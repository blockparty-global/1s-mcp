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
import { DOCS_TOOL_COUNT } from './register-docs-tools.js';
import { expectedToolCount } from './create-server.js';

const PAYMENT_TOOL_NAMES = new Set(['1s_payment_mode', '1s_refund']);
/** The two operational tools registerDocsTools() also owns (not documentation lookups). */
const SETUP_DOC_TOOL_COUNT = 2; // 1s_setup_check, 1s_batch_config

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
  for (const tool of allTools) {
    if (PAYMENT_TOOL_NAMES.has(tool.name)) continue;
    byCategory[tool.category] = (byCategory[tool.category] ?? 0) + 1;
  }

  return {
    total: expectedToolCount('stdio'),
    totalHttp: expectedToolCount('http'),
    live: byCategory.live ?? 0,
    chainUtils: byCategory.chain ?? 0,
    payments: PAYMENT_TOOL_NAMES.size,
    deepstate: byCategory.deepstate ?? 0,
    standard: byCategory.standard ?? 0,
    docs: DOCS_TOOL_COUNT - SETUP_DOC_TOOL_COUNT,
    setup: SETUP_DOC_TOOL_COUNT + 1, // + 1s_report_bug
  };
}
