import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { issueCode, isOAuthConfigured } from './oauth.js';

// ── Constants ────────────────────────────────────────────────────────────────

const ONESOURCE_DASHBOARD = 'https://app.onesource.io/dashboard';

// Must match STATE_TTL_MS in oauth.ts — cookie binding expires with the auth session.
const COOKIE_TTL_MS = 60_000;
const MAX_STATE_COOKIES = 1000;

// Server-generated state tokens are always randomBytes(16).toString('base64url') — 22 chars.
// Enforcing this pattern on both GET and POST paths prevents HTML injection through the
// state field regardless of escapeHtml correctness.
const STATE_RE = /^[A-Za-z0-9_-]{1,100}$/;

// Minimum response time (ms) for all key-validation failure paths combined.
// Applied from before the format check so format failures and fast API rejections
// produce indistinguishable response times — prevents key-format enumeration via timing.
const MIN_KEY_FAIL_MS = 250;

// Shared headers applied to every HTML response.
const HTML_HEADERS: Record<string, string> = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'",
};

// ── Browser-binding cookie Map ───────────────────────────────────────────────
// Binds each pending login state to the browser that initiated it.
// Prevents login CSRF: an attacker who sees the ?state= URL cannot POST on
// behalf of the victim because the server requires the matching cookie.

const stateCookies = new Map<string, { token: Buffer; expiresAt: number }>();

function sweepStateCookies(): void {
  const now = Date.now();
  for (const [k, v] of stateCookies) if (v.expiresAt < now) stateCookies.delete(k);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readBody(req: IncomingMessage, maxBytes = 4096): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        req.destroy(new Error('body too large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', (err: Error) => {
      if (settled) return;
      settled = true;
      reject(err);
    });
  });
}

// Validates a candidate API key against the OneSource API.
// Returns true for HTTP 200 (valid key) or 403 (valid key, no dev plan).
// Returns false for HTTP 402 (key not accepted), timeouts, and network errors.
// IMPORTANT: never log `candidate` — it is a user-supplied API key.
async function validateApiKey(candidate: string): Promise<boolean> {
  try {
    const base = (process.env.ONESOURCE_BASE_URL ?? 'https://skills.onesource.io').replace(/\/+$/, '');
    const res = await fetch(`${base}/api/chain/chain-id?network=ethereum`, {
      headers: { Authorization: `Bearer ${candidate}` },
      signal: AbortSignal.timeout(5000),
    });
    // 200 → valid key; 403 → valid key but no dev plan (user can still log in,
    // they will encounter 403 on tool calls and see the upgrade prompt there).
    return res.status === 200 || res.status === 403;
  } catch {
    // Do NOT log `candidate` here.
    return false;
  }
}

function loginHtml(state: string, errorMsg?: string): string {
  const escapedState = escapeHtml(state);
  const errorBlock = errorMsg
    ? `<p class="error">${escapeHtml(errorMsg)}</p>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>OneSource — Connect to Claude.ai</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #f5f5f5;
         display: flex; align-items: center; justify-content: center;
         min-height: 100vh; padding: 1rem; }
  .card { background: #fff; border-radius: 10px; padding: 2rem;
          width: 100%; max-width: 400px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
  h1 { font-size: 1.1rem; font-weight: 600; margin-bottom: 1.5rem; color: #111; }
  label { display: block; font-size: .85rem; color: #555; margin-bottom: .4rem; }
  input[type=text] { width: 100%; padding: .6rem .8rem; border: 1px solid #ddd;
                     border-radius: 6px; font-size: .9rem; font-family: monospace; }
  input[type=text]:focus { outline: 2px solid #6366f1; border-color: transparent; }
  button { margin-top: 1rem; width: 100%; padding: .7rem; background: #6366f1;
           color: #fff; border: none; border-radius: 6px; font-size: .95rem; cursor: pointer; }
  button:hover { background: #4f46e5; }
  .hint { margin-top: 1rem; font-size: .8rem; color: #888; }
  .hint a { color: #6366f1; }
  .error { background: #fee2e2; color: #b91c1c; padding: .6rem .8rem;
           border-radius: 6px; font-size: .85rem; margin-bottom: 1rem; }
</style>
</head>
<body>
<div class="card">
  <h1>Connect to Claude.ai</h1>
  ${errorBlock}
  <form method="POST" action="/login">
    <input type="hidden" name="state" value="${escapedState}">
    <label for="apiKey">OneSource API key</label>
    <input type="text" id="apiKey" name="apiKey" autocomplete="off" placeholder="os_live_…" required>
    <button type="submit">Connect</button>
  </form>
  <p class="hint">Don&apos;t have a key? <a href="${ONESOURCE_DASHBOARD}" target="_blank" rel="noopener noreferrer">Get one at app.onesource.io</a></p>
</div>
</body>
</html>`;
}

