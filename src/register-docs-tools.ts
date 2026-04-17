/**
 * Register docs tools from @one-source/docs-mcp onto a shared McpServer.
 *
 * NOTE: Docs tools are temporarily disabled (product not yet released).
 * Code is commented out for easy re-enable. Only 1s_setup_check remains active.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';
import { createHash } from 'node:crypto';

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
): void {
  server.tool(name, description, schema, async (input: Record<string, unknown>, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => {
    const start = performance.now();
    const inputKeys = Object.keys(input);
    const sessionHash = hashSession(extra.sessionId);
    const clientInfo = server.server.getClientVersion();

    const base: Omit<ToolCallEvent, 'success' | 'response_size' | 'error_category' | 'duration_ms'> = {
      type: 'tool_call',
      service: 'onesource-docs',
      tool: name,
      category: 'docs',
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
  authMethod?: 'api_key' | 'x402' | 'none';
  /** Wallet address derived from X402_PRIVATE_KEY (only relevant when authMethod is 'x402'). */
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

  const authMethod = opts.authMethod;
  const x402Address = opts.x402Address;
  instrumentedTool(server, analytics, transport,
    '1s_setup_check',
    'Check OneSource MCP server health — version (current vs latest), authentication status (API key or x402), API connectivity, and setup instructions if anything is missing. Free, no authentication required. Call this first when troubleshooting.',
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
      const bothSet = !!(runtimeApiKey && runtimeX402Key);
      // Use authMethod from startup; fall back to runtime env check for robustness
      const activeMethod = authMethod ?? (runtimeApiKey ? 'api_key' : runtimeX402Key ? 'x402' : 'none');

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
        if (x402Address) {
          parts.push(`Wallet: \`${x402Address}\``);
        }
        parts.push('\nThis wallet must hold USDC on the **Base** network to pay for API calls.');
        parts.push('\n> **If this key was not explicitly set in your Claude MCP config**, it may be inherited from your shell environment. Run `echo $X402_PRIVATE_KEY` in your terminal to check.');
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
        parts.push('**Security:** Never commit keys to source control. Use environment variables or a secrets manager.\n');
      }

      // 3. API connectivity
      parts.push('\n## API Connectivity\n');
      const baseUrl = process.env.ONESOURCE_BASE_URL ?? 'https://skills.onesource.io';
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

      return parts.join('\n');
    },
  );

  return 1;
}

// export { loadData, type LoadedData };
