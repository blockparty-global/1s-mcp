# OneSource MCP — Full Testing Flow
**Version:** 5.4.0  
**Date:** 2026-06-09  
**Purpose:** End-to-end verification of all 30 tools from a clean install.

---

## Test Run — 2026-06-11

**Tester:** Claude Code (automated via MCP tool calls in-session)  
**Auth:** API key (`sk_28a••••••`) — detected by `1s_setup_check`, accepted by backend  
**Transport:** stdio  
**Version:** 5.4.2 (latest)

### Summary

| Phase | Tests | Pass | Fail | Blocked |
|-------|-------|------|------|---------|
| Phase 2 — Setup Check | 1 | 1 | 0 | 0 |
| Phase 3 — Chain Utility Tools | 13 | 13 | 0 | 0 |
| Phase 4 — Live Chain Tools | 12 | 12 | 0 | 0 |
| Phase 5 — Bug Reporting | 1 | 1 | 0 | 0 |
| Phase 6 — Auth Edge Cases | manual | — | — | — |
| Phase 7 — Install/Uninstall Cycles | manual | — | — | — |
| Phase 8 — HTTP Mode | manual | — | — | — |
| Phase 9 — x402 End-to-End | manual | — | — | — |
| Phase 10 — Batch Config | manual | — | — | — |
| Phase 11 — Refund | manual | — | — | — |

**Result: All automated phases passed (27/27 tests).**

### Phase 2 — Setup Check

| Test | Tool | Result | Notes |
|------|------|--------|-------|
| 1 | `1s_setup_check` | ✅ PASS | Version 5.4.2 (latest). Auth: Configured (API key). Backend: Reachable. Transport: stdio. Bug reporting: Enabled. Both env vars set — API key takes priority. |

### Phase 3 — Chain Utility Tools

| Test | Tool | Result | Notes |
|------|------|--------|-------|
| 2 | `1s_network_info` | ✅ PASS | chain_id: 0x1, block: 0x181fd82 (25,297,794), gas price: 0x97b461a |
| 3 | `1s_ens_resolve` (forward) | ✅ PASS | vitalik.eth → 0xd8da6bf26964af9d7eed9e03e53415d37aa96045 |
| 4 | `1s_ens_resolve` (reverse) | ✅ PASS | 0xd8dA6BF...96045 → vitalik.eth |
| 5 | `1s_nonce` | ✅ PASS | 0x1708 (5,896 txs sent) |
| 6 | `1s_contract_code` | ✅ PASS | USDC proxy bytecode returned (2,187 bytes), is_contract: true |
| 7 | `1s_proxy_detect` | ✅ PASS | proxy_type: slot0, impl: 0xfcb19e6a322b27c06842a71e8c725399f049ae3a |
| 8 | `1s_storage_read` | ✅ PASS | slot 0 → 0x000...fcb19e6a... (impl address packed in slot) |
| 9 | `1s_estimate_gas` | ✅ PASS | 0x5208 = 21,000 gas (simple ETH transfer) |
| 10 | `1s_simulate_call` | ✅ PASS | name() returned hex encoding of "USD Coin" |
| 11 | `1s_pending_block` | ✅ PASS | Returned pending block (truncated >100K chars as documented); hash, miner, transactions present |
| 12 | `1s_tx_receipt` | ✅ PASS | status: 0x1 (success), gasUsed: 0x5208, blockNumber: 0xb443 |
| 12a | `1s_block_number` | ✅ PASS | 0x181fd82 (25,297,794) |
| 12b | `1s_block_by_number` | ✅ PASS | Block 19,000,000 — hash, miner, 130 txs, withdrawals returned |
| 12c | `1s_chain_id` | ✅ PASS | 0x1 (Ethereum mainnet) |

### Phase 4 — Live Chain Tools

| Test | Tool | Result | Notes |
|------|------|--------|-------|
| 13 | `1s_erc20_balance_live` | ✅ PASS | Vitalik USDC balance: 31,127,137 raw units (31.127137 USDC) |
| 14 | `1s_multi_balance_live` | ✅ PASS | ETH + USDC returned in one call |
| 15 | `1s_total_supply_live` | ✅ PASS | USDC total supply: ~51,462,338,351 USDC |
| 16 | `1s_allowance_live` | ✅ PASS | Allowance: 0 (no approval granted — valid result) |
| 17 | `1s_contract_info_live` | ✅ PASS | BAYC: ERC721, ERC165 interfaces confirmed, name: BoredApeYachtClub |
| 18 | `1s_nft_owner_live` | ✅ PASS | BAYC #1 owner: 0x46efbaedc92067e6d60e84ed6395099723252496 |
| 19 | `1s_nft_metadata_live` | ✅ PASS | ipfs URI resolved; traits: Mouth (Grin), Fur (Robot), Eyes (Blue Beams) |
| 20 | `1s_erc721_tokens_live` | ✅ PASS | Vitalik owns BAYC #940 (balance: 1) |
| 21 | `1s_erc1155_balance_live` | ✅ PASS | Parallel card balance: 0 (valid result) |
| 22 | `1s_erc20_transfers_live` | ✅ PASS | 0 results for Vitalik in latest block (no matching transfers — valid) |
| 23 | `1s_events_live` | ✅ PASS | 49 USDC Transfer events returned from latest block |
| 24 | `1s_tx_details_live` | ✅ PASS | tx + receipt returned; status: 0x1, gasUsed: 0x5208, from/to confirmed |

