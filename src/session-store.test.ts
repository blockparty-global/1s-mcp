import { describe, it, expect } from 'vitest';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  InMemoryStore,
  ValkeyStore,
  CapacityError,
  redactRedisUrl,
  checkRateLimitInMap,
  type RateLimitMap,
  type RedisLikeClient,
  type AuthStateEntry,
  type PendingCodeEntry,
} from './session-store.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function authEntry(overrides: Partial<AuthStateEntry> = {}): AuthStateEntry {
  return {
    codeChallenge: 'x'.repeat(43),
    redirectUri: 'https://claude.ai/callback',
    clientId: 'client-1',
    clientState: 'cs',
    expiresAt: Date.now() + 120_000,
    ...overrides,
  };
}

function pendingEntry(overrides: Partial<PendingCodeEntry> = {}): PendingCodeEntry {
  return {
    encryptedApiKey: 'iv.ct.tag',
    codeChallenge: 'x'.repeat(43),
    redirectUri: 'https://claude.ai/callback',
    clientId: 'client-1',
    expiresAt: Date.now() + 120_000,
    ...overrides,
  };
}

// Which ops a fake should reject, to simulate a Valkey blip on that op.
type RejectOps = Partial<Record<'set' | 'get' | 'getDel' | 'incr' | 'connect' | 'ping', boolean>>;

// A minimal in-process fake of the node-redis v4 surface ValkeyStore uses, so
// ValkeyStore's op logic (GETDEL single-use, SET-NX + INCR window) is testable
// without a live server. It does NOT model TTL expiry — the store relies on
// native PX for that, which is a Valkey guarantee, not our logic to test here.
// `ttl` records the PX set on each key so tests can assert a TTL was attached.
// `reject` tells the fake to throw on named ops, simulating a transient blip.
type FakeRedis = RedisLikeClient & {
  store: Map<string, string>;
  ttl: Map<string, number>;
};
function makeFakeRedis(reject: RejectOps = {}): FakeRedis {
  const store = new Map<string, string>();
  const ttl = new Map<string, number>();
  const boom = (op: string) => { throw new Error(`fake redis: ${op} rejected`); };
  return {
    store,
    ttl,
    async connect() { if (reject.connect) boom('connect'); return undefined; },
    async ping() { if (reject.ping) boom('ping'); return 'PONG'; },
    async set(key: string, value: string, opts: { PX: number; NX?: boolean }) {
      if (reject.set) boom('set');
      // Honor NX: only create if absent (matches SET ... NX semantics).
      if (opts?.NX && store.has(key)) return null;
      store.set(key, value);
      if (opts?.PX !== undefined) ttl.set(key, opts.PX);
      return 'OK';
    },
    async get(key: string) { if (reject.get) boom('get'); return store.has(key) ? store.get(key)! : null; },
    async getDel(key: string) {
      if (reject.getDel) boom('getDel');
      if (!store.has(key)) return null;
      const v = store.get(key)!;
      store.delete(key);
      return v;
    },
    async incr(key: string) {
      if (reject.incr) boom('incr');
      const n = parseInt(store.get(key) ?? '0', 10) + 1;
      store.set(key, String(n));
      return n;
    },
    on() { return this; },
  };
}

// ── (a) Single-use consume ───────────────────────────────────────────────────

