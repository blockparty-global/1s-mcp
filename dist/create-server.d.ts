/**
 * Unified MCP Server Factory
 *
 * Creates a single McpServer named 'onesource' with all 24 tools
 * (22 API + 1 setup check + 1 bug report) by delegating to the register modules.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { OneSourceClient } from '@one-source/api-mcp/client';
import { type Analytics } from './analytics.js';
import { VERSION } from './version.js';
export interface CreateServerOptions {
    /** Override the default analytics instance (for sharing across HTTP requests). */
    analytics?: Analytics;
    /** Override the default API client (for sharing across HTTP requests). */
    client?: OneSourceClient;
    /** Transport mode — passed through to analytics events. */
    transport?: 'stdio' | 'http';
    /** Active authentication method, determined at startup. */
    authMethod?: 'api_key' | 'x402' | 'none';
    /** Wallet address derived from X402_PRIVATE_KEY (only relevant when authMethod is 'x402'). */
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
export declare function createMcpServer(opts?: CreateServerOptions): CreateServerResult;
export { VERSION };
export { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
//# sourceMappingURL=create-server.d.ts.map