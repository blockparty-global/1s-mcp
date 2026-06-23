#!/usr/bin/env node
/**
 * CLI entry point for onesource-mcp (unified server).
 *
 * Usage:
 *   npx onesource-mcp             # stdio mode (default)
 *   npx onesource-mcp --http      # HTTP server on port 3000
 *   npx onesource-mcp --http --port=8080
 */

import { parseBearerToken } from './auth-header.js';

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

/**
 * Build the batch-settlement guidance line for the agent system prompt.
 *
 * Only meaningful when paying via x402; returns '' for api_key/none. The line's
 * proactivity is driven by the resolved batch preferences (file > env > default;
 * see batch-prefs.ts):
 *   prompt     — autonomy level: 'ask' (default) | 'auto' | 'off'
 *   threshold  — count of anticipated calls that means "many" (default 5)
 */
function buildBatchGuidance(
  authMethod: 'api_key' | 'x402' | 'mpp' | 'none',
  prompt: 'ask' | 'auto' | 'off',
  threshold: number,
): string {
  // MPP rail: the cheaper-for-a-burst mode is a Tempo voucher channel.
  if (authMethod === 'mpp') {
    if (prompt === 'off') {
      return 'Session payments: only switch to a voucher channel if the user explicitly asks. The unspent deposit is reclaimed with 1s_refund (or automatically on shutdown). You can change this preference with 1s_batch_config.';
    }
    if (prompt === 'auto') {
      return `Session payments: when you anticipate ${threshold} or more blockchain calls in a session, switch to a voucher channel automatically via 1s_payment_mode {mode:'mpp-session'}, and call 1s_refund when finished to reclaim the unspent deposit (it also settles automatically on shutdown). Behaviour is configurable with 1s_batch_config.`;
    }
    return `Session payments: when you anticipate ${threshold} or more blockchain calls in one session, mpp-session (a Tempo voucher channel) is cheaper than per-call mpp-charge. Because it deposits up front, ask the user before switching; on agreement call 1s_payment_mode {mode:'mpp-session'}, and remind them to 1s_refund the unspent deposit when finished (it also settles automatically on shutdown). Tune behaviour any time via 1s_batch_config — no restart needed.`;
  }

  if (authMethod !== 'x402') return '';

  if (prompt === 'off') {
    return 'Batch payments: only switch to batch mode if the user explicitly asks. You can change this preference with 1s_batch_config.';
  }
  if (prompt === 'auto') {
    return `Batch payments: when you anticipate ${threshold} or more blockchain calls in a session, switch to batch automatically via 1s_payment_mode {mode:'x402-batch'}, and call 1s_refund when finished to reclaim leftover balance. Batch behaviour is configurable with 1s_batch_config.`;
  }
  return `Batch payments: when you anticipate ${threshold} or more blockchain calls in one session, batch mode (a USDC payment channel) is cheaper than per-call exact payments. Because batch deposits USDC up front, ask the user before switching; on agreement call 1s_payment_mode {mode:'x402-batch'}, and remind them to 1s_refund leftover balance when finished. The user can tune batch behaviour (autonomy, threshold, deposit) any time via 1s_batch_config — no restart needed.`;
}

