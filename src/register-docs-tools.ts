/**
 * Register docs tools from @one-source/docs-mcp onto a shared McpServer.
 *
 * NOTE: Docs tools are temporarily disabled (product not yet released).
 * Code is commented out for easy re-enable. Only 1s_setup_check remains active.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { ServerRequest, ServerNotification, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { getPaymentModeInfo, setPaymentMode } from '@one-source/api-mcp/payment';
import {
  getBatchPrefs,
  setBatchPrefs,
  resetBatchPrefs,
  batchConfigPath,
  hasPersistedConfig,
  coercePrompt,
  coerceThreshold,
  coerceMultiplier,
  coerceMaxDeposit,
  coerceMode,
  MIN_DEPOSIT_MULTIPLIER,
  type BatchPrefs,
} from './batch-prefs.js';

// import { loadData, type LoadedData } from '@one-source/docs-mcp';
// import { searchDocsSchema, handleSearchDocs } from '@one-source/docs-mcp/tools/search-docs';
// import { getQueryReferenceSchema, handleGetQueryReference } from '@one-source/docs-mcp/tools/get-query-reference';
// import { getTypeDefinitionSchema, handleGetTypeDefinition } from '@one-source/docs-mcp/tools/get-type-definition';
// import { listExamplesSchema, handleListExamples } from '@one-source/docs-mcp/tools/list-examples';
// import { listSupportedChainsSchema, handleListSupportedChains } from '@one-source/docs-mcp/tools/list-supported-chains';
// import { getFilterReferenceSchema, handleGetFilterReference } from '@one-source/docs-mcp/tools/get-filter-reference';
// import { getPaginationGuideSchema, handleGetPaginationGuide } from '@one-source/docs-mcp/tools/get-pagination-guide';
// import { getSchemaOverviewSchema, handleGetSchemaOverview } from '@one-source/docs-mcp/tools/get-schema-overview';
// import { getAuthenticationGuideSchema, handleGetAuthenticationGuide } from '@one-source/docs-mcp/tools/get-authentication-guide';
// import { getMcpSetupGuideSchema, handleGetMcpSetupGuide } from '@one-source/docs-mcp/tools/get-mcp-setup-guide';

import type { Analytics, ToolCallEvent } from './analytics.js';
import { VERSION } from './version.js';

function hashSession(sessionId: string | undefined): string | undefined {
  if (!sessionId) return undefined;
  return createHash('sha256').update(sessionId).digest('hex').slice(0, 16);
}

/**
 * Register an instrumented docs tool — wraps the handler with analytics tracking.
 *
 * Uses `any` for the handler input type because the MCP SDK's overloaded
 * `server.tool()` signature makes generics impractical here. Each handler
 * is still type-safe at its own definition site.
 */
