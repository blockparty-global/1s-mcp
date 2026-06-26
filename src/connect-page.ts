import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { issueCode, isOAuthConfigured, hasAuthState } from './oauth.js';
import { readBody } from './http-utils.js';

// ── Constants ────────────────────────────────────────────────────────────────

const COOKIE_TTL_MS = 60_000;
const MAX_STATE_COOKIES = 1000;

// Must exceed the time for a slow validateApiKey call so format failures and
// API rejections produce indistinguishable response times.
const MIN_KEY_FAIL_MS = 250;

// Accepts the base64url output of randomBytes(16) used as internalState in oauth.ts.
const STATE_RE = /^[A-Za-z0-9_-]{1,100}$/;

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
} as const;

// ── Browser-binding cookie Map ───────────────────────────────────────────────

const stateCookies = new Map<string, { token: Buffer; expiresAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of stateCookies) if (v.expiresAt < now) stateCookies.delete(k);
}, COOKIE_TTL_MS).unref();

// ── Helpers ──────────────────────────────────────────────────────────────────

function jsonError(res: ServerResponse, status: number, error: string): void {
  res.writeHead(status, JSON_HEADERS);
  res.end(JSON.stringify({ error }));
}

async function validateApiKey(candidate: string): Promise<'valid' | 'invalid' | 'error'> {
  try {
    const base = (process.env.ONESOURCE_BASE_URL ?? 'https://api.onesource.io').replace(/\/+$/, '');
    const r = await fetch(`${base}/api/chain/chain-id?network=ethereum`, {
      headers: { Authorization: `Bearer ${candidate}` },
      signal: AbortSignal.timeout(5000),
    });
    // 200 → valid key; 403 → valid key, no dev plan (user can still connect)
    if (r.status === 200 || r.status === 403) return 'valid';
    if (r.status >= 500) return 'error';
    return 'invalid';
  } catch {
    return 'error';
  }
}

// ── Public exports ───────────────────────────────────────────────────────────

/**
 * GET /api/oauth/connect-init?state=<state>
 * Verifies the state exists in the auth session, issues a browser-binding CSRF cookie,
 * and returns { ok: true }. The cookie must be present on the subsequent connect-submit call.
 */
