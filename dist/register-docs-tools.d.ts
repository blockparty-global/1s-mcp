/**
 * Register docs tools from @one-source/docs-mcp onto a shared McpServer.
 *
 * NOTE: Docs tools are temporarily disabled (product not yet released).
 * Code is commented out for easy re-enable. Only 1s_setup_check remains active.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Analytics } from './analytics.js';
export interface RegisterDocsToolsOptions {
    server: McpServer;
    analytics: Analytics;
    transport?: 'stdio' | 'http';
    /** Active authentication method, determined at startup. */
    authMethod?: 'api_key' | 'x402' | 'none';
    /** Wallet address derived from X402_PRIVATE_KEY (only relevant when authMethod is 'x402'). */
    x402Address?: string;
}
/**
 * Register all docs tools and return the tool count.
 */
export declare function registerDocsTools(opts: RegisterDocsToolsOptions): number;
//# sourceMappingURL=register-docs-tools.d.ts.map