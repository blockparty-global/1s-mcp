/**
 * Unified MCP Server Factory
 *
 * Creates a single McpServer named 'onesource' with all 46 tools
 * (35 API incl. payment-mode, live chain, and Deepstate market data + 8
 * documentation + 1 setup check + 1 batch config + 1 bug report) by
 * delegating to the register modules.
 *
 * Two of the API tools are stdio-only, so an HTTP server registers 44.
 *
 * Pending: 18 more API tools (`1s_std_*`, The Standard Reserve on Robinhood
 * Chain) have TOOL_META rows in register-api-tools.ts but aren't in the
 * above count yet — they only register once the @one-source/api-mcp
 * dependency is bumped past ^5.12.0 to the version that ships them (see the
 * TODO at the top of register-api-tools.ts). Once that bump lands, this
 * becomes 64 tools total (62 registered over HTTP).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { OneSourceClient } from '@one-source/api-mcp/client';
import { registerApiTools } from './register-api-tools.js';
import { registerDocsTools } from './register-docs-tools.js';
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
