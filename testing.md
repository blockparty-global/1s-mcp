# OneSource MCP — Full Testing Flow
**Version:** 5.0.0  
**Date:** 2026-04-16  
**Purpose:** End-to-end verification of all 24 tools from a clean install.

---

## Prerequisites

- Node.js ≥ 18 installed (`node --version`)
- One of: Claude Code CLI, Claude Desktop, or Cursor
- One of: `ONESOURCE_API_KEY` (recommended) or an EVM private key funded with USDC on Base

---

## Phase 1 — Installation

### Claude Code (CLI)

**Without auth (install first, configure after):**
```bash
claude mcp add onesource -- npx -y @one-source/mcp@latest
```

**With API key:**
```bash
claude mcp add onesource -e ONESOURCE_API_KEY=<your-key> -- npx -y @one-source/mcp@latest
```

**With x402:**
```bash
claude mcp add onesource -e X402_PRIVATE_KEY=<your-64-char-hex-key> -- npx -y @one-source/mcp@latest
```

Then reload: `/reload-plugins`

Verify server is listed: `/mcp`  
Expected: `onesource` appears with status `connected`.

---

### Claude Desktop / Cursor

Add to your MCP config file:

**macOS Claude Desktop:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Cursor (macOS):** `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "onesource": {
      "command": "npx",
      "args": ["-y", "@one-source/mcp@latest"],
      "env": {
        "ONESOURCE_API_KEY": "<your-key>"
      }
    }
  }
}
```

Restart the app after saving. Verify the `onesource` server appears in the MCP panel.

---

## Phase 2 — Setup Check (run this first, always)

### Test 1 — `1s_setup_check`

**Prompt:**
```
Call 1s_setup_check
```

**Expected output includes:**
- `## Server Version` — shows current version and whether an update is available
- `## Authentication` — shows `Status: Configured (API key)` or `Status: Configured (x402)` (not "Not configured")
- `## API Connectivity` — shows `Backend: Reachable`
- `## Transport` — shows `stdio` or `http`
- `## Bug Reporting` — shows `Enabled`

**Fail conditions:**
- Status shows "Not configured" → auth env var not reaching the server; reload MCP
- Backend shows "Unreachable" → network issue or wrong `ONESOURCE_BASE_URL`
- Tool not found → server not connected; check `/mcp`

---

## Phase 3 — Chain Utility Tools (10 tools, RPC only)

These use RPC and have no indexing dependency. Run these first.

---

### Test 2 — `1s_network_info`

**Prompt:**
```
Call 1s_network_info for ethereum
```

**Expected:** Returns chain ID (`1`), current block number, and current gas price. Block number should be a recent mainnet block (> 19,000,000).

---

### Test 3 — `1s_ens_resolve` (name → address)

**Prompt:**
```
Resolve the ENS name vitalik.eth using 1s_ens_resolve
```