describe('InMemoryStore — single-use consume', () => {
  it('takeAuthState returns the entry once, then null', async () => {
    const store = new InMemoryStore();
    await store.setAuthState('s1', authEntry(), 120_000);
    const first = await store.takeAuthState('s1');
    expect(first).not.toBeNull();
    expect(first?.clientId).toBe('client-1');
    expect(await store.takeAuthState('s1')).toBeNull();
  });

  it('takePendingCode returns the entry once, then null', async () => {
    const store = new InMemoryStore();
    await store.setPendingCode('c1', pendingEntry(), 120_000);
    expect(await store.takePendingCode('c1')).not.toBeNull();
    expect(await store.takePendingCode('c1')).toBeNull();
  });

  it('takeStateCookie returns the hash once, then null', async () => {
    const store = new InMemoryStore();
    await store.setStateCookie('s1', 'deadbeef', 60_000);
    expect(await store.takeStateCookie('s1')).toBe('deadbeef');
    expect(await store.takeStateCookie('s1')).toBeNull();
  });

  it('getAuthState is non-consuming (peek); expired entry returns null', async () => {
    const store = new InMemoryStore();
    await store.setAuthState('s1', authEntry(), 120_000);
    expect(await store.getAuthState('s1')).not.toBeNull();
    expect(await store.getAuthState('s1')).not.toBeNull(); // still there
    await store.setAuthState('s2', authEntry({ expiresAt: Date.now() - 1 }), 120_000);
    expect(await store.getAuthState('s2')).toBeNull();
  });
});

describe('ValkeyStore (fake client) — single-use consume', () => {
  it('takeAuthState uses GETDEL: entry once, then null', async () => {
    const store = ValkeyStore.fromClient(makeFakeRedis());
    await store.setAuthState('s1', authEntry(), 120_000);
    expect(await store.takeAuthState('s1')).not.toBeNull();
    expect(await store.takeAuthState('s1')).toBeNull();
  });

  it('takePendingCode uses GETDEL: entry once, then null', async () => {
    const store = ValkeyStore.fromClient(makeFakeRedis());
    await store.setPendingCode('c1', pendingEntry(), 120_000);
    expect(await store.takePendingCode('c1')).not.toBeNull();
    expect(await store.takePendingCode('c1')).toBeNull();
  });

  it('getStateCookie peeks without consuming; takeStateCookie consumes', async () => {
    const store = ValkeyStore.fromClient(makeFakeRedis());
    await store.setStateCookie('s1', 'abc123', 60_000);
    expect(await store.getStateCookie('s1')).toBe('abc123');
    expect(await store.getStateCookie('s1')).toBe('abc123'); // still there
    expect(await store.takeStateCookie('s1')).toBe('abc123');
    expect(await store.takeStateCookie('s1')).toBeNull();
  });
});

// ── (b) Concurrent double-submit race ────────────────────────────────────────

describe('concurrent double-submit — exactly one winner', () => {
  it('InMemoryStore: two simultaneous takeAuthState → one entry, one null', async () => {
    const store = new InMemoryStore();
    await store.setAuthState('s1', authEntry(), 120_000);
    const [a, b] = await Promise.all([store.takeAuthState('s1'), store.takeAuthState('s1')]);
    const winners = [a, b].filter((x) => x !== null);
    expect(winners).toHaveLength(1);
    expect([a, b].filter((x) => x === null)).toHaveLength(1);
  });

  it('InMemoryStore: two simultaneous takePendingCode → one entry, one null', async () => {
    const store = new InMemoryStore();
    await store.setPendingCode('c1', pendingEntry(), 120_000);
    const [a, b] = await Promise.all([store.takePendingCode('c1'), store.takePendingCode('c1')]);
    expect([a, b].filter((x) => x !== null)).toHaveLength(1);
    expect([a, b].filter((x) => x === null)).toHaveLength(1);
  });

  it('ValkeyStore (fake): two simultaneous takeAuthState → one entry, one null', async () => {
    const store = ValkeyStore.fromClient(makeFakeRedis());
    await store.setAuthState('s1', authEntry(), 120_000);
    const [a, b] = await Promise.all([store.takeAuthState('s1'), store.takeAuthState('s1')]);
    expect([a, b].filter((x) => x !== null)).toHaveLength(1);
    expect([a, b].filter((x) => x === null)).toHaveLength(1);
  });
});

// ── (c) CSRF hashing ─────────────────────────────────────────────────────────

