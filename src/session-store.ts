/**
 * Pluggable session store for OAuth flow state.
 *
 * Two implementations, selected at HTTP startup by the presence of VALKEY_URL:
 *   - InMemoryStore — wraps the original per-process Maps + sweep + capacity
 *     logic bit-for-bit. Default. Used by stdio/npx, local HTTP dev, and any
 *     deploy without VALKEY_URL. The npx/stdio path never loads redis.
 *   - ValkeyStore — Valkey/Redis-backed, so ≥2 replicas can each serve any step
 *     of the flow. Lazy dynamic import('redis') so it is only loaded in HTTP mode
 *     when VALKEY_URL is set.
 *
 * Value shapes and TTLs mirror the state inventory (plan §3):
 *   - authState   : { codeChallenge, redirectUri, clientId, clientState?, expiresAt }  TTL 120s
 *   - pendingCode : { encryptedApiKey, codeChallenge, redirectUri, clientId, expiresAt } TTL 120s
 *   - stateCookie : SHA256(csrfToken) hex string (NOT the raw token)                    TTL 60s
 *   - rate limit  : integer counter over a 60s window (native TTL)
 *
 * Single-use consume (take*) is atomic: InMemoryStore uses get-then-delete on a
 * single-threaded event loop; ValkeyStore uses GETDEL (one round-trip). This is
 * what preserves cross-pod replay protection.
 */

export interface AuthStateEntry {
  codeChallenge: string;
  redirectUri: string;
  clientId: string;
  clientState?: string;
  expiresAt: number;
}

export interface PendingCodeEntry {
  encryptedApiKey: string;
  codeChallenge: string;
  redirectUri: string;
  clientId: string;
  expiresAt: number;
}

export interface RateResult {
  count: number;
}

/**
 * All operations are async so the two backends share one call surface.
 *
 * take* = single-use consume (returns the entry once, then null forever).
 * get*  = non-consuming peek (used only by the connect-init flow).
 */
export interface SessionStore {
  setAuthState(token: string, entry: AuthStateEntry, ttlMs: number): Promise<void>;
  /** Non-consuming peek — connect-init only. Returns null if absent/expired. */
  getAuthState(token: string): Promise<AuthStateEntry | null>;
  /** Single-use consume — issueCode. Returns the entry once, then null. */
  takeAuthState(token: string): Promise<AuthStateEntry | null>;

  setPendingCode(code: string, entry: PendingCodeEntry, ttlMs: number): Promise<void>;
  /** Single-use consume — token exchange. Returns the entry once, then null. */
  takePendingCode(code: string): Promise<PendingCodeEntry | null>;

  /** Stores SHA256(csrfToken) (hex) — never the raw token. */
  setStateCookie(state: string, tokenHash: string, ttlMs: number): Promise<void>;
  /** Non-consuming peek — connect-init SEC-02. Returns null if absent/expired. */
  getStateCookie(state: string): Promise<string | null>;
  /** Single-use consume — connect-submit C-01. Returns the hash once, then null. */
  takeStateCookie(state: string): Promise<string | null>;

  /** Increments the counter for `key` within a `windowMs` window; the counter
   *  is always created with the window TTL so it self-resets when the window ends. */
  incrRate(key: string, windowMs: number): Promise<RateResult>;
}

// ── InMemoryStore ──────────────────────────────────────────────────────────

/**
 * Preserves the original per-process behavior exactly:
 *   - authState/pendingCode: sweep-then-capacity (MAX_PENDING) as in
 *     oauth.ts handleAuthorize (219–222) and issueCode (348–349).
 *   - stateCookies: sweep-then-capacity (MAX_STATE_COOKIES) as in connect-page.ts.
 *   - rate limits: per-process INCR with MAX_IPS eviction.
 *
 * Capacity overflow is signalled to callers by returning null from set* (the
 * caller maps that to a 503), matching the original "excess → 503" semantics.
 */
export class InMemoryStore implements SessionStore {
  private readonly MAX_PENDING: number;
  private readonly MAX_STATE_COOKIES: number;
  private readonly MAX_RATE_IPS: number;

  private readonly authStateMap = new Map<string, AuthStateEntry>();
  private readonly pendingCodeMap = new Map<string, PendingCodeEntry>();
  private readonly stateCookieMap = new Map<string, { tokenHash: string; expiresAt: number }>();
  private readonly rateMap = new Map<string, { count: number; resetAt: number }>();