/** Build the MCP instructions string based on version comparison and active auth method. */
function buildInstructions(
  currentVersion: string,
  latestVersion: string | null,
  authMethod: 'api_key' | 'x402' | 'mpp' | 'none',
  batchPrompt: 'ask' | 'auto' | 'off',
  batchThreshold: number,
): string {
  const authLine = authMethod === 'api_key'
    ? 'Blockchain API tools are authenticated via API key. If a tool returns a 402 error, the API key may be invalid or inactive — tell the user to verify their key at app.onesource.io. If a tool returns a 403 error, the account does not have a developer plan — tell the user to upgrade at app.onesource.io.'
    : authMethod === 'x402'
      ? 'Blockchain API tools require x402 payment (USDC on Base). If a tool returns a 402 error, the user needs to configure X402_PRIVATE_KEY. Call 1s_setup_check for diagnostics and setup instructions.'
      : authMethod === 'mpp'
        ? 'Blockchain API tools are paid via MPP (Tempo USDC.e / pathUSD). If a tool returns a 402 error, the MPP wallet (MPP_PRIVATE_KEY) may be unfunded — it must hold USDC.e or pathUSD on Tempo. Call 1s_setup_check for diagnostics.'
        : 'Blockchain API tools require authentication. Set ONESOURCE_API_KEY (API key), X402_PRIVATE_KEY (x402 on Base), or MPP_PRIVATE_KEY (MPP on Tempo) to access them. Call 1s_setup_check for setup instructions.';

  const batchGuidance = buildBatchGuidance(authMethod, batchPrompt, batchThreshold);

  const baseline = [
    'OneSource MCP — 30 tools for blockchain data.',
    '',
    authLine,
    ...(batchGuidance ? ['', batchGuidance] : []),
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

  // Auth detection — API key takes priority over a payment wallet
  const apiKey = process.env.ONESOURCE_API_KEY?.trim() || undefined;
  const hasWallet = !!(process.env.X402_PRIVATE_KEY || process.env.MPP_PRIVATE_KEY);

  if (apiKey && hasWallet) {
    console.error('[onesource] WARNING: ONESOURCE_API_KEY is set alongside a payment wallet. API key takes priority; X402_PRIVATE_KEY / MPP_PRIVATE_KEY will not be used.');
  }

  let authMethod: 'api_key' | 'x402' | 'mpp' | 'none' = 'none';
  let x402Fetch: typeof globalThis.fetch | undefined;
  let x402Address: string | undefined;

  // Resolve payment preferences (file > env > default) and mirror them into
  // process.env BEFORE setupPayments builds the payer, so settings saved via
  // 1s_batch_config take effect at startup. closePaymentSession is captured for
  // graceful shutdown (settles any open MPP voucher channel).
  const { loadBatchPrefs } = await import('./batch-prefs.js');
  const batchPrefs = loadBatchPrefs();
  const { setupPayments, closePaymentSession } = await import('@one-source/api-mcp/payment');

  if (apiKey) {
    authMethod = 'api_key';
    console.error('[onesource] auth: api_key');
  } else {
    try {
      const pay = setupPayments();
      if (pay.enabled) {
        authMethod = pay.authMethod;
        x402Fetch = pay.fetch;
        x402Address = pay.x402Address ?? pay.mppAddress;
        console.error(`[onesource] auth: ${authMethod} (wallet: ${x402Address})`);
      } else {
        console.error('[onesource] auth: none');
      }
    } catch (err) {
      console.error(`[onesource] payment setup failed, continuing without auth: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Bug report endpoint (silent override for dev/testing)
  const bugReportUrl = process.env.ONESOURCE_BUG_REPORT_URL;

  // Check for updates (non-blocking, 3s timeout)
  const latestVersion = await checkLatestVersion();
  const instructions = buildInstructions(VERSION, latestVersion, authMethod, batchPrefs.prompt, batchPrefs.threshold);
  if (latestVersion && latestVersion !== VERSION) {
    console.error(`[onesource] v${VERSION} (update available: v${latestVersion})`);
  } else if (latestVersion) {
    console.error(`[onesource] v${VERSION} (latest)`);
  } else {
    console.error(`[onesource] v${VERSION}`);
  }

  // Instructions variant for requests that authenticate with a per-request
  // Bearer API key (multi-tenant HTTP hosting) — mirrors the api_key startup path.
  const apiKeyInstructions = buildInstructions(VERSION, latestVersion, 'api_key', batchPrefs.prompt, batchPrefs.threshold);

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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id, Authorization');

    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }

    // Browser redirect — GET / with Accept: text/html → landing page
    if (req.method === 'GET' && req.url === '/' && req.headers['accept']?.includes('text/html')) {
      res.writeHead(301, { 'Location': 'https://onesource.io/mcp' });
      res.end();
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

    // ── Per-request API-key auth (multi-tenant HTTP hosting) ─────────────────
    // A remote buyer (e.g. via AWS Marketplace or Bedrock AgentCore Gateway)
    // connects to this hosted endpoint and sends their key as
    // `Authorization: Bearer sk_...`. Forward it as a per-request client so the
    // upstream gateway authenticates THEM. Without a header, behaviour is
    // unchanged — requests fall back to the process-level auth (x402/none),
    // which is what local stdio installs and the env-keyed deployments use.
    //
    // Note: x402 cannot be performed server-side for arbitrary callers (the
    // payer must hold the signing key), so a forwarded API key is the only way
    // the hosted endpoint can serve data for a remote buyer.
    let reqClient = sharedClient;
    let reqAuthMethod = authMethod;
    let reqInstructions = instructions;
    const bearerKey = parseBearerToken(req.headers['authorization']);
    if (bearerKey) {
      try {
        // Per-request client; never logged. baseUrl resolves from
        // ONESOURCE_BASE_URL (default https://api.onesource.io).
        reqClient = createClientFromEnv({ apiKey: bearerKey });
        reqAuthMethod = 'api_key';
        reqInstructions = apiKeyInstructions;
      } catch {
        // Malformed key (e.g. contains a newline) — ignore and fall back to
        // the process-level auth rather than failing the request.
      }
    }

    // Fresh server per request (SDK stateless pattern), shared singletons
    const { server } = createMcpServer({
      analytics: sharedAnalytics,
      client: reqClient,
      transport: 'http',
      authMethod: reqAuthMethod,
      x402Address,
      instructions: reqInstructions,
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

  // Graceful shutdown — flush analytics + settle any open MPP session before exit
  const shutdown = async () => {
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
        await closePaymentSession();
      })(),
      new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
    ]);
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

} else {
  // ---------- Stdio mode (default) ----------

  const { createMcpServer, VERSION } = await import('./create-server.js');
  const { StdioServerTransport } = await import(
    '@modelcontextprotocol/sdk/server/stdio.js'
  );
  const { createClientFromEnv } = await import('@one-source/api-mcp/client');

  // Auth detection — API key takes priority over a payment wallet
  const apiKey = process.env.ONESOURCE_API_KEY?.trim() || undefined;
  const hasWallet = !!(process.env.X402_PRIVATE_KEY || process.env.MPP_PRIVATE_KEY);

  if (apiKey && hasWallet) {
    console.error('[onesource] WARNING: ONESOURCE_API_KEY is set alongside a payment wallet. API key takes priority; X402_PRIVATE_KEY / MPP_PRIVATE_KEY will not be used.');
  }

  let authMethod: 'api_key' | 'x402' | 'mpp' | 'none' = 'none';
  let x402Fetch: typeof globalThis.fetch | undefined;
  let x402Address: string | undefined;

  // Resolve payment preferences (file > env > default) and mirror them into
  // process.env BEFORE setupPayments builds the payer, so settings saved via
  // 1s_batch_config take effect at startup. closePaymentSession is captured for
  // graceful shutdown (settles any open MPP voucher channel).
  const { loadBatchPrefs } = await import('./batch-prefs.js');
  const batchPrefs = loadBatchPrefs();
  const { setupPayments, closePaymentSession } = await import('@one-source/api-mcp/payment');

  if (apiKey) {
    authMethod = 'api_key';
    console.error('[onesource] auth: api_key');
  } else {
    try {
      const pay = setupPayments();
      if (pay.enabled) {
        authMethod = pay.authMethod;
        x402Fetch = pay.fetch;
        x402Address = pay.x402Address ?? pay.mppAddress;
        console.error(`[onesource] auth: ${authMethod} (wallet: ${x402Address})`);
      } else {
        console.error('[onesource] auth: none');
      }
    } catch (err) {
      console.error(`[onesource] payment setup failed, continuing without auth: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Bug report endpoint (silent override for dev/testing)
  const bugReportUrl = process.env.ONESOURCE_BUG_REPORT_URL;

  // Check for updates (non-blocking, 3s timeout)
  const latestVersion = await checkLatestVersion();
  const instructions = buildInstructions(VERSION, latestVersion, authMethod, batchPrefs.prompt, batchPrefs.threshold);
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

  // Graceful shutdown — flush analytics + settle any open MPP session before exit
  const shutdown = async () => {
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
        await closePaymentSession();
      })(),
      new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
    ]);
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

// Empty export makes this file a module (required for top-level await in TypeScript)
export {};
