/**
 * Register all 9 docs tools from @one-source/docs-mcp onto a shared McpServer.
 *
 * Replicates the exact instrumentation pattern from docs-mcp's create-server.ts:
 * performance timing, session hashing, and error sanitization.
 * Analytics events use service: 'onesource-docs', category: 'docs'.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadData, type LoadedData } from '@one-source/docs-mcp';
import type { Analytics } from './analytics.js';
export interface RegisterDocsToolsOptions {
    server: McpServer;
    analytics: Analytics;
    transport?: 'stdio' | 'http';
    /** Pre-loaded docs data (avoids re-reading files per request in HTTP mode). */
    data?: LoadedData;
}
/**
 * Register all docs tools and return the tool count.
 */
export declare function registerDocsTools(opts: RegisterDocsToolsOptions): number;
export { loadData, type LoadedData };
//# sourceMappingURL=register-docs-tools.d.ts.map