  constructor(opts?: { maxPending?: number; maxStateCookies?: number; maxRateIps?: number }) {
    this.MAX_PENDING = opts?.maxPending ?? 1000;
    this.MAX_STATE_COOKIES = opts?.maxStateCookies ?? 1000;
    this.MAX_RATE_IPS = opts?.maxRateIps ?? 10_000;
  }

  private static sweep<V extends { expiresAt: number }>(map: Map<string, V>): void {
    const now = Date.now();
    for (const [key, val] of map) {
      if (val.expiresAt < now) map.delete(key);
    }
  }

  // authState — set does sweep-then-capacity, mirroring handleAuthorize (219–222).
  async setAuthState(token: string, entry: AuthStateEntry, _ttlMs: number): Promise<void> {
    InMemoryStore.sweep(this.authStateMap);
    if (this.authStateMap.size >= this.MAX_PENDING && !this.authStateMap.has(token)) {
      throw new CapacityError('too many pending sessions');
    }
    this.authStateMap.set(token, entry);
  }

  async getAuthState(token: string): Promise<AuthStateEntry | null> {
    const entry = this.authStateMap.get(token);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.authStateMap.delete(token);
      return null;
    }
    return entry;
  }

  async takeAuthState(token: string): Promise<AuthStateEntry | null> {
    const entry = this.authStateMap.get(token);
    if (!entry) return null;
    this.authStateMap.delete(token); // single-use — delete regardless of expiry
    if (entry.expiresAt < Date.now()) return null;
    return entry;
  }

  // pendingCode — set does sweep-then-capacity, mirroring issueCode (348–349).
  async setPendingCode(code: string, entry: PendingCodeEntry, _ttlMs: number): Promise<void> {
    InMemoryStore.sweep(this.pendingCodeMap);
    if (this.pendingCodeMap.size >= this.MAX_PENDING && !this.pendingCodeMap.has(code)) {
      throw new CapacityError('too many pending codes');
    }
    this.pendingCodeMap.set(code, entry);
  }

  async takePendingCode(code: string): Promise<PendingCodeEntry | null> {
    const entry = this.pendingCodeMap.get(code);
    if (!entry) return null;
    this.pendingCodeMap.delete(code); // single-use — delete regardless of expiry
    if (entry.expiresAt < Date.now()) return null;
    return entry;
  }

  // stateCookies — sweep-then-capacity mirrors connect-page.ts handleConnectInit.
  async setStateCookie(state: string, tokenHash: string, ttlMs: number): Promise<void> {
    if (this.stateCookieMap.size >= this.MAX_STATE_COOKIES && !this.stateCookieMap.has(state)) {
      InMemoryStore.sweep(this.stateCookieMap);
      if (this.stateCookieMap.size >= this.MAX_STATE_COOKIES && !this.stateCookieMap.has(state)) {
        throw new CapacityError('too many state cookies');
      }
    }
    this.stateCookieMap.set(state, { tokenHash, expiresAt: Date.now() + ttlMs });
  }

  async getStateCookie(state: string): Promise<string | null> {
    const entry = this.stateCookieMap.get(state);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.stateCookieMap.delete(state);
      return null;
    }
    return entry.tokenHash;
  }

  async takeStateCookie(state: string): Promise<string | null> {
    const entry = this.stateCookieMap.get(state);
    if (!entry) return null;
    this.stateCookieMap.delete(state); // single-use
    if (entry.expiresAt < Date.now()) return null;
    return entry.tokenHash;
  }

  async incrRate(key: string, windowMs: number): Promise<RateResult> {
    const now = Date.now();
    const entry = this.rateMap.get(key);
    if (!entry) {
      if (this.rateMap.size >= this.MAX_RATE_IPS) {
        for (const [k, v] of this.rateMap) if (v.resetAt < now) this.rateMap.delete(k);
      }
      this.rateMap.set(key, { count: 1, resetAt: now + windowMs });
      return { count: 1 };
    }
    if (entry.resetAt < now) {
      entry.count = 1;
      entry.resetAt = now + windowMs;
      return { count: 1 };
    }
    entry.count++;
    return { count: entry.count };
  }
}

