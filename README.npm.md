# @one-source/mcp

Unified MCP server for [OneSource](https://docs.onesource.io) — 34 tools for blockchain data, live chain queries, and API documentation in a single server.

Combines [`@one-source/api-mcp`](https://www.npmjs.com/package/@one-source/api-mcp) (22 tools) and [`@one-source/docs-mcp`](https://www.npmjs.com/package/@one-source/docs-mcp) (11 tools) so your AI assistant gets full access to OneSource with one MCP connection.

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

## Tools (34)

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

### Blockchain API — Chain Utilities (10 tools)

RPC only.

| Tool | Description |
|------|-------------|
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

### Documentation, Setup & Ops (12 tools)

Read-only, no API key required.

| Tool | Purpose | When to use |
|------|---------|-------------|
| `1s_setup_check` | Server health, version, x402 status, setup instructions | First thing to call — checks if everything is configured |
| `1s_report_bug` | Report bugs to Slack (or GitHub Issues fallback) | When a tool errors or user wants to report an issue |
| `search_docs` | Keyword search across all documentation | Finding guides, concepts, or API patterns |
| `get_query_reference` | Full reference for a root GraphQL query | Building a specific query with correct args/filters |
| `get_type_definition` | Schema definition for any type/enum/input | Understanding field shapes and return types |
| `list_examples` | Browse or search working GraphQL examples | Finding ready-to-use query patterns |
| `list_supported_chains` | All supported blockchain networks + endpoints | First question: "What chains are supported?" |
| `get_filter_reference` | Filter fields and operators for a list query | Building filtered queries with correct syntax |
| `get_pagination_guide` | Cursor-based pagination pattern with examples | Implementing pagination for list queries |
| `get_schema_overview` | High-level summary of the entire schema | Exploring the API surface before diving in |
| `get_authentication_guide` | API key format, headers, and endpoints | Setting up authentication for the first time |
| `get_mcp_setup_guide` | MCP installation, setup, x402 config guide | Setting up the MCP server or configuring payments |

## Networks

All blockchain API tools accept an optional `network` parameter:

| Network | Description |
|---------|-------------|
| `ethereum` | Ethereum mainnet (default) |
| `sepolia` | Ethereum Sepolia testnet |
| `avax` | Avalanche C-Chain |

## Payment (x402)

Blockchain API endpoints are priced in USDC on Base via [x402](https://github.com/coinbase/x402). When you set `X402_PRIVATE_KEY`, the server automatically handles payments — tool calls that return HTTP 402 are paid and retried without any extra work from the agent.

Documentation tools are always free — no key or payment needed.

### Setup

1. **Get an EVM private key** — export one from MetaMask, Coinbase Wallet, or any EVM wallet. The key must start with `0x` followed by 64 hex characters (e.g. `0x4c08...7e3d`). Some wallets export the key without the `0x` prefix — if yours is just letters and numbers without `0x` at the start, add `0x` to the beginning yourself.
2. **Fund the wallet with USDC on Base** — the wallet address derived from the key must hold USDC on the [Base](https://base.org) network. Bridge or transfer USDC to it.
3. **Pass the key to the server** using one of the methods below.

### Claude Code

```bash
claude mcp add onesource -e X402_PRIVATE_KEY=0x... -- npx -y @one-source/mcp@latest
```

### Claude Desktop / Cursor

Add the `env` block to your MCP config:

```json
{
  "mcpServers": {
    "onesource": {
      "command": "npx",
      "args": ["-y", "@one-source/mcp@latest"],
      "env": {
        "X402_PRIVATE_KEY": "0x..."
      }
    }
  }
}
```

### Any MCP Client (stdio)

```bash
X402_PRIVATE_KEY=0x... npx -y @one-source/mcp@latest
```

### Config File Locations

If you prefer editing the config file directly instead of using CLI commands:

| Client | Config file path |
|--------|-----------------|
| Claude Code | Run `claude mcp get onesource` to see the file path |
| Claude Desktop (macOS) | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Desktop (Windows) | `%APPDATA%\Claude\claude_desktop_config.json` |
| Cursor (macOS) | `~/.cursor/mcp.json` |
| Cursor (Windows) | `%USERPROFILE%\.cursor\mcp.json` |

Add the `onesource` entry inside `"mcpServers"` using the JSON block shown above.

### Alternative: Set as an Environment Variable

Instead of the `env` config block, you can set `X402_PRIVATE_KEY` as a shell or system environment variable: `export X402_PRIVATE_KEY=0x...` (bash/zsh) or `$env:X402_PRIVATE_KEY = "0x..."` (PowerShell). Set it at the OS level for persistence across sessions.

### Security

Never commit your private key to source control. Use environment variables, a `.env` file (excluded from git), or a secrets manager.

> **After any config change:** Run `/reload-plugins` in Claude Code, or restart Claude Desktop / Cursor. The MCP server must be reloaded to pick up new environment variables.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `X402_PRIVATE_KEY` | — | EVM private key (hex, 0x-prefixed) for automatic x402 USDC payments on Base |
| `ONESOURCE_BASE_URL` | `https://skills.onesource.io` | API base URL |
| `ONESOURCE_ANALYTICS` | — | Set to `false` to disable analytics |

## Troubleshooting

**`1s_setup_check` shows "Not configured"** — Reload the MCP server first (see note above). If the key still isn't reaching the server after reloading, set it as an environment variable directly.

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
