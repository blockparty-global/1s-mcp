import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

// ── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_REDIRECT_HOSTS = ['claude.ai', 'www.claude.ai'];
const JWT_TTL_SECONDS = 30 * 86400; // 30 days
const STATE_TTL_MS = 60_000;        // 60 s — consent window
const MAX_PENDING = 1000;           // hard cap on in-flight sessions; excess → 503

const OAUTH_METADATA = JSON.stringify({
  issuer: 'https://mcp.onesource.io',
  authorization_endpoint: 'https://mcp.onesource.io/oauth/authorize',
  token_endpoint: 'https://mcp.onesource.io/oauth/token',
  response_types_supported: ['code'],
  grant_types_supported: ['authorization_code'],
  code_challenge_methods_supported: ['S256'],
  token_endpoint_auth_methods_supported: ['none'],
});

// ── Secret initialisation ────────────────────────────────────────────────────

let jwtSignKey: Buffer | null = null;
let aesKey: Buffer | null = null;

function initSecret(): void {
  const raw = process.env.ONESOURCE_JWT_SECRET ?? '';
  const buf = Buffer.from(raw, 'hex');
  // Buffer.from('invalid-hex', 'hex') silently returns 0 bytes — check length explicitly
  if (buf.length < 32) {
    console.error('[onesource] WARNING: ONESOURCE_JWT_SECRET invalid or too short — OAuth endpoints disabled');
    return;
  }
  jwtSignKey = createHmac('sha256', buf).update('jwt-sign').digest();
  aesKey = createHmac('sha256', buf).update('aes-encrypt').digest();
}

initSecret();

export function isOAuthConfigured(): boolean {
  return jwtSignKey !== null && aesKey !== null;
}

// ── In-memory state ──────────────────────────────────────────────────────────

interface AuthStateEntry {
  codeChallenge: string;
  redirectUri: string;
  clientId: string;
  clientState?: string;
  expiresAt: number;
}

interface PendingCodeEntry {
  encryptedApiKey: string;
  codeChallenge: string;
  redirectUri: string;
  clientId: string;
  expiresAt: number;
}

const authState = new Map<string, AuthStateEntry>();
const pendingCode = new Map<string, PendingCodeEntry>();

function sweepMap<V extends { expiresAt: number }>(map: Map<string, V>): void {
  const now = Date.now();
  for (const [key, val] of map) {
    if (val.expiresAt < now) map.delete(key);
  }
}

// ── AES-256-GCM helpers ──────────────────────────────────────────────────────

