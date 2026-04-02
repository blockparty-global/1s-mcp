#!/usr/bin/env node
/**
 * CLI entry point for onesource-mcp (unified server).
 *
 * Usage:
 *   npx onesource-mcp             # stdio mode (default)
 *   npx onesource-mcp --http      # HTTP server on port 3000
 *   npx onesource-mcp --http --port=8080
 */

const args = process.argv.slice(2);

if (args.includes('--http')) {
  // ---------- HTTP mode ----------

  // Port priority: PORT env var (set by Railway/hosting) > --port flag > 3000
  const portArgIdx = args.findIndex(
    (a) => a === '--port' || a.startsWith('--port='),
  );
  let port = 3000;
  const envPort = process.env.PORT;
  if (envPort) {
    const parsed = parseInt(envPort, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 65535) {
      port = parsed;
    }
  } else if (portArgIdx !== -1) {
    const arg = args[portArgIdx];
    const portStr = arg.startsWith('--port=')
      ? arg.split('=')[1]
      : args[portArgIdx + 1];
    const parsed = parseInt(portStr ?? '', 10);
    if (!portStr || isNaN(parsed) || parsed < 1 || parsed > 65535) {
      console.error(
        `Error: Invalid port "${portStr ?? ''}". Must be between 1 and 65535.`,
      );
      process.exit(1);
    }
    port = parsed;
  }

  const { StreamableHTTPServerTransport } = await import(
    '@modelcontextprotocol/sdk/server/streamableHttp.js'
  );
  const { createServer } = await import('node:http');
  const { createMcpServer, loadData, VERSION } = await import('./create-server.js');
  const { createAnalytics } = await import('./analytics.js');
  const { createClientFromEnv } = await import('@one-source/api-mcp/client');

  // x402 payment wrapper — only active when X402_PRIVATE_KEY is set
  let x402Fetch: typeof globalThis.fetch | undefined;
  try {
    const { setupX402 } = await import('@one-source/api-mcp/x402');
    const x402 = setupX402();
    if (x402.enabled) {
      console.error(`[onesource] x402 payments enabled (wallet: ${x402.address})`);
      x402Fetch = x402.fetch;
    }
  } catch (err) {
    console.error(`[onesource] x402 setup failed, continuing without payments: ${err instanceof Error ? err.message : err}`);
  }

  // Pre-load docs data once at startup
  const docsData = loadData();

  // Shared singletons — reused across stateless per-request servers
  const sharedAnalytics = createAnalytics();
  console.error(`[onesource] analytics: ${process.env.ONESOURCE_ANALYTICS === 'false' ? 'disabled' : `dashboard (${process.env.ONESOURCE_ANALYTICS_URL})`}`);
  const sharedClient = createClientFromEnv({ fetch: x402Fetch });

  // Compute tool count once at startup (server object is discarded)
  const { toolCount } = createMcpServer({
    docsData,
    analytics: sharedAnalytics,
    client: sharedClient,
    transport: 'http',
  });

  const httpServer = createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');

    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }

    // Health check
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        server: 'onesource-mcp',
        version: VERSION,
        tools: toolCount,
      }));
      return;
    }

    // MCP only accepts POST (stateless mode)
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed' },
        id: null,
      }));
      return;
    }

    // Fresh server per request (SDK stateless pattern), shared singletons
    const { server } = createMcpServer({
      docsData,
      analytics: sharedAnalytics,
      client: sharedClient,
      transport: 'http',
    });
    const httpTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    // Register cleanup before handleRequest so it runs even if handleRequest throws
    res.on('close', () => {
      httpTransport.close();
      server.close();
    });

    try {
      await server.connect(httpTransport);
      await httpTransport.handleRequest(req, res);
    } catch {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        }));
      }
    }
  });

  // Bind to 0.0.0.0 for deployment compatibility (Railway, Fly.io, etc.)
  const host = '0.0.0.0';
  httpServer.listen(port, host, () => {
    console.error(`[onesource] HTTP server listening on http://${host}:${port}`);
    console.error(`[onesource] MCP endpoint: POST http://${host}:${port}/`);
    console.error(`[onesource] Health: GET http://${host}:${port}/health`);
  });

  sharedAnalytics.trackService({
    type: 'service_start',
    service: 'onesource',
    timestamp: new Date().toISOString(),
    version: VERSION,
    details: `http:${port}`,
    source: 'unified',
  });

  // Graceful shutdown — flush analytics before exit
  process.once('SIGINT', async () => {
    sharedAnalytics.trackService({
      type: 'service_stop',
      service: 'onesource',
      timestamp: new Date().toISOString(),
      version: VERSION,
      source: 'unified',
    });
    sharedAnalytics.stop();
    await Promise.race([
      (async () => {
        await sharedAnalytics.flush();
        await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      })(),
      new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
    ]);
    process.exit(0);
  });

} else {
  // ---------- Stdio mode (default) ----------

  const { createMcpServer, VERSION } = await import('./create-server.js');
  const { StdioServerTransport } = await import(
    '@modelcontextprotocol/sdk/server/stdio.js'
  );
  const { createClientFromEnv } = await import('@one-source/api-mcp/client');

  // x402 payment wrapper — only active when X402_PRIVATE_KEY is set
  let x402Fetch: typeof globalThis.fetch | undefined;
  try {
    const { setupX402 } = await import('@one-source/api-mcp/x402');
    const x402 = setupX402();
    if (x402.enabled) {
      console.error(`[onesource] x402 payments enabled (wallet: ${x402.address})`);
      x402Fetch = x402.fetch;
    }
  } catch (err) {
    console.error(`[onesource] x402 setup failed, continuing without payments: ${err instanceof Error ? err.message : err}`);
  }

  const client = createClientFromEnv({ fetch: x402Fetch });
  const { server, analytics } = createMcpServer({ client, transport: 'stdio' });
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
  console.error('[onesource] Server connected via stdio');
  console.error(`[onesource] analytics: ${process.env.ONESOURCE_ANALYTICS === 'false' ? 'disabled' : `dashboard (${process.env.ONESOURCE_ANALYTICS_URL})`}`);

  analytics.trackService({
    type: 'service_start',
    service: 'onesource',
    timestamp: new Date().toISOString(),
    version: VERSION,
    details: 'stdio',
    source: 'unified',
  });

  // Graceful shutdown — flush analytics before exit
  process.once('SIGINT', async () => {
    analytics.trackService({
      type: 'service_stop',
      service: 'onesource',
      timestamp: new Date().toISOString(),
      version: VERSION,
      source: 'unified',
    });
    analytics.stop();
    await Promise.race([
      (async () => {
        await analytics.flush();
        stdioTransport.close();
        await server.close();
      })(),
      new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
    ]);
    process.exit(0);
  });
}

// Empty export makes this file a module (required for top-level await in TypeScript)
export {};
