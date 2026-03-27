/**
 * Unified MCP Server Factory
 *
 * Creates a single McpServer named 'onesource' with all 31 tools
 * (22 API + 9 docs) by delegating to the two register modules.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { OneSourceClient } from '@one-source/api-mcp/client';
import { loadData, type LoadedData } from './register-docs-tools.js';
import { type Analytics } from './analytics.js';
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
export declare function createMcpServer(opts?: CreateServerOptions): CreateServerResult;
export { loadData, type LoadedData };
export { VERSION };
export { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
//# sourceMappingURL=create-server.d.ts.map