function encryptApiKey(apiKey: string): string {
  if (!aesKey) throw new Error('AES key not initialised');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', aesKey, iv);
  const ct = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${ct.toString('base64url')}.${tag.toString('base64url')}`;
}

function decryptApiKey(encrypted: string): string | null {
  try {
    if (!aesKey) return null;
    const parts = encrypted.split('.');
    if (parts.length !== 3) return null;
    const [ivB64, ctB64, tagB64] = parts as [string, string, string];
    const iv = Buffer.from(ivB64, 'base64url');
    const ct = Buffer.from(ctB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', aesKey, iv);
    decipher.setAuthTag(tag);
    // decipher.final() throws on auth-tag mismatch — caught below
    const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
    return plain.toString('utf8');
  } catch {
    return null;
  }
}

// ── JWT helpers ──────────────────────────────────────────────────────────────

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function issueJwt(apiKey: string): string {
  if (!jwtSignKey) throw new Error('JWT sign key not initialised');
  const encryptedApiKey = encryptApiKey(apiKey);
  const sub = createHash('sha256').update(apiKey, 'utf8').digest('hex');
  const now = Math.floor(Date.now() / 1000);
  const headerB64 = b64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payloadB64 = b64url(Buffer.from(JSON.stringify({
    sub,
    apiKey: encryptedApiKey,
    iat: now,
    exp: now + JWT_TTL_SECONDS,
  })));
  const sig = createHmac('sha256', jwtSignKey)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  return `${headerB64}.${payloadB64}.${b64url(sig)}`;
}

// ── Shared response helpers ──────────────────────────────────────────────────

function oauthError(
  res: ServerResponse,
  status: number,
  error: string,
  description?: string,
): void {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(description ? { error, error_description: description } : { error }));
}

function serverError(res: ServerResponse): void {
  oauthError(res, 500, 'server_error');
}

// ── Body reader ──────────────────────────────────────────────────────────────

async function readBody(req: IncomingMessage, maxBytes = 65536): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        req.destroy(new Error('request body too large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      // settled guard is load-bearing: req.destroy(err) fires 'error' async; 'end' may arrive first
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

// ── Public exports ───────────────────────────────────────────────────────────

/** RFC 8414 discovery document. Wired to GET /.well-known/oauth-authorization-server */
export function handleOAuthMetadata(_req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(OAUTH_METADATA);
}

/** Validates PKCE params, stores state, redirects to /login. */
export function handleAuthorize(req: IncomingMessage, res: ServerResponse): void {
  if (!jwtSignKey) { serverError(res); return; }

  const params = new URL(req.url ?? '/', 'https://x').searchParams;

  const responseType = params.get('response_type');
  const clientId = params.get('client_id');
  const redirectUri = params.get('redirect_uri');
  const codeChallenge = params.get('code_challenge');
  const codeChallengeMethod = params.get('code_challenge_method');
  const clientState = params.get('state');

  if (responseType !== 'code') {
    oauthError(res, 400, 'invalid_request', 'response_type must be code'); return;
  }
  if (codeChallengeMethod !== 'S256') {
    oauthError(res, 400, 'invalid_request', 'code_challenge_method must be S256'); return;
  }
  if (!codeChallenge) {
    oauthError(res, 400, 'invalid_request', 'code_challenge required'); return;
  }
  if (!/^[A-Za-z0-9_-]{43}$/.test(codeChallenge)) {
    oauthError(res, 400, 'invalid_request', 'code_challenge must be S256 base64url'); return;
  }
  if (!clientId) {
    oauthError(res, 400, 'invalid_request', 'client_id required'); return;
  }
  if (!redirectUri) {
    oauthError(res, 400, 'invalid_request', 'redirect_uri required'); return;
  }
  if (clientState !== null && clientState.length > 512) {
    oauthError(res, 400, 'invalid_request', 'state too long'); return;
  }

  // Validate redirect_uri against allowlist
  let parsedRedirect: URL;
  try {
    parsedRedirect = new URL(redirectUri);
  } catch {
    oauthError(res, 400, 'invalid_request', 'redirect_uri not allowed'); return;
  }
  if (
    parsedRedirect.protocol !== 'https:' ||
    !ALLOWED_REDIRECT_HOSTS.includes(parsedRedirect.hostname)
  ) {
    oauthError(res, 400, 'invalid_request', 'redirect_uri not allowed'); return;
  }

  const internalState = randomBytes(16).toString('base64url');
  sweepMap(authState);
  if (authState.size >= MAX_PENDING) {
    oauthError(res, 503, 'temporarily_unavailable', 'too many pending sessions'); return;
  }
  authState.set(internalState, {
    codeChallenge,
    redirectUri,
    clientId,
    clientState: clientState ?? undefined,
    expiresAt: Date.now() + STATE_TTL_MS,
  });

  res.writeHead(302, { Location: `/login?state=${encodeURIComponent(internalState)}`, 'Cache-Control': 'no-store' });
  res.end();
}

/** PKCE token exchange — issues a signed JWT containing the encrypted API key. */
export async function handleToken(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!jwtSignKey) { serverError(res); return; }

  let params: URLSearchParams;
  try {
    const body = await readBody(req);
    const ct = (req.headers['content-type'] ?? '').toLowerCase();
    if (ct.includes('application/json')) {
      const parsed = JSON.parse(body) as Record<string, unknown>;
      if (Object.values(parsed).some(v => typeof v !== 'string')) {
        oauthError(res, 400, 'invalid_request', 'all parameters must be strings'); return;
      }
      params = new URLSearchParams(Object.entries(parsed as Record<string, string>));
    } else {
      params = new URLSearchParams(body);
    }
  } catch {
    oauthError(res, 400, 'invalid_request', 'could not parse request body'); return;
  }

  const grantType = params.get('grant_type');
  const code = params.get('code');
  const codeVerifier = params.get('code_verifier');
  const redirectUri = params.get('redirect_uri');
  const clientId = params.get('client_id');

  if (grantType !== 'authorization_code') {
    oauthError(res, 400, 'unsupported_grant_type'); return;
  }
  if (!code || !codeVerifier || !redirectUri) {
    oauthError(res, 400, 'invalid_request', 'code, code_verifier, and redirect_uri required'); return;
  }

  // RFC 7636 §4.1 — code_verifier must be 43-128 unreserved ASCII characters
  if (codeVerifier.length < 43 || codeVerifier.length > 128 || !/^[A-Za-z0-9\-._~]+$/.test(codeVerifier)) {
    oauthError(res, 400, 'invalid_request', 'code_verifier does not meet RFC 7636 requirements'); return;
  }

  const entry = pendingCode.get(code);
  if (!entry || entry.expiresAt < Date.now()) {
    pendingCode.delete(code);
    oauthError(res, 400, 'invalid_grant'); return;
  }

  // Single-use: consume on first presentation regardless of validation outcome
  pendingCode.delete(code);

  // PKCE verification — timingSafeEqual requires equal-length buffers
  const expectedChallenge = createHash('sha256')
    .update(codeVerifier, 'ascii')
    .digest()
    .toString('base64url');
  const expectedBuf = Buffer.from(expectedChallenge);
  const storedBuf = Buffer.from(entry.codeChallenge);
  if (
    expectedBuf.length !== storedBuf.length ||
    !timingSafeEqual(expectedBuf, storedBuf)
  ) {
    oauthError(res, 400, 'invalid_grant'); return;
  }

  // redirect_uri binding (RFC 6749 §4.1.3)
  if (redirectUri !== entry.redirectUri) {
    oauthError(res, 400, 'invalid_grant'); return;
  }

  // client_id binding (RFC 6749 §4.1.3) — verified only when present; public clients may omit it
  if (clientId !== null && clientId !== entry.clientId) {
    oauthError(res, 400, 'invalid_grant'); return;
  }

  const apiKey = decryptApiKey(entry.encryptedApiKey);
  if (!apiKey) { serverError(res); return; }

  let accessToken: string;
  try {
    accessToken = issueJwt(apiKey);
  } catch {
    serverError(res); return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: JWT_TTL_SECONDS,
  }));
}

/**
 * Called by login-page.ts after the user's API key passes live validation.
 * Stores an auth code keyed to the encrypted API key; returns the code and
 * the redirect URI so the login handler can build the redirect URL.
 * Returns null if the state is unknown or expired.
 */
export function issueCode(
  state: string,
  apiKey: string,
): { code: string; redirectUri: string; clientState?: string } | null {
  if (!aesKey) return null;

  const entry = authState.get(state);
  if (!entry || entry.expiresAt < Date.now()) {
    authState.delete(state);
    return null;
  }

  authState.delete(state); // single-use

  const encryptedApiKey = encryptApiKey(apiKey);
  const code = randomBytes(32).toString('base64url');

  sweepMap(pendingCode);
  if (pendingCode.size >= MAX_PENDING) return null;
  pendingCode.set(code, {
    encryptedApiKey,
    codeChallenge: entry.codeChallenge,
    redirectUri: entry.redirectUri,
    clientId: entry.clientId,
    expiresAt: Date.now() + STATE_TTL_MS,
  });

  return { code, redirectUri: entry.redirectUri, clientState: entry.clientState };
}

/**
 * Resolves a Bearer token to a OneSource API key.
 * Returns the decrypted API key if the token is a valid, unexpired JWT issued
 * by this server. Returns null for raw API keys, expired tokens, invalid
 * signatures, or any error — never throws.
 */
export function resolveBearer(token: string): string | null {
  try {
    if (!jwtSignKey) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts as [string, string, string];

    // Parse header — JSON.parse throws on malformed base64url
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8')) as Record<string, unknown>;

    // Pin algorithm before any crypto — alg:none protection
    if (header['alg'] !== 'HS256' || header['typ'] !== 'JWT') return null;

    // Verify signature — timingSafeEqual requires equal-length buffers
    const expectedSig = createHmac('sha256', jwtSignKey)
      .update(`${headerB64}.${payloadB64}`)
      .digest();
    const receivedSig = Buffer.from(sigB64, 'base64url');
    if (expectedSig.length !== receivedSig.length || !timingSafeEqual(expectedSig, receivedSig)) {
      return null;
    }

    // Parse payload
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as Record<string, unknown>;

    // Check expiry
    if (typeof payload['exp'] !== 'number' || payload['exp'] < Date.now() / 1000) return null;

    // Decrypt API key — decryptApiKey never throws
    if (typeof payload['apiKey'] !== 'string') return null;
    return decryptApiKey(payload['apiKey']);
  } catch {
    return null;
  }
}
