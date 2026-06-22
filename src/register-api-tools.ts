/**
 * Register all 27 API tools from @one-source/api-mcp onto a shared McpServer.
 *
 * Replicates the exact instrumentation pattern from api-mcp's create-server.ts:
 * per-call client context, x402 detection, performance timing, session hashing,
 * and error sanitization.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { createHash } from 'node:crypto';
import { allTools } from '@one-source/api-mcp/tools';
import { createClientFromEnv, type OneSourceClient } from '@one-source/api-mcp/client';
import type { Analytics } from './analytics.js';
import { VERSION } from './version.js';

const RO: ToolAnnotations = Object.freeze({ readOnlyHint: true, destructiveHint: false });

export const TOOL_META: Record<string, { title: string; annotations: ToolAnnotations }> = Object.freeze({
  // Live chain data
  '1s_allowance_live':       { title: 'ERC-20 Allowance',        annotations: RO },
  '1s_contract_info_live':   { title: 'Contract Info',            annotations: RO },
  '1s_erc1155_balance_live': { title: 'ERC-1155 Token Balance',   annotations: RO },
  '1s_erc20_balance_live':   { title: 'ERC-20 Token Balance',     annotations: RO },
  '1s_erc20_transfers_live': { title: 'ERC-20 Transfer History',  annotations: RO },
  '1s_erc721_tokens_live':   { title: 'ERC-721 NFT Tokens',       annotations: RO },
  '1s_events_live':          { title: 'Contract Events',          annotations: RO },
  '1s_multi_balance_live':   { title: 'Multi-Address Balance',    annotations: RO },
  '1s_nft_metadata_live':    { title: 'NFT Metadata',             annotations: RO },
  '1s_nft_owner_live':       { title: 'NFT Owner',                annotations: RO },
  '1s_total_supply_live':    { title: 'Token Total Supply',       annotations: RO },
  '1s_tx_details_live':      { title: 'Transaction Details',      annotations: RO },
  // Chain utilities
  '1s_block_by_number':      { title: 'Block by Number',          annotations: RO },
  '1s_block_number':         { title: 'Current Block Number',     annotations: RO },
  '1s_chain_id':             { title: 'Chain ID',                 annotations: RO },
  '1s_contract_code':        { title: 'Contract Bytecode',        annotations: RO },
  '1s_ens_resolve':          { title: 'ENS Name Resolution',      annotations: RO },
  '1s_estimate_gas':         { title: 'Gas Estimate',             annotations: RO },
  '1s_network_info':         { title: 'Network Info',             annotations: RO },
  '1s_nonce':                { title: 'Account Nonce',            annotations: RO },
  '1s_payment_mode':         Object.freeze({ title: 'Payment Mode',            annotations: Object.freeze({ readOnlyHint: false, destructiveHint: false }) }),
  '1s_pending_block':        { title: 'Pending Block',            annotations: RO },
  '1s_proxy_detect':         { title: 'Proxy Contract Detection', annotations: RO },
  '1s_refund':               Object.freeze({ title: 'Refund x402 Channel',     annotations: Object.freeze({ readOnlyHint: false, destructiveHint: true }) }),
  '1s_simulate_call':        { title: 'Simulate Contract Call',   annotations: RO },
  '1s_storage_read':         { title: 'Contract Storage Read',    annotations: RO },
  '1s_tx_receipt':           { title: 'Transaction Receipt',      annotations: RO },
});

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
  authMethod?: 'api_key' | 'x402' | 'mpp' | 'none';
  /** Payer wallet address (x402 or MPP) — hashed to wallet_id for analytics. */
  x402Address?: string;
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
  const walletId = opts.x402Address
    ? createHash('sha256').update(opts.x402Address.toLowerCase()).digest('hex').slice(0, 16)
    : undefined;

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
    const meta = TOOL_META[tool.name];
    server.registerTool(
      tool.name,
      {
        title: meta?.title ?? tool.name,
        description: tool.description,
        inputSchema: tool.schema,
        annotations: meta?.annotations ?? RO,
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
            auth_method: authMethod === 'api_key' ? 'api_key' : authMethod === 'mpp' ? 'mpp' : (x402Seen ? 'x402' : 'none'),
            client_name: clientInfo?.name,
            client_version: clientInfo?.version,
            session_id: sessionHash,
            wallet_id: walletId,
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
            auth_method: authMethod === 'api_key' ? 'api_key' : authMethod === 'mpp' ? 'mpp' : (x402Seen ? 'x402' : 'none'),
            client_name: clientInfo?.name,
            client_version: clientInfo?.version,
            session_id: sessionHash,
            wallet_id: walletId,
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
