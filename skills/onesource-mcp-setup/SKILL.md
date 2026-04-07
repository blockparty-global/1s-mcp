---
name: onesource-mcp-setup
description: >-
  Guide for installing and configuring the OneSource MCP server with x402
  payments. Covers installation, version checking, wallet setup, USDC
  funding on Base, and verification. Use when a user needs help setting up
  OneSource MCP or configuring x402 payments.
---

# OneSource MCP Setup Guide

OneSource MCP provides 33 tools for blockchain data, live chain queries, and API documentation. Documentation tools are free. Blockchain API tools require x402 micropayments in USDC on the Base network.

## Before You Start

**Always call `1s_setup_check` before using any other OneSource tools.** This checks the installed version against the latest release and reports x402 payment status.

- **If an update is available:** Tell the user and help them update before proceeding. Run `npx -y @one-source/mcp@latest` to get the latest version. The update takes effect on the next session — the user will need to restart their MCP client.
- **If `1s_setup_check` is not available:** The MCP is either not installed or running a version before this tool existed. Help the user install or update using the instructions in Step 2 below.
- **If x402 is not configured:** The tool will include setup instructions. Walk the user through them before attempting paid API calls.

Do not skip this step — outdated versions may be missing tools, fixes, or protocol changes.

## Step 1: Check Current Installation

Call the `1s_setup_check` tool. It reports:
- Server version (current vs latest)
- Whether x402 payments are configured
- Wallet address (if configured)
- API backend connectivity

If the tool is not available, the MCP is not installed — go to Step 2.

## Step 2: Install or Update

### Claude Code

```bash
claude mcp add onesource -- npx -y @one-source/mcp@latest
```

### Claude Desktop / Cursor

Add to your MCP configuration file:

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

### Check for Updates

Compare the installed version (shown in `1s_setup_check` output) against the latest:

```bash
npm view @one-source/mcp version
```

To update, reinstall with `@latest` or clear the npx cache: `npx -y @one-source/mcp@latest`.

## Step 3: Get an EVM Private Key

The `X402_PRIVATE_KEY` is an EVM wallet private key — the same kind used by MetaMask, Coinbase Wallet, or Foundry. It must be a hex string starting with `0x`.

### Option A: Export from MetaMask

1. Open MetaMask
2. Click the three dots next to the account name
3. Go to **Account details** > **Show private key**
4. Enter your MetaMask password
5. Copy the key (starts with `0x`)

### Option B: Export from Coinbase Wallet

1. Open Coinbase Wallet > Settings > Developer settings
2. Export your private key

### Option C: Generate a New Wallet

```bash
# Using OpenSSL
echo "0x$(openssl rand -hex 32)"

# Using Foundry (if installed)
cast wallet new
```

**Important:** Use a dedicated wallet for MCP payments — do not use your primary wallet with large holdings. Transfer only what you need.

## Step 4: Fund the Wallet with USDC on Base

The wallet must hold **USDC on the Base network** (not Ethereum mainnet, not other tokens).

1. Get the wallet address — set the key (Step 5) and call `1s_setup_check` to see the address, or import the key into MetaMask to see it.
2. Send USDC to that address **on the Base network**.
3. A few dollars ($1–5 USDC) is enough for hundreds of API calls.

If you have USDC on Ethereum mainnet, bridge it to Base using the [Base Bridge](https://bridge.base.org) or any cross-chain bridge that supports Base.

## Step 5: Set the Private Key

### Claude Code

```bash
claude mcp remove onesource
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

### Security

- **Never** commit your private key to source control.
- Use environment variables, a `.env` file (excluded from git), or a secrets manager.
- Use a dedicated wallet with minimal funds — only what you need for API calls.

## Step 6: Verify

After setting the key and restarting the MCP server, call `1s_setup_check` again. You should see:

- **x402 status:** Configured
- **Wallet address:** Your wallet address
- **API backend:** Reachable

Then try a paid tool like `1s_network_info` to confirm payments work end-to-end.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `1s_setup_check` shows "Not configured" | The `X402_PRIVATE_KEY` env var is not reaching the server. Check your MCP client config and restart. |
| Tool returns HTTP 402 error | x402 is not configured, or the wallet has insufficient USDC on Base. |
| "x402 setup failed" in server logs | The private key format is wrong. It must be a 64-character hex string prefixed with `0x`. |
| Key is set but wallet shows 0 USDC | Make sure USDC is on the **Base** network, not Ethereum mainnet or another chain. |
| Tools work but results seem stale | Check `1s_setup_check` for version — you may need to update to the latest. |
