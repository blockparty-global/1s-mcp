/**
 * Single source of truth for "how many tools of category X are registered."
 *
 * Every count-bearing file (README.md, README.npm.md, package.json,
 * server.json, plugin.json, marketplace.json, manifest.json — see
 * tool-count-sites.json) is checked against these numbers rather than
 * against each other, so a drift between two prose files is caught the same
 * way as a drift between prose and code (playbook §7 lesson 27: "every count
 * written by hand becomes a pull request. Guard: generate or assert.").
 *
 * `1s_payment_mode` / `1s_refund` are split out of api-mcp's single `chain`
 * ToolDef category by name (not by a `category` field — api-mcp doesn't
 * subdivide further) because every prose file in this repo presents them as
 * their own "Payments" section, distinct from the read-only chain-utility
 * tools; see skills/mcp/README.md in the sre-services repo for the same
 * split made the same way.
 */
import { allTools } from '@one-source/api-mcp/tools';
import { STDIO_ONLY_API_TOOL_NAMES } from './register-api-tools.js';
import { DOCS_TOOL_NAMES, OPS_TOOL_NAMES } from './register-docs-tools.js';
import { BUG_REPORT_TOOL_NAMES } from './register-bug-report-tool.js';
import { expectedToolCount } from './create-server.js';

export interface ActualToolCounts {
  /** Total tools registered on the stdio transport (package.json / server.json / plugin.json / marketplace.json count). */
  total: number;
  /** Total tools registered on the HTTP transport (2 fewer: the wallet-singleton tools are stdio-only). */
  totalHttp: number;
  live: number;
  chainUtils: number;
  payments: number;
  deepstate: number;
  standard: number;
  /** Pure documentation lookup tools (excludes 1s_setup_check / 1s_batch_config). */
  docs: number;
  /** 1s_setup_check + 1s_batch_config + 1s_report_bug. */
  setup: number;
}

export function actualToolCounts(): ActualToolCounts {
  const byCategory: Record<string, number> = {};
  let payments = 0;
  for (const tool of allTools) {
    if (STDIO_ONLY_API_TOOL_NAMES.includes(tool.name)) {
      payments++;
      continue;
    }
    byCategory[tool.category] = (byCategory[tool.category] ?? 0) + 1;
  }

  const counts = {
    total: expectedToolCount('stdio'),
    totalHttp: expectedToolCount('http'),
    live: byCategory.live ?? 0,
    chainUtils: byCategory.chain ?? 0,
    payments,
    deepstate: byCategory.deepstate ?? 0,
    standard: byCategory.standard ?? 0,
    docs: DOCS_TOOL_NAMES.length,
    setup: OPS_TOOL_NAMES.length + BUG_REPORT_TOOL_NAMES.length,
  };

  const categorizedTotal = counts.live + counts.chainUtils + counts.payments
    + counts.deepstate + counts.standard + counts.docs + counts.setup;
  if (categorizedTotal !== counts.total) {
    throw new Error(`Tool categories sum to ${categorizedTotal}, but the stdio server registers ${counts.total}.`);
  }

  return counts;
}
