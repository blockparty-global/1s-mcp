import type { IncomingMessage } from 'node:http';

/**
 * Thrown by readBody when the body exceeds maxBytes, so callers can answer 413
 * rather than lumping the overflow in with a generic parse failure.
 */
export class BodyTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`request body exceeds ${maxBytes} bytes`);
    this.name = 'BodyTooLargeError';
  }
}

/**
 * Read a request body once, to completion, with a hard size cap.
 *
 * This is the ONLY consumer the body may have. Attaching a 'data' listener puts
 * an IncomingMessage into flowing mode and consumes it, so a second reader —
 * including the MCP SDK's internal one — sees an exhausted stream. Anything that
 * needs the body after this must use the returned string.
 */
export async function readBody(req: IncomingMessage, maxBytes = 65536): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;
    req.on('data', (chunk: Buffer) => {
      if (settled) return;
      total += chunk.length;
      if (total > maxBytes) {
        // Settle before pausing so a racing 'end' can't resolve a truncated body.
        // Deliberately not req.destroy() — that kills the socket and the caller's
        // 413 never reaches the client. Leaving the rest unread is fine: Node
        // closes the connection once the response ends.
        settled = true;
        req.pause();
        reject(new BodyTooLargeError(maxBytes));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', (err: Error) => {
      if (settled) return;
      settled = true;
      reject(err);
    });
  });
}
