# @one-source/mcp

Unified MCP server for [OneSource](https://docs.onesource.io) — 31 tools for blockchain data, live chain queries, and API documentation in a single server.

Combines [`@one-source/api-mcp`](https://www.npmjs.com/package/@one-source/api-mcp) (22 tools) and [`@one-source/docs-mcp`](https://www.npmjs.com/package/@one-source/docs-mcp) (9 tools) so your AI assistant gets full access to OneSource with one MCP connection.

> **What is MCP?** The [Model Context Protocol](https://modelcontextprotocol.io) lets AI assistants call tools and access data sources. This server exposes both the OneSource blockchain API and its documentation as tools.

## Quick Start

### Claude Code

```bash
claude mcp add onesource -- npx @one-source/mcp
```

### Claude Desktop / Cursor

Add to your MCP config:

```json
{
  "mcpServers": {
    "onesource": {
      "command": "npx",
      "args": ["-y", "@one-source/mcp"]
    }
  }
}
```

### Any MCP Client (stdio)

```bash
npx @one-source/mcp
```

### HTTP Server (self-hosted)

```bash
npx @one-source/mcp --http
npx @one-source/mcp --http --port=8080
```

Then connect your MCP client to `http://localhost:3000/`.

Health check: `GET http://localhost:3000/health`

## Tools (31)

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

### Documentation (9 tools)

Read-only, no API key required.

| Tool | Purpose | When to use |
|------|---------|-------------|
| `search_docs` | Keyword search across all documentation | Finding guides, concepts, or API patterns |
| `get_query_reference` | Full reference for a root GraphQL query | Building a specific query with correct args/filters |
| `get_type_definition` | Schema definition for any type/enum/input | Understanding field shapes and return types |
| `list_examples` | Browse or search working GraphQL examples | Finding ready-to-use query patterns |
| `list_supported_chains` | All supported blockchain networks + endpoints | First question: "What chains are supported?" |
| `get_filter_reference` | Filter fields and operators for a list query | Building filtered queries with correct syntax |
| `get_pagination_guide` | Cursor-based pagination pattern with examples | Implementing pagination for list queries |
| `get_schema_overview` | High-level summary of the entire schema | Exploring the API surface before diving in |
| `get_authentication_guide` | API key format, headers, and endpoints | Setting up authentication for the first time |

## Networks

All blockchain API tools accept an optional `network` parameter:

| Network | Description |
|---------|-------------|
| `ethereum` | Ethereum mainnet (default) |
| `sepolia` | Ethereum Sepolia testnet |
| `avax` | Avalanche C-Chain |

## Payment (x402)

Blockchain API endpoints are priced in USDC on Base via [x402](https://github.com/coinbase/x402). When the backend has payments enabled, tool calls return a 402 with payment details. Agents using [`@x402/fetch`](https://www.npmjs.com/package/@x402/fetch) handle this automatically.

Documentation tools are always free — no API key or authentication needed.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ONESOURCE_BASE_URL` | `https://skills.onesource.io` | API base URL |
| `ONESOURCE_ANALYTICS` | — | Set to `false` to disable analytics |
| `ONESOURCE_ANALYTICS_URL` | — | Dashboard endpoint for analytics |
| `X402_ANALYTICS_KEY` | — | API key for dashboard analytics |
| `X402_PRIVATE_KEY` | — | EVM private key (hex, 0x-prefixed) for automatic x402 USDC payments on Base |

## Troubleshooting

**`npx` hangs with no output**
That's normal — stdio mode waits for JSON-RPC input on stdin. Use `--http` if you want an HTTP server you can curl.

**Port already in use**
Specify a different port: `npx @one-source/mcp --http --port=8080`

**Tools return "Data files may be missing"**
Try reinstalling: `npm install @one-source/mcp`

**"Type not found" even though it exists**
Type names are case-insensitive but must match the GraphQL name (e.g. `Transaction`, not `transaction_type`). The tool will suggest close matches.

## License

Proprietary. All rights reserved.
