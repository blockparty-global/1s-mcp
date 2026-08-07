/**
 * The tools registered in register-docs-tools.ts span two analytics surfaces.
 *
 * `1s_setup_check` and `1s_batch_config` are operational tooling for the MCP
 * server — free, unauthenticated, and unrelated to documentation. They used to
 * report as `onesource-docs`, which put MCP-server configuration traffic onto
 * the analytics dashboard's Docs MCP surface, so that surface conflated two
 * unrelated things.
 *
 * The corresponding dashboard-side mapping lives in 1s-analytics
 * src/lib/services.ts (SERVICE_TO_SURFACE).
 */
import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDocsTools, serviceForToolCategory } from './register-docs-tools.js';
import type { Analytics, ToolCallEvent } from './analytics.js';

describe('serviceForToolCategory', () => {
  it('routes ops tooling to the ops service', () => {
    expect(serviceForToolCategory('ops')).toBe('onesource-ops');
  });

  it('leaves documentation tools on the docs service', () => {
    expect(serviceForToolCategory('docs')).toBe('onesource-docs');
    // Default when a call site passes nothing.
    expect(serviceForToolCategory(undefined)).toBe('onesource-docs');
  });
});

/**
 * Registers the real tools against a real McpServer, then invokes each one and
 * captures what it reported. A unit test of the mapping alone would still pass
 * if a call site stopped passing 'ops', which is the regression that matters.
 */
async function captureToolEvents(): Promise<ToolCallEvent[]> {
  const events: ToolCallEvent[] = [];
  const analytics = {
    trackTool: (e: ToolCallEvent) => { events.push(e); },
    trackHttp: vi.fn(),
    trackService: vi.fn(),
    flush: vi.fn(),
    stop: vi.fn(),
  } as unknown as Analytics;

  const server = new McpServer({ name: 'test', version: '0.0.0' });
  const registered = new Map<string, (input: Record<string, unknown>, extra: unknown) => Promise<unknown>>();
  const originalRegister = server.registerTool.bind(server);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (server as any).registerTool = (name: string, config: unknown, handler: any) => {
    registered.set(name, handler);
    return originalRegister(name, config as never, handler);
  };

  registerDocsTools({ server, analytics, transport: 'stdio', authMethod: 'none' });

  for (const [, handler] of registered) {
    // `1s_batch_config` with no arguments just reports current settings;
    // `1s_setup_check` takes none. Both emit exactly one tool_call either way.
    await handler({}, { sessionId: undefined });
  }

  return events;
}

describe('registered tool analytics', () => {
  it('reports the live setup and config tools under onesource-ops', async () => {
    const events = await captureToolEvents();
    const names = events.map((e) => e.tool).sort();
    expect(names).toEqual(['1s_batch_config', '1s_setup_check']);

    for (const e of events) {
      expect(e.service).toBe('onesource-ops');
      expect(e.category).toBe('ops');
    }
  });

  it('reports nothing under onesource-docs while the docs tools are disabled', async () => {
    // The documentation tools in this file are commented out. If they are
    // re-enabled they should appear here as onesource-docs — at which point
    // this assertion is the prompt to update it deliberately rather than
    // discovering the surface changed meaning from a chart.
    const events = await captureToolEvents();
    expect(events.filter((e) => e.service === 'onesource-docs')).toHaveLength(0);
  });
});
