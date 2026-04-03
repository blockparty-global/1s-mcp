/**
 * Register all 11 docs tools from @one-source/docs-mcp onto a shared McpServer.
 *
 * Replicates the exact instrumentation pattern from docs-mcp's create-server.ts:
 * performance timing, session hashing, and error sanitization.
 * Analytics events use service: 'onesource-docs', category: 'docs'.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';
import { createHash } from 'node:crypto';

import { loadData, type LoadedData } from '@one-source/docs-mcp';
import { searchDocsSchema, handleSearchDocs } from '@one-source/docs-mcp/tools/search-docs';
import { getQueryReferenceSchema, handleGetQueryReference } from '@one-source/docs-mcp/tools/get-query-reference';
import { getTypeDefinitionSchema, handleGetTypeDefinition } from '@one-source/docs-mcp/tools/get-type-definition';
import { listExamplesSchema, handleListExamples } from '@one-source/docs-mcp/tools/list-examples';
import { listSupportedChainsSchema, handleListSupportedChains } from '@one-source/docs-mcp/tools/list-supported-chains';
import { getFilterReferenceSchema, handleGetFilterReference } from '@one-source/docs-mcp/tools/get-filter-reference';
import { getPaginationGuideSchema, handleGetPaginationGuide } from '@one-source/docs-mcp/tools/get-pagination-guide';
import { getSchemaOverviewSchema, handleGetSchemaOverview } from '@one-source/docs-mcp/tools/get-schema-overview';
import { getAuthenticationGuideSchema, handleGetAuthenticationGuide } from '@one-source/docs-mcp/tools/get-authentication-guide';
import { getMcpSetupGuideSchema, handleGetMcpSetupGuide } from '@one-source/docs-mcp/tools/get-mcp-setup-guide';

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
  /** Pre-loaded docs data (avoids re-reading files per request in HTTP mode). */
  data?: LoadedData;
  /** Whether x402 payments are enabled (set during startup). */
  x402Enabled?: boolean;
  /** Wallet address derived from X402_PRIVATE_KEY (set during startup). */
  x402Address?: string;
}

/**
 * Register all docs tools and return the tool count.
 */
