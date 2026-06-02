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

/** Fetch the latest published version from npm (3s timeout, returns null on failure). */
async function checkLatestVersion(): Promise<string | null> {
  try {
    const res = await fetch('https://registry.npmjs.org/@one-source/mcp/latest', {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { version: string };
    return data.version ?? null;
  } catch {
    return null;
  }
}

/** Build the MCP instructions string based on version comparison and active auth method. */
function buildInstructions(currentVersion: string, latestVersion: string | null, authMethod: 'api_key' | 'x402' | 'none'): string {
  const authLine = authMethod === 'api_key'
    ? 'Blockchain API tools are authenticated via API key. If a tool returns a 402 error, the API key may be invalid or inactive — tell the user to verify their key at app.onesource.io. If a tool returns a 403 error, the account does not have a developer plan — tell the user to upgrade at app.onesource.io.'
    : authMethod === 'x402'
      ? 'Blockchain API tools require x402 payment (USDC on Base). If a tool returns a 402 error, the user needs to configure X402_PRIVATE_KEY. Call 1s_setup_check for diagnostics and setup instructions.'
      : 'Blockchain API tools require authentication. Set ONESOURCE_API_KEY (API key) or X402_PRIVATE_KEY (x402 micropayments) to access them. Call 1s_setup_check for setup instructions.';

  const baseline = [
    'OneSource MCP — 28 tools for blockchain data.',
    '',
    authLine,
    '',
    'Bug Reporting: When any blockchain API tool (1s_* prefix) returns an error, automatically call 1s_report_bug with the tool_name, error_message, and a brief description of what was attempted. Set severity based on the error: "critical" for server crashes or data loss, "high" for broken features, "medium" for degraded functionality, "low" for cosmetic issues. Do NOT auto-report 402 or 403 errors — these are auth or billing issues, not bugs (402 means the API key was rejected or x402 payment is required; 403 means a developer plan is required). Do not report the same error more than once per conversation. Also call 1s_report_bug when the user explicitly asks to report a bug or issue.',
  ].join('\n');

  if (latestVersion && latestVersion !== currentVersion) {
    return [
      `UPDATE AVAILABLE: OneSource MCP v${currentVersion} is installed but v${latestVersion} is available. Newer versions may include new tools, bug fixes, or protocol changes. Ask the user to update by running: npx -y @one-source/mcp@latest`,
      '',
      baseline,
    ].join('\n');
  }

  return baseline;
}

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
  const { createMcpServer, VERSION } = await import('./create-server.js');
  const { createAnalytics } = await import('./analytics.js');
  const { createClientFromEnv } = await import('@one-source/api-mcp/client');

  // Auth detection — API key takes priority over x402
  const apiKey = process.env.ONESOURCE_API_KEY?.trim() || undefined;
  const hasX402 = !!process.env.X402_PRIVATE_KEY;

  if (apiKey && hasX402) {
    console.error('[onesource] WARNING: Both ONESOURCE_API_KEY and X402_PRIVATE_KEY are set. API key takes priority; x402 will not be used.');
  }

  let authMethod: 'api_key' | 'x402' | 'none' = 'none';
  let x402Fetch: typeof globalThis.fetch | undefined;
  let x402Address: string | undefined;

  if (apiKey) {
    authMethod = 'api_key';
    console.error('[onesource] auth: api_key');
  } else {
    try {
      const { setupX402 } = await import('@one-source/api-mcp/x402');
      const x402 = setupX402();
      if (x402.enabled) {
        authMethod = 'x402';
        x402Fetch = x402.fetch;
        x402Address = x402.address;
        console.error(`[onesource] auth: x402 (wallet: ${x402.address})`);
      } else {
        console.error('[onesource] auth: none');
      }
    } catch (err) {
      console.error(`[onesource] x402 setup failed, continuing without auth: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Bug report endpoint (silent override for dev/testing)
  const bugReportUrl = process.env.ONESOURCE_BUG_REPORT_URL;

  // Check for updates (non-blocking, 3s timeout)
  const latestVersion = await checkLatestVersion();
  const instructions = buildInstructions(VERSION, latestVersion, authMethod);
  if (latestVersion && latestVersion !== VERSION) {
    console.error(`[onesource] v${VERSION} (update available: v${latestVersion})`);
  } else if (latestVersion) {
    console.error(`[onesource] v${VERSION} (latest)`);
  } else {
    console.error(`[onesource] v${VERSION}`);
  }

  // Shared singletons — reused across stateless per-request servers
  const sharedAnalytics = createAnalytics();
  console.error(`[onesource] analytics: ${process.env.ONESOURCE_ANALYTICS === 'false' ? 'disabled' : `dashboard (${process.env.ONESOURCE_ANALYTICS_URL})`}`);
  console.error(`[onesource] bug reporting: ${bugReportUrl ?? 'https://1s-analytics.vercel.app/api/bugs'}`);
  const sharedClient = createClientFromEnv({ fetch: x402Fetch, apiKey });

  // Compute tool count once at startup (server object is discarded)
  const { toolCount } = createMcpServer({
    analytics: sharedAnalytics,
    client: sharedClient,
    transport: 'http',
    authMethod,
    x402Address,
    instructions,
    bugReportUrl,
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
      analytics: sharedAnalytics,
      client: sharedClient,
      transport: 'http',
      authMethod,
      x402Address,
      instructions,
      bugReportUrl,
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

  // Auth detection — API key takes priority over x402
  const apiKey = process.env.ONESOURCE_API_KEY?.trim() || undefined;
  const hasX402 = !!process.env.X402_PRIVATE_KEY;

  if (apiKey && hasX402) {
    console.error('[onesource] WARNING: Both ONESOURCE_API_KEY and X402_PRIVATE_KEY are set. API key takes priority; x402 will not be used.');
  }

  let authMethod: 'api_key' | 'x402' | 'none' = 'none';
  let x402Fetch: typeof globalThis.fetch | undefined;
  let x402Address: string | undefined;

  if (apiKey) {
    authMethod = 'api_key';
    console.error('[onesource] auth: api_key');
  } else {
    try {
      const { setupX402 } = await import('@one-source/api-mcp/x402');
      const x402 = setupX402();
      if (x402.enabled) {
        authMethod = 'x402';
        x402Fetch = x402.fetch;
        x402Address = x402.address;
        console.error(`[onesource] auth: x402 (wallet: ${x402.address})`);
      } else {
        console.error('[onesource] auth: none');
      }
    } catch (err) {
      console.error(`[onesource] x402 setup failed, continuing without auth: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Bug report endpoint (silent override for dev/testing)
  const bugReportUrl = process.env.ONESOURCE_BUG_REPORT_URL;

  // Check for updates (non-blocking, 3s timeout)
  const latestVersion = await checkLatestVersion();
  const instructions = buildInstructions(VERSION, latestVersion, authMethod);
  if (latestVersion && latestVersion !== VERSION) {
    console.error(`[onesource] v${VERSION} (update available: v${latestVersion})`);
  } else if (latestVersion) {
    console.error(`[onesource] v${VERSION} (latest)`);
  } else {
    console.error(`[onesource] v${VERSION}`);
  }

  const client = createClientFromEnv({ fetch: x402Fetch, apiKey });
  const { server, analytics } = createMcpServer({ client, transport: 'stdio', authMethod, x402Address, instructions, bugReportUrl });
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
  console.error('[onesource] Server connected via stdio');
  console.error(`[onesource] analytics: ${process.env.ONESOURCE_ANALYTICS === 'false' ? 'disabled' : `dashboard (${process.env.ONESOURCE_ANALYTICS_URL})`}`);
  console.error(`[onesource] bug reporting: ${bugReportUrl ?? 'https://1s-analytics.vercel.app/api/bugs'}`);

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
