/**
 * Unit tests for 1s_setup_check's "Current configuration" wallet-state lines —
 * the logic this PR fixes: a wallet rail must report *set but ignored* (not
 * *not set*) when a key is present in the environment but an API key takes
 * precedence, and the "both set" warning must agree with the per-rail lines.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mutable payment-info the mocked api-mcp payment layer returns per test.
const h = vi.hoisted(() => ({
  info: {
    enabled: false,
    mode: 'x402-exact',
    x402: { enabled: false, address: undefined as string | undefined, batchAvailable: false },
    mpp: { enabled: false, address: undefined as string | undefined, sessionAvailable: false },
    availableModes: [] as string[],
  },
}));

vi.mock('@one-source/api-mcp/payment', () => ({
  getPaymentModeInfo: () => h.info,
  setPaymentMode: vi.fn(),
}));

import { registerDocsTools } from './register-docs-tools.js';

type Handler = (input: unknown, extra: { sessionId?: string }) => Promise<{
  content: { type: string; text: string }[];
}>;

const WALLET_ENV = ['ONESOURCE_API_KEY', 'X402_PRIVATE_KEY', 'MPP_PRIVATE_KEY'] as const;

function captureSetupCheck(authMethod: 'api_key' | 'x402' | 'mpp' | 'none') {
  const handlers = new Map<string, Handler>();
  const server = {
    registerTool: (name: string, _def: unknown, handler: Handler) => handlers.set(name, handler),
    server: { getClientVersion: () => ({ name: 'test', version: '1' }) },
  };
  registerDocsTools({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    server: server as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    analytics: { trackTool: vi.fn() } as any,
    transport: 'stdio',
    authMethod,
  });
  const handler = handlers.get('1s_setup_check');
  if (!handler) throw new Error('1s_setup_check not registered');
  return handler;
}

async function runText(handler: Handler): Promise<string> {
  const res = await handler({}, { sessionId: 's' });
  return res.content.map((c) => c.text).join('\n');
}

beforeEach(() => {
  // No network: the npm-registry/backend probes fail closed (caught).
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
  for (const k of WALLET_ENV) delete process.env[k];
  h.info = {
    enabled: false,
    mode: 'x402-exact',
    x402: { enabled: false, address: undefined, batchAvailable: false },
    mpp: { enabled: false, address: undefined, sessionAvailable: false },
    availableModes: [],
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of WALLET_ENV) delete process.env[k];
  vi.clearAllMocks();
});

describe('1s_setup_check wallet state', () => {
  it('reports *not set* when no wallet key is present', async () => {
    const text = await runText(captureSetupCheck('none'));
    const x402Line = text.split('\n').find((l) => l.includes('x402 (Base) wallet:')) ?? '';
    const mppLine = text.split('\n').find((l) => l.includes('MPP (Tempo) wallet:')) ?? '';
    expect(x402Line).toContain('not set');
    expect(mppLine).toContain('not set');
    expect(text).not.toContain('set but ignored');
  });

  it('shows the wallet address when the rail is active', async () => {
    h.info.x402 = { enabled: true, address: '0xBaseWa11et', batchAvailable: true };
    const text = await runText(captureSetupCheck('x402'));
    expect(text).toContain('0xBaseWa11et');
  });

  it('reports *set but ignored* (not *not set*) when an API key shadows a wallet key', async () => {
    // API key wins, wallet rails never init (x402.enabled=false) but the env key IS present.
    process.env.ONESOURCE_API_KEY = 'sk_test_123456';
    process.env.X402_PRIVATE_KEY = '0x' + 'ab'.repeat(32);
    const text = await runText(captureSetupCheck('api_key'));

    expect(text).toContain('set but ignored');
    // The "both set" warning must fire, agreeing with the per-rail line.
    expect(text).toContain('Both an API key and a wallet key are set');
    // Regression guard: the x402 wallet line specifically must not say "not set".
    const x402Line = text.split('\n').find((l) => l.includes('x402 (Base) wallet:')) ?? '';
    expect(x402Line).not.toContain('not set');
  });
});
