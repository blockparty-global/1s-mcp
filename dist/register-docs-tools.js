/**
 * Register all 9 docs tools from @one-source/docs-mcp onto a shared McpServer.
 *
 * Replicates the exact instrumentation pattern from docs-mcp's create-server.ts:
 * performance timing, session hashing, and error sanitization.
 * Analytics events use service: 'onesource-docs', category: 'docs'.
 */
import { createHash } from 'node:crypto';
import { loadData } from '@one-source/docs-mcp';
import { searchDocsSchema, handleSearchDocs } from '@one-source/docs-mcp/tools/search-docs';
import { getQueryReferenceSchema, handleGetQueryReference } from '@one-source/docs-mcp/tools/get-query-reference';
import { getTypeDefinitionSchema, handleGetTypeDefinition } from '@one-source/docs-mcp/tools/get-type-definition';
import { listExamplesSchema, handleListExamples } from '@one-source/docs-mcp/tools/list-examples';
import { listSupportedChainsSchema, handleListSupportedChains } from '@one-source/docs-mcp/tools/list-supported-chains';
import { getFilterReferenceSchema, handleGetFilterReference } from '@one-source/docs-mcp/tools/get-filter-reference';
import { getPaginationGuideSchema, handleGetPaginationGuide } from '@one-source/docs-mcp/tools/get-pagination-guide';
import { getSchemaOverviewSchema, handleGetSchemaOverview } from '@one-source/docs-mcp/tools/get-schema-overview';
import { getAuthenticationGuideSchema, handleGetAuthenticationGuide } from '@one-source/docs-mcp/tools/get-authentication-guide';
import { VERSION } from './version.js';
function hashSession(sessionId) {
    if (!sessionId)
        return undefined;
    return createHash('sha256').update(sessionId).digest('hex').slice(0, 16);
}
/**
 * Register an instrumented docs tool — wraps the handler with analytics tracking.
 *
 * Uses `any` for the handler input type because the MCP SDK's overloaded
 * `server.tool()` signature makes generics impractical here. Each handler
 * is still type-safe at its own definition site.
 */
function instrumentedTool(server, analytics, transport, name, description, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
schema, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
handler) {
    server.tool(name, description, schema, async (input, extra) => {
        const start = performance.now();
        const inputKeys = Object.keys(input);
        const sessionHash = hashSession(extra.sessionId);
        const clientInfo = server.server.getClientVersion();
        const base = {
            type: 'tool_call',
            service: 'onesource-docs',
            tool: name,
            category: 'docs',
            timestamp: new Date().toISOString(),
            input_params: inputKeys,
            version: VERSION,
            auth_method: 'none',
            client_name: clientInfo?.name,
            client_version: clientInfo?.version,
            session_id: sessionHash,
            transport,
            source: 'unified',
        };
        try {
            const text = handler(input);
            const durationMs = Math.round(performance.now() - start);
            analytics.trackTool({
                ...base,
                duration_ms: durationMs,
                success: true,
                response_size: text.length,
            });
            return { content: [{ type: 'text', text }] };
        }
        catch (err) {
            const durationMs = Math.round(performance.now() - start);
            const message = err instanceof Error ? err.message : String(err);
            analytics.trackTool({
                ...base,
                duration_ms: durationMs,
                success: false,
                error_category: message.slice(0, 100).replace(/0x[a-fA-F0-9]+/g, '0x***'),
                response_size: 0,
            });
            return {
                isError: true,
                content: [{ type: 'text', text: `Tool error: ${message.slice(0, 500).replace(/0x[a-fA-F0-9]+/g, '0x***')}` }],
            };
        }
    });
}
/**
 * Register all docs tools and return the tool count.
 */
export function registerDocsTools(opts) {
    const { server, analytics, transport } = opts;
    const { sections, index, schema } = opts.data ?? loadData();
    instrumentedTool(server, analytics, transport, 'search_docs', 'Search OneSource documentation by keyword. Returns the top 5 matching sections.', searchDocsSchema.shape, (input) => handleSearchDocs(input, index));
    instrumentedTool(server, analytics, transport, 'get_query_reference', 'Get full reference for a OneSource root GraphQL query — arguments, filters, return type. There are 12 root queries: address, addresses, block, blocks, contract, contracts, nft, nfts, token, tokens, transaction, transactions.', getQueryReferenceSchema.shape, (input) => handleGetQueryReference(input, schema));
    instrumentedTool(server, analytics, transport, 'get_type_definition', 'Get the schema definition for a GraphQL type, enum, scalar, input, or interface. Returns fields, values, and descriptions.', getTypeDefinitionSchema.shape, (input) => handleGetTypeDefinition(input, schema));
    instrumentedTool(server, analytics, transport, 'list_examples', 'List or search working GraphQL examples. Without a topic, returns a summary of all available examples. With a topic, returns full example content matching that keyword.', listExamplesSchema.shape, (input) => handleListExamples(input, sections));
    instrumentedTool(server, analytics, transport, 'list_supported_chains', 'List all blockchain networks supported by OneSource with endpoint URLs.', listSupportedChainsSchema.shape, () => handleListSupportedChains());
    instrumentedTool(server, analytics, transport, 'get_filter_reference', 'Get all filter fields and operators for a list query (e.g. transactions, tokens).', getFilterReferenceSchema.shape, (input) => handleGetFilterReference(input, schema));
    instrumentedTool(server, analytics, transport, 'get_pagination_guide', 'Get the cursor-based pagination pattern with examples for a list query.', getPaginationGuideSchema.shape, (input) => handleGetPaginationGuide(input, schema));
    instrumentedTool(server, analytics, transport, 'get_schema_overview', 'Get a high-level summary of the entire GraphQL schema — all queries, types, enums, and scalars.', getSchemaOverviewSchema.shape, () => handleGetSchemaOverview(schema));
    instrumentedTool(server, analytics, transport, 'get_authentication_guide', 'Get the authentication guide — API key format, endpoints, headers, and common mistakes.', getAuthenticationGuideSchema.shape, () => handleGetAuthenticationGuide());
    return 9;
}
export { loadData };
//# sourceMappingURL=register-docs-tools.js.map