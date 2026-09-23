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
let allToolsByName: Record<string, { description: string }> = {};
try {
  const { allTools } = await import('@one-source/api-mcp/tools');
  allToolNames = allTools.map((t: { name: string }) => t.name);
  allToolsByName = Object.fromEntries(allTools.map((t: { name: string; description: string }) => [t.name, t]));
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

  /**
   * DESCRIPTION_OVERRIDE exists to fix a tool's registered description ahead
   * of an api-mcp publish (see the comments above MULTI_BALANCE_DESCRIPTION
   * and DS_MAKERS_DESCRIPTION/DS_MARKETS_DESCRIPTION in register-api-tools.ts).
   * Once api-mcp actually ships the same wording, an override that still
   * matches word-for-word is dead code shadowing upstream forever — this had
   * gone unchecked for MULTI_BALANCE_DESCRIPTION since 5.11.0. Assert every
   * override still *differs* from the currently-installed upstream
   * description, so a dependency bump that catches up makes this fail loudly
   * instead of silently.
   */
  it('every DESCRIPTION_OVERRIDE still differs from the installed api-mcp description (fails loudly once upstream catches up, instead of shadowing it silently)', async () => {
    const { DESCRIPTION_OVERRIDE } = await import('./register-api-tools.js');
    const stillRedundant = Object.entries(DESCRIPTION_OVERRIDE)
      .filter(([name, overrideText]) => allToolsByName[name]?.description === overrideText)
      .map(([name]) => name);
    expect(
      stillRedundant,
      `DESCRIPTION_OVERRIDE entries that now match upstream verbatim and should be dropped: ${stillRedundant.join(', ')}`,
    ).toEqual([]);
  });
});
