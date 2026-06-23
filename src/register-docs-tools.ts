/**
 * Register docs tools from @one-source/docs-mcp onto a shared McpServer.
 *
 * NOTE: Docs tools are temporarily disabled (product not yet released).
 * Code is commented out for easy re-enable. Only 1s_setup_check remains active.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerRequest, ServerNotification, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { getPaymentModeInfo, setPaymentMode } from '@one-source/api-mcp/payment';
import {
  getBatchPrefs,
  setBatchPrefs,
  resetBatchPrefs,
  batchConfigPath,
  hasPersistedConfig,
  coercePrompt,
  coerceThreshold,
  coerceMultiplier,
  coerceMaxDeposit,
  coerceMode,
  MIN_DEPOSIT_MULTIPLIER,
  type BatchPrefs,
} from './batch-prefs.js';

// import { loadData, type LoadedData } from '@one-source/docs-mcp';
// import { searchDocsSchema, handleSearchDocs } from '@one-source/docs-mcp/tools/search-docs';
// import { getQueryReferenceSchema, handleGetQueryReference } from '@one-source/docs-mcp/tools/get-query-reference';
// import { getTypeDefinitionSchema, handleGetTypeDefinition } from '@one-source/docs-mcp/tools/get-type-definition';
// import { listExamplesSchema, handleListExamples } from '@one-source/docs-mcp/tools/list-examples';
// import { listSupportedChainsSchema, handleListSupportedChains } from '@one-source/docs-mcp/tools/list-supported-chains';
// import { getFilterReferenceSchema, handleGetFilterReference } from '@one-source/docs-mcp/tools/get-filter-reference';
// import { getPaginationGuideSchema, handleGetPaginationGuide } from '@one-source/docs-mcp/tools/get-pagination-guide';
// import { getSchemaOverviewSchema, handleGetSchemaOverview } from '@one-source/docs-mcp/tools/get-schema-overview';
// import { getAuthenticationGuideSchema, handleGetAuthenticationGuide } from '@one-source/docs-mcp/tools/get-authentication-guide';
// import { getMcpSetupGuideSchema, handleGetMcpSetupGuide } from '@one-source/docs-mcp/tools/get-mcp-setup-guide';

import type { Analytics, ToolCallEvent } from './analytics.js';
import { VERSION } from './version.js';

function hashSession(sessionId: string | undefined): string | undefined {
  if (!sessionId) return undefined;
  return createHash('sha256').update(sessionId).digest('hex').slice(0, 16);
}

/**
 * Register an instrumented docs tool — wraps the handler with analytics tracking.
 *
 * Uses `any` for the handler input type because the MCP SDK's overloaded
 * `server.tool()` signature makes generics impractical here. Each handler
 * is still type-safe at its own definition site.
 */
