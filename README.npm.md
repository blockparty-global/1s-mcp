# @one-source/mcp

Unified MCP server for [OneSource](https://docs.onesource.io) — 27 tools for blockchain data and live chain queries in a single server.

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

## Tools (27)

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

### Setup & Ops (2 tools)

No authentication required.

| Tool | Purpose | When to use |
|------|---------|-------------|
| `1s_setup_check` | Server health, version, auth status, setup instructions | First thing to call — checks if everything is configured |
| `1s_report_bug` | Report bugs to Slack (or GitHub Issues fallback) | When a tool errors or user wants to report an issue |

## Networks

All blockchain API tools accept an optional `network` parameter:

| Network | Description |
|---------|-------------|
| `ethereum` | Ethereum mainnet (default) |
| `sepolia` | Ethereum Sepolia testnet |
| `avax` | Avalanche C-Chain |

## Authentication

Blockchain API tools require authentication. Two options are available — if both are set, API key takes priority.

| Method | Variable | Description |
|--------|----------|-------------|
| API key | `ONESOURCE_API_KEY` | Unlimited calls, no per-call cost |
| x402 micropayments | `X402_PRIVATE_KEY` | Pay-per-call via USDC on Base, no account required |

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

After adding, reload the MCP server and call `1s_setup_check` — it should show `Status: Configured (API key)`.

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

3. **Reload and find your wallet address** — reload the MCP server, then call `1s_setup_check`. It will show the wallet address derived from your key under "Wallet address".
4. **Fund that address with USDC on Base** — send USDC to the address shown, on the [Base](https://base.org) network. A few dollars ($1–5 USDC) is enough for hundreds of calls. Bridge from Ethereum mainnet if needed using the [Base Bridge](https://bridge.base.org).
5. **Verify** — call `1s_network_info` for ethereum. If it returns chain data, payments are working.

### Security

Never commit keys to source control. Use environment variables, a `.env` file (excluded from git), or a secrets manager.

> **After any config change:** Run `/reload-plugins` in Claude Code, or restart Claude Desktop / Cursor. The MCP server must be reloaded to pick up new environment variables.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ONESOURCE_API_KEY` | — | OneSource API key for Bearer token auth. Takes priority over x402. |
| `X402_PRIVATE_KEY` | — | EVM private key (64-char hex, `0x` prefix optional) for automatic x402 USDC payments on Base |

## Troubleshooting

**`1s_setup_check` shows "Not configured"** — Set either `ONESOURCE_API_KEY` or `X402_PRIVATE_KEY`. Reload the MCP server after setting either variable. If the key still isn't reaching the server, set it as a shell environment variable directly.

**Getting 403 / wrong key active despite correct setup** — A key set in your shell profile (e.g. `~/.zshrc`, `~/.bash_profile`) is picked up by the MCP server process even if it isn't in your Claude MCP config. Run `echo $ONESOURCE_API_KEY` in your terminal to check. If it prints a value you didn't intend, unset it (`unset ONESOURCE_API_KEY`) or explicitly clear it when adding the server: `claude mcp add onesource -e ONESOURCE_API_KEY= -e X402_PRIVATE_KEY=<key> -- npx -y @one-source/mcp@latest`. `1s_setup_check` shows the first 6 characters of whichever key is active so you can confirm which one the server is using.

**Instructions show wrong auth method after reinstall** — `/reload-plugins` in Claude Code reconnects tools but may not refresh the system prompt the LLM sees. If you switch auth method (e.g. API key → x402), do a full Claude Code restart to ensure the instructions reflect the new auth.

**"MCP server onesource already exists" error** — Run `claude mcp remove onesource` first, then re-add.

**Windows: `npx` requires `cmd /c` wrapper** — Update your MCP config to use `"command": "cmd"` with `"args": ["/c", "npx", "-y", "@one-source/mcp@latest"]`. Claude Code's `/doctor` command can diagnose this.

**`npx` hangs with no output** — That's normal in stdio mode. Use `--http` for an HTTP server.

**Port already in use** — Specify a different port: `npx -y @one-source/mcp@latest --http --port=8080`

## Links

- [GitHub Repository](https://github.com/blockparty-global/1s-mcp)
- [OneSource Documentation](https://docs.onesource.io)
- [Report an Issue](https://github.com/blockparty-global/1s-mcp/issues)

## License

Apache 2.0