/**
 * Signals a capacity-cap overflow (InMemoryStore only). Callers translate this
 * to the original "excess → 503" response. ValkeyStore never throws this — it
 * relies on native TTL + the rate limiter per plan decision D2.
 */
export class CapacityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CapacityError';
  }
}

// ── ValkeyStore ──────────────────────────────────────────────────────────

const NS_OAUTH = 'mcp:oauth:';
const NS_RL = 'mcp:rl:';

// Minimal structural type for the subset of the node-redis v4 client we use.
// Kept local so the redis types are not a hard build-time dependency.
export interface RedisLikeClient {
  connect(): Promise<unknown>;
  ping(): Promise<string>;
  set(key: string, value: string, opts: { PX: number; NX?: boolean }): Promise<unknown>;
  get(key: string): Promise<string | null>;
  getDel(key: string): Promise<string | null>;
  incr(key: string): Promise<number>;
  on(event: string, listener: (...args: unknown[]) => void): unknown;
}

/**
 * Redacts credentials from a Valkey/Redis URL so it is never logged verbatim.
 * `redis://:secret@host:6379` → `redis://:***@host:6379`. Also strips a
 * `user:pass@` form. Falls back to a fully-redacted marker if parsing fails.
 */
export function redactRedisUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    if (u.username) u.username = '***';
    return u.toString();
  } catch {
    // Non-parseable URL — never risk leaking. Redact any `user:pass@` credential
    // segment (with or without a leading `//`), else redact the whole string.
    if (/@/.test(url)) return url.replace(/(\/\/)?[^@/]*@/, (_m, slashes) => `${slashes ?? ''}***@`);
    return '[redacted]';
  }
}

export class ValkeyStore implements SessionStore {
  private readonly client: RedisLikeClient;

  private constructor(client: RedisLikeClient) {
    this.client = client;
  }

  /**
   * Connect + PING. Throws (with a REDACTED message) on any failure — the caller
   * decides startup behavior (the plan requires failing startup loudly).
   */
  static async connect(url: string, password?: string): Promise<ValkeyStore> {
    // Lazy dynamic import so stdio/npx never loads redis.
    const redis = (await import('redis')) as unknown as {
      createClient(opts: { url: string; password?: string }): RedisLikeClient;
    };
    const client = redis.createClient(password ? { url, password } : { url });
    // Swallow post-connect error events so a transient blip never crashes the
    // process with an unhandled 'error'; individual ops still reject and are
    // handled by the store-error semantics in the handlers.
    client.on('error', () => { /* handled per-operation */ });
    try {
      await client.connect();
      await client.ping();
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      // NEVER include url/password — redact before surfacing.
      throw new Error(`Valkey connection failed (${redactRedisUrl(url)}): ${reason}`);
    }
    return new ValkeyStore(client);
  }

  /**
   * Builds a ValkeyStore over an already-connected client. Used only for tests
   * (inject a fake `RedisLikeClient`) so the store's op logic can be exercised
   * without a live Valkey and without `npm test` needing one running.
   */
  static fromClient(client: RedisLikeClient): ValkeyStore {
    return new ValkeyStore(client);
  }

  private static key(ns: string, id: string): string {
    return ns + id;
  }

  /**
   * Parses a stored JSON entry, failing CLOSED on any corruption: a non-JSON
   * value, or a parsed object that fails the caller's light shape check, is
   * treated as absent (returns null) rather than throwing. Without this a
   * corrupted/partial/schema-drifted value would throw an uncaught rejection →
   * a session-destroying 500 (and GETDEL has already deleted the key), instead
   * of the flow failing cleanly to invalid_grant / session_expired.
   */
  private static parseEntry<T>(raw: string | null, isValid: (o: Record<string, unknown>) => boolean): T | null {
    if (raw === null) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    return isValid(parsed as Record<string, unknown>) ? (parsed as T) : null;
  }

  private static isAuthState(o: Record<string, unknown>): boolean {
    return typeof o['codeChallenge'] === 'string'
      && typeof o['redirectUri'] === 'string'
      && typeof o['clientId'] === 'string';
  }

  private static isPendingCode(o: Record<string, unknown>): boolean {
    return typeof o['encryptedApiKey'] === 'string'
      && typeof o['codeChallenge'] === 'string'
      && typeof o['redirectUri'] === 'string'
      && typeof o['clientId'] === 'string';
  }

