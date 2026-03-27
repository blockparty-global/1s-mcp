/**
 * Unified MCP Server Factory
 *
 * Creates a single McpServer named 'onesource' with all 31 tools
 * (22 API + 9 docs) by delegating to the two register modules.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerApiTools } from './register-api-tools.js';
import { registerDocsTools, loadData } from './register-docs-tools.js';
import { createAnalytics } from './analytics.js';
import { VERSION } from './version.js';
/**
 * Create a unified MCP server with all OneSource tools.
 */
export function createMcpServer(opts) {
    const analytics = opts?.analytics ?? createAnalytics();
    const transport = opts?.transport;
    const server = new McpServer({
        name: 'onesource',
        version: VERSION,
    });
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
    });
    return { server, analytics, client, toolCount: apiCount + docsCount };
}
export { loadData };
export { VERSION };
export { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
//# sourceMappingURL=create-server.js.map