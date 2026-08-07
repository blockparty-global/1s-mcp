/**
 * Register the 1s_report_bug tool onto a shared McpServer.
 *
 * Sends structured bug reports to the OneSource bug report endpoint,
 * which forwards them to Slack. Works out of the box — no configuration
 * needed. The endpoint URL defaults to the analytics dashboard.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerRequest, ServerNotification } from '@modelcontextprotocol/sdk/types.js';
import { createHash } from 'node:crypto';
import { z } from 'zod';

import type { Analytics, ToolCallEvent } from './analytics.js';
import { errorCategoryFromMessage } from './analytics.js';
import { VERSION } from './version.js';

/** Default bug report endpoint (analytics dashboard). */
const DEFAULT_BUG_REPORT_URL = 'https://1s-analytics.vercel.app/api/bugs';

function hashSession(sessionId: string | undefined): string | undefined {
  if (!sessionId) return undefined;
  return createHash('sha256').update(sessionId).digest('hex').slice(0, 16);
}

interface BugReportInput {
  description: string;
  tool_name?: string;
  error_message?: string;
  severity?: string;
  network?: string;
  steps_to_reproduce?: string;
}

export interface RegisterBugReportToolOptions {
  server: McpServer;
  analytics: Analytics;
  transport?: 'stdio' | 'http';
  /** Override the default bug report endpoint (for dev/testing). */
  bugReportUrl?: string;
}

/**
 * Register the bug report tool and return the tool count (1).
 */
export function registerBugReportTool(opts: RegisterBugReportToolOptions): number {
  const { server, analytics, transport } = opts;
  const bugReportUrl = opts.bugReportUrl ?? DEFAULT_BUG_REPORT_URL;

  server.registerTool(
    '1s_report_bug',
    {
      title: 'Report Bug',
      description: 'Report a bug or issue to the OneSource team. Use when a tool returns an unexpected error or when the user asks to report a problem. Free, no payment required.',
      inputSchema: z.object({
      description: z.string().describe('What went wrong — describe the bug, what you expected, and what actually happened.'),
      tool_name: z.string().optional().describe('The MCP tool that produced the error (e.g. 1s_network_info, 1s_erc20_balance_live).'),
      error_message: z.string().optional().describe('The error message or relevant output from the failed tool call.'),
      severity: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Bug severity: low (cosmetic), medium (degraded function), high (feature broken), critical (server crash or data loss).'),
      network: z.string().optional().describe('The blockchain network involved, if applicable (e.g. ethereum, sepolia).'),
      steps_to_reproduce: z.string().optional().describe('Steps to reproduce the issue, if known.'),
    }).shape,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async (input: BugReportInput, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => {
      const start = performance.now();
      const inputKeys = Object.keys(input);
      const sessionHash = hashSession(extra.sessionId);
      const clientInfo = server.server.getClientVersion();

      const base: Omit<ToolCallEvent, 'success' | 'response_size' | 'error_category' | 'duration_ms'> = {
        type: 'tool_call',
        service: 'onesource-ops',
        tool: '1s_report_bug',
        category: 'ops',
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
        const descriptionTrimmed = input.description?.trim() ?? '';
        const toolNameTrimmed = input.tool_name?.trim();
        const networkTrimmed = input.network?.trim();

        if (descriptionTrimmed.length < 10) {
          return {
            isError: true,
            content: [{ type: 'text' as const, text: 'Bug report requires a description of at least 10 characters.' }],
          };
        }
        if (toolNameTrimmed && !/^1s_[a-z][a-z0-9_]*[a-z0-9]$/.test(toolNameTrimmed)) {
          return {
            isError: true,
            content: [{ type: 'text' as const, text: 'Invalid tool_name. Must be a valid OneSource tool name (e.g. 1s_network_info, 1s_erc20_balance_live).' }],
          };
        }
        if (networkTrimmed !== undefined && (networkTrimmed.length === 0 || networkTrimmed.length > 100)) {
          return {
            isError: true,
            content: [{ type: 'text' as const, text: 'Network field is too long. Use a blockchain network name like ethereum or sepolia.' }],
          };
        }

        // Build the payload — structured JSON, backend handles formatting
        const payload = {
          description: descriptionTrimmed.slice(0, 3000),
          tool_name: toolNameTrimmed?.slice(0, 100),
          error_message: input.error_message?.slice(0, 1000),
          severity: input.severity ?? 'medium',
          network: networkTrimmed,
          steps_to_reproduce: input.steps_to_reproduce?.slice(0, 2000),
          context: {
            mcp_version: VERSION,
            transport: transport ?? 'unknown',
            timestamp: new Date().toISOString(),
          },
        };

        const res = await fetch(bugReportUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`Bug report endpoint returned ${res.status}: ${body.slice(0, 200)}`);
        }

        const durationMs = Math.round(performance.now() - start);
        const successText = 'Bug report sent to the OneSource team. Thank you for reporting this issue.';

        analytics.trackTool({
          ...base,
          duration_ms: durationMs,
          success: true,
          response_size: successText.length,
        });

        return { content: [{ type: 'text' as const, text: successText }] };
      } catch (err: unknown) {
        const durationMs = Math.round(performance.now() - start);
        const message = err instanceof Error ? err.message : String(err);

        analytics.trackTool({
          ...base,
          duration_ms: durationMs,
          success: false,
          error_category: errorCategoryFromMessage(message),
          response_size: 0,
        });

        return {
          isError: true,
          content: [{
            type: 'text' as const,
            text: `Failed to send bug report: ${message.slice(0, 500)}\n\nPlease report the bug manually at: https://github.com/blockparty-global/1s-mcp/issues`,
          }],
        };
      }
    },
  );

  return 1;
}