  async setAuthState(token: string, entry: AuthStateEntry, ttlMs: number): Promise<void> {
    await this.client.set(ValkeyStore.key(NS_OAUTH, `authstate:${token}`), JSON.stringify(entry), { PX: ttlMs });
  }

  async getAuthState(token: string): Promise<AuthStateEntry | null> {
    const raw = await this.client.get(ValkeyStore.key(NS_OAUTH, `authstate:${token}`));
    return ValkeyStore.parseEntry<AuthStateEntry>(raw, ValkeyStore.isAuthState);
  }

  async takeAuthState(token: string): Promise<AuthStateEntry | null> {
    const raw = await this.client.getDel(ValkeyStore.key(NS_OAUTH, `authstate:${token}`));
    return ValkeyStore.parseEntry<AuthStateEntry>(raw, ValkeyStore.isAuthState);
  }

  async setPendingCode(code: string, entry: PendingCodeEntry, ttlMs: number): Promise<void> {
    await this.client.set(ValkeyStore.key(NS_OAUTH, `pending:${code}`), JSON.stringify(entry), { PX: ttlMs });
  }

  async takePendingCode(code: string): Promise<PendingCodeEntry | null> {
    const raw = await this.client.getDel(ValkeyStore.key(NS_OAUTH, `pending:${code}`));
    return ValkeyStore.parseEntry<PendingCodeEntry>(raw, ValkeyStore.isPendingCode);
  }

  async setStateCookie(state: string, tokenHash: string, ttlMs: number): Promise<void> {
    await this.client.set(ValkeyStore.key(NS_OAUTH, `cookie:${state}`), tokenHash, { PX: ttlMs });
  }

  async getStateCookie(state: string): Promise<string | null> {
    return this.client.get(ValkeyStore.key(NS_OAUTH, `cookie:${state}`));
  }

  async takeStateCookie(state: string): Promise<string | null> {
    return this.client.getDel(ValkeyStore.key(NS_OAUTH, `cookie:${state}`));
  }

  async incrRate(key: string, windowMs: number): Promise<RateResult> {
    const k = ValkeyStore.key(NS_RL, key);
    // Establish the key WITH its window TTL before incrementing: SET NX only
    // creates the counter (at 0) on the first hit of a window, and always with
    // PX. A later INCR bumps it to 1+. This guarantees every created key carries
    // a TTL — the previous INCR-then-pExpire pair could leave a TTL-less key that
    // climbs forever if the process died in the gap (permanently rate-limiting an
    // IP). SET NX preserves an existing counter+TTL, so the window still resets
    // correctly (the key expires and the next hit re-creates it at 0 → 1).
    await this.client.set(k, '0', { PX: windowMs, NX: true });
    const count = await this.client.incr(k);
    return { count };
  }
}

// ── Per-process rate limiter (fallback / non-Valkey) ─────────────────────────

/** A per-process rate-limit bucket keyed by client IP. */
export type RateLimitMap = Map<string, { count: number; resetAt: number }>;

/**
 * Pure per-process token check against `map`. Returns true if the request is
 * allowed. Shared by the InMemoryStore-mode limiter in cli.ts AND by the
 * degraded fallback when the Valkey INCR fails, so both paths are exercised by
 * one testable seam.
 *
 * `maxReq` is a parameter (not a constant) precisely so the degraded fallback
 * can pass a LOWER ceiling than the normal per-process limit: during a Valkey
 * outage the per-process map is not shared, so across N replicas the effective
 * aggregate limit is maxReq×N. Passing a conservative fallback ceiling keeps
 * that aggregate tight while the shared limiter is blind.
 */
export function checkRateLimitInMap(
  ip: string,
  map: RateLimitMap,
  opts: { maxReq: number; windowMs: number; maxIps: number },
): boolean {
  const now = Date.now();
  const entry = map.get(ip);
  if (!entry) {
    if (map.size >= opts.maxIps) {
      for (const [k, v] of map) if (v.resetAt < now) map.delete(k);
      if (map.size >= opts.maxIps) return false;
    }
    map.set(ip, { count: 1, resetAt: now + opts.windowMs });
    return true;
  }
  if (entry.resetAt < now) {
    entry.count = 1;
    entry.resetAt = now + opts.windowMs;
    return true;
  }
  if (entry.count >= opts.maxReq) return false;
  entry.count++;
  return true;
}