**Expected:** Returns `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` (Vitalik's address).

---

### Test 4 — `1s_ens_resolve` (address → name)

**Prompt:**
```
Reverse resolve the address 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 to an ENS name using 1s_ens_resolve
```

**Expected:** Returns `vitalik.eth`.

---

### Test 5 — `1s_nonce`

**Prompt:**
```
Get the transaction count (nonce) for 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 on ethereum using 1s_nonce
```

**Expected:** Returns a large integer (Vitalik has sent many transactions).

---

### Test 6 — `1s_contract_code`

**Prompt:**
```
Get the bytecode for contract 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 on ethereum using 1s_contract_code
```

**Expected:** Returns a long hex bytecode string (USDC is a deployed contract, not an EOA).

---

### Test 7 — `1s_proxy_detect`

**Prompt:**
```
Check if 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 is a proxy contract on ethereum using 1s_proxy_detect
```

**Expected:** Returns proxy type (USDC uses a proxy pattern) and implementation address.

---

### Test 8 — `1s_storage_read`

**Prompt:**
```
Read storage slot 0 of contract 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 on ethereum using 1s_storage_read
```

**Expected:** Returns a 32-byte hex value.

---

### Test 9 — `1s_estimate_gas`

**Prompt:**
```
Estimate the gas for transferring 0 ETH from 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 to 0x000000000000000000000000000000000000dEaD on ethereum using 1s_estimate_gas
```

**Expected:** Returns a gas estimate (likely `21000` for a simple ETH transfer).

---

### Test 10 — `1s_simulate_call`

**Prompt:**
```
Simulate calling the name() function (selector 0x06fdde03) on contract 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 on ethereum using 1s_simulate_call
```

**Expected:** Returns hex-encoded result. Decoded, it should represent "USD Coin".

---

### Test 11 — `1s_pending_block`

**Prompt:**
```
Get the pending block on ethereum using 1s_pending_block
```

**Expected:** Returns pending block data including transactions in the mempool.

---

### Test 12 — `1s_tx_receipt`

**Prompt:**
```
Get the receipt for transaction 0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060 on ethereum using 1s_tx_receipt
```

**Expected:** Returns receipt with status, gas used, logs. This is a historical mainnet transaction (the first ever DAO hack transaction).

---

## Phase 4 — Live Chain Tools (12 tools)

These query indexed blockchain data.

---

### Test 13 — `1s_erc20_balance_live`

**Prompt:**
```
Get the USDC balance of 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 using the USDC contract 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 on ethereum using 1s_erc20_balance_live
```

**Expected:** Returns a balance (may be 0 or non-zero — Vitalik holds various amounts of USDC over time).

---

### Test 14 — `1s_multi_balance_live`

**Prompt:**
```
Get the ETH and USDC balances for 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 on ethereum. USDC contract is 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48. Use 1s_multi_balance_live
```

**Expected:** Returns ETH balance and USDC balance in one call.

---

### Test 15 — `1s_total_supply_live`

**Prompt:**
```
Get the total supply of USDC (contract 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) on ethereum using 1s_total_supply_live
```

**Expected:** Returns a very large number representing billions of USDC (6 decimal places).

---

### Test 16 — `1s_allowance_live`

**Prompt:**
```
Check the USDC allowance that 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 has granted to 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D (Uniswap V2 Router) using USDC contract 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 on ethereum. Use 1s_allowance_live
```

**Expected:** Returns an allowance value (likely 0 if no approval exists — that's a valid result).

---

### Test 17 — `1s_contract_info_live`

**Prompt:**
```
Detect the contract type of 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D on ethereum using 1s_contract_info_live
```

**Expected:** Returns ERC721 (this is the Bored Ape Yacht Club contract).

---

### Test 18 — `1s_nft_owner_live`

**Prompt:**
```
Who owns Bored Ape #1 (token ID 1) from contract 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D on ethereum? Use 1s_nft_owner_live
```

**Expected:** Returns an Ethereum address (the current owner of BAYC #1).

---

### Test 19 — `1s_nft_metadata_live`

**Prompt:**
```
Get the metadata for Bored Ape #1 (token ID 1) from contract 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D on ethereum using 1s_nft_metadata_live
```

**Expected:** Returns tokenURI and/or decoded metadata (name, image URL, traits).

---

### Test 20 — `1s_erc721_tokens_live`

**Prompt:**
```
List tokens owned by 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 from the BAYC contract 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D on ethereum using 1s_erc721_tokens_live
```

**Expected:** Returns a list of token IDs owned (may be empty — valid result).

---

### Test 21 — `1s_erc1155_balance_live`

**Prompt:**
```
Check the balance of token ID 1 for address 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 from ERC1155 contract 0x76BE3b62873462d2142405439777e971754E8E77 on ethereum using 1s_erc1155_balance_live
```

**Expected:** Returns a balance (0 or more). This is the Parallel cards contract.

---

### Test 22 — `1s_erc20_transfers_live`

**Prompt:**
```
Get recent USDC transfers (contract 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) to or from 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 on ethereum. Limit to 5. Use 1s_erc20_transfers_live
```

**Expected:** Returns a list of transfer events with from, to, amount, and block number.

---

### Test 23 — `1s_events_live`

**Prompt:**
```
Get the last 5 Transfer events from USDC contract 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 on ethereum using 1s_events_live
```

**Expected:** Returns a list of Transfer event logs with decoded topics and data.

---

### Test 24 — `1s_tx_details_live`

**Prompt:**
```
Get the full details and receipt for transaction 0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060 on ethereum using 1s_tx_details_live
```

**Expected:** Returns combined transaction + receipt (input data, value, gas used, status, logs).

---

## Phase 5 — Bug Reporting

### Test 25 — `1s_report_bug`

**Prompt:**
```
Call 1s_report_bug with tool_name "1s_network_info", description "Testing bug reporting — this is a test submission, not a real bug", severity "low"
```

**Expected:** Returns a confirmation that the bug report was submitted successfully (ticket ID or success message).

---

## Phase 6 — Auth Edge Cases

### Test 26 — No auth configured

Install without any env vars:
```bash
claude mcp add onesource -- npx -y @one-source/mcp@latest
```

Then call `1s_setup_check`.

**Expected:** Authentication section shows `Status: Not configured` with setup instructions for both Option 1 (API key) and Option 2 (x402).

**Expected behavior on API tool call:** Tool returns an error or 402/403 response, not a crash.

---

### Test 27 — Both keys set (priority check)

Install with both env vars:
```bash
claude mcp add onesource -e ONESOURCE_API_KEY=<key> -e X402_PRIVATE_KEY=<hex-key> -- npx -y @one-source/mcp@latest
```

Then call `1s_setup_check`.

**Expected:** Shows `Status: Configured (API key)` with a warning that both are set and x402 is not used. The active auth method should be `api_key`.

---

### Test 28 — Whitespace-only API key

Set `ONESOURCE_API_KEY` to spaces only (e.g., `"   "`).

**Expected:** Server treats it as no auth configured (`Status: Not configured`). Should not claim API key is active.

---

## Phase 7 — Install / Uninstall Cycles

These tests verify that the server installs, removes, and reinstalls cleanly across different auth configurations. Run these in order. Each step uses Claude Code (`claude mcp` commands) — adapt to config file edits for Claude Desktop / Cursor.

> **Shell env leak:** If `ONESOURCE_API_KEY` or `X402_PRIVATE_KEY` is exported in your shell (e.g. `~/.zshenv`), the MCP subprocess inherits it even when not passed via `-e`. Cycles 1 and 3 test "no API key" and "x402 only" respectively — for those to be valid, pass `-e ONESOURCE_API_KEY=` explicitly to override any shell value.

---

### Cycle 1 — Install with no auth → verify → remove

**Step 1:** Install without any auth:
```bash
claude mcp add onesource -- npx -y @one-source/mcp@latest
```
Reload: `/reload-plugins`

**Step 2:** Verify server is connected:
```
/mcp
```
Expected: `onesource` listed as connected.

**Step 3:** Call `1s_setup_check`  
Expected: Auth status shows `Not configured`. Server still starts and responds.

**Step 4:** Remove:
```bash
claude mcp remove onesource
```
Reload: `/reload-plugins`

**Step 5:** Verify server is gone:
```
/mcp
```
Expected: `onesource` no longer listed.

---

### Cycle 2 — Install with API key → verify → remove

**Step 1:** Install with API key:
```bash
claude mcp add onesource -e ONESOURCE_API_KEY=<your-key> -- npx -y @one-source/mcp@latest
```
Reload: `/reload-plugins`

**Step 2:** Call `1s_setup_check`  
Expected: Auth status shows `Configured (API key)`.

**Step 3:** Call `1s_network_info` for ethereum  
Expected: Returns chain data — confirms API key auth is working end-to-end.

**Step 4:** Remove:
```bash
claude mcp remove onesource
```
Reload: `/reload-plugins`

Expected: `onesource` no longer listed in `/mcp`.

---

### Cycle 3 — Install with x402 → verify → remove

**Step 1:** Install with x402 key:
```bash
claude mcp add onesource -e X402_PRIVATE_KEY=<your-hex-key> -- npx -y @one-source/mcp@latest
```
Reload: `/reload-plugins`

**Step 2:** Call `1s_setup_check`  
Expected: Auth status shows `Configured (x402)` with wallet address.

**Step 3:** Call `1s_network_info` for ethereum  
Expected: Returns chain data — confirms x402 key is valid and the server is configured correctly. Note: this does not verify that USDC was actually spent. For payment verification, see Phase 9.

**Step 4:** Remove:
```bash
claude mcp remove onesource
```
Reload: `/reload-plugins`

Expected: `onesource` no longer listed in `/mcp`.

---

### Cycle 4 — Reinstall with different auth (API key → x402 swap)

This tests that changing the auth method on reinstall takes effect cleanly.

**Step 1:** Install with API key:
```bash
claude mcp add onesource -e ONESOURCE_API_KEY=<your-key> -- npx -y @one-source/mcp@latest
```
Reload: `/reload-plugins`

**Step 2:** Confirm API key is active via `1s_setup_check`.

**Step 3:** Remove and reinstall with x402:
```bash
claude mcp remove onesource
claude mcp add onesource -e X402_PRIVATE_KEY=<your-hex-key> -- npx -y @one-source/mcp@latest
```
Reload: `/reload-plugins`

**Step 4:** Call `1s_setup_check`  
Expected: Auth now shows `Configured (x402)` — not `Configured (API key)`. Confirms the old config was fully replaced.

**Step 5:** Remove:
```bash
claude mcp remove onesource
```

---

### Cycle 5 — Reinstall at pinned version then upgrade to latest

This tests the update path.

**Step 1:** Install a previous version (4.0.4):
```bash
claude mcp add onesource -e ONESOURCE_API_KEY=<your-key> -- npx -y @one-source/mcp@4.0.4
```
Reload: `/reload-plugins`

**Step 2:** Call `1s_setup_check`  
Expected: Shows version `4.0.4` and "Update available" notice pointing to `5.0.0`.

**Step 3:** Remove and reinstall at latest:
```bash
claude mcp remove onesource
claude mcp add onesource -e ONESOURCE_API_KEY=<your-key> -- npx -y @one-source/mcp@latest
```
Reload: `/reload-plugins`

**Step 4:** Call `1s_setup_check`  
Expected: Shows version `5.0.0` and "You are on the latest version."

**Step 5:** Remove:
```bash
claude mcp remove onesource
```

---

### Cycle 6 — Reload without remove (config change in place)

This tests that `/reload-plugins` picks up a config change without a full remove/add.

**Step 1:** Install without auth:
```bash
claude mcp add onesource -- npx -y @one-source/mcp@latest
```
Reload: `/reload-plugins`  
Confirm: `1s_setup_check` shows `Not configured`.

**Step 2:** Edit the MCP config file directly to add `ONESOURCE_API_KEY` (find the file with `claude mcp get onesource`).

**Step 3:** Reload without removing:
```
/reload-plugins
```

**Step 4:** Call `1s_setup_check`  
Expected: Now shows `Configured (API key)` — confirms reload picks up env var changes without a reinstall.

**Step 5:** Remove:
```bash
claude mcp remove onesource
```

---

## Phase 8 — HTTP Mode (optional)

Start the server in HTTP mode:
```bash
npx -y @one-source/mcp@latest --http --port=3000
```

**Health check:**
```bash
curl http://localhost:3000/health
```
Expected response:
```json
{"status":"ok","server":"onesource-mcp","version":"5.0.0","tools":24}
```

Connect an MCP client to `http://localhost:3000/` and run `1s_setup_check` to verify transport shows `http`.

---

## Phase 9 — x402 End-to-End (Real Payments)

Verifies that x402 payments are actually being processed — USDC is spent from the wallet, not just that tools return data. Run this with a dedicated test wallet funded with a small amount of USDC on Base. Do not use a primary wallet.

**Prerequisites:**
- A dedicated EVM wallet private key (64-char hex)
- USDC on Base funded to the derived wallet address — $1–2 is enough
- MCP installed with `X402_PRIVATE_KEY` only (no `ONESOURCE_API_KEY`)
- One of: Basescan bookmarked, or Foundry's `cast` installed

---

### Step 1 — Record starting USDC balance on Base

Before any tool calls, note the exact USDC balance of the test wallet on the Base network.

**Via Basescan:**
```
https://basescan.org/address/<your-wallet-address>
```
Click "Token Holdings" — find USDC and note the exact balance (e.g. `4.250000`).

**Via Foundry cast:**
```bash
cast call 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  "balanceOf(address)(uint256)" <your-wallet-address> \
  --rpc-url https://mainnet.base.org
```
Result is in raw units (6 decimals) — divide by 1,000,000 to get USDC.

---

### Step 2 — Install with x402 only and verify auth

```bash
claude mcp remove onesource 2>/dev/null; \
claude mcp add onesource -e X402_PRIVATE_KEY=<your-hex-key> -- npx -y @one-source/mcp@latest
```
Reload: `/reload-plugins`

Call `1s_setup_check`. Confirm:
- Auth shows `Configured (x402)` — not "Configured (API key)", not "Not configured"
- Wallet address matches your test wallet
- Backend: Reachable

**If it shows `Configured (API key)`:** An `ONESOURCE_API_KEY` env var is leaking from your shell. Run `claude mcp remove onesource`, then reinstall with `-e ONESOURCE_API_KEY=` to explicitly clear it:
```bash
claude mcp add onesource -e X402_PRIVATE_KEY=<key> -e ONESOURCE_API_KEY= -- npx -y @one-source/mcp@latest
```

---

### Step 3 — Run 5 paid tool calls

Run each prompt below. Each successful response (real data, not a 402 error) means one x402 payment was processed.

```
Call 1s_network_info for ethereum
```
Expected: chain ID `1`, a recent block number, gas price.

```
Resolve the ENS name vitalik.eth using 1s_ens_resolve
```
Expected: `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`

```
Get the USDC balance of 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 using contract 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 on ethereum using 1s_erc20_balance_live
```
Expected: a USDC balance (any number, including 0).

```
Who owns Bored Ape #1 (token ID 1) from contract 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D on ethereum? Use 1s_nft_owner_live
```
Expected: an Ethereum address.

```
Get the total supply of USDC (contract 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) on ethereum using 1s_total_supply_live
```
Expected: a very large number (~55 billion USDC).

Record how many of the 5 returned real data vs. 402.

---

### Step 4 — Record ending USDC balance

Wait ~30 seconds for Base to finalize, then check the balance again using the same method as Step 1.

---

### Step 5 — Assert

| Check | Expected | Pass |
|-------|----------|------|
| All 5 tools returned real data | No 402s in the batch | ✅ / ❌ |
| USDC balance decreased | Ending balance < starting balance | ✅ / ❌ |
| Balance delta is ~$0.015 USDC | Between $0.010 and $0.025 for 5 calls (~$0.003/call) | ✅ / ❌ |

---

### Fail conditions

| Symptom | Likely cause |
|---------|-------------|
| All tools return 402 | x402 not configured, wallet not funded, or wallet on wrong network (must be Base) |
| Tools return data but balance unchanged | Payment handshake bypassed — x402 middleware not firing or backend accepted call without payment |
| Balance decreased by much more than $0.025 | Per-call cost has changed — update expected delta |
| Some tools 402, others succeed | Intermittent payment failure — worth retrying and filing a bug if consistent |

---

### Cleanup

```bash
claude mcp remove onesource
```

---

## Pass / Fail Criteria

| Check | Pass | Fail |
|-------|------|------|
| Server connects | Listed in `/mcp` as connected | Error or not listed |
| `1s_setup_check` | Auth configured, backend reachable | Not configured or unreachable |
| Chain utility tools | Returns structured data | Error or empty response |
| Live chain tools | Returns data or valid empty result | Unhandled error or crash |
| Bug reporting | Returns submission confirmation | Error or no response |
| Tool count | 24 tools available | Fewer or more |
| HTTP health check | `{"tools":24}` | Wrong count or 500 |

---

## Known Acceptable Results

- **Balance = 0** — valid; the address may not hold that token
- **Empty token list** — valid; the address may not own those NFTs
- **Allowance = 0** — valid; no approval has been granted
- **402 with no auth** — expected; configure auth to proceed
- **403 with API key** — key is valid but account needs a developer plan

---

## Test Data Reference

| Label | Value |
|-------|-------|
| Vitalik's address | `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` |
| ENS name | `vitalik.eth` |
| USDC contract | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| BAYC contract | `0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D` |
| Uniswap V2 Router | `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D` |
| Parallel ERC1155 | `0x76BE3b62873462d2142405439777e971754E8E77` |
| Historical TX | `0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060` |
| Network | `ethereum` (mainnet) |
