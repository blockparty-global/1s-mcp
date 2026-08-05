import { describe, it, expect } from 'vitest';
import { PassThrough } from 'node:stream';
import type { IncomingMessage } from 'node:http';
import { readBody, BodyTooLargeError } from './http-utils.js';

/**
 * A PassThrough is close enough to an IncomingMessage for readBody: both are
 * readable streams that emit 'data'/'end'/'error'.
 */
function fakeReq(): PassThrough & IncomingMessage {
  return new PassThrough() as unknown as PassThrough & IncomingMessage;
}

describe('readBody', () => {
  it('reads a whole body', async () => {
    const req = fakeReq();
    const p = readBody(req);
    req.end('{"a":1}');
    expect(await p).toBe('{"a":1}');
  });

  it('reassembles a body delivered across chunks', async () => {
    const req = fakeReq();
    const p = readBody(req);
    req.write('{"a":');
    req.write('1}');
    req.end();
    expect(await p).toBe('{"a":1}');
  });

  it('accepts a body of exactly maxBytes', async () => {
    const req = fakeReq();
    const p = readBody(req, 16);
    req.end('x'.repeat(16));
    expect(await p).toHaveLength(16);
  });

  it('rejects one byte over maxBytes', async () => {
    const req = fakeReq();
    const p = readBody(req, 16);
    req.end('x'.repeat(17));
    await expect(p).rejects.toThrow(BodyTooLargeError);
  });

  // The cap must not silently hand back a truncated body: 'end' arrives right
  // after the oversize chunk, and if it won the race the caller would parse a
  // half-body as if it were the whole request.
  it('does not resolve a truncated body when the cap trips mid-stream', async () => {
    const req = fakeReq();
    const p = readBody(req, 8);
    req.write('x'.repeat(4));
    req.write('x'.repeat(10));
    req.end();
    await expect(p).rejects.toThrow(BodyTooLargeError);
  });

  it('rejects when the stream errors', async () => {
    const req = fakeReq();
    const p = readBody(req);
    req.destroy(new Error('socket hang up'));
    await expect(p).rejects.toThrow('socket hang up');
  });

  // Regression guard for the hosted-MCP outage (todo 036): readBody consumes the
  // stream, so nothing downstream can read it a second time. Any caller that needs
  // the body afterwards must use the returned string.
  it('leaves the stream exhausted for any later reader', async () => {
    const req = fakeReq();
    const body = await (async () => { const p = readBody(req); req.end('{"a":1}'); return p; })();
    expect(body).toBe('{"a":1}');

    const leftover: Buffer[] = [];
    req.on('data', (c: Buffer) => leftover.push(c));
    await new Promise((r) => setImmediate(r));
    expect(Buffer.concat(leftover).toString()).toBe('');
  });
});