describe('CSRF cookie hashing', () => {
  // Mirrors connect-page.ts: store SHA256(token) hex; verify by hashing the
  // incoming cookie and timingSafeEqual-comparing against the stored hash.
  function hashToken(token: Buffer): string {
    return createHash('sha256').update(token).digest('hex');
  }

  it('stored value is SHA256(token), not the raw token', async () => {
    const store = new InMemoryStore();
    const token = randomBytes(16);
    const hash = hashToken(token);
    await store.setStateCookie('s1', hash, 60_000);
    const stored = await store.getStateCookie('s1');
    expect(stored).toBe(hash);
    expect(stored).not.toBe(token.toString('hex')); // never the raw token
    expect(stored).toHaveLength(64); // SHA256 hex
  });

  it('timingSafeEqual accepts the right cookie and rejects a wrong one', async () => {
    const store = new InMemoryStore();
    const token = randomBytes(16);
    await store.setStateCookie('s1', hashToken(token), 60_000);
    const stored = await store.getStateCookie('s1');
    expect(stored).not.toBeNull();
    const storedBuf = Buffer.from(stored!, 'hex');

    const rightBuf = Buffer.from(hashToken(token), 'hex');
    expect(rightBuf.length === storedBuf.length && timingSafeEqual(rightBuf, storedBuf)).toBe(true);

    const wrongBuf = Buffer.from(hashToken(randomBytes(16)), 'hex');
    expect(wrongBuf.length === storedBuf.length && timingSafeEqual(wrongBuf, storedBuf)).toBe(false);
  });
});

// ── (d) incrRate window / count ──────────────────────────────────────────────

describe('incrRate window and count', () => {
  it('InMemoryStore: increments within a window, resets after it', async () => {
    const store = new InMemoryStore();
    const r1 = await store.incrRate('k', 60_000);
    const r2 = await store.incrRate('k', 60_000);
    const r3 = await store.incrRate('k', 60_000);
    expect(r1.count).toBe(1);
    expect(r2.count).toBe(2);
    expect(r3.count).toBe(3);

    // A window in the past resets the counter to 1.
    const store2 = new InMemoryStore();
    await store2.incrRate('k', -1); // resetAt already in the past
    const after = await store2.incrRate('k', 60_000);
    expect(after.count).toBe(1);
  });

  it('ValkeyStore (fake): INCR increments monotonically', async () => {
    const store = ValkeyStore.fromClient(makeFakeRedis());
    expect((await store.incrRate('k', 60_000)).count).toBe(1);
    expect((await store.incrRate('k', 60_000)).count).toBe(2);
    expect((await store.incrRate('k', 60_000)).count).toBe(3);
  });

  // G2: every created rate key must carry a TTL, established atomically with the
  // key's creation (SET NX PX). The old INCR-then-pExpire could orphan a
  // TTL-less key that climbs forever and permanently rate-limits an IP.
  it('ValkeyStore (fake): first hit creates the key WITH a TTL', async () => {
    const fake = makeFakeRedis();
    const store = ValkeyStore.fromClient(fake);
    const r1 = await store.incrRate('k', 60_000);
    expect(r1.count).toBe(1);
    // The SET NX PX established the window TTL on the very first hit.
    const rlKey = [...fake.ttl.keys()].find((k) => k.endsWith('k'));
    expect(rlKey).toBeDefined();
    expect(fake.ttl.get(rlKey!)).toBeGreaterThan(0);
  });

  it('ValkeyStore (fake): a second hit increments without resetting the TTL', async () => {
    const fake = makeFakeRedis();
    const store = ValkeyStore.fromClient(fake);
    await store.incrRate('k', 60_000);
    const rlKey = [...fake.ttl.keys()].find((k) => k.endsWith('k'))!;
    const ttlAfterFirst = fake.ttl.get(rlKey);
    // Second hit within the window: SET NX is a no-op (key exists), so the TTL
    // must be untouched — the window does not get pushed out.
    const r2 = await store.incrRate('k', 30_000);
    expect(r2.count).toBe(2);
    expect(fake.ttl.get(rlKey)).toBe(ttlAfterFirst);
  });
});