export function registerDocsTools(opts: RegisterDocsToolsOptions): number {
  const { server, analytics, transport } = opts;
  const { sections, index, schema } = opts.data ?? loadData();

  instrumentedTool(server, analytics, transport,
    'search_docs',
    'Search OneSource documentation by keyword. Returns the top 5 matching sections.',
    searchDocsSchema.shape,
    (input) => handleSearchDocs(input, index),
  );

  instrumentedTool(server, analytics, transport,
    'get_query_reference',
    'Get full reference for a OneSource root GraphQL query — arguments, filters, return type. There are 12 root queries: address, addresses, block, blocks, contract, contracts, nft, nfts, token, tokens, transaction, transactions.',
    getQueryReferenceSchema.shape,
    (input) => handleGetQueryReference(input, schema),
  );

  instrumentedTool(server, analytics, transport,
    'get_type_definition',
    'Get the schema definition for a GraphQL type, enum, scalar, input, or interface. Returns fields, values, and descriptions.',
    getTypeDefinitionSchema.shape,
    (input) => handleGetTypeDefinition(input, schema),
  );

  instrumentedTool(server, analytics, transport,
    'list_examples',
    'List or search working GraphQL examples. Without a topic, returns a summary of all available examples. With a topic, returns full example content matching that keyword.',
    listExamplesSchema.shape,
    (input) => handleListExamples(input, sections),
  );

  instrumentedTool(server, analytics, transport,
    'list_supported_chains',
    'List all blockchain networks supported by OneSource with endpoint URLs.',
    listSupportedChainsSchema.shape,
    () => handleListSupportedChains(),
  );

  instrumentedTool(server, analytics, transport,
    'get_filter_reference',
    'Get all filter fields and operators for a list query (e.g. transactions, tokens).',
    getFilterReferenceSchema.shape,
    (input) => handleGetFilterReference(input, schema),
  );

  instrumentedTool(server, analytics, transport,
    'get_pagination_guide',
    'Get the cursor-based pagination pattern with examples for a list query.',
    getPaginationGuideSchema.shape,
    (input) => handleGetPaginationGuide(input, schema),
  );

  instrumentedTool(server, analytics, transport,
    'get_schema_overview',
    'Get a high-level summary of the entire GraphQL schema — all queries, types, enums, and scalars.',
    getSchemaOverviewSchema.shape,
    () => handleGetSchemaOverview(schema),
  );

  instrumentedTool(server, analytics, transport,
    'get_authentication_guide',
    'Get the authentication guide — API key format, endpoints, headers, and common mistakes.',
    getAuthenticationGuideSchema.shape,
    () => handleGetAuthenticationGuide(),
  );

  instrumentedTool(server, analytics, transport,
    'get_mcp_setup_guide',
    'Get the MCP installation and setup guide — quickstart, per-client instructions, x402 payments, configuration, and individual MCP packages. Use the topic parameter to focus on a specific area.',
    getMcpSetupGuideSchema.shape,
    (input) => handleGetMcpSetupGuide(input, sections),
  );

  const x402Enabled = opts.x402Enabled;
  const x402Address = opts.x402Address;

  instrumentedTool(server, analytics, transport,
    '1s_setup_check',
    'Check OneSource MCP server health — version (current vs latest), x402 payment status, wallet address, API connectivity, and setup instructions if anything is missing. Free, no payment required. Call this first when troubleshooting.',
    {},
    async () => {
      const sections: string[] = [];

      // 1. Server version
      sections.push('## Server Version\n');
      sections.push(`Current: ${VERSION}`);

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

      sections.push(`Latest:  ${latestVersion}`);
      if (latestVersion !== 'unknown' && latestVersion !== VERSION) {
        sections.push('\n**Update available!** Run: `npx @one-source/mcp@latest`');
      } else if (latestVersion === VERSION) {
        sections.push('\nYou are on the latest version.');
      }

      // 2. x402 payment status
      sections.push('\n## x402 Payment Status\n');

      const enabled = x402Enabled ?? !!process.env.X402_PRIVATE_KEY;

      if (enabled && x402Address) {
        sections.push('Status: **Configured**');
        sections.push(`Wallet: \`${x402Address}\``);
        sections.push('\nThis wallet must hold USDC on the **Base** network to pay for API calls.');
      } else if (enabled) {
        sections.push('Status: **Configured** (wallet address not available)');
      } else {
        sections.push('Status: **Not configured**');
        sections.push('\nBlockchain API tools require x402 payment. Without a key, paid endpoints return HTTP 402 errors.\n');
        sections.push('### How to configure x402\n');
        sections.push('1. **Get an EVM private key** — export from MetaMask, Coinbase Wallet, or generate one:');
        sections.push('   ```');
        sections.push('   # Generate a new key');
        sections.push('   echo "0x$(openssl rand -hex 32)"');
        sections.push('   ```\n');
        sections.push('2. **Fund the wallet** with USDC on the **Base** network (not Ethereum mainnet). A few dollars is enough for hundreds of queries.\n');
        sections.push('3. **Set the key** for your MCP client:\n');
        sections.push('   **Claude Code:**');
        sections.push('   ```');
        sections.push('   claude mcp remove onesource');
        sections.push('   claude mcp add onesource -e X402_PRIVATE_KEY=0x... -- npx -y @one-source/mcp@latest');
        sections.push('   ```\n');
        sections.push('   **Claude Desktop / Cursor** — add an `env` block to your MCP config:');
        sections.push('   ```json');
        sections.push('   {');
        sections.push('     "mcpServers": {');
        sections.push('       "onesource": {');
        sections.push('         "command": "npx",');
        sections.push('         "args": ["-y", "@one-source/mcp@latest"],');
        sections.push('         "env": { "X402_PRIVATE_KEY": "0x..." }');
        sections.push('       }');
        sections.push('     }');
        sections.push('   }');
        sections.push('   ```\n');
        sections.push('   **Any MCP client (stdio):**');
        sections.push('   ```');
        sections.push('   X402_PRIVATE_KEY=0x... npx -y @one-source/mcp@latest');
        sections.push('   ```\n');
        sections.push('4. **Restart the MCP server** after setting the key.\n');
        sections.push('**Security:** Never commit your private key to source control. Use environment variables or a secrets manager.');
      }

      // 3. API connectivity
      sections.push('\n## API Connectivity\n');
      const baseUrl = process.env.ONESOURCE_BASE_URL ?? 'https://skills.onesource.io';
      try {
        const res = await fetch(baseUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        sections.push(`Backend: **Reachable** (${baseUrl})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        sections.push(`Backend: **Unreachable** — ${msg}`);
      }

      // 4. Transport
      sections.push('\n## Transport\n');
      sections.push(`Mode: ${transport ?? 'unknown'}`);

      // 5. Next steps
      sections.push('\n## Next Steps\n');
      if (!enabled) {
        sections.push('- Configure x402 payments to use blockchain API tools (see instructions above)');
      }
      if (latestVersion !== 'unknown' && latestVersion !== VERSION) {
        sections.push('- Update to the latest version: `npx @one-source/mcp@latest`');
      }
      sections.push('- Documentation tools are free — try `search_docs` or `list_supported_chains`');
      if (enabled) {
        sections.push('- Try a paid API tool: `1s_network_info` (returns chain ID, block number, gas price)');
      }

      return sections.join('\n');
    },
  );

  return 11;
}

export { loadData, type LoadedData };
