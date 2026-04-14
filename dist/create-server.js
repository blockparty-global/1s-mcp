/**
 * Unified MCP Server Factory
 *
 * Creates a single McpServer named 'onesource' with all 34 tools
 * (22 API + 11 docs + 1 bug report) by delegating to the register modules.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerApiTools } from './register-api-tools.js';
import { registerDocsTools, loadData } from './register-docs-tools.js';
import { registerBugReportTool } from './register-bug-report-tool.js';
import { createAnalytics } from './analytics.js';
import { VERSION } from './version.js';
/**
 * Create a unified MCP server with all OneSource tools.
 */
export function createMcpServer(opts) {
    const analytics = opts?.analytics ?? createAnalytics();
    const transport = opts?.transport;
    const server = new McpServer({ name: 'onesource', version: VERSION }, opts?.instructions ? { instructions: opts.instructions } : undefined);
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
    const bugCount = registerBugReportTool({
        server,
        analytics,
        transport,
        bugReportUrl: opts?.bugReportUrl,
    });
    return { server, analytics, client, toolCount: apiCount + docsCount + bugCount };
}
export { loadData };
export { VERSION };
export { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
//# sourceMappingURL=create-server.js.map