// ── Capacity caps (InMemoryStore parity) ─────────────────────────────────────

describe('InMemoryStore capacity caps', () => {
  it('setAuthState throws CapacityError past MAX_PENDING', async () => {
    const store = new InMemoryStore({ maxPending: 2 });
    await store.setAuthState('a', authEntry(), 120_000);
    await store.setAuthState('b', authEntry(), 120_000);
    await expect(store.setAuthState('c', authEntry(), 120_000)).rejects.toBeInstanceOf(CapacityError);
  });

  it('sweeps expired entries before enforcing the cap', async () => {
    const store = new InMemoryStore({ maxPending: 2 });
    await store.setAuthState('a', authEntry({ expiresAt: Date.now() - 1 }), 120_000);
    await store.setAuthState('b', authEntry(), 120_000);
    // 'a' is expired; the sweep in setAuthState frees room for 'c'.
    await expect(store.setAuthState('c', authEntry(), 120_000)).resolves.toBeUndefined();
  });

  it('setStateCookie throws CapacityError past MAX_STATE_COOKIES', async () => {
    const store = new InMemoryStore({ maxStateCookies: 1 });
    await store.setStateCookie('a', 'h1', 60_000);
    await expect(store.setStateCookie('b', 'h2', 60_000)).rejects.toBeInstanceOf(CapacityError);
  });
});

// ── URL redaction ────────────────────────────────────────────────────────────

describe('redactRedisUrl', () => {
  it('redacts the password', () => {
    expect(redactRedisUrl('redis://:supersecret@valkey.mcp.svc:6379')).not.toContain('supersecret');
  });

  it('keeps the host so the log is still useful', () => {
    expect(redactRedisUrl('redis://:pw@valkey.mcp.svc:6379')).toContain('valkey.mcp.svc');
  });

  it('redacts even a non-parseable URL', () => {
    expect(redactRedisUrl('not a url :pw@host')).not.toContain('pw@host');
  });

  // G5: ValkeyStore.connect wraps a connection failure as
  //   `Valkey connection failed (<redactRedisUrl(url)>): <reason>`
  // — assert the surfaced message is password-free. We reproduce the exact
  // message ValkeyStore.connect builds (a rejecting ping) so no live Valkey is
  // needed; the load-bearing part is that the URL is passed through
  // redactRedisUrl before it can reach a log or an error surface.
  it('connect-failure message is built with a redacted (password-free) URL', async () => {
    const url = 'redis://:supersecret@valkey.mcp.svc:6379';
    let reason = '';
    try {
      await makeFakeRedis({ ping: true }).ping();
    } catch (err) {
      reason = err instanceof Error ? err.message : String(err);
    }
    const surfaced = `Valkey connection failed (${redactRedisUrl(url)}): ${reason}`;
    expect(surfaced).not.toContain('supersecret');
    expect(surfaced).toContain('valkey.mcp.svc'); // host kept for diagnostics
  });
});

// ── G3: JSON.parse guard — corrupt/wrong-shape stored value fails closed ──────

