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

Add the `env` block to your MCP config:

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

Blockchain API endpoints are priced in USDC on Base via [x402](https://github.com/coinbase/x402). When you set `X402_PRIVATE_KEY`, the server automatically handles payments — tool calls are paid and retried transparently without any extra work from the agent.

1. **Get an EVM private key** — export one from MetaMask, Coinbase Wallet, or any EVM wallet, or generate a fresh one. The key is a 64-character hex string. The `0x` prefix is optional — both formats are accepted.
2. **Pass the key to the server** using one of the methods below.
3. **Reload and find your wallet address** — reload the MCP server, then call `1s_setup_check`. It will show the wallet address derived from your key under "Wallet address".
4. **Fund that address with USDC on Base** — send USDC to the address shown in `1s_setup_check`, on the [Base](https://base.org) network. A few dollars ($1–5 USDC) is enough for hundreds of calls. If your USDC is on Ethereum mainnet, bridge it using the [Base Bridge](https://bridge.base.org).
5. **Verify** — call `1s_network_info` for ethereum. If it returns chain data (block number, gas price), x402 payments are working end-to-end.

#### Claude Code

```bash
claude mcp add onesource -e X402_PRIVATE_KEY=<key> -- npx -y @one-source/mcp@latest
```

#### Claude Desktop / Cursor

Add the `env` block to your MCP config:

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

Instead of the `env` config block, you can set either variable as a shell or system environment variable: `export ONESOURCE_API_KEY=<key>` (bash/zsh) or `$env:ONESOURCE_API_KEY = "<key>"` (PowerShell). Set it at the OS level for persistence across sessions.

### Security

Never commit keys to source control. Use environment variables, a `.env` file (excluded from git), or a secrets manager.

> **After any config change:** Run `/reload-plugins` in Claude Code, or restart Claude Desktop / Cursor. The MCP server must be reloaded to pick up new environment variables.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ONESOURCE_API_KEY` | — | OneSource API key for Bearer token auth. Takes priority over x402. |
| `X402_PRIVATE_KEY` | — | EVM private key (64-char hex, `0x` prefix optional) for automatic x402 USDC payments on Base |
| `ONESOURCE_BASE_URL` | `https://skills.onesource.io` | API base URL |
| `ONESOURCE_ANALYTICS` | — | Set to `false` to disable analytics |
| `ONESOURCE_ANALYTICS_URL` | — | Dashboard endpoint for analytics |
| `X402_ANALYTICS_KEY` | — | API key for dashboard analytics |

## Troubleshooting

**`1s_setup_check` shows "Not configured"**
Set either `ONESOURCE_API_KEY` or `X402_PRIVATE_KEY`. Reload the MCP server after setting either variable (see note above). If the key still isn't reaching the server, set it as a shell environment variable directly.

**Getting 403 / wrong key active despite correct setup**
A key set in your shell profile (e.g. `~/.zshrc`, `~/.bash_profile`) is picked up by the MCP server process even if it isn't in your Claude MCP config. Run `echo $ONESOURCE_API_KEY` in your terminal to check. If it prints a value you didn't intend, unset it (`unset ONESOURCE_API_KEY`) or explicitly clear it when adding the server: `claude mcp add onesource -e ONESOURCE_API_KEY= -e X402_PRIVATE_KEY=<key> -- npx -y @one-source/mcp@latest`. `1s_setup_check` shows the first 6 characters of whichever key is active so you can confirm which one the server is using.

**Instructions show wrong auth method after reinstall**
`/reload-plugins` in Claude Code reconnects tools but may not refresh the system prompt the LLM sees. If you switch auth method (e.g. API key → x402), do a full Claude Code restart to ensure the instructions reflect the new auth.

**"MCP server onesource already exists" error**
Run `claude mcp remove onesource` first, then re-add with your updated config.

**Windows: `npx` requires `cmd /c` wrapper**
Claude Code's `/doctor` command may warn about this. Update your MCP config to use `"command": "cmd"` with `"args": ["/c", "npx", "-y", "@one-source/mcp@latest"]`.

**`npx` hangs with no output**
That's normal — stdio mode waits for JSON-RPC input on stdin. Use `--http` if you want an HTTP server you can curl.

**Port already in use**
Specify a different port: `npx -y @one-source/mcp@latest --http --port=8080`

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
