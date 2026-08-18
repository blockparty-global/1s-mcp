/**
 * Bridge to the documentation tools in `@one-source/docs-mcp`.
 *
 * That package publishes a single entry point — a factory that builds its own
 * `McpServer` — and does not export the individual tool handlers. So the
 * unified server cannot call them as plain functions. Instead it runs the docs
 * server in-process behind an in-memory transport pair and forwards tool calls
 * to it. Nothing leaves the process: no socket, no port, no network hop.
 *
 * Consequences worth knowing before changing this:
 *
 * - The docs server is a lazily-created module singleton. Documentation tools
 *   are read-only and stateless, so one instance is safe to share across every
 *   caller — including HTTP mode, where the unified server itself is rebuilt
 *   per request and a per-request docs server would re-read the bundled docs
 *   corpus every time.
 * - The docs server is given a silent analytics sink. Every docs call is
 *   already recorded by the unified server's own instrumentation in
 *   `register-docs-tools.ts`; letting the inner server report as well would
 *   double-count the same call on the dashboard.
 * - Upstream tool names are an internal detail of this bridge. The names the
 *   unified server exposes are declared in `register-docs-tools.ts`.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer as createDocsMcpServer } from '@one-source/docs-mcp';
import { VERSION } from './version.js';

/** Text content block as returned over the wire by a tool call. */
interface TextBlock {
  type: string;
  text?: string;
}

/**
 * Analytics sink handed to the docs server so its tool calls are not reported
 * twice. Written as an explicit object rather than a cast: if the docs
 * package's analytics interface grows a method, this stops compiling instead
 * of failing at runtime on the first tool call.
 */
const silentAnalytics = {
  trackTool(): void {},
  trackService(): void {},
  stop(): void {},
  async flush(): Promise<void> {},
};

let connection: Promise<Client> | null = null;

async function connect(): Promise<Client> {
  const { server } = createDocsMcpServer({ analytics: silentAnalytics });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'onesource-unified', version: VERSION });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

/**
 * Connect on first use and reuse the connection thereafter. A failed connect
 * clears the cache so the next call retries rather than replaying the same
 * rejected promise forever.
 */
function docsClient(): Promise<Client> {
  connection ??= connect().catch((err: unknown) => {
    connection = null;
    throw err;
  });
  return connection;
}

/**
 * Call a tool on the docs server and return its text output.
 *
 * Throws on tool failure so the caller's instrumentation records it as an
 * error. The docs server reports failures in-band (`isError` with an
 * explanatory text block) rather than by rejecting, which would otherwise be
 * counted as a success.
 */
export async function callDocsTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<string> {
  const client = await docsClient();
  const result = await client.callTool({ name: toolName, arguments: args });

  const blocks = (Array.isArray(result.content) ? result.content : []) as TextBlock[];
  const text = blocks
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('\n')
    .trim();

  if (result.isError) {
    throw new Error(text || `Documentation tool ${toolName} failed`);
  }
  return text;
}

/** List the tool names the docs server exposes. Used by tests and diagnostics. */
export async function listDocsTools(): Promise<string[]> {
  const client = await docsClient();
  const { tools } = await client.listTools();
  return tools.map((tool) => tool.name);
}

/** Drop the cached connection. Tests use this to isolate runs. */
export async function closeDocsBridge(): Promise<void> {
  const pending = connection;
  connection = null;
  if (!pending) return;
  try {
    const client = await pending;
    await client.close();
  } catch {
    // Nothing to close — the connection never came up.
  }
}