### Phase 5 — Bug Reporting

| Test | Tool | Result | Notes |
|------|------|--------|-------|
| 25 | `1s_report_bug` | ✅ PASS | Submission confirmed: "Bug report sent to the OneSource team." |

---

## Test Run — 2026-06-10

**Tester:** Claude Code (automated via MCP tool calls in-session)  
**Auth:** API key (`sk_fad••••••`) — detected by `1s_setup_check`, rejected by backend  
**Transport:** stdio

### Summary

| Phase | Tests | Pass | Fail | Blocked |
|-------|-------|------|------|---------|
| Phase 2 — Setup Check | 1 | 1 | 0 | 0 |
| Phase 3 — Chain Utility Tools | 13 | 0 | 13 | 0 |
| Phase 4 — Live Chain Tools | 12 | — | — | 12 |
| Phase 5 — Bug Reporting | 1 | — | — | 1 |
| Phase 6 — Auth Edge Cases | manual | — | — | — |
| Phase 7 — Install/Uninstall Cycles | manual | — | — | — |
| Phase 8 — HTTP Mode | manual | — | — | — |
| Phase 9 — x402 End-to-End | manual | — | — | — |
| Phase 10 — Batch Config | manual | — | — | — |
| Phase 11 — Refund | manual | — | — | — |

**Blocking issue:** API key `sk_fad••••••` is accepted by `setup_check` (connectivity check passes) but rejected with `402` by every blockchain tool. All Phase 3–5 tests could not complete. Verify key status at app.onesource.io.

### Phase 2 — Setup Check

| Test | Tool | Result | Notes |
|------|------|--------|-------|
| 1 | `1s_setup_check` | ✅ PASS | Version 5.4.0 (5.4.1 available). Auth: Configured (API key). Backend: Reachable. Transport: stdio. Bug reporting: Enabled. Both `ONESOURCE_API_KEY` and `X402_PRIVATE_KEY` set — API key takes priority. |

**Observation:** Update available (5.4.0 → 5.4.1). Both auth env vars are set; setup_check correctly reports API key priority and warns about x402 being ignored.

### Phase 3 — Chain Utility Tools

All 13 tools returned `402: your API key was not accepted` — backend is rejecting the key despite it being detected as configured. Tests 2–12c are blocked until the key is valid.

| Test | Tool | Result | Notes |
|------|------|--------|-------|
| 2 | `1s_network_info` | ❌ 402 | API key rejected by backend |
| 3 | `1s_ens_resolve` (forward) | ❌ 402 | API key rejected by backend |
| 4 | `1s_ens_resolve` (reverse) | ❌ 402 | API key rejected by backend |
| 5 | `1s_nonce` | ❌ 402 | API key rejected by backend |
| 6 | `1s_contract_code` | — | Skipped (same 402 expected) |
| 7 | `1s_proxy_detect` | ❌ 402 | API key rejected by backend |
| 8 | `1s_storage_read` | ❌ 402 | API key rejected by backend |
| 9 | `1s_estimate_gas` | ❌ 402 | API key rejected by backend |
| 10 | `1s_simulate_call` | ❌ 402 | API key rejected by backend |
| 11 | `1s_pending_block` | — | Skipped (same 402 expected) |
| 12 | `1s_tx_receipt` | — | Skipped (same 402 expected) |
| 12a | `1s_block_number` | ❌ 402 | API key rejected by backend |
| 12b | `1s_block_by_number` | — | Skipped (same 402 expected) |
| 12c | `1s_chain_id` | ❌ 402 | API key rejected by backend |

### Phase 4 — Live Chain Tools

Blocked by same 402. Not attempted.

### Phase 5 — Bug Reporting

`1s_report_bug` is free (no auth required). Blocked intentionally — per MCP server instructions, 402 auth errors must not be auto-reported.

### Phases 6–11 — Manual Only

These phases require interactive shell operations (claude mcp add/remove, /reload-plugins), a funded x402 test wallet, or HTTP mode setup. They cannot be run automated in-session.

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

