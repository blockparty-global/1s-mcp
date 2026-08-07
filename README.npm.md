# @one-source/mcp

Unified MCP server for [OneSource](https://docs.onesource.io) — 30 tools for blockchain data and live chain queries in a single server.

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

## Tools (30)

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
2. Subscribe to a developer plan (Stripe checkout).
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
- **MPP (Tempo):** `1s_payment_mode { "mode": "mpp-session" }` (or `MPP_PAYMENT_MODE=session`). First call deposits `price × MPP_DEPOSIT_MULTIPLIER` (default 10), capped by `MPP_MAX_DEPOSIT` (default 1).

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
| `MPP_DEPOSIT_MULTIPLIER` | `10` | Session mode: Tempo channel deposit = call price × this multiplier (min 3), capped by `MPP_MAX_DEPOSIT`. The MPP analog of `X402_DEPOSIT_MULTIPLIER`. |
| `MPP_MAX_DEPOSIT` | `1` | Session mode: ceiling on the price-sized deposit per Tempo voucher channel. Unused balance is reclaimable via `1s_refund`. |
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