function instrumentedTool(
  server: McpServer,
  analytics: Analytics,
  transport: 'stdio' | 'http' | undefined,
  name: string,
  description: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (input: any) => string | Promise<string>,
  category: ToolCallEvent['category'] = 'docs',
  annotations?: ToolAnnotations,
): void {
  const { title: toolTitle, ...restAnnotations } = annotations ?? {};
  server.registerTool(name, {
    title: toolTitle,
    description,
    inputSchema: schema,
    annotations: restAnnotations,
  }, async (input: Record<string, unknown>, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => {
    const start = performance.now();
    const inputKeys = Object.keys(input);
    const sessionHash = hashSession(extra.sessionId);
    const clientInfo = server.server.getClientVersion();

    const base: Omit<ToolCallEvent, 'success' | 'response_size' | 'error_category' | 'duration_ms'> = {
      type: 'tool_call',
      service: 'onesource-docs',
      tool: name,
      category,
      timestamp: new Date().toISOString(),
      input_params: inputKeys,
      version: VERSION,
      auth_method: 'none',
      client_name: clientInfo?.name,
      client_version: clientInfo?.version,
      session_id: sessionHash,
      transport,
      source: 'unified',
    };

    try {
      const text = await handler(input);
      const durationMs = Math.round(performance.now() - start);

      analytics.trackTool({
        ...base,
        duration_ms: durationMs,
        success: true,
        response_size: text.length,
      });

      return { content: [{ type: 'text' as const, text }] };
    } catch (err: unknown) {
      const durationMs = Math.round(performance.now() - start);
      const message = err instanceof Error ? err.message : String(err);

      analytics.trackTool({
        ...base,
        duration_ms: durationMs,
        success: false,
        error_category: message.slice(0, 100).replace(/0x[a-fA-F0-9]+/g, '0x***'),
        response_size: 0,
      });

      return {
        isError: true,
        content: [{ type: 'text' as const, text: `Tool error: ${message.slice(0, 500).replace(/0x[a-fA-F0-9]+/g, '0x***')}` }],
      };
    }
  });
}

export interface RegisterDocsToolsOptions {
  server: McpServer;
  analytics: Analytics;
  transport?: 'stdio' | 'http';
  // /** Pre-loaded docs data (avoids re-reading files per request in HTTP mode). */
  // data?: LoadedData;
  /** Active authentication method, determined at startup. */
  authMethod?: 'api_key' | 'x402' | 'mpp' | 'none';
  /** Payer wallet address (x402 on Base or MPP on Tempo), when paying via a wallet. */
  x402Address?: string;
}

/**
 * Register all docs tools and return the tool count.
 */
export function registerDocsTools(opts: RegisterDocsToolsOptions): number {
  const { server, analytics, transport } = opts;
  // const { sections, index, schema } = opts.data ?? loadData();

  // instrumentedTool(server, analytics, transport,
  //   'search_docs',
  //   'Search OneSource documentation by keyword. Returns the top 5 matching sections.',
  //   searchDocsSchema.shape,
  //   (input) => handleSearchDocs(input, index),
  // );

  // instrumentedTool(server, analytics, transport,
  //   'get_query_reference',
  //   'Get full reference for a OneSource root GraphQL query — arguments, filters, return type. There are 12 root queries: address, addresses, block, blocks, contract, contracts, nft, nfts, token, tokens, transaction, transactions.',
  //   getQueryReferenceSchema.shape,
  //   (input) => handleGetQueryReference(input, schema),
  // );

  // instrumentedTool(server, analytics, transport,
  //   'get_type_definition',
  //   'Get the schema definition for a GraphQL type, enum, scalar, input, or interface. Returns fields, values, and descriptions.',
  //   getTypeDefinitionSchema.shape,
  //   (input) => handleGetTypeDefinition(input, schema),
  // );

  // instrumentedTool(server, analytics, transport,
  //   'list_examples',
  //   'List or search working GraphQL examples. Without a topic, returns a summary of all available examples. With a topic, returns full example content matching that keyword.',
  //   listExamplesSchema.shape,
  //   (input) => handleListExamples(input, sections),
  // );

  // instrumentedTool(server, analytics, transport,
  //   'list_supported_chains',
  //   'List all blockchain networks supported by OneSource with endpoint URLs.',
  //   listSupportedChainsSchema.shape,
  //   () => handleListSupportedChains(),
  // );

  // instrumentedTool(server, analytics, transport,
  //   'get_filter_reference',
  //   'Get all filter fields and operators for a list query (e.g. transactions, tokens).',
  //   getFilterReferenceSchema.shape,
  //   (input) => handleGetFilterReference(input, schema),
  // );

  // instrumentedTool(server, analytics, transport,
  //   'get_pagination_guide',
  //   'Get the cursor-based pagination pattern with examples for a list query.',
  //   getPaginationGuideSchema.shape,
  //   (input) => handleGetPaginationGuide(input, schema),
  // );

  // instrumentedTool(server, analytics, transport,
  //   'get_schema_overview',
  //   'Get a high-level summary of the entire GraphQL schema — all queries, types, enums, and scalars.',
  //   getSchemaOverviewSchema.shape,
  //   () => handleGetSchemaOverview(schema),
  // );

  // instrumentedTool(server, analytics, transport,
  //   'get_authentication_guide',
  //   'Get the authentication guide — API key format, endpoints, headers, and common mistakes.',
  //   getAuthenticationGuideSchema.shape,
  //   () => handleGetAuthenticationGuide(),
  // );

  // instrumentedTool(server, analytics, transport,
  //   'get_mcp_setup_guide',
  //   'Get the MCP installation and setup guide — quickstart, per-client instructions, authentication (API key or x402), configuration, and individual MCP packages. Use the topic parameter to focus on a specific area.',
  //   getMcpSetupGuideSchema.shape,
  //   (input) => handleGetMcpSetupGuide(input, sections),
  // );

  let count = 0;
  const authMethod = opts.authMethod;
  const x402Address = opts.x402Address;
  instrumentedTool(server, analytics, transport,
    '1s_setup_check',
    'Interactive setup & health check for the OneSource MCP server. Returns a step-by-step setup script that the AGENT must run by consulting the user: it walks through EVERY configuration choice for BOTH payment rails (auth method, API key, x402 on Base, MPP on Tempo, payment modes, channel preferences) one decision at a time, every time it is run — even when everything is already configured, so the user can review and adjust without touching env vars or config files directly. Also reports version, auth status, channel status, and connectivity. Free, no authentication required. Call this first to set up, to change configuration, or to troubleshoot.',
    {},
    async () => {
      const parts: string[] = [];

      // ---- Gather current state -------------------------------------------
      let latestVersion = 'unknown';
      try {
        const res = await fetch('https://registry.npmjs.org/@one-source/mcp/latest', {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json() as { version: string };
          latestVersion = data.version;
        }
      } catch { /* network error — skip */ }
      const updateAvailable = latestVersion !== 'unknown' && latestVersion !== VERSION;

      const runtimeApiKey = process.env.ONESOURCE_API_KEY?.trim();
      const runtimeX402Key = process.env.X402_PRIVATE_KEY;
      const runtimeMppKey = process.env.MPP_PRIVATE_KEY;
      const bothSet = !!(runtimeApiKey && (runtimeX402Key || runtimeMppKey));
      // Use authMethod from startup; fall back to runtime env check for robustness
      const activeMethod = authMethod ?? (runtimeApiKey ? 'api_key' : runtimeX402Key ? 'x402' : runtimeMppKey ? 'mpp' : 'none');
      const payInfo = getPaymentModeInfo();
      const x402Enabled = payInfo.x402.enabled;
      const mppEnabled = payInfo.mpp.enabled;
      const prefs = getBatchPrefs();
      const persisted = hasPersistedConfig();

      const authLabel = activeMethod === 'api_key'
        ? `API key (\`${runtimeApiKey?.slice(0, 6)}••••••\`)`
        : activeMethod === 'x402' ? 'x402 (Base)'
        : activeMethod === 'mpp' ? 'MPP (Tempo)'
        : '*none — blockchain tools are locked until you pick one below*';

      // OS-aware command/config hints for the "apply" section.
      const platform = process.platform; // 'win32' | 'darwin' | 'linux' | ...
      const osName = platform === 'win32' ? 'Windows' : platform === 'darwin' ? 'macOS' : 'Linux';
      const desktopCfg = platform === 'win32'
        ? '%APPDATA%\\Claude\\claude_desktop_config.json'
        : platform === 'darwin'
          ? '~/Library/Application Support/Claude/claude_desktop_config.json'
          : '~/.config/Claude/claude_desktop_config.json';
      const cursorCfg = platform === 'win32' ? '%USERPROFILE%\\.cursor\\mcp.json' : '~/.cursor/mcp.json';
      // Per-shell example for setting a key as an OS env var (the "any client" path).
      const shellExample = platform === 'win32'
        ? 'PowerShell: `$env:X402_PRIVATE_KEY = "<key>"` · cmd: `set X402_PRIVATE_KEY=<key>`'
        : 'bash/zsh: `export X402_PRIVATE_KEY=<key>`';

      // =====================================================================
      // AGENT DIRECTIVE — this is the load-bearing part. The user invoked
      // setup because they want to configure something; the agent must now
      // run the interactive script below by consulting the user.
      // =====================================================================
      parts.push('# OneSource MCP — Interactive Setup');
      parts.push('');
      parts.push('> ⚠️ **AGENT: ACT ON THIS NOW. This tool changed nothing by itself** — it handed you a setup script that *you* run by talking to the user, using your client\'s interactive prompt UI (in Claude Code / Desktop that is the **AskUserQuestion** prompt; in any other client, ask in plain text and wait). **Assume the user is new to this** and may not know what x402, MPP, an RPC URL, or a payment channel is — explain every option in plain language, spell out what the choices mean, and never assume they know the jargon.');
      parts.push('>');
      parts.push('> **Step 0 — ASK THIS FIRST, before any other question.** Find out what the user actually wants:');
      parts.push('>   - **(A) Just review** what is currently set up, or');
      parts.push('>   - **(B) Set up or change** the configuration.');
      parts.push('>');
      parts.push('> If **(A)**: summarise the "Current configuration" below in plain language (what auth/payment they have and whether it is ready to use), tell them they can change any single item just by naming it, and **STOP — do not walk through the decisions.** If **(B)**: go through the decisions below. If nothing is configured yet (auth = none), tell them the blockchain tools are locked until they pick a payment method, and recommend (B).');
      parts.push('>');
      parts.push('> **Once the user has chosen (B), these rules are non-negotiable:**');
      parts.push('> 1. Offer **every** decision below, in order — including ones that already have a value. For a value that is already set, show it and ask whether to **keep or change** it. Never silently leave a setting as-is without offering it.');
      parts.push('> 2. **Do not assume a default on the user\'s behalf.** Present the options (with plain-language explanations) and let them choose. Where a setting has a recommended default, say so and tell them it is safe to keep.');
      parts.push('> 3. Ask **one decision at a time** and wait for the answer before moving to the next.');
      parts.push('> 4. Do not jump to "you\'re all set" — you are not finished until you have offered the user every applicable decision.');
      parts.push('> 5. **Apply answers as you go.** Settings tagged _(live)_ take effect immediately via the noted tool — call it, no restart. Settings tagged _(restart)_ are read at startup, so collect them and, at the end, hand the user **one ready-to-run command tailored to their OS + MCP client** (see "Applying restart settings"). Ask which client/shell they use if you don\'t already know.');
      parts.push('> 6. **Secrets never enter this chat.** Do NOT ask the user to paste a private key (or API key) into the conversation, and if they paste one anyway, do not repeat it or build it into your reply — it would be captured in the transcript. Secrets go into the startup command as a **`<placeholder>`** that the user substitutes in their own terminal. You hand back the command shape; they fill in the secret.');
      parts.push('> 7. **Exactly one payment mode is active at a time** (`x402-exact`, `x402-batch`, `mpp-charge`, or `mpp-session`) — it is a single global setting, not a per-rail toggle. Ask about it **once** (Decision 5), offering only the modes whose rail is enabled. Never ask for an x402 scheme and an MPP scheme separately.');
      parts.push('>');
      parts.push('> Begin: ask the **Step 0** question now.');
      parts.push('');

      // ---- Current configuration (reference) ------------------------------
      parts.push('## Current configuration (for your reference — use this for the Step 0 review, and to show current values during setup)');
      parts.push('');
      parts.push(`- **Server version:** ${VERSION}${latestVersion === 'unknown' ? '' : updateAvailable ? ` — ⚠️ update available: **${latestVersion}** (\`npx -y @one-source/mcp@latest\`)` : ' (latest)'}`);
      parts.push(`- **Detected OS:** ${osName} (\`process.platform = ${platform}\`)`);
      parts.push(`- **Active auth method:** ${authLabel}`);
      const x402Wallet = payInfo.x402.address ?? (activeMethod === 'x402' ? x402Address : undefined);
      const mppWallet = payInfo.mpp.address ?? (activeMethod === 'mpp' ? x402Address : undefined);
      parts.push(`- **x402 (Base) wallet:** ${x402Enabled ? `\`${x402Wallet ?? 'enabled'}\` — must hold USDC on Base` : '*not set*'}`);
      parts.push(`- **MPP (Tempo) wallet:** ${mppEnabled ? `\`${mppWallet ?? 'enabled'}\` — must hold USDC.e / pathUSD on Tempo` : '*not set*'}`);
      parts.push(`- **Active payment mode:** \`${payInfo.mode}\``);
      if (x402Enabled) parts.push(`- **x402 batch channel:** ${payInfo.x402.batchAvailable ? 'available' : '**unavailable** — channel scheme failed to init (check `X402_RPC_URL`, then restart)'}`);
      if (mppEnabled) parts.push(`- **MPP session channel:** ${payInfo.mpp.sessionAvailable ? 'available' : '**unavailable** — Tempo channel failed to init (check `MPP_RPC_URL`, then restart)'}`);
      parts.push(`- **Channel preferences:** autonomy \`${prefs.prompt}\`, threshold \`${prefs.threshold}\`, x402 deposit ×\`${prefs.depositMultiplier}\`, MPP max deposit \`${prefs.mppMaxDeposit}\` ${persisted ? `— saved to \`${batchConfigPath()}\`` : '— defaults (not yet saved)'}`);
      if (bothSet) parts.push('- ⚠️ **Both an API key and a wallet key are set.** The API key wins; the wallet key is ignored. Resolve this in Decision 1.');
      parts.push('');

      // =====================================================================
      // DECISIONS
      // =====================================================================
      parts.push('---');
      parts.push('');
      parts.push('## Decision 1 — How do you want to pay for blockchain data?  _(restart)_');
      parts.push(`Every API call costs a tiny amount; this chooses who pays. Current: **${authLabel}**. Explain these in plain terms and let the user pick (they can pick one, or both wallet options):`);
      parts.push('');
      parts.push('- **A) API key** — you have a OneSource account with a paid plan, and your calls are covered by it: no per-call charge, unlimited use. Pick this if you already have an account (sign up at app.onesource.io). *(sets `ONESOURCE_API_KEY`)*');
      parts.push('- **B) Pay-as-you-go on Base (x402)** — no account needed. A few cents of USDC (a US-dollar stablecoin) is paid automatically from your own crypto wallet for each call, on the **Base** network. Easiest way to start if you don\'t have an account. *(sets `X402_PRIVATE_KEY`; → then Decision 3)*');
      parts.push('- **C) Pay-as-you-go on Tempo (MPP)** — the same pay-from-your-wallet idea as (B), but on the **Tempo** network (pays in USDC.e / pathUSD). Pick this only if you already use Tempo. *(sets `MPP_PRIVATE_KEY`; → then Decision 4)*');
      parts.push(`- **D) Keep what I have** (${activeMethod === 'none' ? 'nothing set up yet' : authLabel}).`);
      parts.push('');
      parts.push('> Ask which they want. Heads-up to relay if relevant: an API key and a wallet can\'t both be active — if an API key is set it always wins and the wallet is ignored. So if they want to pay by wallet, the final command must NOT include an API key (and vice-versa). Then do the decisions for each option they chose, then the shared Decisions 5–7.');
      parts.push('');

      parts.push('## Decision 2 — API key  _(restart, secret — only if they chose API key)_');
      parts.push('Tell the user they\'ll need a OneSource API key (starts with `sk_`; create one at app.onesource.io → API Keys). **Do not ask them to paste it here** — per Rule 6, the startup command (Applying restart settings) carries `ONESOURCE_API_KEY=<your-api-key>` as a placeholder they fill in their own terminal.');
      parts.push('');

      parts.push('## Decision 3 — Your Base wallet (x402 settings)  _(only if using x402)_');
      parts.push('Walk through these (the pay-per-call vs. channel choice is made once for both rails in Decision 5, so don\'t ask it here):');
      parts.push(`- **Wallet key (\`X402_PRIVATE_KEY\`)** _(restart, secret)_ — this is the crypto wallet that pays; it must hold some USDC on the **Base** network.${x402Enabled ? ' One is already set — ask **keep / rotate (use a different wallet) / remove**.' : ' None set yet — ask if they want to add one.'} If they keep it, move on. To add or rotate: per Rule 6, **never take the key in chat** — the startup command will contain \`X402_PRIVATE_KEY=<your-key>\` for them to fill in their own terminal (it\'s a 64-character hex key from any EVM wallet, e.g. MetaMask; they can also generate a fresh one). After setup, running \`1s_setup_check\` again shows the wallet address to send USDC to.`);
      parts.push(`- **Deposit size for channel mode (\`X402_DEPOSIT_MULTIPLIER\`)** _(live; advanced — fine to skip)_ — only matters if they pick \`x402-batch\` in Decision 5. It sets how big the up-front refundable deposit is (= call price × this number, so a bigger number = fewer top-ups but more held at once; always reclaimable with \`1s_refund\`). **DEFAULT: 10.** Currently \`${prefs.depositMultiplier}\`. Most people leave this alone; to change: \`1s_batch_config { "deposit_multiplier": N }\` (min ${MIN_DEPOSIT_MULTIPLIER}).`);
      parts.push('- **Base connection (`X402_RPC_URL`)** _(restart; ⚠️ advanced users only)_ — **DEFAULT: OneSource\'s built-in public Base RPC, which works out of the box — recommend leaving this as-is.** Only change it if the user knowingly runs their own Base RPC endpoint (e.g. deposits are rate-limiting). If they don\'t know what an RPC is, that\'s a clear signal to keep the default and skip it.');
      parts.push('- **Where to save the channel so it survives restarts (`X402_CHANNEL_DIR`)** _(restart)_ — only relevant if they use a payment **channel** (`x402-batch`, Decision 5); ignore it for plain pay-per-call. **DEFAULT: off — the channel lives only in memory, so if the server restarts it forgets the open channel.** The unspent deposit isn\'t lost (the network auto-refunds idle channels after a few hours), but until then it\'s locked and can\'t be reclaimed on demand — confusing for a newcomer. **So if they\'re using a channel, recommend setting this** to a convenient, persistent folder they\'ll remember (the agent should suggest a sensible path for their OS, e.g. inside their home directory); then the channel and its deposit survive restarts and stay reclaimable any time with `1s_refund`. (MPP has no equivalent — its session channel can\'t persist.)');
      parts.push('');

      parts.push('## Decision 4 — Your Tempo wallet (MPP settings)  _(only if using MPP)_');
      parts.push('Walk through these (the pay-per-call vs. channel choice is made once for both rails in Decision 5, so don\'t ask it here):');
      parts.push(`- **Wallet key (\`MPP_PRIVATE_KEY\`)** _(restart, secret)_ — the crypto wallet that pays; it must hold **USDC.e or pathUSD on the Tempo network**.${mppEnabled ? ' One is already set — ask **keep / rotate (use a different wallet) / remove**.' : ' None set yet — ask if they want to add one.'} If they keep it, move on. To add or rotate: per Rule 6, **never take the key in chat** — the startup command carries \`MPP_PRIVATE_KEY=<your-key>\` for them to fill in their own terminal.`);
      parts.push(`- **Deposit cap for channel mode (\`MPP_MAX_DEPOSIT\`)** _(live; advanced — fine to skip)_ — only matters if they pick \`mpp-session\` in Decision 5. It caps how much is held in the up-front refundable deposit at once (always reclaimable with \`1s_refund\`). **DEFAULT: 1.** Currently \`${prefs.mppMaxDeposit}\`. Most people leave this alone; to change: \`1s_batch_config { "mpp_max_deposit": "1" }\`.`);
      parts.push('- **Tempo connection (`MPP_RPC_URL`)** _(restart; ⚠️ advanced users only)_ — **DEFAULT: OneSource\'s built-in public Tempo RPC, which works out of the box — recommend leaving this as-is.** Only change it if the user knowingly runs their own Tempo RPC endpoint. If they don\'t know what an RPC is, keep the default and skip it.');
      parts.push('');

      // Decision 5 — the single global active mode. Offer only the modes whose
      // rail is enabled THIS session (those are the ones 1s_payment_mode can
      // switch to live); a newly-added rail's modes apply after restart+reload.
      const modeChoices: string[] = [];
      if (x402Enabled) modeChoices.push('`x402-exact` — **pay-per-call** on Base (simplest; a tiny payment each call)', '`x402-batch` — **channel** on Base (one small refundable deposit covers many calls)');
      if (mppEnabled) modeChoices.push('`mpp-charge` — **pay-per-call** on Tempo (simplest)', '`mpp-session` — **channel** on Tempo (one small refundable deposit covers many calls)');
      parts.push('## Decision 5 — How payments are batched  _(live)_');
      parts.push('Explain the two styles in plain terms, then ask for **one** choice:');
      parts.push('- **Pay-per-call** (`x402-exact` / `mpp-charge`) — a tiny separate payment for every call. Simplest; best if you only make a handful of calls.');
      parts.push('- **Payment channel** (`x402-batch` / `mpp-session`) — you put down one small **refundable** deposit up front, then many calls draw from it. Cheaper if you\'ll make lots of calls in a row; reclaim whatever\'s left any time with `1s_refund`.');
      parts.push('> If they pick **`x402-batch`**, make sure they also set `X402_CHANNEL_DIR` (Decision 3) so the channel survives a restart — otherwise a restart locks the deposit until it auto-refunds. (No such option exists for `mpp-session`.)');
      parts.push(`**Only one mode is active at a time** (it's a single global setting, **not** one-per-rail). Currently: \`${payInfo.mode}\`. **DEFAULT / safe pick: pay-per-call** unless they expect a burst of calls. Ask once, then apply now with \`1s_payment_mode { "mode": "..." }\` (no restart); to also make it the startup default, add \`1s_batch_config { "mode": "..." }\`.`);
      if (modeChoices.length) {
        parts.push('Offer exactly these (their rail is active right now):');
        modeChoices.forEach((m) => parts.push('- ' + m));
        if (x402Enabled && mppEnabled) parts.push('Both rails are active, so all four are valid — but they still pick only **one**.');
      } else {
        parts.push('No wallet is active this session yet, so there is nothing to switch live. If they\'re adding a wallet via the startup command, just record their preferred default with `1s_batch_config { "mode": "..." }`; it takes effect after they run the command and reload.');
      }
      parts.push('');

      parts.push('## Decision 6 — When should the assistant open a money-saving channel?  _(live)_');
      parts.push('Only relevant if they pay by wallet (x402 or MPP). This controls how the assistant decides to switch to a deposit-based **channel** (Decision 5) when it expects lots of calls. These save automatically — **no command or restart.** Ask:');
      parts.push(`- **How much freedom should the assistant have?** (currently \`${prefs.prompt}\`) — **ask** = check with you before opening a channel; **auto** = just do it when it expects a burst; **off** = never, unless you explicitly say so. **DEFAULT: ask** (safest). Apply with \`1s_batch_config { "prompt": "ask" | "auto" | "off" }\`.`);
      parts.push(`- **How many calls counts as "a lot"?** (currently \`${prefs.threshold}\`) — the assistant only considers a channel once it expects at least this many calls in one go. **DEFAULT: 5.** Lower = reaches for channels sooner. Apply with \`1s_batch_config { "threshold": N }\`.`);
      parts.push('');

      parts.push('## Decision 7 — Anonymous usage analytics  _(optional, restart)_');
      parts.push('OneSource collects anonymous usage stats to improve the service (no personal data, no keys). **DEFAULT: on** — most people leave it. Ask if they\'d like to turn it off; if so, add `ONESOURCE_ANALYTICS=false` to the startup command.');
      parts.push('');

      // =====================================================================
      // APPLYING RESTART SETTINGS — OS/client-tailored command
      // =====================================================================
      parts.push('---');
      parts.push('');
      parts.push('## Applying restart settings — build ONE command for the user');
      parts.push(`Detected OS: **${osName}**. After collecting the answers, combine **every chosen _(restart)_ env var** into a single command for the user's MCP client. Include **only** the \`-e\`/\`env\` entries for vars they actually chose. **Leave each secret as a \`<placeholder>\`** (e.g. \`X402_PRIVATE_KEY=<your-key>\`) — per Rule 6, the user fills in keys in their own terminal; never paste in a key you were given in chat. Ask which client + shell they use if you don't know, then give them exactly one command/snippet to run.`);
      parts.push('');
      parts.push('**Claude Code** (any OS/shell) — re-add the server in one go:');
      parts.push('```');
      parts.push('claude mcp remove onesource');
      parts.push('claude mcp add onesource -e <VAR>=<value> [-e <VAR>=<value> ...] -- npx -y @one-source/mcp@latest');
      parts.push('```');
      parts.push('Example with x402 + MPP: `claude mcp add onesource -e X402_PRIVATE_KEY=<key> -e MPP_PRIVATE_KEY=<key> -- npx -y @one-source/mcp@latest`');
      parts.push('');
      parts.push(`**Claude Desktop / Cursor** — edit the MCP config file and set the \`env\` block (only the chosen vars):`);
      parts.push('```json');
      parts.push('{ "mcpServers": { "onesource": {');
      parts.push('  "command": "npx", "args": ["-y", "@one-source/mcp@latest"],');
      parts.push('  "env": { "X402_PRIVATE_KEY": "<key>" }');
      parts.push('} } }');
      parts.push('```');
      parts.push(`Config file on ${osName} — Claude Desktop: \`${desktopCfg}\` · Cursor: \`${cursorCfg}\`. (Claude Code: run \`claude mcp get onesource\` to find its path.)`);
      if (platform === 'win32') {
        parts.push('> **Windows note:** if `/doctor` warns about `npx`, set `"command": "cmd"` and `"args": ["/c", "npx", "-y", "@one-source/mcp@latest"]`.');
      }
      parts.push('');
      parts.push(`**Any MCP client (stdio)** — or set the key as an OS environment variable, then launch: ${shellExample}, then \`npx -y @one-source/mcp@latest\`.`);
      parts.push('');
      parts.push('After they run/save the command, tell them to reload: `/reload-plugins` in Claude Code (do a **full restart** if they switched auth method, so the LLM instructions refresh), or restart Claude Desktop / Cursor. Then call `1s_setup_check` again to confirm and continue tuning.');
      parts.push('');

      // =====================================================================
      // DIAGNOSTICS
      // =====================================================================
      parts.push('---');
      parts.push('');
      parts.push('## Diagnostics');
      parts.push(`- **Transport:** ${transport ?? 'unknown'}`);
      const baseUrl = process.env.ONESOURCE_BASE_URL ?? 'https://api.onesource.io';
      try {
        await fetch(baseUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        parts.push(`- **Backend:** reachable (${baseUrl})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        parts.push(`- **Backend:** ⚠️ unreachable — ${msg} (${baseUrl})`);
      }
      parts.push('- **Bug reporting:** enabled — call `1s_report_bug` to report issues to the OneSource team.');
      parts.push('- **Key not reaching the server?** A key set in your shell profile is inherited by the MCP process even when it isn\'t in your MCP config. Check with `echo $ONESOURCE_API_KEY` / `$X402_PRIVATE_KEY` / `$MPP_PRIVATE_KEY` (PowerShell: `$env:NAME`).');

      return parts.join('\n');
    },
    'ops',
    { title: 'Setup Check', readOnlyHint: true, destructiveHint: false },
  );
  count++;

  // ---------------------------------------------------------------------------
  // 1s_batch_config — view or change x402 batch-settlement preferences at
  // runtime. Persists to the server-managed config file so settings survive
  // restarts without editing the MCP client config. Decoupled from auth: it can
  // record preferences even before x402 is active, but only x402 sessions act on
  // them, and a live mode switch only happens when x402 is enabled.
  // ---------------------------------------------------------------------------
  instrumentedTool(server, analytics, transport,
    '1s_batch_config',
    'View or change payment preferences and save them so they persist across restarts — no MCP config editing or restart required. ' +
      'Call with no arguments to see current settings. ' +
      'Set "prompt" (ask/auto/off — agent autonomy when switching to a cheaper channel mode), "threshold" (anticipated calls before a channel is worth it), ' +
      '"deposit_multiplier" (x402 channel deposit = call price × this; applies to the next channel opened), "mpp_max_deposit" (MPP session channel deposit cap, in tokens), ' +
      'or "mode" (the default rail+scheme — x402-exact / x402-batch / mpp-charge / mpp-session — also switched live for this session). ' +
      'Pass "reset": true to restore defaults. With an API key, calls are covered by your plan.',
    {
      prompt: z.enum(['ask', 'auto', 'off']).optional()
        .describe('Agent autonomy when deciding to switch to a channel mode: ask (confirm first), auto (switch on its own), off (only on explicit request).'),
      threshold: z.number().int().positive().optional()
        .describe('Anticipated call count at/above which a channel mode is worth considering. Default 5.'),
      deposit_multiplier: z.number().min(MIN_DEPOSIT_MULTIPLIER).optional()
        .describe(`x402 channel deposit = call price × this multiplier. Minimum ${MIN_DEPOSIT_MULTIPLIER}. Applies to the next channel opened.`),
      mpp_max_deposit: z.string().optional()
        .describe('MPP session channel max deposit, in human token units (e.g. "1"). Applies to the next Tempo channel opened.'),
      mode: z.enum(['x402-exact', 'x402-batch', 'mpp-charge', 'mpp-session']).optional()
        .describe('Default payment rail+scheme the session starts in. Also switched live for the current session when that rail is active.'),
      reset: z.boolean().optional()
        .describe('Restore all payment settings to their built-in defaults (deletes the saved config file).'),
    },
    (input: Record<string, unknown>) => handleBatchConfig(input, opts.authMethod),
    'ops',
    { title: 'Payment Config', readOnlyHint: false, destructiveHint: false },
  );
  count++;

  return count;
}

/**
 * Handler for `1s_batch_config`. Validates input, persists the change, applies a
 * live payment-mode switch when x402 is active, and returns a human/agent-readable
 * summary of the resulting settings.
 */
function handleBatchConfig(
  input: Record<string, unknown>,
  authMethod: 'api_key' | 'x402' | 'mpp' | 'none' | undefined,
): string {
  const info = getPaymentModeInfo();
  const anyActive = info.enabled || authMethod === 'x402' || authMethod === 'mpp';

  // --- reset path ---
  if (input.reset === true) {
    const { prefs, persisted, persistError } = resetBatchPrefs();
    if (info.enabled) setPaymentMode(prefs.mode);
    return renderBatchConfig('Payment settings reset to defaults.', prefs, persisted, persistError, anyActive, info.enabled);
  }

  // --- validate provided fields (only those present) ---
  const patch: Partial<BatchPrefs> = {};
  const errors: string[] = [];

  if (input.prompt !== undefined) {
    const v = coercePrompt(input.prompt);
    if (v) patch.prompt = v;
    else errors.push(`prompt must be one of ask / auto / off (got ${JSON.stringify(input.prompt)})`);
  }
  if (input.threshold !== undefined) {
    const v = coerceThreshold(input.threshold);
    if (v) patch.threshold = v;
    else errors.push(`threshold must be a positive integer (got ${JSON.stringify(input.threshold)})`);
  }
  if (input.deposit_multiplier !== undefined) {
    const v = coerceMultiplier(input.deposit_multiplier);
    if (v) patch.depositMultiplier = v;
    else errors.push(`deposit_multiplier must be a number ≥ ${MIN_DEPOSIT_MULTIPLIER} (got ${JSON.stringify(input.deposit_multiplier)})`);
  }
  if (input.mpp_max_deposit !== undefined) {
    const v = coerceMaxDeposit(input.mpp_max_deposit);
    if (v) patch.mppMaxDeposit = v;
    else errors.push(`mpp_max_deposit must be a positive number string (got ${JSON.stringify(input.mpp_max_deposit)})`);
  }
  if (input.mode !== undefined) {
    const v = coerceMode(input.mode);
    if (v) patch.mode = v;
    else errors.push(`mode must be one of x402-exact / x402-batch / mpp-charge / mpp-session (got ${JSON.stringify(input.mode)})`);
  }

  if (errors.length > 0) {
    return `Could not apply payment config — ${errors.join('; ')}. No changes were made.`;
  }

  // --- no fields → report current settings ---
  if (Object.keys(patch).length === 0) {
    const prefs = getBatchPrefs();
    return renderBatchConfig('Current payment settings (no changes requested).', prefs, hasPersistedConfig(), undefined, anyActive, info.enabled);
  }

  // --- apply ---
  const { prefs, persisted, persistError } = setBatchPrefs(patch);

  // Apply a live mode switch when the target rail is active. setPaymentMode
  // no-ops (returns the unchanged mode) when the rail's key isn't set or the
  // sub-mode is unavailable.
  let modeNote: string | undefined;
  if (patch.mode !== undefined) {
    if (info.enabled) {
      const applied = setPaymentMode(patch.mode);
      if (applied === patch.mode) {
        modeNote = `Switched the live payment scheme to \`${applied}\` for this session.`;
      } else if (patch.mode === 'x402-batch' && !info.x402.batchAvailable) {
        modeNote = 'Saved as the default, but x402-batch could not be activated — the channel scheme is unavailable (check `X402_RPC_URL` and restart).';
      } else if (patch.mode === 'mpp-session' && !info.mpp.sessionAvailable) {
        modeNote = 'Saved as the default, but mpp-session could not be activated — the Tempo channel is unavailable (check `MPP_RPC_URL` and restart).';
      } else {
        modeNote = `Saved as the default mode; the ${patch.mode.startsWith('mpp-') ? 'MPP' : 'x402'} rail is not active this session, so the live scheme was not switched.`;
      }
    } else {
      modeNote = 'Saved as the default mode; it will take effect once a payment wallet is active (set `X402_PRIVATE_KEY` or `MPP_PRIVATE_KEY`).';
    }
  }

  return renderBatchConfig('Payment settings updated.', prefs, persisted, persistError, anyActive, info.enabled, modeNote);
}

/** Format payment settings + status notes into the tool's text response. */
function renderBatchConfig(
  headline: string,
  prefs: BatchPrefs,
  persisted: boolean,
  persistError: string | undefined,
  anyActive: boolean,
  anyEnabled: boolean,
  modeNote?: string,
): string {
  const lines: string[] = [headline, ''];
  lines.push('**Payment settings**');
  lines.push(`- Default mode: \`${prefs.mode}\``);
  lines.push(`- Autonomy (prompt): \`${prefs.prompt}\``);
  lines.push(`- "Many" threshold: \`${prefs.threshold}\``);
  lines.push(`- x402 deposit multiplier: \`${prefs.depositMultiplier}\``);
  lines.push(`- MPP session max deposit: \`${prefs.mppMaxDeposit}\``);

  if (modeNote) lines.push('', modeNote);

  lines.push('');
  if (persisted) {
    lines.push(`Saved to \`${batchConfigPath()}\` — these settings persist across restarts.`);
  } else {
    lines.push(`⚠️ Could not write the config file (${persistError ?? 'unknown error'}). The settings are active for this session but will not survive a restart.`);
  }

  if (!anyActive) {
    lines.push('');
    lines.push('Note: these preferences are saved and will take effect once a payment wallet is active (set `X402_PRIVATE_KEY` for Base or `MPP_PRIVATE_KEY` for Tempo).');
  } else if (!anyEnabled) {
    lines.push('');
    lines.push('Note: no payment wallet is active in this process yet, so the live scheme was not changed — the saved defaults apply on the next session.');
  }

  return lines.join('\n');
}

// export { loadData, type LoadedData };