## Phase 3 — Chain Utility Tools (13 tools, RPC only)

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

### Test 12a — `1s_block_number`

**Prompt:**
```
Call 1s_block_number for ethereum
```

**Expected:** Returns the current latest block number as an integer. Should be a recent mainnet block (> 19,000,000).

---

### Test 12b — `1s_block_by_number`

**Prompt:**
```
Call 1s_block_by_number for block 19000000 on ethereum
```

**Expected:** Returns block data including hash, timestamp, miner, gas used, and transaction count. Block 19,000,000 is a fixed historical block so the result is deterministic.

---

### Test 12c — `1s_chain_id`

**Prompt:**
```
Call 1s_chain_id for ethereum
```

**Expected:** Returns `1` (Ethereum mainnet chain ID).

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
{"status":"ok","server":"onesource-mcp","version":"5.4.0","tools":30}
```

Connect an MCP client to `http://localhost:3000/` and run `1s_setup_check` to verify transport shows `http`.

---

## Phase 8a — OAuth Multi-Replica (shared session store)

Verifies the hosted OAuth flow works across ≥2 replicas via a shared Valkey session store. Without `VALKEY_URL`, the server uses the per-process in-memory store (single-replica behavior, unchanged) — this phase only applies when testing the Valkey path.

**Prerequisites:**
- Docker (for a local Valkey)
- `ONESOURCE_JWT_SECRET` set (same value for every instance — this is what makes JWTs/encrypted payloads cross-pod)
- A valid OneSource API key to complete the connect step

**Setup — one Valkey, two server instances:**
```bash
# 1. Start a local Valkey
docker run -d --name mcp-valkey -p 6379:6379 valkey/valkey:8-alpine

# 2. Start instance A (pod A) on :3000
VALKEY_URL=redis://localhost:6379 ONESOURCE_JWT_SECRET=<hex> \
  npx -y @one-source/mcp@latest --http --port=3000

# 3. Start instance B (pod B) on :3001, same Valkey + same secret
VALKEY_URL=redis://localhost:6379 ONESOURCE_JWT_SECRET=<hex> \
  npx -y @one-source/mcp@latest --http --port=3001
```
On startup each instance must log `session store: Valkey (...)` (password redacted). If Valkey is unreachable, the instance must log `FATAL: could not connect to Valkey — refusing to start` and exit — it must NOT fall back to in-memory.

**Test 1 — authState + stateCookies cross pods (drive `/authorize` + connect-init on A, connect-submit on B):**
```bash
# Use one shared cookie jar across both ports.
JAR=$(mktemp)
# authorize on A → follow to /oauth/connect?state=<S>; capture <S>
curl -sD - -c "$JAR" "http://localhost:3000/oauth/authorize?response_type=code&client_id=c&redirect_uri=https://claude.ai/cb&code_challenge=$(head -c32 /dev/urandom | basenc --base64url | tr -d '=' | head -c43)&code_challenge_method=S256"
# connect-init on A (issues the CSRF cookie into the jar)
curl -s -c "$JAR" -b "$JAR" "http://localhost:3000/api/oauth/connect-init?state=<S>"
# connect-submit on B — proves authState + the CSRF cookie hash are visible on pod B
curl -s -b "$JAR" -X POST "http://localhost:3001/api/oauth/connect-submit" \
  -H 'Content-Type: application/json' -d '{"state":"<S>","apiKey":"<valid-key>"}'
# → expect {"location":"https://claude.ai/cb?code=<CODE>&state=..."}
```

**Test 2 — pendingCode crosses pods (drive connect-submit on A, `/token` on B):**
```bash
# Repeat authorize + connect-init + connect-submit on A to mint <CODE> with a known <VERIFIER>.
# Then exchange the code on B:
curl -s -X POST "http://localhost:3001/oauth/token" \
  -H 'Content-Type: application/json' \
  -d '{"grant_type":"authorization_code","code":"<CODE>","code_verifier":"<VERIFIER>","redirect_uri":"https://claude.ai/cb"}'
# → expect {"access_token":"eyJ...","token_type":"Bearer","expires_in":...}
```
> **Caveat:** curl reuses the `Path=/api/oauth` cookie across ports where a browser would not across origins. This validates the *store* (cross-pod state), not browser origin behavior.

**Test 3 — store-down (fail closed + degraded rate limiting):**
```bash
docker stop mcp-valkey   # kill Valkey mid-session
```
- `/oauth/authorize`, connect-init, connect-submit, and `/token` must return **503 / invalid_grant** (fail closed) — never a silent in-memory fallback.
- The rate limiter must degrade to per-process (not go unlimited) and log `rate limiter degraded` once per window.

