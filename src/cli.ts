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
import type { IncomingMessage, ServerResponse } from 'node:http';

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
    ? 'Blockchain API tools are authenticated via API key. If a tool returns a 402 error, the API key may be invalid or inactive — tell the user to verify their key at app.onesource.io. If a tool returns a 403 error, the account does not have a developer plan — tell the user to upgrade at app.onesource.io. To review or change configuration (auth method or either payment rail), run 1s_setup_check — it walks the user through every option interactively.'
    : authMethod === 'x402'
      ? 'Blockchain API tools are paid via x402 (USDC on Base). If a tool returns a 402 error, the wallet (X402_PRIVATE_KEY) may be unfunded — it must hold USDC on Base. To set up, switch payment rail (x402 on Base or MPP on Tempo), or change any setting, run 1s_setup_check — it walks the user through every option interactively, with no manual config editing.'
      : authMethod === 'mpp'
        ? 'Blockchain API tools are paid via MPP (Tempo USDC.e / pathUSD). If a tool returns a 402 error, the MPP wallet (MPP_PRIVATE_KEY) may be unfunded — it must hold USDC.e or pathUSD on Tempo. To set up, switch payment rail (MPP on Tempo or x402 on Base), or change any setting, run 1s_setup_check — it walks the user through every option interactively, with no manual config editing.'
        : 'Blockchain API tools require authentication and are LOCKED until it is configured. The moment the user wants to use a blockchain tool — or asks to set up, configure, or connect OneSource — call 1s_setup_check: it is an interactive setup that walks the user through choosing an auth method (API key) or payment rail (x402 on Base / MPP on Tempo) and every related option, then hands them a ready-to-run command. Do not ask the user to hand-edit env vars or config files; run 1s_setup_check and follow its agent instructions.';

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
  const { handleOAuthMetadata, handleAuthorize, handleToken, resolveBearer } = await import('./oauth.js');
  const { handleConnectInit, handleConnectSubmit } = await import('./connect-page.js');
  const { readFileSync } = await import('node:fs');
  const { join, resolve: resolvePath, extname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');

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

  // Static file serving — web frontend built to web/out/ by npm run build:web
  const webOutDir = resolvePath(fileURLToPath(new URL('.', import.meta.url)), '../web/out');

  const STATIC_MIME: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.js': 'application/javascript',
    '.css': 'text/css',
  };

  function serveStaticFile(res: ServerResponse, filePath: string): void {
    const ext = extname(filePath);
    try {
      const content = readFileSync(filePath);
      res.writeHead(200, {
        'Content-Type': STATIC_MIME[ext] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600',
      });
      res.end(content);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  }

  let connectPageHtml: Buffer | null = null;
  try {
    connectPageHtml = readFileSync(join(webOutDir, 'oauth', 'connect.html'));
  } catch {
    console.error('[onesource] WARNING: web/out/oauth/connect.html not found — run npm run build:web');
  }

  // Per-IP rate limiter for unauthenticated OAuth endpoints.
  // TRUSTED_PROXY=true: use rightmost X-Forwarded-For (appended by ALB/Railway).
  // Without it: use socket IP directly to prevent XFF spoofing.
  const authRateLimitMap = new Map<string, { count: number; resetAt: number }>();
  const submitRateLimitMap = new Map<string, { count: number; resetAt: number }>();
  const RATE_LIMIT_WINDOW_MS = 60_000;
  const RATE_LIMIT_MAX_REQ = 20;
  const RATE_LIMIT_MAX_IPS = 10_000;
  const TRUSTED_PROXY = process.env.TRUSTED_PROXY === 'true';

  if (TRUSTED_PROXY) {
    console.error('[onesource] rate limiting: X-Forwarded-For (TRUSTED_PROXY=true) — ensure an ALB/proxy is in front or XFF is attacker-controlled');
  } else {
    console.error('[onesource] rate limiting: socket IP');
    console.error('[onesource] WARNING: TRUSTED_PROXY not set — if running behind a load balancer (EKS/ALB, Railway), set TRUSTED_PROXY=true or all users will share one rate-limit bucket');
  }

  // Periodic cleanup — avoids O(n) scan on every request.
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of authRateLimitMap) if (v.resetAt < now) authRateLimitMap.delete(k);
    for (const [k, v] of submitRateLimitMap) if (v.resetAt < now) submitRateLimitMap.delete(k);
  }, RATE_LIMIT_WINDOW_MS).unref();

  function getClientIp(req: IncomingMessage): string {
    if (TRUSTED_PROXY) {
      const xff = req.headers['x-forwarded-for'];
      const raw = Array.isArray(xff) ? xff.join(',') : (xff ?? '');
      if (raw) {
        const rightmost = raw.split(',').pop()?.trim();
        if (rightmost) return rightmost;
      }
    }
    return req.socket.remoteAddress ?? 'unknown';
  }

  function checkRateLimit(ip: string, map: Map<string, { count: number; resetAt: number }>): boolean {
    const now = Date.now();
    const entry = map.get(ip);
    if (!entry) {
      if (map.size >= RATE_LIMIT_MAX_IPS) {
        for (const [k, v] of map) if (v.resetAt < now) map.delete(k);
        if (map.size >= RATE_LIMIT_MAX_IPS) return false;
      }
      map.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return true;
    }
    if (entry.resetAt < now) {
      entry.count = 1;
      entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
      return true;
    }
    if (entry.count >= RATE_LIMIT_MAX_REQ) return false;
    entry.count++;
    return true;
  }

  const httpServer = createServer(async (req, res) => {
    const path = req.url?.split('?')[0] ?? '/';

    // POST /oauth/token — no CORS headers (server-to-server endpoint; RFC 6749 §4.1.3)
    if (req.method === 'POST' && path === '/oauth/token') {
      if (!checkRateLimit(getClientIp(req), submitRateLimitMap)) {
        res.writeHead(429, { 'Retry-After': '60', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ error: 'invalid_request', error_description: 'too many requests' }));
        return;
      }
      try { await handleToken(req, res); } catch {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
          res.end(JSON.stringify({ error: 'server_error' }));
        }
      }
      return;
    }

    // CORS headers — /api/oauth/* are same-origin endpoints, no CORS header needed
    if (!path.startsWith('/api/oauth/')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id, Authorization, X-Api-Key');
    }

    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }

    // Browser redirect — GET / with Accept: text/html → landing page
    if (req.method === 'GET' && path === '/' && req.headers['accept']?.includes('text/html')) {
      res.writeHead(301, { 'Location': 'https://onesource.io/mcp' });
      res.end();
      return;
    }

    // Health check
    if (req.method === 'GET' && path === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        server: 'onesource-mcp',
        version: VERSION,
        tools: toolCount,
      }));
      return;
    }

    // OAuth discovery document (RFC 8414)
    if (req.method === 'GET' && path === '/.well-known/oauth-authorization-server') {
      handleOAuthMetadata(req, res); return;
    }

    // OAuth authorization — rate-limited (unauthenticated, writes to authState Map)
    if (req.method === 'GET' && path === '/oauth/authorize') {
      if (!checkRateLimit(getClientIp(req), authRateLimitMap)) {
        res.writeHead(429, { 'Retry-After': '60', 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Too many requests' }, id: null }));
        return;
      }
      handleAuthorize(req, res); return;
    }

    // GET /oauth/connect — serve the Next.js login page (static export)
    if (req.method === 'GET' && path === '/oauth/connect') {
      if (!connectPageHtml) {
        res.writeHead(503, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
        res.end('Web frontend not built. Run: npm run build:web');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      });
      res.end(connectPageHtml);
      return;
    }

    // GET /onesource-logo.svg — static asset for the login page
    if (req.method === 'GET' && path === '/onesource-logo.svg') {
      serveStaticFile(res, join(webOutDir, 'onesource-logo.svg'));
      return;
    }

    // GET /fonts/* — font files for the login page; path traversal guarded
    if (req.method === 'GET' && path.startsWith('/fonts/')) {
      const fontFile = path.slice('/fonts/'.length);
      const fontsDir = resolvePath(webOutDir, 'fonts');
      const fontPath = resolvePath(fontsDir, fontFile);
      if (!fontPath.startsWith(fontsDir + '/') && fontPath !== fontsDir) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
      }
      serveStaticFile(res, fontPath);
      return;
    }

    // GET /api/oauth/connect-init — issue CSRF cookie; rate-limited
    if (req.method === 'GET' && path === '/api/oauth/connect-init') {
      if (!checkRateLimit(getClientIp(req), submitRateLimitMap)) {
        res.writeHead(429, { 'Retry-After': '60', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ error: 'too_many_requests' }));
        return;
      }
      handleConnectInit(req, res); return;
    }

    // POST /api/oauth/connect-submit — validate key, issue auth code; rate-limited
    if (req.method === 'POST' && path === '/api/oauth/connect-submit') {
      if (!checkRateLimit(getClientIp(req), submitRateLimitMap)) {
        res.writeHead(429, { 'Retry-After': '60', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ error: 'too_many_requests' }));
        return;
      }
      try { await handleConnectSubmit(req, res); } catch {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
          res.end(JSON.stringify({ error: 'server_error' }));
        }
      }
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

    // Per-request auth — Authorization: Bearer <key|jwt> or X-Api-Key.
    // JWT Bearer tokens (eyJ prefix) are resolved via resolveBearer(); raw keys
    // are forwarded directly. If a header is present but validation fails, reject
    // with 400/401 rather than silently downgrading to startup auth.
    const rawBearer = parseBearerToken(req.headers['authorization']);
    const xApiKeyHeader = req.headers['x-api-key'];
    let requestApiKey: string | undefined;
    let authHeaderPresent = false;

    if (rawBearer !== undefined) {
      authHeaderPresent = true;
      const candidate = rawBearer;
      if (candidate.length > 0 && candidate.length <= 512 && !/[\r\n]/.test(candidate)) {
        if (candidate.startsWith('eyJ') && candidate.split('.').length === 3) {
          // JWT-shaped token (all JWTs base64url-encode a JSON header starting with 'eyJ').
          // Resolve to underlying API key, or reject; never fall back to raw-key forwarding.
          const resolved = resolveBearer(candidate);
          if (resolved !== null) {
            requestApiKey = resolved;
          } else {
            res.writeHead(401, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'WWW-Authenticate': 'Bearer error="invalid_token"' });
            res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Token expired or invalid' }, id: null }));
            return;
          }
        } else {
          requestApiKey = candidate; // raw API key
        }
      }
    } else if (typeof xApiKeyHeader === 'string') {
      authHeaderPresent = true;
      const candidate = xApiKeyHeader.trim();
      if (candidate.length > 0 && candidate.length <= 512 && !/[\r\n]/.test(candidate)) {
        requestApiKey = candidate;
      }
    }

    if (authHeaderPresent && !requestApiKey) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid API key format' },
        id: null,
      }));
      return;
    }

    // Always create a fresh client per request — avoids concurrent mutation of a shared
    // client's onHttpEvent handler when multiple unauthenticated requests overlap.
    const requestAuthMethod: 'api_key' | 'x402' | 'mpp' | 'none' = requestApiKey ? 'api_key' : authMethod;
    const requestClient = requestApiKey
      ? createClientFromEnv({ apiKey: requestApiKey })
      : createClientFromEnv({ fetch: x402Fetch, apiKey });
    const requestInstructions = requestApiKey ? apiKeyInstructions : instructions;

    // Fresh server per request (SDK stateless pattern), shared singletons
    const { server } = createMcpServer({
      analytics: sharedAnalytics,
      client: requestClient,
      transport: 'http',
      authMethod: requestAuthMethod,
      x402Address,
      instructions: requestInstructions,
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

  httpServer.setTimeout(10_000);

  // Bind to 0.0.0.0 for deployment compatibility (AWS EKS, Railway, Fly.io, etc.)
  const host = '0.0.0.0';
  httpServer.listen(port, host, () => {
    console.error(`[onesource] HTTP server listening on http://${host}:${port}`);
    console.error(`[onesource] MCP endpoint: POST http://${host}:${port}/mcp`);
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
