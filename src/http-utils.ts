import type { IncomingMessage } from 'node:http';

export async function readBody(req: IncomingMessage, maxBytes = 65536): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        req.destroy(new Error('request body too large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      // settled guard is load-bearing: req.destroy(err) fires 'error' async; 'end' may arrive first
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
