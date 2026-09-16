# @one-source/mcp

Unified MCP server for [OneSource](https://docs.onesource.io) — 83 tools for blockchain data, live chain queries, Deepstate market data, The Standard Reserve, and REST API documentation in a single server.

> **What is MCP?** The [Model Context Protocol](https://modelcontextprotocol.io) lets AI assistants call tools and access data sources. This server exposes both the OneSource blockchain API and its documentation as tools.

## Quick Start

### Claude Code

```bash
claude mcp add onesource -- npx -y @one-source/mcp@latest
```

### Claude Desktop / Cursor

Add to your MCP config:

```json
{
  "mcpServers": {
    "onesource": {
      "command": "npx",
      "args": ["-y", "@one-source/mcp@latest"]
    }
  }
}
```

### Any MCP Client (stdio)

```bash
npx -y @one-source/mcp@latest
```

### HTTP Server (self-hosted)

```bash
npx -y @one-source/mcp@latest --http
npx -y @one-source/mcp@latest --http --port=8080
```

Then connect your MCP client to `http://localhost:3000/`.

Health check: `GET http://localhost:3000/health`

## Tools (83)

### Blockchain API — Live Chain (12 tools)

| Tool | Description |
|------|-------------|
| `1s_allowance_live` | ERC20 allowance check |
| `1s_contract_info_live` | Contract type detection via ERC165 |
| `1s_erc1155_balance_live` | ERC1155 balance via RPC |
| `1s_erc20_balance_live` | ERC20 balance via balanceOf |
| `1s_erc20_transfers_live` | ERC20 Transfer logs via eth_getLogs |
| `1s_erc721_tokens_live` | ERC721 token enumeration |
| `1s_events_live` | Event logs via eth_getLogs |
| `1s_multi_balance_live` | ETH + multiple ERC20 balances |
| `1s_nft_metadata_live` | NFT metadata via tokenURI |
| `1s_nft_owner_live` | NFT owner via ownerOf |
| `1s_total_supply_live` | Token total supply |
| `1s_tx_details_live` | Transaction + receipt via RPC |

### Blockchain API — Chain Utilities (13 tools)

RPC only.

| Tool | Description |
|------|-------------|
| `1s_block_by_number` | Block details by number via RPC |
| `1s_block_number` | Latest block number |
| `1s_chain_id` | EIP-155 chain ID |
| `1s_contract_code` | Contract bytecode |
| `1s_ens_resolve` | ENS name/address resolution |
| `1s_estimate_gas` | Gas estimation |
| `1s_network_info` | Chain ID, block number, gas price |
| `1s_nonce` | Transaction count |
| `1s_pending_block` | Pending block from mempool |
| `1s_proxy_detect` | Proxy contract detection |
| `1s_simulate_call` | Simulate eth_call |
| `1s_storage_read` | Read storage slot |
| `1s_tx_receipt` | Transaction receipt |

### Payments (2 tools)

| Tool | Description |
|------|-------------|
| `1s_payment_mode` | View or switch the payment rail + scheme across all four modes: `x402-exact` / `x402-batch` (USDC on Base) and `mpp-charge` / `mpp-session` (USDC.e / pathUSD on Tempo). `batch` and `session` open a channel that funds many calls. |
| `1s_refund` | Reclaim an open payment channel's unspent deposit on demand — works for both an x402 `batch` channel (Base) and an MPP `session` voucher channel (Tempo) |

### Deepstate Market Data (8 tools)

Deepstate is an on-chain order-book protocol on Robinhood Chain (chain 4663). These tools read market data — order books, trades, candles, stats, maker analytics, and gas/depth analytics. They're ordinary tools on the same API and take no `network` parameter — always Robinhood Chain — and are paid like every other tool: API key, x402, or MPP.

| Tool | Description |
|------|-------------|
| `1s_ds_markets` | List the Deepstate markets (order books) this API serves, with each market's slug, token layout, and pool/router addresses |
| `1s_ds_book` | Order-book snapshot for a market — bids descending, asks ascending, with each price level's resting size |
| `1s_ds_trades` | Trade tape for a market, newest first — each fill's price, size, side, and block |
| `1s_ds_candles` | OHLCV candles for a market at a given timeframe |
| `1s_ds_stats` | Rolling 24h / 7d / 30d volume and price change for a market, plus the latest traded price |
| `1s_ds_makers` | Per-maker analytics for a market — time at top of book, resting notional, fill count/rate, and DEEP rewards |
| `1s_ds_cost_to_quote` | Gas spent resting and cancelling orders on a market, bucketed over time |
| `1s_ds_depth_history` | Depth heatmap for a market — resting order size by price level over time |

Every Deepstate tool except `1s_ds_markets` takes a `book` parameter: the market's canonical uppercase slug (e.g. `NVDA-USDG`) or its 32-byte `book_id`. Call `1s_ds_markets` first for the full list.

### The Standard Reserve (37 tools)

The Standard Reserve is an on-chain central-bank protocol on Robinhood Chain (chain id 4663). These tools read the deployed contracts' state as indexed and served by OneSource, with `basis`, `as_of_block`, and `serving_state` on every response. `1s_std_addresses` and `1s_std_genesis_live` are free; every other tool here is paid the same way as the rest of this API: API key, x402, or MPP. Several tools (`1s_std_supply`, `_vaults`, `_pool`, `_exit_pressure`, `_backing`, `_policy_current`) also take an `atBlock` param to read that state as of a past block instead of the latest one.


| Tool                        | Description                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| `1s_std_addresses`          | Verified registry of TSR contracts and pool, with a verification status per entry. Free, no payment required. |
| `1s_std_auction_days`       | Per-day auction history for the license or charter auction: open/floor/close price, sold vs. offered, time to sell out |
| `1s_std_auction_sales`      | Recent sales for the license or charter auction, newest first: buyer, unit price, count, and block. Filter by kind, page with before/limit |
| `1s_std_auctions_current`   | Current state of the daily license auction and charter auction: price, floor, sold/remaining today, phase, and last sale |
| `1s_std_backing`            | Reserve backing: vault ETH balances, unpriced reserve-asset holdings, and ETH-per-STANDARD backing ratio (excluding and including protocol-owned liquidity). Current, history, or as of a past block |
| `1s_std_branch_auction_live`| Raw head-fresh state of the Branch license auction: phase, price, today's sold/remaining counts, and recent sale velocity |
| `1s_std_branches_doi`       | Days of Issuance for the Branch license auction, plus a buy-now-vs-wait table                          |
| `1s_std_branches_summary`   | Summary across TSR's active Branches: count, issuance per Branch per day, and license price in days of issuance |
| `1s_std_buyback_readiness`  | Contraction-vault buyback-tick readiness: this tick's ETH capacity, binding constraint, cooldown, TWAP deviation, and recent executed ticks |
| `1s_std_candles`            | OHLC price candles for the ETH/STANDARD pool in ETH per STANDARD, with swap counts and volume. Set tf for candle width (1m to 1d) and from/to for the window |
| `1s_std_charter`            | One charter by id, or charters filtered by owner: holder, branch count, mint kind, owed production, and branch history |
| `1s_std_decision_branch`    | Composite: should I buy a Branch/license right now. Bundles Days of Issuance, license cost vs. the charter auction, recent auction history, policy outlook, and pending governance changes |
| `1s_std_decision_charter`   | Composite: should I buy into a new charter right now. Bundles charter-auction state, license-cost cheapest path, Days of Issuance, backing ratio, and holder concentration |
| `1s_std_decision_exit`      | Composite: should I exit a charter's branches right now. Bundles the exit quote, fee curve, fee forecast, tax schedule, pool state, policy outlook, and pending governance changes |
| `1s_std_decision_plan`      | Simulate three Branch-buying strategies (keep, selective, aggressive) over a horizon, seeded from live prices, issuance, and license cost unless overridden. A planning tool, not a forecast: it never names a winning strategy |
| `1s_std_dormancy`           | Wallets past their reportable dormancy window, or the full tracked wallet list                        |
| `1s_std_dormancy_bounties`  | Dormancy bounty board: wallets already past their reportable window, ranked by estimated bounty        |
| `1s_std_epochs`             | TSR epoch history: net flow, signal, regime, multiplier, and issuance per epoch. Page with before/limit |
| `1s_std_events`             | Raw decoded protocol events, optionally filtered by contract_label, event_name, addresses, token_id, epoch, or block/log cursor, and paginated with before/limit |
| `1s_std_exit_fee_curve`     | How the exit fee changes with withdrawal size: current fee rate plus a ladder at 1/5/10/25/50/100% of a gross withdrawal |
| `1s_std_exit_fee_forecast`  | Current-pace projection of the exit fee if no more withdrawals happen, day by day, plus days until the fee reaches its floor |
| `1s_std_exit_pressure`      | Exit-pressure reading and the resulting resolution fee rate. Current, history, or as of a past block   |
| `1s_std_exit_quote`         | Pro-rata exit quote for retiring a charter's open Branches, plus a realizable-ETH estimate as of a given block |
| `1s_std_flow_hourly`        | Hourly ETH flow into and out of the ETH/STANDARD pool, with swap counts. Set hours for how far back to look |
| `1s_std_genesis_live`       | Head-fresh stats for the genesis Dutch mint: phase, minted, remaining, price, and sale velocity. Free. |
| `1s_std_governance_changes` | Governance/param-change history across TSR's 12 contracts, what's currently queued, switch states, and guardian pause state |
| `1s_std_holders_concentration` | Charter/Branch ownership concentration: distribution across Charters, top owners, an HHI (Herfindahl-Hirschman Index) score, and the genesis-vs-auction cohort split |
| `1s_std_issuance_runway`    | Cumulative STANDARD issued against the Central Bank's issuance budget, current stream rate, and a same-state projection of when the budget runs out |
| `1s_std_license_cost`       | What a Branch license costs in ETH right now, and whether the charter auction is a cheaper path to the same outcome |
| `1s_std_license_headroom`   | How many more Branch licenses a charter can still buy today, with a live per-unit quote ladder            |
| `1s_std_policy_current`     | Current epoch's monetary policy: regime, multiplier, net flow, and the two-epoch signal. Current or as of a past block |
| `1s_std_policy_outlook`     | Same-state projection of the policy multiplier and issuance rate if the current epoch's net-flow sign holds to close |
| `1s_std_pool`               | Latest ETH/STANDARD Uniswap v4 pool state: price, tick, liquidity, reserves, and remaining launch tax. Current or as of a past block |
| `1s_std_supply`             | STANDARD supply ledger: circulating, cumulative minted, cumulative burned by path, and max supply. Current, history, or as of a past block |
| `1s_std_tax_schedule`       | Launch tax-hook schedule: current buy/sell tax, decay configuration, and a labeled projection while the launch schedule is active |
| `1s_std_vaults`             | Expansion and Contraction vault balances: WETH and STANDARD held, protocol-owned liquidity, and buyback capacity. Current, history, or as of a past block |
| `1s_std_wallet`             | One wallet's full TSR position across every Charter it holds: pending owed, a summary exit quote, dormancy status, and license headroom |

### Documentation (8 tools)

No authentication required. These answer from a documentation corpus bundled with the server, so they cost nothing and work even before a payment method is configured. They share their names with the standalone `@one-source/docs-mcp` server, which serves the same corpus.

| Tool | Description |
|------|-------------|
| `1s_search_docs` | Keyword search across the OneSource developer documentation |
| `1s_get_api_overview` | What the REST API covers — operation count, tags, networks, payment protocols |
| `1s_list_endpoints` | Every REST endpoint with method, path, price, and summary; filter by tag |
| `1s_get_endpoint_reference` | One endpoint in full — parameters, request body, example response, price, curl |
| `1s_search_use_cases` | Find the right endpoint from a plain-language description of the task |
| `1s_list_networks` | Networks the REST API routes, as declared by its published spec |
| `1s_get_payment_info` | Price range, payment rails, and pay-to address; per-endpoint when given one |
| `1s_get_authentication_guide` | How to authenticate to the REST API and which method to choose |

### Setup & Ops (3 tools)

No authentication required.

| Tool | Purpose | When to use |
|------|---------|-------------|
| `1s_setup_check` | **Interactive setup & health check** — walks the user through every config choice for both rails (auth method, x402, MPP, payment modes, channel prefs) one decision at a time, every run, plus version/auth/channel/connectivity status | First thing to call — to set up, change configuration, or troubleshoot |
| `1s_batch_config` | View or change payment-channel preferences (autonomy, threshold, x402 deposit multiplier, MPP session deposit cap, default mode) and persist them across restarts — no config editing required | Configure channel behaviour from the session |
| `1s_report_bug` | Report bugs to Slack (or GitHub Issues fallback) | When a tool errors or user wants to report an issue |

## Networks

All blockchain API tools accept an optional `network` parameter:

| Network | Description |
|---------|-------------|
| `ethereum` | Ethereum mainnet (default) |
| `sepolia` | Ethereum Sepolia testnet |
| `robinhood` | Robinhood Chain, chain 4663 (Arbitrum Orbit L2) — live-RPC only |

## Authentication

Blockchain API tools require authentication. Three options are available — if an API key is set alongside a wallet key, the API key takes priority and the wallet is ignored.

> **Tip:** the easiest way to configure any of these is the `1s_setup_check` tool — it walks you through every option interactively and hands you a ready-to-run command, so you never have to hand-edit env vars or config files. The manual instructions below are the reference.

| Method | Variable | Description |
|--------|----------|-------------|
| API key | `ONESOURCE_API_KEY` | Unlimited calls, no per-call cost |
| x402 micropayments | `X402_PRIVATE_KEY` | Pay-per-call via USDC on **Base**, no account required |
| MPP micropayments | `MPP_PRIVATE_KEY` | Pay-per-call via USDC.e / pathUSD on **Tempo**, no account required |

### Option 1: API Key

1. Go to [app.onesource.io](https://app.onesource.io) and create an account.
2. Complete the API key subscription through Stripe checkout.
3. Navigate to **API Keys** and generate a key.
4. Copy the key — it starts with `sk_`.

#### Claude Code

```bash
claude mcp add onesource -e ONESOURCE_API_KEY=<key> -- npx -y @one-source/mcp@latest
```

#### Claude Desktop / Cursor

```json
{
  "mcpServers": {
    "onesource": {
      "command": "npx",
      "args": ["-y", "@one-source/mcp@latest"],
      "env": {
        "ONESOURCE_API_KEY": "<key>"
      }
    }
  }
}
```

#### Any MCP Client (stdio)

```bash
ONESOURCE_API_KEY=<key> npx -y @one-source/mcp@latest
```

After adding, reload the MCP server and call `1s_setup_check` — under **Current configuration** it should report **Active auth method: API key** (with the first 6 characters of your key).

### Option 2: x402 Micropayments

Pay-per-call via USDC on Base using [x402](https://github.com/coinbase/x402). No account required — just an EVM wallet funded with USDC. The server handles payments transparently.

1. **Get an EVM private key** — export from MetaMask, Coinbase Wallet, or generate a fresh one. The key is a 64-character hex string. The `0x` prefix is optional — both formats are accepted.
2. **Pass the key to the server:**

#### Claude Code

```bash
claude mcp add onesource -e X402_PRIVATE_KEY=<key> -- npx -y @one-source/mcp@latest
```

#### Claude Desktop / Cursor

```json
{
  "mcpServers": {
    "onesource": {
      "command": "npx",
      "args": ["-y", "@one-source/mcp@latest"],
      "env": {
        "X402_PRIVATE_KEY": "<key>"
      }
    }
  }
}
```

#### Any MCP Client (stdio)

```bash
X402_PRIVATE_KEY=<key> npx -y @one-source/mcp@latest
```

3. **Reload and find your wallet address** — reload the MCP server, then call `1s_setup_check`. Under **Current configuration** it lists your **x402 (Base) wallet** — the address derived from your key.
4. **Fund that address with USDC on Base** — send USDC to the address shown, on the [Base](https://base.org) network. A few dollars ($1–5 USDC) is enough for hundreds of calls. Bridge from Ethereum mainnet if needed using the [Base Bridge](https://bridge.base.org).
5. **Verify** — call `1s_network_info` for ethereum. If it returns chain data, payments are working.

### Option 3: MPP Micropayments (Tempo)

Pay-per-call via USDC.e / pathUSD on the [Tempo](https://docs.onesource.io) network — an alternative to x402 on Base. No account required — just a Tempo wallet funded with USDC.e or pathUSD. The server handles payments transparently.

1. **Get an EVM private key** — same format as x402 (64-char hex, `0x` optional).
2. **Pass the key to the server:**

#### Claude Code

```bash
claude mcp add onesource -e MPP_PRIVATE_KEY=<key> -- npx -y @one-source/mcp@latest
```

#### Claude Desktop / Cursor

```json
{
  "mcpServers": {
    "onesource": {
      "command": "npx",
      "args": ["-y", "@one-source/mcp@latest"],
      "env": {
        "MPP_PRIVATE_KEY": "<key>"
      }
    }
  }
}
```

#### Any MCP Client (stdio)

```bash
MPP_PRIVATE_KEY=<key> npx -y @one-source/mcp@latest
```

3. **Reload and find your wallet address** — reload the MCP server, then call `1s_setup_check`. Under **Current configuration** it lists your **MPP (Tempo) wallet** — the address derived from your key.
4. **Fund that address with USDC.e or pathUSD on Tempo** — a few dollars covers hundreds of calls.
5. **Verify** — call `1s_network_info`. If it returns chain data, MPP payments are working.

### Payment channels (optional)

By default each paid call signs one payment per call (`x402-exact` on Base, `mpp-charge` on Tempo). For a burst of calls, open a **payment channel** — one on-chain deposit funds many off-chain calls, settled together — which is cheaper than per-call:

- **x402 (Base):** `1s_payment_mode { "mode": "x402-batch" }` (or `X402_PAYMENT_MODE=batch`). First call deposits `price × X402_DEPOSIT_MULTIPLIER` (default 10).
- **MPP (Tempo):** `1s_payment_mode { "mode": "mpp-session" }` (or `MPP_PAYMENT_MODE=session`). First call deposits up to `MPP_MAX_DEPOSIT` (default 1).

Reclaim the unused balance any time with the `1s_refund` tool (works for both rails); the residual is always recoverable. An idle x402 channel auto-refunds after a few hours; an MPP session settles automatically on clean shutdown.

When paying via a wallet, the agent is also given channel guidance at startup so it can manage this for you: when it anticipates a burst of calls it offers to switch to the active rail's channel mode and reminds you to `1s_refund` when done. Tune that behavior with the `1s_batch_config` tool — set whether the agent asks first / switches automatically / only on request (`prompt`), how many calls count as "a burst" (`threshold`, shared across rails), the x402 deposit multiplier, the MPP session deposit cap, and the default mode, all from your session. Changes are saved to a server-managed config file and persist across restarts, so you never have to edit the MCP config or set env vars by hand. (The matching `X402_*` / `MPP_*` env vars still work as install-time defaults.) Run `1s_setup_check` to see your current mode, whether the channel is available, and these settings.

### Security

Never commit keys to source control. Use environment variables, a `.env` file (excluded from git), or a secrets manager.

> **After any config change:** Run `/reload-plugins` in Claude Code, or restart Claude Desktop / Cursor. The MCP server must be reloaded to pick up new environment variables.

## Environment Variables

### Required

Set one to access the blockchain API tools. Without any, only the no-auth Setup & Ops tools work. The API key takes priority when set alongside a wallet key.

| Variable | Default | Description |
|----------|---------|-------------|
| `ONESOURCE_API_KEY` | — | OneSource API key for Bearer token auth. Takes priority over the wallet rails. |
| `X402_PRIVATE_KEY` | — | EVM private key (64-char hex, `0x` prefix optional) for automatic x402 USDC payments on **Base**. |
| `MPP_PRIVATE_KEY` | — | EVM private key for automatic MPP payments (USDC.e / pathUSD) on **Tempo**. |

### Optional / Advanced

All have sensible defaults — channel modes run out of the box. Set these only to tune how channel modes behave or how proactively the agent reaches for them. Payment modes can also be switched at runtime with the `1s_payment_mode` tool.

| Variable | Default | Description |
|----------|---------|-------------|
| `X402_PAYMENT_MODE` | `exact` | Initial x402 scheme: `exact` (per-call) or `batch` (payment channel). Switch in-session with `1s_payment_mode`. |
| `X402_DEPOSIT_MULTIPLIER` | `10` | Batch mode: deposit = price × this multiplier, funding that many calls per channel. Unused balance is reclaimable via `1s_refund`. |
| `X402_RPC_URL` | Base default | Base RPC endpoint used to submit channel deposits in batch mode. |
| `X402_CHANNEL_DIR` | — | Directory to persist batch channel state across restarts. Unset = in-memory (channel lost on restart). |
| `MPP_PAYMENT_MODE` | `charge` | Initial MPP scheme: `charge` (per-call) or `session` (Tempo voucher channel). Switch in-session with `1s_payment_mode`. |
| `MPP_MAX_DEPOSIT` | `1` | Session mode: max USDC.e / pathUSD locked per Tempo voucher channel. Unused balance is reclaimable via `1s_refund`. |
| `MPP_RPC_URL` | Tempo default | Tempo RPC endpoint used to submit channel deposits in session mode. |
| `X402_BATCH_PROMPT` | `ask` | How the agent handles switching to a channel mode (both rails): `ask` (confirm first), `auto` (switch on its own), or `off` (only when explicitly asked). |
| `X402_BATCH_THRESHOLD` | `5` | Number of anticipated calls in a session at/above which the agent considers a channel mode (both rails). Advisory — the agent estimates the count; not a hard runtime counter. |

## Troubleshooting

**`1s_setup_check` shows "Active auth method: none" (blockchain tools locked)** — Under **Current configuration**, "Active auth method: *none*" means no authentication is set. Set one of `ONESOURCE_API_KEY` (API key), `X402_PRIVATE_KEY` (x402 on Base), or `MPP_PRIVATE_KEY` (MPP on Tempo) — or just run `1s_setup_check` and let it walk you through it. Reload the MCP server after setting any variable. If the key still isn't reaching the server, set it as a shell environment variable directly.

**Getting 403 / wrong key active despite correct setup** — A key set in your shell profile (e.g. `~/.zshrc`, `~/.bash_profile`) is picked up by the MCP server process even if it isn't in your Claude MCP config. Run `echo $ONESOURCE_API_KEY` in your terminal to check. If it prints a value you didn't intend, unset it (`unset ONESOURCE_API_KEY`) or explicitly clear it when adding the server: `claude mcp add onesource -e ONESOURCE_API_KEY= -e X402_PRIVATE_KEY=<key> -- npx -y @one-source/mcp@latest`. `1s_setup_check` shows the first 6 characters of whichever key is active so you can confirm which one the server is using.

**Instructions show wrong auth method after reinstall** — `/reload-plugins` in Claude Code reconnects tools but may not refresh the system prompt the LLM sees. If you switch auth method (e.g. API key → x402), do a full Claude Code restart to ensure the instructions reflect the new auth.

**"MCP server onesource already exists" error** — Run `claude mcp remove onesource` first, then re-add.

**Windows: `npx` requires `cmd /c` wrapper** — Update your MCP config to use `"command": "cmd"` with `"args": ["/c", "npx", "-y", "@one-source/mcp@latest"]`. Claude Code's `/doctor` command can diagnose this.

**`npx` hangs with no output** — That's normal in stdio mode. Use `--http` for an HTTP server.

**Port already in use** — Specify a different port: `npx -y @one-source/mcp@latest --http --port=8080`

## Links

- [GitHub Repository](https://github.com/blockparty-global/1s-mcp)
- [OneSource Documentation](https://docs.onesource.io/getting-started/mcp/install)
- [Report an Issue](https://github.com/blockparty-global/1s-mcp/issues)

## License

Apache 2.0
