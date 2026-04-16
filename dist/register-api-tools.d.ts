/**
 * Register all 22 API tools from @one-source/api-mcp onto a shared McpServer.
 *
 * Replicates the exact instrumentation pattern from api-mcp's create-server.ts:
 * per-call client context, x402 detection, performance timing, session hashing,
 * and error sanitization.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type OneSourceClient } from '@one-source/api-mcp/client';
import type { Analytics } from './analytics.js';
export interface RegisterApiToolsOptions {
    server: McpServer;
    analytics: Analytics;
    transport?: 'stdio' | 'http';
    /** Override the default client (useful for sharing across HTTP requests). */
    client?: OneSourceClient;
    /** Active authentication method, determined at startup. */
    authMethod?: 'api_key' | 'x402' | 'none';
}
/**
 * Register all API tools and return the client instance + tool count.
 */
export declare function registerApiTools(opts: RegisterApiToolsOptions): {
    client: OneSourceClient;
    count: number;
};
//# sourceMappingURL=register-api-tools.d.ts.map