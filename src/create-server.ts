/**
 * Unified MCP Server Factory
 *
 * Creates a single McpServer named 'onesource' with all 33 tools
 * (22 API + 9 docs) by delegating to the two register modules.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { OneSourceClient } from '@one-source/api-mcp/client';
import { registerApiTools } from './register-api-tools.js';
import { registerDocsTools, loadData, type LoadedData } from './register-docs-tools.js';
import { createAnalytics, type Analytics } from './analytics.js';
import { VERSION } from './version.js';

export interface CreateServerOptions {
  /** Pre-loaded docs content (avoids re-reading files per request in HTTP mode). */
  docsData?: LoadedData;
  /** Override the default analytics instance (for sharing across HTTP requests). */
  analytics?: Analytics;
  /** Override the default API client (for sharing across HTTP requests). */
  client?: OneSourceClient;
  /** Transport mode — passed through to analytics events. */
  transport?: 'stdio' | 'http';
  /** Whether x402 payments are enabled (set during startup). */
  x402Enabled?: boolean;
  /** Wallet address derived from X402_PRIVATE_KEY (set during startup). */
  x402Address?: string;
  /** Server instructions injected into the LLM's system prompt by MCP clients. */
  instructions?: string;
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
  });

  const docsCount = registerDocsTools({
    server,
    analytics,
    transport,
    data: opts?.docsData,
    x402Enabled: opts?.x402Enabled,
    x402Address: opts?.x402Address,
  });

  return { server, analytics, client, toolCount: apiCount + docsCount };
}

export { loadData, type LoadedData };
export { VERSION };
export { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
