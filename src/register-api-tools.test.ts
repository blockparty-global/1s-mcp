import { describe, expect, it } from 'vitest';
import { createMcpServer } from './create-server.js';
import type { Analytics } from './analytics.js';

const ADDRESS = `0x${'1'.repeat(40)}`;

function registeredMultiBalanceTool(): {
  description: string;
  inputSchema: { safeParse(input: unknown): { success: boolean } };
} {
  const analytics = new Proxy({}, { get: () => () => {} }) as Analytics;
  const { server } = createMcpServer({ analytics });
  const registered = (server as unknown as {
    _registeredTools: Record<string, {
      description: string;
      inputSchema: { safeParse(input: unknown): { success: boolean } };
    }>;
  })._registeredTools;
  return registered['1s_multi_balance_live'];
}

describe('1s_multi_balance_live registration contract', () => {
  it('accepts at most 20 caller-supplied token addresses', () => {
    const tool = registeredMultiBalanceTool();
    const twenty = Array(20).fill(ADDRESS).join(',');
    const twentyOne = Array(21).fill(ADDRESS).join(',');

    expect(tool.inputSchema.safeParse({ address: ADDRESS, tokens: twenty }).success).toBe(true);
    expect(tool.inputSchema.safeParse({ address: ADDRESS, tokens: twentyOne }).success).toBe(false);
  });

  it('describes the bounded query without implying discovery or aggregation', () => {
    const { description } = registeredMultiBalanceTool();

    expect(description).toContain('up to 20 caller-supplied ERC20 contract addresses');
    expect(description).toContain('Tokens are queried, not discovered');
    expect(description).toContain('does not calculate a portfolio value');
    expect(description).toContain('exceeding the 20-token cap rejects the request');
  });
});
