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

Blockchain API endpoints are priced in USDC on Base via [x402](https://github.com/coinbase/x402). When you set `X402_PRIVATE_KEY`, the server automatically handles payments — tool calls that return HTTP 402 are paid and retried without any extra work from the agent.

Documentation tools are always free — no key or payment needed.

### Setup

1. **Get an EVM private key** — export one from MetaMask, Coinbase Wallet, or any EVM wallet. The key is a hex string starting with `0x`.
2. **Fund the wallet with USDC on Base** — the wallet address derived from the key must hold USDC on the [Base](https://base.org) network. Bridge or transfer USDC to it.
3. **Pass the key to the server** using one of the methods below.

### Claude Code

```bash
claude mcp add onesource -e X402_PRIVATE_KEY=0x... -- npx @one-source/mcp
```

### Claude Desktop / Cursor

Add the `env` block to your MCP config:

```json
{
  "mcpServers": {
    "onesource": {
      "command": "npx",
      "args": ["-y", "@one-source/mcp"],
      "env": {
        "X402_PRIVATE_KEY": "0x..."
      }
    }
  }
}
```

### Any MCP Client (stdio)

```bash
X402_PRIVATE_KEY=0x... npx @one-source/mcp
```

### Security

Never commit your private key to source control. Use environment variables, a `.env` file (excluded from git), or a secrets manager.

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

## Registry Publishing

This package is listed on the [official MCP Registry](https://registry.modelcontextprotocol.io) under the verified namespace `io.onesource/mcp` and on [Glama](https://glama.ai/mcp/servers). When releasing a new version, update both registries.

### MCP Registry

#### First-Time Setup

##### 1. Install Go

Download the installer for your platform from [go.dev/dl](https://go.dev/dl/) and run it. Verify:

```bash
go version
```

##### 2. Install mcp-publisher

```bash
go install github.com/modelcontextprotocol/registry/cmd/mcp-publisher@latest
```

If the Go module path has changed and the command fails, download the binary directly from the [mcp-publisher GitHub releases](https://github.com/modelcontextprotocol/registry/releases) page instead.

On Windows, add Go's bin directory to your PATH if the command isn't recognized:

```powershell
$env:PATH += ";$env:USERPROFILE\go\bin"
```

Verify:

```bash
mcp-publisher --help
```

##### 3. DNS Authentication (already done)

The `onesource.io` domain has a DNS TXT record that proves ownership of the `io.onesource` namespace. This is already configured — you don't need to redo it.

The record is on the root domain (`onesource.io`, not `_mcp-registry.onesource.io`):

```
v=MCPv1; k=ed25519; p=7D3U5rufgNXb/lH2MthTRZdDzEGeE7/Jvg8YkiArQc8=
```

You can verify it resolves:

```bash
nslookup -type=TXT onesource.io 8.8.8.8
```

##### 4. Get the Private Key

Authentication requires the ed25519 private key in **hex format** that corresponds to the public key in the DNS record. Ask the team lead for this key — it's stored in the team's password manager / vault.

If you need to regenerate the keypair (this invalidates the current DNS record and requires updating it):

1. Generate a new ed25519 keypair (e.g., `openssl genpkey -algorithm Ed25519 -out key.pem`)
2. Extract the raw 32-byte private key seed and convert to hex:
   ```bash
   openssl pkey -in key.pem -outform DER | tail -c 32 | xxd -p -c 32
   ```
3. Extract the public key in base64 for the DNS TXT record:
   ```bash
   openssl pkey -in key.pem -pubout -outform DER | tail -c 32 | base64
   ```
4. Update the DNS TXT record on `onesource.io` with the new public key:
   ```
   v=MCPv1; k=ed25519; p=<base64-public-key>
   ```
5. Wait for DNS propagation before attempting to log in.

#### Publishing a New Version

Every time you release a new npm version, update the MCP Registry:

1. **Publish to npm** (the registry validates the package exists, so this must happen first):
   ```bash
   npm run build
   npm publish --access public
   ```

2. **Update `server.json`** — set both `version` fields to match the new npm version:
   ```json
   {
     "version": "x.y.z",
     ...
     "packages": [{ "version": "x.y.z", ... }]
   }
   ```
   The `mcpName` field in `package.json` must be `"io.onesource/mcp"` and must match the `name` field in `server.json`. This is already set — don't remove it.

3. **Authenticate** (tokens expire, so do this each time):
   ```bash
   mcp-publisher login dns --domain onesource.io --private-key <ed25519-hex-private-key>
   ```

4. **Publish to the registry:**
   ```bash
   mcp-publisher publish
   ```

5. **Verify:**
   ```bash
   curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=onesource"
   ```

### Glama

Glama auto-syncs from the GitHub repo daily. No manual steps needed after a release — just make sure changes are pushed to `main`. The `glama.json` file in the repo root controls ownership. Manual re-sync is available from the [Glama admin panel](https://glama.ai/mcp/servers) after claiming the server.

## License

Apache 2.0 — see [LICENSE](LICENSE) for details.
