/**
 * TOOL_META <-> api-mcp parity.
 *
 * scripts/validate-mcp.mjs already runs these checks against the *built*
 * dist/ output (its checks 1 and 2b) — this is the same assertion available
 * as an ordinary vitest test against source, so it runs on `npm test`
 * without requiring a prior build, and fails with a normal vitest diff
 * instead of a script's console.error list.
 *
 * Skips (rather than failing) when @one-source/api-mcp isn't resolvable —
 * e.g. a partial checkout — per the task's "skip with a message otherwise."
 */
import { describe, it, expect } from 'vitest';

let apiMcpAvailable = true;
let allToolNames: string[] = [];
try {
  const { allTools } = await import('@one-source/api-mcp/tools');
  allToolNames = allTools.map((t: { name: string }) => t.name);
} catch {
  apiMcpAvailable = false;
}

const describeOrSkip = apiMcpAvailable ? describe : describe.skip;

if (!apiMcpAvailable) {
  console.warn('[tool-meta-api-mcp-parity] @one-source/api-mcp is not resolvable — skipping TOOL_META parity test');
}

describeOrSkip('TOOL_META rows match every registered api-mcp tool', () => {
  it('has a TOOL_META row for every api-mcp tool (no missing rows)', async () => {
    const { TOOL_META } = await import('./register-api-tools.js');
    const missing = allToolNames.filter((name) => !TOOL_META[name]);
    expect(missing, `api-mcp tools with no TOOL_META row: ${missing.join(', ')}`).toEqual([]);
  });

  it('has no orphaned TOOL_META rows (no stale entries for tools api-mcp no longer registers)', async () => {
    const { TOOL_META } = await import('./register-api-tools.js');
    const apiToolNameSet = new Set(allToolNames);
    const orphaned = Object.keys(TOOL_META).filter((name) => !apiToolNameSet.has(name));
    expect(orphaned, `TOOL_META rows with no matching api-mcp tool: ${orphaned.join(', ')}`).toEqual([]);
  });
});
