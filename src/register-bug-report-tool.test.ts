/**
 * Unit tests for the 1s_report_bug tool: input validation, payload shaping,
 * and success / failure handling (including the GitHub fallback message and
 * analytics tracking).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerBugReportTool } from './register-bug-report-tool.js';

type Handler = (input: Record<string, unknown>, extra: { sessionId?: string }) => Promise<{
  isError?: boolean;
  content: { type: string; text: string }[];
}>;

// Capture the handler registered with the server, plus a trackTool spy.
function setup() {
  let handler: Handler | undefined;
  const trackTool = vi.fn();
  const server = {
    registerTool: (_name: string, _def: unknown, h: Handler) => {
      handler = h;
    },
    server: { getClientVersion: () => ({ name: 'test-client', version: '1.0.0' }) },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerBugReportTool({ server: server as any, analytics: { trackTool } as any, bugReportUrl: 'http://bugs.test/api' });
  if (!handler) throw new Error('handler not registered');
  return { handler, trackTool };
}

const VALID = { description: 'Something is clearly broken here', tool_name: '1s_network_info' };

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () => new Response('ok', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('1s_report_bug validation', () => {
  it('rejects a too-short description without calling the endpoint', async () => {
    const { handler } = setup();
    const res = await handler({ description: 'too short' }, {});
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('at least 10 characters');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid tool_name', async () => {
    const { handler } = setup();
    const res = await handler({ ...VALID, tool_name: 'network_info' }, {});
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('Invalid tool_name');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an over-long network field', async () => {
    const { handler } = setup();
    const res = await handler({ ...VALID, network: 'x'.repeat(101) }, {});
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('too long');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('1s_report_bug submission', () => {
  it('posts a shaped payload and reports success + tracks analytics', async () => {
    const { handler, trackTool } = setup();
    const res = await handler({ ...VALID, severity: 'high' }, { sessionId: 'sess-1' });
    expect(res.isError).toBeFalsy();
    expect(res.content[0].text).toContain('sent to the OneSource team');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://bugs.test/api');
    const body = JSON.parse((init as { body: string }).body);
    expect(body.description).toBe(VALID.description);
    expect(body.tool_name).toBe('1s_network_info');
    expect(body.severity).toBe('high');
    expect(body.context.mcp_version).toBeTruthy();

    expect(trackTool).toHaveBeenCalledTimes(1);
    expect(trackTool.mock.calls[0][0]).toMatchObject({ tool: '1s_report_bug', success: true });
  });

  it('defaults severity to medium when omitted', async () => {
    const { handler } = setup();
    await handler({ ...VALID }, {});
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(body.severity).toBe('medium');
  });

  it('on endpoint failure returns the GitHub fallback and tracks failure', async () => {
    fetchMock.mockResolvedValueOnce(new Response('boom', { status: 500 }));
    const { handler, trackTool } = setup();
    const res = await handler({ ...VALID }, {});
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain('Failed to send bug report');
    expect(res.content[0].text).toContain('github.com/blockparty-global/1s-mcp/issues');
    expect(trackTool.mock.calls[0][0]).toMatchObject({ success: false });
  });
});
