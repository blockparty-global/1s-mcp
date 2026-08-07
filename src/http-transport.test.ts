import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * End-to-end guard for the HTTP transport.
 *
 * This exists because of todo 036: for five weeks the hosted server answered
 * `Parse error: Invalid JSON` to every POST while `GET /health` stayed green, and
 * nothing in the suite or in CI ever completed a handshake. A test that only pokes
 * /health would have shipped that regression too, so this one POSTs.
 *
 * It drives the built `dist/cli.js` as a real subprocess rather than importing the
 * handler, because the bug lived in how the Node request stream was consumed — a
 * detail only a real socket reproduces.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(root, 'dist/cli.js');

/** Ask the OS for a free port so parallel runs don't collide. */
async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const addr = s.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      s.close(() => resolve(port));
    });
  });
}

async function post(port: number, body: string, headers: Record<string, string> = {}) {
  return fetch(`http://127.0.0.1:${port}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...headers,
    },
    body,
  });
}

/**
 * Build a syntactically valid JSON-RPC document of an exact byte length by sizing
 * a padding string. Used to probe the 64KB cap on both sides of the boundary.
 */
function bodyOfExactly(bytes: number): string {
  const shell = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { pad: '' } });
  const pad = 'x'.repeat(bytes - shell.length);
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { pad } });
  if (body.length !== bytes) throw new Error(`wanted ${bytes} bytes, built ${body.length}`);
  return body;
}

let server: ChildProcess;
let port: number;

beforeAll(async () => {
  if (!existsSync(cli)) {
    throw new Error(`dist/cli.js not found at ${cli} — run "npm run build:tsc" first`);
  }
  port = await freePort();

  // Clean auth env so the server starts in 'none' mode: deterministic, and no
  // payment rail is set up or contacted at boot.
  const env = { ...process.env, PORT: String(port), ONESOURCE_ANALYTICS: 'false' };
  delete env.ONESOURCE_API_KEY;
  delete env.X402_PRIVATE_KEY;
  delete env.MPP_PRIVATE_KEY;

  server = spawn(process.execPath, [cli, '--http'], { env, stdio: ['ignore', 'ignore', 'pipe'] });

  let stderr = '';
  server.stderr?.on('data', (c: Buffer) => { stderr += c.toString(); });

  // Poll until the port answers. Startup includes a 3s npm version check.
  const deadline = Date.now() + 30_000;
  for (;;) {
    if (server.exitCode !== null) throw new Error(`server exited ${server.exitCode}:\n${stderr}`);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.ok) break;
    } catch { /* not listening yet */ }
    if (Date.now() > deadline) throw new Error(`server never came up:\n${stderr}`);
    await new Promise((r) => setTimeout(r, 250));
  }
}, 40_000);

afterAll(() => {
  server?.kill();
});

describe('HTTP transport', () => {
  it('completes an initialize handshake', async () => {
    const res = await post(port, JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'vitest', version: '1' },
      },
    }));

    expect(res.status).toBe(200);
    const text = await res.text();

    // Stateless streamable-HTTP answers as an SSE frame: `event: message\ndata: {...}`.
    const payload = JSON.parse(text.slice(text.indexOf('data: ') + 'data: '.length).trim());
    expect(payload.error).toBeUndefined();
    expect(payload.result.serverInfo.name).toBe('onesource');
    expect(payload.result.protocolVersion).toBeTruthy();
  });

  it('lists tools', async () => {
    const res = await post(port, JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));
    expect(res.status).toBe(200);
    const text = await res.text();
    const payload = JSON.parse(text.slice(text.indexOf('data: ') + 'data: '.length).trim());
    expect(payload.result.tools.length).toBeGreaterThan(0);
  });

  it('answers -32700 for a malformed body', async () => {
    const res = await post(port, '{not json');
    expect(res.status).toBe(400);
    expect((await res.json() as { error: { code: number } }).error.code).toBe(-32700);
  });

  it('accepts a body of exactly 64KB', async () => {
    const res = await post(port, bodyOfExactly(65536));
    expect(res.status).not.toBe(413);
  });

  // Declared Content-Length: rejected up front, before a server is built.
  it('rejects a declared body over 64KB with 413', async () => {
    const res = await post(port, bodyOfExactly(65537));
    expect(res.status).toBe(413);
    // The 413 must carry a body — an earlier version destroyed the socket, so the
    // client saw a connection reset instead of an explanation.
    expect((await res.json() as { error: { message: string } }).error.message).toMatch(/too large/);
  });

  // No Content-Length: only the streaming cap can catch this one.
  it('rejects an oversized chunked body with 413', async () => {
    const big = bodyOfExactly(200_000);
    const res = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      // A ReadableStream body makes undici use chunked transfer encoding.
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(big));
          controller.close();
        },
      }),
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });
    expect(res.status).toBe(413);
  });
});