export function handleConnectInit(req: IncomingMessage, res: ServerResponse): void {
  if (!isOAuthConfigured()) {
    jsonError(res, 503, 'server_error'); return;
  }

  const params = new URL(req.url ?? '/', 'https://x').searchParams;
  const state = params.get('state') ?? '';

  if (!state || !STATE_RE.test(state)) {
    jsonError(res, 400, 'invalid_state'); return;
  }

  if (!hasAuthState(state)) {
    jsonError(res, 400, 'invalid_state'); return;
  }

  // SEC-02: if a valid entry already exists for this state, don't overwrite it.
  // A second call (attacker) cannot replace the victim's cookie token.
  const existing = stateCookies.get(state);
  if (existing && existing.expiresAt > Date.now()) {
    res.writeHead(200, JSON_HEADERS);
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (stateCookies.size >= MAX_STATE_COOKIES && !stateCookies.has(state)) {
    // ADV-01: sweep expired entries before giving up — may free space.
    const now = Date.now();
    for (const [k, v] of stateCookies) if (v.expiresAt < now) stateCookies.delete(k);
    if (stateCookies.size >= MAX_STATE_COOKIES && !stateCookies.has(state)) {
      jsonError(res, 503, 'server_busy'); return;
    }
  }

  const cookieToken = randomBytes(16);
  stateCookies.set(state, { token: cookieToken, expiresAt: Date.now() + COOKIE_TTL_MS });

  // Production (TRUSTED_PROXY=true, behind ALB): always Secure.
  // Local dev (plain HTTP): read XFP with correct string parsing (not Array.isArray).
  const isTrustedProxy = process.env.TRUSTED_PROXY === 'true';
  const xfp = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim();
  const needsSecure = isTrustedProxy || xfp === 'https';
  const cookieStr = [
    `connect_state=${cookieToken.toString('hex')}`,
    'HttpOnly',
    ...(needsSecure ? ['Secure'] : []),
    'SameSite=Lax',
    'Path=/api/oauth',
    'Max-Age=60',
  ].join('; ');

  res.writeHead(200, { ...JSON_HEADERS, 'Set-Cookie': cookieStr });
  res.end(JSON.stringify({ ok: true }));
}

/**
 * POST /api/oauth/connect-submit
 * Body: { state: string, apiKey: string }
 * Validates the CSRF cookie, validates the API key live, then issues an auth code.
 * Returns { location: string } on success or { error: string } on failure.
 *
 * C-01 fix: the cookie entry is only deleted after issueCode() succeeds.
 * On key validation failure the cookie stays alive so the user can retry.
 */
export async function handleConnectSubmit(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!isOAuthConfigured()) {
    jsonError(res, 503, 'server_error'); return;
  }

  let body: string;
  try {
    body = await readBody(req, 4096);
  } catch {
    jsonError(res, 400, 'invalid_request'); return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    jsonError(res, 400, 'invalid_request'); return;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    jsonError(res, 400, 'invalid_request'); return;
  }

  const { state, apiKey } = parsed as Record<string, unknown>;

  if (typeof state !== 'string' || !STATE_RE.test(state)) {
    jsonError(res, 400, 'invalid_state'); return;
  }
  if (typeof apiKey !== 'string') {
    jsonError(res, 400, 'invalid_request'); return;
  }

  // Cookie binding — prevents CSRF; the cookie was issued by handleConnectInit.
  const cookieHeader = req.headers['cookie'] ?? '';
  const cookieMatch = /(?:^|;\s*)connect_state=([0-9a-f]{32})(?=\s*(?:;|$))/.exec(cookieHeader);
  const browserToken = cookieMatch ? Buffer.from(cookieMatch[1]!, 'hex') : null;
  const storedEntry = stateCookies.get(state);
  const cookieValid = browserToken !== null
    && storedEntry !== undefined
    && storedEntry.expiresAt > Date.now()
    && timingSafeEqual(browserToken, storedEntry.token);

  if (!cookieValid) {
    jsonError(res, 400, 'session_expired'); return;
  }

  // All key-validation failure paths share a response-time floor so format
  // failures and API rejections are indistinguishable by timing.
  const keyCheckStart = Date.now();
  async function keyFailFloor(): Promise<void> {
    const remaining = MIN_KEY_FAIL_MS - (Date.now() - keyCheckStart);
    if (remaining > 0) await new Promise<void>(r => setTimeout(r, remaining));
  }

  const apiKeyFormatOk = apiKey.length > 0 && apiKey.length <= 512 && /^[\x21-\x7E]+$/.test(apiKey);
  if (!apiKeyFormatOk) {
    await keyFailFloor();
    // Cookie stays alive — user can retry with corrected key
    jsonError(res, 401, 'invalid_key'); return;
  }

  const keyResult = await validateApiKey(apiKey);
  if (keyResult === 'error') {
    await keyFailFloor();
    jsonError(res, 503, 'server_busy'); return;
  }
  if (keyResult === 'invalid') {
    await keyFailFloor();
    // Cookie stays alive — user can retry with corrected key
    jsonError(res, 401, 'invalid_key'); return;
  }

  // Issue auth code — consumes the authState entry atomically.
  // issueCode deletes the authState entry on expiry, so checking hasAuthState
  // after a null return correctly distinguishes expiry (false) from capacity (true).
  const result = issueCode(state, apiKey);
  if (!result) {
    if (!hasAuthState(state)) {
      stateCookies.delete(state);
      jsonError(res, 400, 'session_expired'); return;
    }
    // authState still present — pendingCode at capacity; user can retry.
    jsonError(res, 503, 'server_busy'); return;
  }

  // C-01 fix: delete cookie only after issueCode succeeds.
  stateCookies.delete(state);

  let location: URL;
  try {
    location = new URL(result.redirectUri);
  } catch {
    jsonError(res, 500, 'server_error'); return;
  }
  location.searchParams.set('code', result.code);
  if (result.clientState !== undefined) location.searchParams.set('state', result.clientState);

  res.writeHead(200, JSON_HEADERS);
  res.end(JSON.stringify({ location: location.toString() }));
}
