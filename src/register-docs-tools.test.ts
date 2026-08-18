/**
 * The tools registered in register-docs-tools.ts span two analytics surfaces.
 *
 * The documentation tools are the documentation surface. `1s_setup_check` and
 * `1s_batch_config` are operational tooling for the MCP server — free,
 * unauthenticated, and unrelated to documentation. They used to report as
 * `onesource-docs`, which put MCP-server configuration traffic onto the
 * analytics dashboard's Docs MCP surface, so that surface conflated two
 * unrelated things.
 *
 * The corresponding dashboard-side mapping lives in 1s-analytics
 * src/lib/services.ts (SERVICE_TO_SURFACE).
 */
import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMcpServer } from './create-server.js';
import { DOCS_TOOL_NAMES, registerDocsTools, serviceForToolCategory } from './register-docs-tools.js';
import type { Analytics, ToolCallEvent } from './analytics.js';

/**
 * The roster is imported rather than restated, so these tests cannot drift into
 * asserting a set of tools the server no longer registers. This one assertion
 * anchors it: adding or removing a tool must be a deliberate edit here too.
 */
const EXPECTED_DOCS_TOOL_COUNT = 8;

/** Operational tools registered alongside them by the same module. */
const OPS_TOOL_NAMES = ['1s_setup_check', '1s_batch_config'];

/**
 * Tools that must never reach the multi-tenant HTTP server: they mutate the
 * process-level payment singleton, which no single HTTP caller can own.
 */
const WALLET_TOOL_NAMES = ['1s_payment_mode', '1s_refund'];

function stubAnalytics(events: ToolCallEvent[]): Analytics {
  return {
    trackTool: (e: ToolCallEvent) => { events.push(e); },
    trackHttp: vi.fn(),
    trackService: vi.fn(),
    flush: vi.fn(),
    stop: vi.fn(),
  } as unknown as Analytics;
}

/** Tool names registered on a server built for the given transport. */
function registeredToolNames(transport: 'stdio' | 'http'): string[] {
  const { server } = createMcpServer({ analytics: stubAnalytics([]), transport });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Object.keys((server as any)._registeredTools);
}

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
 *
 * `args` supplies real input for the tools that need it; anything absent is
 * called with `{}`.
 */
async function captureToolEvents(
  args: Record<string, Record<string, unknown>> = {},
): Promise<ToolCallEvent[]> {
  const events: ToolCallEvent[] = [];
  const analytics = stubAnalytics(events);

  const server = new McpServer({ name: 'test', version: '0.0.0' });
  const registered = new Map<string, (input: Record<string, unknown>, extra: unknown) => Promise<unknown>>();
  const originalRegister = server.registerTool.bind(server);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (server as any).registerTool = (name: string, config: unknown, handler: any) => {
    registered.set(name, handler);
    return originalRegister(name, config as never, handler);
  };

  registerDocsTools({ server, analytics, transport: 'stdio', authMethod: 'none' });

  for (const [name, handler] of registered) {
    // `1s_batch_config` with no arguments just reports current settings;
    // `1s_setup_check` takes none. Both emit exactly one tool_call either way.
    await handler(args[name] ?? {}, { sessionId: undefined });
  }

  return events;
}

describe('registered tool analytics', () => {
  it('reports the live setup and config tools under onesource-ops', async () => {
    const events = await captureToolEvents();
    const opsEvents = events.filter((e) => e.service === 'onesource-ops');
    expect(opsEvents.map((e) => e.tool).sort()).toEqual([...OPS_TOOL_NAMES].sort());

    for (const e of opsEvents) {
      expect(e.category).toBe('ops');
    }
  });

  it('reports the documentation tools under onesource-docs', async () => {
    const events = await captureToolEvents();
    const docsEvents = events.filter((e) => e.service === 'onesource-docs');
    expect(docsEvents.map((e) => e.tool).sort()).toEqual([...DOCS_TOOL_NAMES].sort());

    for (const e of docsEvents) {
      expect(e.category).toBe('docs');
    }
  });
});

describe('documentation tools', () => {
  it('exposes the expected roster', () => {
    expect(DOCS_TOOL_NAMES).toHaveLength(EXPECTED_DOCS_TOOL_COUNT);
    // Names are shared with the standalone @one-source/docs-mcp server so the
    // bundled docs corpus, which names these tools, stays accurate here too.
    expect(DOCS_TOOL_NAMES).toContain('1s_search_docs');
    expect(DOCS_TOOL_NAMES).toContain('1s_get_endpoint_reference');
  });

  it('registers every docs tool on stdio', () => {
    const names = registeredToolNames('stdio');
    for (const name of DOCS_TOOL_NAMES) {
      expect(names).toContain(name);
    }
  });

  /**
   * Docs tools are read-only and stateless, so unlike the wallet tools they are
   * safe on the shared HTTP server. Asserting both halves in one test keeps the
   * split visible: regressing either side silently changes what the hosted
   * server offers.
   */
  it('registers every docs tool on HTTP, and no wallet tool', () => {
    const names = registeredToolNames('http');
    for (const name of DOCS_TOOL_NAMES) {
      expect(names).toContain(name);
    }
    for (const name of WALLET_TOOL_NAMES) {
      expect(names).not.toContain(name);
    }
  });

  it('answers a keyword search with matching documentation sections', async () => {
    const events = await captureToolEvents({
      '1s_search_docs': { query: 'authentication' },
    });
    const event = events.find((e) => e.tool === '1s_search_docs');
    expect(event).toBeDefined();
    expect(event!.success).toBe(true);
    expect(event!.response_size).toBeGreaterThan(0);
    expect(event!.input_params).toEqual(['query']);
  });

  it('answers an endpoint reference lookup for a real endpoint', async () => {
    const events = await captureToolEvents({
      '1s_get_endpoint_reference': { endpoint: '/api/chain/network-info' },
    });
    const event = events.find((e) => e.tool === '1s_get_endpoint_reference');
    expect(event).toBeDefined();
    expect(event!.success).toBe(true);
    expect(event!.response_size).toBeGreaterThan(0);
  });

  /**
   * Handlers narrow their input by re-parsing it through the tool's own schema.
   * That parse is what turns bad input into a thrown error the instrumentation
   * can see; without it a malformed argument would reach the upstream handler
   * as an unchecked cast and whatever came back would be logged as a success.
   */
  it('records a rejected input as a failure, not a success', async () => {
    const events = await captureToolEvents({
      '1s_get_endpoint_reference': { endpoint: 42 },
    });
    const event = events.find((e) => e.tool === '1s_get_endpoint_reference');
    expect(event).toBeDefined();
    expect(event!.success).toBe(false);
  });
});