function instrumentedTool(
  server: McpServer,
  analytics: Analytics,
  transport: 'stdio' | 'http' | undefined,
  name: string,
  description: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (input: any) => string | Promise<string>,
  category: ToolCallEvent['category'] = 'docs',
  annotations?: ToolAnnotations,
): void {
  const { title: toolTitle, ...restAnnotations } = annotations ?? {};
  server.registerTool(name, {
    title: toolTitle,
    description,
    inputSchema: schema,
    annotations: restAnnotations,
  }, async (input: Record<string, unknown>, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => {
    const start = performance.now();
    const inputKeys = Object.keys(input);
    const sessionHash = hashSession(extra.sessionId);
    const clientInfo = server.server.getClientVersion();

    const base: Omit<ToolCallEvent, 'success' | 'response_size' | 'error_category' | 'duration_ms'> = {
      type: 'tool_call',
      service: 'onesource-docs',
      tool: name,
      category,
      timestamp: new Date().toISOString(),
      input_params: inputKeys,
      version: VERSION,
      auth_method: 'none',
      client_name: clientInfo?.name,
      client_version: clientInfo?.version,
      session_id: sessionHash,
      transport,
      source: 'unified',
    };

    try {
      const text = await handler(input);
      const durationMs = Math.round(performance.now() - start);

      analytics.trackTool({
        ...base,
        duration_ms: durationMs,
        success: true,
        response_size: text.length,
      });

      return { content: [{ type: 'text' as const, text }] };
    } catch (err: unknown) {
      const durationMs = Math.round(performance.now() - start);
      const message = err instanceof Error ? err.message : String(err);

      analytics.trackTool({
        ...base,
        duration_ms: durationMs,
        success: false,
        error_category: message.slice(0, 100).replace(/0x[a-fA-F0-9]+/g, '0x***'),
        response_size: 0,
      });

      return {
        isError: true,
        content: [{ type: 'text' as const, text: `Tool error: ${message.slice(0, 500).replace(/0x[a-fA-F0-9]+/g, '0x***')}` }],
      };
    }
  });
}

export interface RegisterDocsToolsOptions {
  server: McpServer;
  analytics: Analytics;
  transport?: 'stdio' | 'http';
  // /** Pre-loaded docs data (avoids re-reading files per request in HTTP mode). */
  // data?: LoadedData;
  /** Active authentication method, determined at startup. */
  authMethod?: 'api_key' | 'x402' | 'mpp' | 'none';
  /** Payer wallet address (x402 on Base or MPP on Tempo), when paying via a wallet. */
  x402Address?: string;
}

/**
 * Register all docs tools and return the tool count.
 */
export function registerDocsTools(opts: RegisterDocsToolsOptions): number {
  const { server, analytics, transport } = opts;
  // const { sections, index, schema } = opts.data ?? loadData();

  // instrumentedTool(server, analytics, transport,
  //   'search_docs',
  //   'Search OneSource documentation by keyword. Returns the top 5 matching sections.',
  //   searchDocsSchema.shape,
  //   (input) => handleSearchDocs(input, index),
  // );

  // instrumentedTool(server, analytics, transport,
  //   'get_query_reference',
  //   'Get full reference for a OneSource root GraphQL query — arguments, filters, return type. There are 12 root queries: address, addresses, block, blocks, contract, contracts, nft, nfts, token, tokens, transaction, transactions.',
  //   getQueryReferenceSchema.shape,
  //   (input) => handleGetQueryReference(input, schema),
  // );

  // instrumentedTool(server, analytics, transport,
  //   'get_type_definition',
  //   'Get the schema definition for a GraphQL type, enum, scalar, input, or interface. Returns fields, values, and descriptions.',
  //   getTypeDefinitionSchema.shape,
  //   (input) => handleGetTypeDefinition(input, schema),
  // );

  // instrumentedTool(server, analytics, transport,
  //   'list_examples',
  //   'List or search working GraphQL examples. Without a topic, returns a summary of all available examples. With a topic, returns full example content matching that keyword.',
  //   listExamplesSchema.shape,
  //   (input) => handleListExamples(input, sections),
  // );

  // instrumentedTool(server, analytics, transport,
  //   'list_supported_chains',
  //   'List all blockchain networks supported by OneSource with endpoint URLs.',
  //   listSupportedChainsSchema.shape,
  //   () => handleListSupportedChains(),
  // );

  // instrumentedTool(server, analytics, transport,
  //   'get_filter_reference',
  //   'Get all filter fields and operators for a list query (e.g. transactions, tokens).',
  //   getFilterReferenceSchema.shape,
  //   (input) => handleGetFilterReference(input, schema),
  // );

  // instrumentedTool(server, analytics, transport,
  //   'get_pagination_guide',
  //   'Get the cursor-based pagination pattern with examples for a list query.',
  //   getPaginationGuideSchema.shape,
  //   (input) => handleGetPaginationGuide(input, schema),
  // );

  // instrumentedTool(server, analytics, transport,
  //   'get_schema_overview',
  //   'Get a high-level summary of the entire GraphQL schema — all queries, types, enums, and scalars.',
  //   getSchemaOverviewSchema.shape,
  //   () => handleGetSchemaOverview(schema),
  // );

  // instrumentedTool(server, analytics, transport,
  //   'get_authentication_guide',
  //   'Get the authentication guide — API key format, endpoints, headers, and common mistakes.',
  //   getAuthenticationGuideSchema.shape,
  //   () => handleGetAuthenticationGuide(),
  // );

  // instrumentedTool(server, analytics, transport,
  //   'get_mcp_setup_guide',
  //   'Get the MCP installation and setup guide — quickstart, per-client instructions, authentication (API key or x402), configuration, and individual MCP packages. Use the topic parameter to focus on a specific area.',
  //   getMcpSetupGuideSchema.shape,
  //   (input) => handleGetMcpSetupGuide(input, sections),
  // );

  let count = 0;
  const authMethod = opts.authMethod;
  const x402Address = opts.x402Address;
  instrumentedTool(server, analytics, transport,
    '1s_setup_check',
    'Check OneSource MCP server health — version (current vs latest), authentication status (API key, x402, or MPP), payment-channel status for each enabled rail, API connectivity, and setup instructions if anything is missing. Free, no authentication required. Call this first when troubleshooting.',
    {},
    async () => {
      const parts: string[] = [];

      // 1. Server version
      parts.push('## Server Version\n');
      parts.push(`Current: ${VERSION}`);

      let latestVersion = 'unknown';
      try {
        const res = await fetch('https://registry.npmjs.org/@one-source/mcp/latest', {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json() as { version: string };
          latestVersion = data.version;
        }
      } catch { /* network error — skip */ }

      parts.push(`Latest:  ${latestVersion}`);
      if (latestVersion !== 'unknown' && latestVersion !== VERSION) {
        parts.push('\n**Update available!** Run: `npx -y @one-source/mcp@latest`');
      } else if (latestVersion === VERSION) {
        parts.push('\nYou are on the latest version.');
      }

      // 2. Authentication status
      parts.push('\n## Authentication\n');

      const runtimeApiKey = process.env.ONESOURCE_API_KEY;
      const runtimeX402Key = process.env.X402_PRIVATE_KEY;
      const runtimeMppKey = process.env.MPP_PRIVATE_KEY;
      const bothSet = !!(runtimeApiKey && (runtimeX402Key || runtimeMppKey));
      // Use authMethod from startup; fall back to runtime env check for robustness
      const activeMethod = authMethod ?? (runtimeApiKey ? 'api_key' : runtimeX402Key ? 'x402' : runtimeMppKey ? 'mpp' : 'none');
      const payInfo = getPaymentModeInfo();
      // Both rails are reported at equal depth, independent of which is primary.
      // (When an API key is active, setupPayments is skipped so both read false —
      // the wallet keys are intentionally ignored; see the bothSet warning.)
      const x402Enabled = payInfo.x402.enabled;
      const mppEnabled = payInfo.mpp.enabled;

      if (activeMethod === 'api_key') {
        parts.push('Status: **Configured (API key)**');
        const keyPreview = runtimeApiKey?.trim().slice(0, 6);
        if (keyPreview) {
          parts.push(`Key: \`${keyPreview}••••••\``);
        }
        if (bothSet) {
          parts.push('\n⚠️ Both `ONESOURCE_API_KEY` and `X402_PRIVATE_KEY` are set. API key takes priority; x402 is not used.');
        }
        parts.push('\nAPI key authentication is active. Blockchain API tools are ready to use.');
        parts.push('\n> **If this key was not explicitly set in your Claude MCP config**, it may be inherited from your shell environment. Run `echo $ONESOURCE_API_KEY` in your terminal to check.');
      } else if (activeMethod === 'x402') {
        parts.push('Status: **Configured (x402)**');
        const addr = x402Address ?? payInfo.x402.address;
        if (addr) {
          parts.push(`Wallet: \`${addr}\``);
        }
        parts.push('\nThis wallet must hold USDC on the **Base** network to pay for API calls.');
        parts.push('\n> **If this key was not explicitly set in your Claude MCP config**, it may be inherited from your shell environment. Run `echo $X402_PRIVATE_KEY` in your terminal to check.');
        if (mppEnabled) {
          const mppAddr = payInfo.mpp.address;
          parts.push(`\nAlso available: **MPP (Tempo)**${mppAddr ? ` — wallet \`${mppAddr}\`` : ''} (must hold USDC.e or pathUSD on Tempo). Switch with \`1s_payment_mode { "mode": "mpp-charge" }\` or \`{ "mode": "mpp-session" }\`.`);
        }
      } else if (activeMethod === 'mpp') {
        parts.push('Status: **Configured (MPP / Tempo)**');
        const addr = payInfo.mpp.address ?? x402Address;
        if (addr) {
          parts.push(`Wallet: \`${addr}\``);
        }
        parts.push('\nThis wallet must hold **USDC.e or pathUSD on the Tempo network** to pay for API calls.');
        parts.push('Two modes are available via `1s_payment_mode`: `mpp-charge` (per-call) and `mpp-session` (a voucher channel — cheaper for a burst of calls; reclaim the unspent deposit with `1s_refund`, or it settles automatically on shutdown).');
        parts.push('\n> **If this key was not explicitly set in your Claude MCP config**, it may be inherited from your shell environment. Run `echo $MPP_PRIVATE_KEY` in your terminal to check.');
        if (x402Enabled) {
          const x402Addr = payInfo.x402.address;
          parts.push(`\nAlso available: **x402 (Base)**${x402Addr ? ` — wallet \`${x402Addr}\`` : ''} (must hold USDC on Base). Switch with \`1s_payment_mode { "mode": "x402-exact" }\` or \`{ "mode": "x402-batch" }\`.`);
        }
      } else {
        parts.push('Status: **Not configured**');
        parts.push('\nBlockchain API tools require authentication. Choose one of the options below.\n');

        parts.push('### Option 1: API Key (recommended)\n');
        parts.push('Set `ONESOURCE_API_KEY` with your OneSource API key.\n');
        parts.push('**Claude Code:**');
        parts.push('```');
        parts.push('claude mcp remove onesource');
        parts.push('claude mcp add onesource -e ONESOURCE_API_KEY=<key> -- npx -y @one-source/mcp@latest');
        parts.push('```\n');
        parts.push('**Claude Desktop / Cursor:**');
        parts.push('```json');
        parts.push('{');
        parts.push('  "mcpServers": {');
        parts.push('    "onesource": {');
        parts.push('      "command": "npx",');
        parts.push('      "args": ["-y", "@one-source/mcp@latest"],');
        parts.push('      "env": { "ONESOURCE_API_KEY": "<key>" }');
        parts.push('    }');
        parts.push('  }');
        parts.push('}');
        parts.push('```\n');
        parts.push('**Any MCP client (stdio):**');
        parts.push('```');
        parts.push('ONESOURCE_API_KEY=<key> npx -y @one-source/mcp@latest');
        parts.push('```\n');

        parts.push('### Option 2: x402 Micropayments\n');
        parts.push('Set `X402_PRIVATE_KEY` with an EVM private key (64-char hex, `0x` prefix optional) funded with USDC on Base.\n');
        parts.push('1. **Get an EVM private key** — export from MetaMask, Coinbase Wallet, or generate one.');
        parts.push('   ```');
        parts.push('   # macOS/Linux or Git Bash on Windows');
        parts.push('   echo "0x$(openssl rand -hex 32)"');
        parts.push('   ```\n');
        parts.push('2. **Fund the wallet** with USDC on the **Base** network (not Ethereum mainnet).\n');
        parts.push('3. **Set the key:**\n');
        parts.push('   **Claude Code:**');
        parts.push('   ```');
        parts.push('   claude mcp remove onesource');
        parts.push('   claude mcp add onesource -e X402_PRIVATE_KEY=0x... -- npx -y @one-source/mcp@latest');
        parts.push('   ```\n');
        parts.push('   **Claude Desktop / Cursor:**');
        parts.push('   ```json');
        parts.push('   {');
        parts.push('     "mcpServers": {');
        parts.push('       "onesource": {');
        parts.push('         "command": "npx",');
        parts.push('         "args": ["-y", "@one-source/mcp@latest"],');
        parts.push('         "env": { "X402_PRIVATE_KEY": "0x..." }');
        parts.push('       }');
        parts.push('     }');
        parts.push('   }');
        parts.push('   ```\n');
        parts.push('   **Any MCP client (stdio):**');
        parts.push('   ```');
        parts.push('   X402_PRIVATE_KEY=0x... npx -y @one-source/mcp@latest');
        parts.push('   ```\n');
        parts.push('4. **Reload the MCP server** — run `/reload-plugins` in Claude Code, or restart Claude Desktop / Cursor.\n');

        parts.push('### Option 3: MPP Micropayments (Tempo)\n');
        parts.push('Set `MPP_PRIVATE_KEY` with an EVM private key funded with **USDC.e or pathUSD on the Tempo network**. Pays per call on Tempo rails (an alternative to x402 on Base).\n');
        parts.push('```');
        parts.push('MPP_PRIVATE_KEY=0x... npx -y @one-source/mcp@latest');
        parts.push('```');
        parts.push('Optional: `MPP_PAYMENT_MODE` (`charge` default | `session`), `MPP_MAX_DEPOSIT` (session deposit cap, default `1`). Switch modes in-session with `1s_payment_mode { "mode": "mpp-session" }`.\n');

        parts.push('**Security:** Never commit keys to source control. Use environment variables or a secrets manager.\n');
      }

      // 2b. Payment channels — both rails reported at equal depth: x402 batch
      // settlement (Base) and MPP session channels (Tempo). Each subsection is
      // rendered whenever its rail is enabled, regardless of which is primary.
      parts.push('\n## Payment Channels\n');

      if (x402Enabled || mppEnabled) {
        // prompt/threshold are rail-agnostic (anticipated-call autonomy); shared
        // by both subsections. mppMaxDeposit/depositMultiplier are rail-specific.
        const prefs = getBatchPrefs();
        const persisted = hasPersistedConfig();

        parts.push(`Active payment mode: **${payInfo.mode}**.`);

        if (x402Enabled) {
          parts.push('\n### Batch Settlement (x402 on Base)\n');
          if (payInfo.x402.batchAvailable) {
            parts.push('Batch channel available: **Yes**');
          } else {
            parts.push('Batch channel available: **No** — the channel scheme failed to initialise (usually an RPC issue). Check `X402_RPC_URL` and restart the server.');
          }
          parts.push('\n**Current batch settings:**');
          parts.push(`- Autonomy: \`${prefs.prompt}\` (ask / auto / off — whether the agent confirms before switching to a channel mode)`);
          parts.push(`- "Many" threshold: \`${prefs.threshold}\` (anticipated calls at/above which a channel is considered)`);
          parts.push(`- Deposit multiplier: \`${prefs.depositMultiplier}\` (channel deposit = call price × this)`);
          parts.push(`- Default mode: \`${prefs.mode}\` (scheme the session starts in)`);
          parts.push(`- Saved to: ${persisted ? `\`${batchConfigPath()}\`` : `*(not yet saved — using ${process.env.X402_BATCH_PROMPT || process.env.X402_BATCH_THRESHOLD ? 'env vars / ' : ''}defaults)*`}`);

          parts.push('\nBatch settlement opens a USDC payment channel: the first paid call deposits `price × deposit multiplier` on-chain, then subsequent calls are signed off-chain and settled together with a single claim. Best for a **burst of calls** — cheaper than paying per call. Switching back to `x402-exact` leaves any unspent channel balance locked until the on-chain withdraw delay (~1 day on mainnet), so reclaim it with `1s_refund` when done.');

          parts.push('\n**Switch / configure from this session — no config editing, no restart:**');
          parts.push('- Switch mode: `1s_payment_mode { "mode": "x402-batch" }` (or `"x402-exact"` for per-call).');
          parts.push('- Change autonomy / threshold: `1s_batch_config { "prompt": "auto", "threshold": 8 }`.');
          parts.push('- Change the deposit multiplier: `1s_batch_config { "deposit_multiplier": 20 }` (min ' + MIN_DEPOSIT_MULTIPLIER + '; applies to the next channel opened).');
          parts.push('- Set the default mode and switch now: `1s_batch_config { "mode": "x402-batch" }` (applies immediately and on future restarts).');
          parts.push('- Reclaim unspent channel deposit when finished: `1s_refund` (idle channels also auto-refund after a few hours).');

          parts.push('\n#### Advanced: install-time env vars');
          parts.push('Setting these in the MCP config seeds the defaults at startup (the saved config file, when present, takes priority). Most users should use `1s_batch_config` instead.');
          parts.push('- `X402_BATCH_PROMPT` (default `ask`), `X402_BATCH_THRESHOLD` (default `5`), `X402_PAYMENT_MODE` (default `exact`), `X402_DEPOSIT_MULTIPLIER` (default `10`).');
          parts.push('- `X402_RPC_URL` (default Base public RPC) — set your own Base RPC if channel deposits rate-limit.');
          parts.push('- `X402_CHANNEL_DIR` (default unset = in-memory) — directory to persist the channel across restarts.');
          parts.push('- `ONESOURCE_CONFIG_DIR` (default `~/.onesource`) — directory holding the saved payment config.');
        }

        if (mppEnabled) {
          parts.push('\n### Session Channels (MPP on Tempo)\n');
          if (payInfo.mpp.sessionAvailable) {
            parts.push('Session channel available: **Yes**');
          } else {
            parts.push('Session channel available: **No** — the Tempo channel failed to initialise (usually an RPC issue). Check `MPP_RPC_URL` and restart the server.');
          }
          parts.push('\n**Current session settings:**');
          parts.push(`- Autonomy: \`${prefs.prompt}\` (ask / auto / off — shared with x402; whether the agent confirms before switching to a channel mode)`);
          parts.push(`- "Many" threshold: \`${prefs.threshold}\` (anticipated calls at/above which a channel is considered)`);
          parts.push(`- Deposit cap: \`${prefs.mppMaxDeposit}\` (\`MPP_MAX_DEPOSIT\` — max USDC.e/pathUSD locked per channel)`);
          parts.push(`- Default mode: \`${prefs.mode}\` (scheme the session starts in)`);
          parts.push(`- Saved to: ${persisted ? `\`${batchConfigPath()}\`` : '*(not yet saved — using defaults)*'}`);

          parts.push('\n`mpp-session` opens a TIP-1034 voucher channel: the first paid call deposits up to the cap on-chain, then subsequent calls are signed off-chain as cumulative vouchers and settled together. Best for a **burst of calls** — cheaper than per-call `mpp-charge`. Reclaim the unspent deposit with `1s_refund` when done; it also settles automatically on clean shutdown (a hard kill leaves it locked until reclaimed on-chain later).');

          parts.push('\n**Switch / configure from this session — no config editing, no restart:**');
          parts.push('- Switch mode: `1s_payment_mode { "mode": "mpp-session" }` (or `"mpp-charge"` for per-call).');
          parts.push('- Change the deposit cap: `1s_batch_config { "mpp_max_deposit": "1" }` (persists across restarts; applies to the next channel opened).');
          parts.push('- Reclaim unspent channel deposit when finished: `1s_refund`.');

          parts.push('\n#### Advanced: install-time env vars');
          parts.push('Setting these in the MCP config seeds the defaults at startup (the saved config file, when present, takes priority).');
          parts.push('- `MPP_PRIVATE_KEY` (funded Tempo wallet), `MPP_PAYMENT_MODE` (`charge` default | `session`), `MPP_MAX_DEPOSIT` (session deposit cap, default `1`), `MPP_RPC_URL` (default Tempo public RPC).');
        }

        parts.push('\n### Your preference\n');
        parts.push(`> **Agent:** ask the user how they want channel payments handled — (1) **how many calls** in a session should make a channel worth it (currently ${prefs.threshold}), and (2) whether you should **ask first** (current: \`${prefs.prompt}\`), **switch automatically**, or **only act on request**. When they answer, apply it immediately with \`1s_batch_config\` (e.g. \`{ "threshold": 8, "prompt": "auto" }\`) — it persists automatically, so there is no config file to edit and no restart needed.`);
      } else {
        parts.push('Payment channels apply only to wallet payments. ' + (activeMethod === 'api_key'
          ? 'Your calls are covered by your API key, so there is no per-call payment to batch.'
          : 'You have no payment wallet configured, so there is nothing to batch yet — set `X402_PRIVATE_KEY` (Base) or `MPP_PRIVATE_KEY` (Tempo).'));
      }

      // 3. API connectivity
      parts.push('\n## API Connectivity\n');
      const baseUrl = process.env.ONESOURCE_BASE_URL ?? 'https://api.onesource.io';
      try {
        await fetch(baseUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        parts.push(`Backend: **Reachable** (${baseUrl})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        parts.push(`Backend: **Unreachable** — ${msg}`);
      }

      // 4. Transport
      parts.push('\n## Transport\n');
      parts.push(`Mode: ${transport ?? 'unknown'}`);
      parts.push('\n> **Note:** If you recently changed auth method (e.g. API key → x402), restart Claude Code fully to refresh the LLM instructions. `/reload-plugins` reconnects tools but may not update the system prompt the LLM sees.');

      // 5. Bug reporting
      parts.push('\n## Bug Reporting\n');
      parts.push('Status: **Enabled** — call `1s_report_bug` to report issues to the OneSource team.');

      // 6. Next steps
      parts.push('\n## Next Steps\n');
      if (activeMethod === 'none') {
        parts.push('- Configure authentication to use blockchain API tools (see instructions above)');
      }
      if (latestVersion !== 'unknown' && latestVersion !== VERSION) {
        parts.push('- Update to the latest version: `npx -y @one-source/mcp@latest`');
      }
      if (activeMethod !== 'none') {
        parts.push('- Try an API tool: `1s_network_info` (returns chain ID, block number, gas price)');
      }
      if (x402Enabled || mppEnabled) {
        parts.push('- Review your channel-payment preferences and adjust them with `1s_batch_config` (see Payment Channels above) — no config editing or restart needed.');
      }
      if (x402Enabled && payInfo.mode === 'x402-exact') {
        parts.push('- Making many calls this session? Open a Base payment channel (`1s_payment_mode { "mode": "x402-batch" }`) to pay once for the whole burst, then reclaim with `1s_refund`.');
      }
      if (mppEnabled && payInfo.mode === 'mpp-charge') {
        parts.push('- Making many calls this session? Switch to a Tempo voucher channel (`1s_payment_mode { "mode": "mpp-session" }`) — cheaper than per-call, reclaim with `1s_refund`.');
      }

      return parts.join('\n');
    },
    'ops',
    { title: 'Setup Check', readOnlyHint: true, destructiveHint: false },
  );
  count++;

  // ---------------------------------------------------------------------------
  // 1s_batch_config — view or change payment-channel preferences at runtime.
  // Persists to the server-managed config file + mutates process.env and the
  // live payment mode, so it's a process-wide singleton control — registered in
  // stdio only. On the multi-tenant HTTP server (mcp.onesource.io) one caller's
  // change would leak to every tenant and the disk-backed config is meaningless
  // for a stateless hosted process; it's also a no-op without a wallet. Mirrors
  // the STDIO_ONLY gate on 1s_payment_mode / 1s_refund in register-api-tools.ts.
  // ---------------------------------------------------------------------------
  if (transport === 'stdio') {
  instrumentedTool(server, analytics, transport,
    '1s_batch_config',
    'View or change payment preferences and save them so they persist across restarts — no MCP config editing or restart required. ' +
      'Call with no arguments to see current settings. ' +
      'Set "prompt" (ask/auto/off — agent autonomy when switching to a cheaper channel mode), "threshold" (anticipated calls before a channel is worth it), ' +
      '"deposit_multiplier" (x402 channel deposit = call price × this; applies to the next channel opened), "mpp_max_deposit" (MPP session channel deposit cap, in tokens), ' +
      'or "mode" (the default rail+scheme — x402-exact / x402-batch / mpp-charge / mpp-session — also switched live for this session). ' +
      'Pass "reset": true to restore defaults. With an API key, calls are covered by your plan.',
    {
      prompt: z.enum(['ask', 'auto', 'off']).optional()
        .describe('Agent autonomy when deciding to switch to a channel mode: ask (confirm first), auto (switch on its own), off (only on explicit request).'),
      threshold: z.number().int().positive().optional()
        .describe('Anticipated call count at/above which a channel mode is worth considering. Default 5.'),
      deposit_multiplier: z.number().min(MIN_DEPOSIT_MULTIPLIER).optional()
        .describe(`x402 channel deposit = call price × this multiplier. Minimum ${MIN_DEPOSIT_MULTIPLIER}. Applies to the next channel opened.`),
      mpp_max_deposit: z.string().optional()
        .describe('MPP session channel max deposit, in human token units (e.g. "1"). Applies to the next Tempo channel opened.'),
      mode: z.enum(['x402-exact', 'x402-batch', 'mpp-charge', 'mpp-session']).optional()
        .describe('Default payment rail+scheme the session starts in. Also switched live for the current session when that rail is active.'),
      reset: z.boolean().optional()
        .describe('Restore all payment settings to their built-in defaults (deletes the saved config file).'),
    },
    (input: Record<string, unknown>) => handleBatchConfig(input, opts.authMethod),
    'ops',
    { title: 'Payment Config', readOnlyHint: false, destructiveHint: false },
  );
  count++;
  }

  return count;
}

/**
 * Handler for `1s_batch_config`. Validates input, persists the change, applies a
 * live payment-mode switch when x402 is active, and returns a human/agent-readable
 * summary of the resulting settings.
 */
function handleBatchConfig(
  input: Record<string, unknown>,
  authMethod: 'api_key' | 'x402' | 'mpp' | 'none' | undefined,
): string {
  const info = getPaymentModeInfo();
  const anyActive = info.enabled || authMethod === 'x402' || authMethod === 'mpp';

  // --- reset path ---
  if (input.reset === true) {
    const { prefs, persisted, persistError } = resetBatchPrefs();
    if (info.enabled) setPaymentMode(prefs.mode);
    return renderBatchConfig('Payment settings reset to defaults.', prefs, persisted, persistError, anyActive, info.enabled);
  }

  // --- validate provided fields (only those present) ---
  const patch: Partial<BatchPrefs> = {};
  const errors: string[] = [];

  if (input.prompt !== undefined) {
    const v = coercePrompt(input.prompt);
    if (v) patch.prompt = v;
    else errors.push(`prompt must be one of ask / auto / off (got ${JSON.stringify(input.prompt)})`);
  }
  if (input.threshold !== undefined) {
    const v = coerceThreshold(input.threshold);
    if (v) patch.threshold = v;
    else errors.push(`threshold must be a positive integer (got ${JSON.stringify(input.threshold)})`);
  }
  if (input.deposit_multiplier !== undefined) {
    const v = coerceMultiplier(input.deposit_multiplier);
    if (v) patch.depositMultiplier = v;
    else errors.push(`deposit_multiplier must be a number ≥ ${MIN_DEPOSIT_MULTIPLIER} (got ${JSON.stringify(input.deposit_multiplier)})`);
  }
  if (input.mpp_max_deposit !== undefined) {
    const v = coerceMaxDeposit(input.mpp_max_deposit);
    if (v) patch.mppMaxDeposit = v;
    else errors.push(`mpp_max_deposit must be a positive number string (got ${JSON.stringify(input.mpp_max_deposit)})`);
  }
  if (input.mode !== undefined) {
    const v = coerceMode(input.mode);
    if (v) patch.mode = v;
    else errors.push(`mode must be one of x402-exact / x402-batch / mpp-charge / mpp-session (got ${JSON.stringify(input.mode)})`);
  }

  if (errors.length > 0) {
    return `Could not apply payment config — ${errors.join('; ')}. No changes were made.`;
  }

  // --- no fields → report current settings ---
  if (Object.keys(patch).length === 0) {
    const prefs = getBatchPrefs();
    return renderBatchConfig('Current payment settings (no changes requested).', prefs, hasPersistedConfig(), undefined, anyActive, info.enabled);
  }

  // --- apply ---
  const { prefs, persisted, persistError } = setBatchPrefs(patch);

  // Apply a live mode switch when the target rail is active. setPaymentMode
  // no-ops (returns the unchanged mode) when the rail's key isn't set or the
  // sub-mode is unavailable.
  let modeNote: string | undefined;
  if (patch.mode !== undefined) {
    if (info.enabled) {
      const applied = setPaymentMode(patch.mode);
      if (applied === patch.mode) {
        modeNote = `Switched the live payment scheme to \`${applied}\` for this session.`;
      } else if (patch.mode === 'x402-batch' && !info.x402.batchAvailable) {
        modeNote = 'Saved as the default, but x402-batch could not be activated — the channel scheme is unavailable (check `X402_RPC_URL` and restart).';
      } else if (patch.mode === 'mpp-session' && !info.mpp.sessionAvailable) {
        modeNote = 'Saved as the default, but mpp-session could not be activated — the Tempo channel is unavailable (check `MPP_RPC_URL` and restart).';
      } else {
        modeNote = `Saved as the default mode; the ${patch.mode.startsWith('mpp-') ? 'MPP' : 'x402'} rail is not active this session, so the live scheme was not switched.`;
      }
    } else {
      modeNote = 'Saved as the default mode; it will take effect once a payment wallet is active (set `X402_PRIVATE_KEY` or `MPP_PRIVATE_KEY`).';
    }
  }

  return renderBatchConfig('Payment settings updated.', prefs, persisted, persistError, anyActive, info.enabled, modeNote);
}

/** Format payment settings + status notes into the tool's text response. */
function renderBatchConfig(
  headline: string,
  prefs: BatchPrefs,
  persisted: boolean,
  persistError: string | undefined,
  anyActive: boolean,
  anyEnabled: boolean,
  modeNote?: string,
): string {
  const lines: string[] = [headline, ''];
  lines.push('**Payment settings**');
  lines.push(`- Default mode: \`${prefs.mode}\``);
  lines.push(`- Autonomy (prompt): \`${prefs.prompt}\``);
  lines.push(`- "Many" threshold: \`${prefs.threshold}\``);
  lines.push(`- x402 deposit multiplier: \`${prefs.depositMultiplier}\``);
  lines.push(`- MPP session max deposit: \`${prefs.mppMaxDeposit}\``);

  if (modeNote) lines.push('', modeNote);

  lines.push('');
  if (persisted) {
    lines.push(`Saved to \`${batchConfigPath()}\` — these settings persist across restarts.`);
  } else {
    lines.push(`⚠️ Could not write the config file (${persistError ?? 'unknown error'}). The settings are active for this session but will not survive a restart.`);
  }

  if (!anyActive) {
    lines.push('');
    lines.push('Note: these preferences are saved and will take effect once a payment wallet is active (set `X402_PRIVATE_KEY` for Base or `MPP_PRIVATE_KEY` for Tempo).');
  } else if (!anyEnabled) {
    lines.push('');
    lines.push('Note: no payment wallet is active in this process yet, so the live scheme was not changed — the saved defaults apply on the next session.');
  }

  return lines.join('\n');
}

// export { loadData, type LoadedData };
