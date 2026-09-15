/**
 * Unified MCP Server Factory
 *
 * Creates a single McpServer named 'onesource' with every OneSource tool by
 * delegating to the register modules: the @one-source/api-mcp tools (live
 * chain, chain utilities, payments, Deepstate market data, The Standard
 * Reserve), the documentation tools, the setup/batch-config tools, and the
 * bug report tool. Two of the API tools (1s_payment_mode, 1s_refund) are
 * stdio-only, so an HTTP server registers two fewer.
 *
 * The total is never written down as a number here: expectedToolCount()
 * derives it from the same tables the register modules iterate, the
 * instructions string quotes that, and scripts/validate-mcp.mjs asserts it
 * matches what actually registered. A hardcoded count went stale at 38 while
 * the server grew to 65, which is why.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { OneSourceClient } from '@one-source/api-mcp/client';
import { registerApiTools, apiToolsFor } from './register-api-tools.js';
import { registerDocsTools, DOCS_TOOL_COUNT } from './register-docs-tools.js';
import { registerBugReportTool } from './register-bug-report-tool.js';
import { createAnalytics, type Analytics } from './analytics.js';
import { VERSION } from './version.js';

export interface CreateServerOptions {
  /** Override the default analytics instance (for sharing across HTTP requests). */
  analytics?: Analytics;
  /** Override the default API client (for sharing across HTTP requests). */
  client?: OneSourceClient;
  /** Transport mode — passed through to analytics events. */
  transport?: 'stdio' | 'http';
  /** Active authentication method, determined at startup. */
  authMethod?: 'api_key' | 'x402' | 'mpp' | 'none';
  /** Payer wallet address (x402 on Base or MPP on Tempo), when paying via a wallet. */
  x402Address?: string;
  /** Server instructions injected into the LLM's system prompt by MCP clients. */
  instructions?: string;
  /** Override the default bug report endpoint (for dev/testing). */
  bugReportUrl?: string;
}

export interface CreateServerResult {
  server: McpServer;
  analytics: Analytics;
  client: OneSourceClient;
  toolCount: number;
}

/**
 * The number of tools createMcpServer() will register for a transport,
 * computed from the registration tables without building a server. Used for
 * the tool count quoted in the MCP instructions (which must exist before the
 * server is constructed) and cross-checked against the real registration by
 * scripts/validate-mcp.mjs.
 */
export function expectedToolCount(transport?: 'stdio' | 'http'): number {
  return apiToolsFor(transport).length + DOCS_TOOL_COUNT + 1; // + 1s_report_bug
}

/**
 * Create a unified MCP server with all OneSource tools.
 */
export function createMcpServer(opts?: CreateServerOptions): CreateServerResult {
  const analytics = opts?.analytics ?? createAnalytics();
  const transport = opts?.transport;

  const server = new McpServer(
    { name: 'onesource', version: VERSION },
    opts?.instructions ? { instructions: opts.instructions } : undefined,
  );

  const { client, count: apiCount } = registerApiTools({
    server,
    analytics,
    transport,
    client: opts?.client,
    authMethod: opts?.authMethod,
    x402Address: opts?.x402Address,
  });

  const docsCount = registerDocsTools({
    server,
    analytics,
    transport,
    authMethod: opts?.authMethod,
    x402Address: opts?.x402Address,
  });

  const bugCount = registerBugReportTool({
    server,
    analytics,
    transport,
    bugReportUrl: opts?.bugReportUrl,
  });

  return { server, analytics, client, toolCount: apiCount + docsCount + bugCount };
}

export { VERSION };
export { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