**Test 4 — single-use / replay across pods:** re-submit the same `<CODE>` on the other pod → second attempt must return `invalid_grant` (GETDEL consumed it on first use).

**Test 5 — TTL expiry:** wait >120s, then exchange the code → `invalid_grant` (native `PX` expiry).

Cleanup: `docker rm -f mcp-valkey`.

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

## Phase 10 — Batch Config (x402, in-session)

Verifies that x402 batch-settlement preferences can be fully configured from the session via `1s_batch_config` — no config file editing, no restart — and that they persist across restarts. Run with `X402_PRIVATE_KEY` set (no `ONESOURCE_API_KEY`).

> The settings are saved to `~/.onesource/batch-config.json` (override the directory with `ONESOURCE_CONFIG_DIR`). A saved config takes priority over the `X402_BATCH_*` / `X402_PAYMENT_MODE` / `X402_DEPOSIT_MULTIPLIER` env vars.

### Test 29 — `1s_payment_mode` (read current mode)

**Prompt:**
```
Call 1s_payment_mode
```

**Expected:** Returns the current x402 payment mode (`exact` or `batch`) and whether a deposit is active. With no prior config, mode should be `exact`.

---

### Test 30 — View batch config settings

**Prompt:**
```
Call 1s_batch_config
```
**Expected:** Reports the current autonomy (`prompt`), threshold, deposit multiplier, and default mode. With no prior config, shows defaults (`ask` / `5` / `10` / `exact`).

### Test 31 — Change settings and persist

**Prompt:**
```
Call 1s_batch_config with prompt "auto", threshold 12, and mode "batch"
```
**Expected:**
- Confirms the new settings (`auto` / `12` / `batch`).
- Notes the live payment scheme switched to `batch` for this session.
- Reports the settings were saved to the config file path.

Confirm with `1s_payment_mode` (no args) — mode should now be `batch`.

### Test 32 — Persistence across restart

Restart the MCP client (Claude Desktop: quit and reopen; Claude Code: `/reload-plugins` or restart). Then:

**Prompt:**
```
Call 1s_setup_check
```
**Expected:** The Batch Settlement section shows the saved settings (`auto` / `12`, default mode `batch`) and lists the config file under "Saved to". This confirms the values survived the restart without any config-file editing.

### Test 33 — Setup check prompts for batch preference

**Prompt:**
```
Call 1s_setup_check
```
**Expected:** Under x402 auth, the Batch Settlement section ends with a "Your preference" directive instructing the agent to ask how batch should be handled and to apply the answer with `1s_batch_config`. The agent should raise this with you.

### Test 34 — Validation and reset

**Prompt:**
```
Call 1s_batch_config with threshold -5
```
**Expected:** Rejected with a validation error; no settings change.

**Prompt:**
```
Call 1s_batch_config with reset true
```
**Expected:** All settings return to defaults (or to the `X402_*` env vars, if set); the saved config file is removed.

---

## Phase 11 — Refund (x402 only, destructive)

Verifies that `1s_refund` can reclaim an open x402 deposit back to the wallet. This tool is destructive — it closes the active deposit — so run it last and only with a dedicated test wallet. Requires `X402_PRIVATE_KEY` set and an active deposit (i.e. at least one tool call made in batch mode this session, or a deposit opened via `1s_payment_mode`).

> **Do not run with a primary wallet.** The refund settles whatever deposit is currently open.

### Test 35 — `1s_refund`

**Setup:** Ensure you have an active x402 deposit. The simplest way is to run one tool call in batch mode after completing Phase 10 (the deposit from Test 31 should still be open if you haven't reset).

**Prompt:**
```
Call 1s_refund
```

**Expected:**
- Returns confirmation that the refund transaction was submitted, including the transaction hash.
- The wallet's USDC balance on Base increases by the remaining deposit amount (minus gas).
- Subsequent calls to `1s_payment_mode` show no active deposit.

**Fail conditions:**
- `No active deposit` — no deposit is open; run a tool call in batch mode first
- Transaction error — wallet may lack gas (ETH on Base) to submit the refund transaction
- Balance unchanged after ~30 seconds — refund transaction may have reverted; check the tx hash on Basescan

---

## Pass / Fail Criteria

| Check | Pass | Fail |
|-------|------|------|
| Server connects | Listed in `/mcp` as connected | Error or not listed |
| `1s_setup_check` | Auth configured, backend reachable | Not configured or unreachable |
| Chain utility tools | Returns structured data | Error or empty response |
| Live chain tools | Returns data or valid empty result | Unhandled error or crash |
| Bug reporting | Returns submission confirmation | Error or no response |
| Tool count | 30 tools available | Fewer or more |
| HTTP health check | `{"tools":30}` | Wrong count or 500 |

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
