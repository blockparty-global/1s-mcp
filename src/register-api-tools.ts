/**
 * Register all 22 API tools from @one-source/api-mcp onto a shared McpServer.
 *
 * Replicates the exact instrumentation pattern from api-mcp's create-server.ts:
 * per-call client context, x402 detection, performance timing, session hashing,
 * and error sanitization.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createHash } from 'node:crypto';
import { allTools } from '@one-source/api-mcp/tools';
import { createClientFromEnv, type OneSourceClient } from '@one-source/api-mcp/client';
import type { Analytics } from './analytics.js';
import { VERSION } from './version.js';

function hashSession(sessionId: string | undefined): string | undefined {
  if (!sessionId) return undefined;
  return createHash('sha256').update(sessionId).digest('hex').slice(0, 16);
}

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
export function registerApiTools(
  opts: RegisterApiToolsOptions,
): { client: OneSourceClient; count: number } {
  const { server, analytics, transport } = opts;
  const authMethod = opts.authMethod;
  const client = opts.client ?? createClientFromEnv();

  // Wire HTTP-level analytics from base client (default handler for non-overridden calls)
  client.onHttpEvent = (event) => {
    analytics.trackHttp({
      type: 'http_call',
      service: 'onesource-api',
      tool: event.tool,
      http_status: event.http_status,
      backend_latency_ms: event.backend_latency_ms,
      x402_required: event.x402_required,
      timestamp: new Date().toISOString(),
      source: 'unified',
    });
  };

  for (const tool of allTools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.schema,
      },
      async (input, extra) => {
        const start = performance.now();
        const inputRecord = input as Record<string, unknown>;
        const inputKeys = Object.keys(inputRecord);
        const network = inputRecord.network as string | undefined;
        const sessionHash = hashSession(extra.sessionId);
        const clientInfo = server.server.getClientVersion();

        // Per-call client with tool context — avoids race condition on shared client
        const toolClient = client.withContext({ tool: tool.name });

        // Track x402 status per-call via closure — no shared mutable state
        let x402Seen = false;
        toolClient.onHttpEvent = (event) => {
          if (event.x402_required) x402Seen = true;
          analytics.trackHttp({
            type: 'http_call',
            service: 'onesource-api',
            tool: event.tool,
            http_status: event.http_status,
            backend_latency_ms: event.backend_latency_ms,
            x402_required: event.x402_required,
            timestamp: new Date().toISOString(),
            session_id: sessionHash,
            source: 'unified',
          });
        };

        try {
          let text = await tool.handler(inputRecord, toolClient);
          const durationMs = Math.round(performance.now() - start);

          // When the API key plan doesn't cover this endpoint (403) and the user
          // also has X402_PRIVATE_KEY set, hint that they can switch to x402.
          if (
            text.startsWith('Error: Access denied (403)') &&
            authMethod === 'api_key' &&
            !!process.env.X402_PRIVATE_KEY?.trim()
          ) {
            text +=
              '\n\n**Tip:** Your API key does not have access to this endpoint (developer plan required), but you also have `X402_PRIVATE_KEY` configured. To use x402 micropayments instead, reinstall without the API key:\n```\nclaude mcp remove onesource\nclaude mcp add onesource -e X402_PRIVATE_KEY=<key> -- npx -y @one-source/mcp@latest\n```\nOr unset `ONESOURCE_API_KEY` from your shell and restart Claude Code.';
          }

          analytics.trackTool({
            type: 'tool_call',
            service: 'onesource-api',
            tool: tool.name,
            category: tool.category,
            timestamp: new Date().toISOString(),
            duration_ms: durationMs,
            success: true,
            network,
            input_params: inputKeys,
            response_size: text.length,
            version: VERSION,
            auth_method: authMethod === 'api_key' ? 'api_key' : (x402Seen ? 'x402' : 'none'),
            client_name: clientInfo?.name,
            client_version: clientInfo?.version,
            session_id: sessionHash,
            transport,
            source: 'unified',
          });

          return {
            content: [{ type: 'text', text }],
          };
        } catch (err: unknown) {
          const durationMs = Math.round(performance.now() - start);
          const message = err instanceof Error ? err.message : String(err);

          analytics.trackTool({
            type: 'tool_call',
            service: 'onesource-api',
            tool: tool.name,
            category: tool.category,
            timestamp: new Date().toISOString(),
            duration_ms: durationMs,
            success: false,
            error_category: message.slice(0, 100).replace(/0x[a-fA-F0-9]+/g, '0x***'),
            network,
            input_params: inputKeys,
            response_size: 0,
            version: VERSION,
            auth_method: authMethod === 'api_key' ? 'api_key' : (x402Seen ? 'x402' : 'none'),
            client_name: clientInfo?.name,
            client_version: clientInfo?.version,
            session_id: sessionHash,
            transport,
            source: 'unified',
          });

          return {
            isError: true,
            content: [
              { type: 'text', text: `Tool error: ${message.slice(0, 500)}` },
            ],
          };
        }
      },
    );
  }

  return { client, count: allTools.length };
}