function terminalErrorHtml(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>OneSource — ${escapeHtml(title)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #f5f5f5;
         display: flex; align-items: center; justify-content: center;
         min-height: 100vh; padding: 1rem; }
  .card { background: #fff; border-radius: 10px; padding: 2rem;
          width: 100%; max-width: 400px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
  h1 { font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem; color: #111; }
  p { font-size: .9rem; color: #555; line-height: 1.5; }
</style>
</head>
<body>
<div class="card">
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(message)}</p>
</div>
</body>
</html>`;
}

// ── Public exports ───────────────────────────────────────────────────────────

/** Handles GET /login?state=<state> — renders the API key entry form. */
export function handleLoginPage(req: IncomingMessage, res: ServerResponse): void {
  if (!isOAuthConfigured()) {
    res.writeHead(503, HTML_HEADERS);
    res.end(terminalErrorHtml('Service Unavailable', 'Authentication service is not configured. Please contact support.'));
    return;
  }

  const params = new URL(req.url ?? '/', 'https://x').searchParams;
  const state = params.get('state') ?? '';
  const errorParam = params.get('error');

  if (!state || !STATE_RE.test(state)) {
    res.writeHead(400, HTML_HEADERS);
    res.end(terminalErrorHtml('Invalid Link', 'Invalid link. Please connect again from Claude.ai.'));
    return;
  }

  // Issue a browser-binding cookie to prevent login CSRF.
  const cookieToken = randomBytes(16);
  sweepStateCookies();
  if (stateCookies.size >= MAX_STATE_COOKIES && !stateCookies.has(state)) {
    res.writeHead(503, HTML_HEADERS);
    res.end(terminalErrorHtml('Service Unavailable', 'Too many pending sessions. Please try again in a moment.'));
    return;
  }
  stateCookies.set(state, { token: cookieToken, expiresAt: Date.now() + COOKIE_TTL_MS });

  const cookieStr = [
    `oauth_state=${cookieToken.toString('hex')}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Path=/login',
    'Max-Age=60',
  ].join('; ');

  const errorMsg = errorParam === 'invalid_key'
    ? 'Invalid API key. Please check your key and try again.'
    : undefined;

  res.writeHead(200, { ...HTML_HEADERS, 'Set-Cookie': cookieStr });
  res.end(loginHtml(state, errorMsg));
}

/**
 * Handles POST /login — validates API key and issues auth code.
 *
 * Security properties:
 * - `apiKey` is never logged, never reflected in HTML, never included in error messages.
 * - `state` is validated against the server-generated base64url pattern (STATE_RE) before
 *   use, on both GET and POST paths. This prevents HTML injection regardless of escapeHtml
 *   correctness.
 * - All key-validation failure paths share a constant minimum response time (MIN_KEY_FAIL_MS)
 *   so format failures and fast API rejections produce indistinguishable response times,
 *   preventing key-format enumeration via timing.
 * - `issueCode` is the authoritative gate for state validity — it consumes the authState
 *   entry atomically; the state value from POST body is trusted only after format validation.
 * - Residual risk: an attacker who observes a victim's state token from the /login?state=
 *   URL can race the victim's POST submission. Full mitigation requires same-site cookie
 *   binding, deferred to a future unit.
 */
export async function handleLoginSubmit(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!isOAuthConfigured()) {
    res.writeHead(503, HTML_HEADERS);
    res.end(terminalErrorHtml('Service Unavailable', 'Authentication service is not configured. Please contact support.'));
    return;
  }

  let body: string;
  try {
    body = await readBody(req, 4096);
  } catch {
    res.writeHead(400, HTML_HEADERS);
    res.end(terminalErrorHtml('Error', 'Something went wrong. Please try again.'));
    return;
  }

  const params = new URLSearchParams(body);
  const state = params.get('state') ?? '';
  const apiKey = params.get('apiKey') ?? '';

  // Validate state format — reject tampered or malformed state before any Map access.
  if (!STATE_RE.test(state)) {
    res.writeHead(400, HTML_HEADERS);
    res.end(terminalErrorHtml('Invalid Link', 'Invalid link. Please connect again from Claude.ai.'));
    return;
  }

  // Cookie binding — prevents login CSRF / session fixation.
  // The cookie was issued when GET /login was served; it must match the stored token
  // for this state. Single-use: entry deleted regardless of outcome.
  const cookieHeader = req.headers['cookie'] ?? '';
  const cookieMatch = /(?:^|;\s*)oauth_state=([0-9a-f]{32})(?=\s*(?:;|$))/.exec(cookieHeader);
  const browserToken = cookieMatch ? Buffer.from(cookieMatch[1], 'hex') : null;
  const storedEntry = stateCookies.get(state);
  const cookieValid = browserToken !== null
    && storedEntry !== undefined
    && storedEntry.expiresAt > Date.now()
    && timingSafeEqual(browserToken, storedEntry.token);
  stateCookies.delete(state);
  if (!cookieValid) {
    res.writeHead(400, HTML_HEADERS);
    res.end(terminalErrorHtml('Invalid Request', 'Session verification failed. Please return to Claude.ai and connect again.'));
    return;
  }

  // All key-validation failure paths share a floor so their timing is indistinguishable.
  const keyCheckStart = Date.now();
  async function keyFailFloor(): Promise<void> {
    const remaining = MIN_KEY_FAIL_MS - (Date.now() - keyCheckStart);
    if (remaining > 0) await new Promise<void>(r => setTimeout(r, remaining));
  }

  // Validate apiKey format — non-empty, ≤512 chars, no control chars.
  // On failure, redirect back to GET /login so the browser gets a fresh cookie.
  const apiKeyFormatOk = apiKey.length > 0 && apiKey.length <= 512 && !/[\r\n\t]/.test(apiKey);
  if (!apiKeyFormatOk) {
    await keyFailFloor();
    res.writeHead(302, { 'Location': `/login?state=${encodeURIComponent(state)}&error=invalid_key`, 'Cache-Control': 'no-store' });
    res.end();
    return;
  }

  // Live API key validation — 5s timeout; never logs `apiKey` on failure.
  // On failure, redirect back to GET /login so the browser gets a fresh cookie.
  const valid = await validateApiKey(apiKey);
  if (!valid) {
    await keyFailFloor();
    res.writeHead(302, { 'Location': `/login?state=${encodeURIComponent(state)}&error=invalid_key`, 'Cache-Control': 'no-store' });
    res.end();
    return;
  }

  // Issue auth code — consumes the authState entry atomically; returns null if
  // the state is expired, already used, or the pendingCode map is at capacity.
  const result = issueCode(state, apiKey);
  if (!result) {
    res.writeHead(200, HTML_HEADERS);
    res.end(terminalErrorHtml('Session Expired', 'Session expired. Please return to Claude.ai and connect again.'));
    return;
  }

  // Build redirect URL with URL class to handle any pre-existing query params correctly.
  let u: URL;
  try {
    u = new URL(result.redirectUri);
  } catch {
    res.writeHead(500, HTML_HEADERS);
    res.end(terminalErrorHtml('Error', 'Something went wrong. Please try again.'));
    return;
  }
  u.searchParams.set('code', result.code);
  if (result.clientState !== undefined) u.searchParams.set('state', result.clientState);

  res.writeHead(302, { Location: u.toString(), 'Cache-Control': 'no-store' });
  res.end();
}
