# Plan: Wire @x402/fetch into the Unified MCP Server

## Context

Users can't use the 22 blockchain API tools because when the backend has x402 payments enabled, the `OneSourceClient` (in `@one-source/api-mcp`) receives HTTP 402 responses and returns an error — it doesn't actually pay. The x402 protocol requires a client-side wrapper (`@x402/fetch`) that intercepts 402 responses, signs a USDC payment, and retries the request.

### Current state in `@one-source/api-mcp`

- **Detection only** — the client catches 402 responses and returns `{ error: "Payment required (402)..." }`
- **No x402 dependencies** — `@x402/fetch`, `@x402/core`, `@x402/evm` are not installed
- **Analytics tracking works** — `x402_required` flag and `auth_method: 'x402'` are already tracked
- **README says** "Agents using `@x402/fetch` handle this automatically" — but nobody wires it in

### Where to implement

**Option A: In `@one-source/api-mcp`** (ideal long-term)
- Where the `OneSourceClient` and `fetchWithMetrics()` live
- Every consumer gets payment support automatically
- Requires modifying and republishing that package

**Option B: In this unified MCP** (practical short-term) ← **Recommended**
- Wrap `globalThis.fetch` before `OneSourceClient` is created
- The client uses native `fetch()` internally, so the patch works transparently
- No changes to `@one-source/api-mcp` needed
- Opt-in via `X402_PRIVATE_KEY` env var

---

## Approach: Global Fetch Wrapping

### How it works

1. On server startup, check for `X402_PRIVATE_KEY` env var
2. If set, create an x402 payment client with an EVM signer from that key
3. Replace `globalThis.fetch` with the x402-wrapped version
4. All subsequent HTTP requests from `OneSourceClient.fetchWithMetrics()` go through the wrapper
5. 402 responses are intercepted → payment signed → request retried → success returned

### Why this works

- `OneSourceClient.fetchWithMetrics()` calls native `fetch(url, init)` directly
- It's a private method — we can't inject a custom fetch into it
- But it uses `globalThis.fetch`, so patching the global is transparent
- The x402 wrapper is a pass-through for non-402 responses (no impact on docs tools)

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/x402.ts` | **Create** | Setup module: wraps `globalThis.fetch` with x402 payment handling |
| `src/cli.ts` | **Modify** | Call x402 setup at the top, before any client creation |
| `package.json` | **Modify** | Add `@x402/fetch`, `@x402/core`, `@x402/evm`, `viem` as dependencies |
| `README.md` | **Modify** | Document `X402_PRIVATE_KEY` env var |
| `README.npm.md` | **Modify** | Same env var documentation |

---

## Implementation Details

### `src/x402.ts` (new file)

```typescript
import { wrapFetchWithPayment } from '@x402/fetch';
import { x402Client } from '@x402/core/client';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { privateKeyToAccount } from 'viem/accounts';

export function setupX402(): boolean {
  const privateKey = process.env.X402_PRIVATE_KEY;
  if (!privateKey) return false;

  const signer = privateKeyToAccount(privateKey as `0x${string}`);
  const client = new x402Client();
  registerExactEvmScheme(client, { signer });

  globalThis.fetch = wrapFetchWithPayment(fetch, client);
  return true;
}
```

- Returns `true` if payments enabled, `false` if not
- Must be called before `createClientFromEnv()` or `createMcpServer()`
- No-op when `X402_PRIVATE_KEY` is not set

### `src/cli.ts` changes

Add at the very top of the file (before the `if (args.includes('--http'))` block):

```typescript
const { setupX402 } = await import('./x402.js');
const x402Enabled = setupX402();
if (x402Enabled) {
  console.error('[onesource] x402 payments enabled');
}
```

### `package.json` changes

Add to `dependencies`:

```json
"@x402/fetch": "^<latest>",
"@x402/core": "^<latest>",
"@x402/evm": "^<latest>",
"viem": "^2.x"
```

### README changes

Add to the Environment Variables table in both `README.md` and `README.npm.md`:

```
| X402_PRIVATE_KEY | — | EVM private key (hex, 0x-prefixed) for automatic x402 USDC payments on Base |
```

---

## What This Does NOT Change

- **`@one-source/api-mcp`** — no modifications needed
- **`register-api-tools.ts`** — x402 analytics tracking already works
- **`create-server.ts`** — no changes
- **Docs tools** — unaffected (free, no 402s)
- **Behavior without env var** — identical to current (402 = error message)

---

## User Experience

### Without `X402_PRIVATE_KEY` (free mode)

```bash
npx @one-source/mcp
# Tools that hit x402 endpoints return: "Payment required (402)..."
# Docs tools work normally
```

### With `X402_PRIVATE_KEY` (paid mode)

```bash
X402_PRIVATE_KEY=0xabc123... npx @one-source/mcp
# stderr: [onesource] x402 payments enabled
# All 22 API tools work — payments handled automatically
# USDC on Base is deducted per request
```

---

## Verification

1. `npm run build` — zero type errors
2. **Without key**: API tools return 402 error as before (no regression)
3. **With key**: API tool calls that hit 402 are automatically paid and succeed
4. Stderr shows `[onesource] x402 payments enabled` when key is set
5. Analytics still tracks `x402_required: true` on paid requests

---

## Future: Move to `@one-source/api-mcp`

Long-term, this should be implemented in the api-mcp client itself so all consumers benefit. That would involve:
1. Adding x402 deps to api-mcp
2. Accepting an optional fetch override in `ClientOptions`
3. Using the wrapped fetch in `fetchWithMetrics()`
4. Removing the global patch from this unified MCP