describe('ValkeyStore — corrupt stored entry fails closed (returns null)', () => {
  const authKey = 'mcp:oauth:authstate:s1';
  const pendingKey = 'mcp:oauth:pending:c1';

  it('getAuthState returns null for a non-JSON value instead of throwing', async () => {
    const fake = makeFakeRedis();
    fake.store.set(authKey, 'not-json{{{');
    const store = ValkeyStore.fromClient(fake);
    await expect(store.getAuthState('s1')).resolves.toBeNull();
  });

  it('takeAuthState returns null for a wrong-shape object', async () => {
    const fake = makeFakeRedis();
    fake.store.set(authKey, JSON.stringify({ foo: 'bar' })); // missing known fields
    const store = ValkeyStore.fromClient(fake);
    await expect(store.takeAuthState('s1')).resolves.toBeNull();
  });

  it('takePendingCode returns null for a non-JSON value', async () => {
    const fake = makeFakeRedis();
    fake.store.set(pendingKey, ' partial');
    const store = ValkeyStore.fromClient(fake);
    await expect(store.takePendingCode('c1')).resolves.toBeNull();
  });

  it('takePendingCode returns null for an object missing encryptedApiKey', async () => {
    const fake = makeFakeRedis();
    // Shape valid for authState but NOT pendingCode (no encryptedApiKey).
    fake.store.set(pendingKey, JSON.stringify({
      codeChallenge: 'x', redirectUri: 'https://claude.ai', clientId: 'c',
    }));
    const store = ValkeyStore.fromClient(fake);
    await expect(store.takePendingCode('c1')).resolves.toBeNull();
  });

  it('a valid entry still round-trips (guard does not over-reject)', async () => {
    const fake = makeFakeRedis();
    const store = ValkeyStore.fromClient(fake);
    await store.setAuthState('s1', authEntry(), 120_000);
    const got = await store.getAuthState('s1');
    expect(got?.clientId).toBe('client-1');
  });
});

// ── G1: store-error propagation contract the handlers rely on ─────────────────

describe('ValkeyStore — store errors propagate (handlers map these to 503)', () => {
  it('getStateCookie rejects when the underlying get rejects', async () => {
    const store = ValkeyStore.fromClient(makeFakeRedis({ get: true }));
    await expect(store.getStateCookie('s1')).rejects.toThrow();
  });

  it('setPendingCode rejects when the underlying set rejects', async () => {
    const store = ValkeyStore.fromClient(makeFakeRedis({ set: true }));
    await expect(store.setPendingCode('c1', pendingEntry(), 120_000)).rejects.toThrow();
  });

  it('takePendingCode rejects when the underlying getDel rejects', async () => {
    const store = ValkeyStore.fromClient(makeFakeRedis({ getDel: true }));
    await expect(store.takePendingCode('c1')).rejects.toThrow();
  });
});

// ── G6: degraded per-process fallback still enforces a (lower) ceiling ────────

describe('checkRateLimitInMap — degraded fallback ceiling', () => {
  const opts = { maxReq: 5, windowMs: 60_000, maxIps: 10_000 };

  it('allows up to maxReq then rejects (not unlimited)', () => {
    const map: RateLimitMap = new Map();
    const results: boolean[] = [];
    for (let i = 0; i < 7; i++) results.push(checkRateLimitInMap('1.2.3.4', map, opts));
    expect(results.filter((x) => x)).toHaveLength(5); // first 5 allowed
    expect(results.slice(5)).toEqual([false, false]);  // 6th+ rejected
  });

  it('resets after the window elapses', () => {
    const map: RateLimitMap = new Map();
    // Prime an entry already past its window.
    checkRateLimitInMap('1.2.3.4', map, { ...opts, windowMs: -1 });
    expect(checkRateLimitInMap('1.2.3.4', map, opts)).toBe(true); // window rolled over → allowed
  });

  it('a Valkey incr rejection maps to this per-process ceiling (contract)', async () => {
    // Mirrors cli.ts checkRateLimitStore: on store error it calls
    // checkRateLimitInMap with FALLBACK_MAX_REQ rather than going unlimited.
    const store = ValkeyStore.fromClient(makeFakeRedis({ set: true, incr: true }));
    await expect(store.incrRate('submit:1.2.3.4', 60_000)).rejects.toThrow();
    // The fallback the handler then invokes enforces the lower ceiling:
    const map: RateLimitMap = new Map();
    let allowed = 0;
    for (let i = 0; i < 10; i++) if (checkRateLimitInMap('1.2.3.4', map, opts)) allowed++;
    expect(allowed).toBe(5);
  });
});
