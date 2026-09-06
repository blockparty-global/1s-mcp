---
name: onesource-mcp-setup
description: >-
  Guide for installing and configuring the OneSource MCP server. Covers both
  authentication options (API key and x402 micropayments), wallet setup, USDC
  funding on Base, and verification. Use when a user needs help setting up
  OneSource MCP or configuring either auth method.
---

# OneSource MCP Setup Guide

OneSource MCP provides 46 tools: blockchain data and live chain queries, Deepstate market data, plus documentation lookups for the OneSource REST API. The documentation tools (`1s_search_docs`, `1s_get_endpoint_reference`, `1s_get_authentication_guide` and five more) are free and need no authentication. Blockchain API tools do require authentication — either an API key (`ONESOURCE_API_KEY`) or x402 micropayments in USDC on the Base network (`X402_PRIVATE_KEY`). If both are set, API key takes priority. The 8 Deepstate tools (`1s_ds_*`) are ordinary tools on the same server — they authenticate and pay the same way as every other blockchain API tool.

## Before You Start

**Always call `1s_setup_check` before using any other OneSource tools.** This checks the installed version against the latest release and reports authentication status.

- **If an update is available:** Tell the user and help them update before proceeding. Run `npx -y @one-source/mcp@latest` to get the latest version. The update takes effect on the next session — the user will need to restart their MCP client.
- **If `1s_setup_check` is not available:** The MCP is either not installed or running a version before this tool existed. Help the user install or update using the instructions in Step 2 below.
- **If auth is not configured:** The tool will include setup instructions. Walk the user through them before attempting API calls.

Do not skip this step — outdated versions may be missing tools, fixes, or protocol changes.

## Step 1: Check Current Installation

Call the `1s_setup_check` tool. It reports:
- Server version (current vs latest)
- Which auth method is active (API key, x402), or whether auth is not yet configured
- Wallet address (if x402 is configured)
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

## Step 3: Configure Authentication

Choose one option. If both are set, API key takes priority.

### Option A: API Key

1. Go to [app.onesource.io](https://app.onesource.io) and create an account.
2. Complete the API key subscription through Stripe checkout.
3. Navigate to **API Keys** and generate a key.
4. Copy the key — it starts with `sk_`.

#### Claude Code

```bash
claude mcp remove onesource
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

After adding the key, reload the MCP server (run `/reload-plugins` in Claude Code, or restart Claude Desktop / Cursor), then call `1s_setup_check`. It should show `Status: Configured (API key)`. You're done — skip to Step 7 to verify a live tool call.

---

### Option B: x402 Micropayments

Pay-per-call using USDC on Base. No account required — just an EVM wallet funded with USDC. The server handles payments transparently. Continue with Steps 3B through 6 below.

## Step 3B: Get an EVM Private Key

The `X402_PRIVATE_KEY` is an EVM wallet private key — the same kind used by MetaMask, Coinbase Wallet, or Foundry. It is a 64-character hex string. The `0x` prefix is optional — both formats are accepted.

### Option A: Export from MetaMask

1. Open MetaMask
2. Click the three dots next to the account name
3. Go to **Account details** > **Show private key**
4. Enter your MetaMask password
5. Copy the key

### Option B: Export from Coinbase Wallet

1. Open Coinbase Wallet > Settings > Developer settings
2. Export your private key

### Option C: Generate a New Wallet

```bash
# Using OpenSSL (macOS/Linux, or Git Bash on Windows)
openssl rand -hex 32

# Using Foundry (if installed)
cast wallet new
```

```powershell
# PowerShell (Windows)
-join ((1..32) | ForEach-Object { "{0:x2}" -f (Get-Random -Max 256) })
```

**Important:** Use a dedicated wallet for MCP payments — do not use your primary wallet with large holdings. Transfer only what you need.

## Step 4: Set the Private Key (x402)

### Claude Code

```bash
claude mcp remove onesource
claude mcp add onesource -e X402_PRIVATE_KEY=0x... -- npx -y @one-source/mcp@latest
```

> **Scope tip:** Claude Code stores MCP configs at three levels — `user`, `project`, and `local`. Use `local` scope (the default for `claude mcp add`) for faster debugging and testing. You can check which scope your config is in by looking at `.claude/settings.local.json` (local), `.claude/settings.json` (project), or `~/.claude/settings.json` (user).

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

### Manual Setup (Editing the Config File Directly)

The CLI commands above write to a JSON config file. You can also edit this file directly — this is useful for debugging or if you want to understand what the setup actually does.

**Claude Code** — Find which file your config is in by running `claude mcp get onesource`. Depending on the scope:
- **Local:** `.claude/settings.local.json` in your project directory
- **Project:** `.claude/settings.json` in your project directory
- **User:** `~/.claude/settings.json` (macOS/Linux) or `%USERPROFILE%\.claude\settings.json` (Windows)

**Claude Desktop:**
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Cursor:**
- **macOS:** `~/.cursor/mcp.json`
- **Windows:** `%USERPROFILE%\.cursor\mcp.json`

Open the config file and add (or update) the `onesource` entry inside `"mcpServers"`:

```json
{
  "mcpServers": {
    "onesource": {
      "command": "npx",
      "args": ["-y", "@one-source/mcp@latest"],
      "env": {
        "X402_PRIVATE_KEY": "0xYOUR_PRIVATE_KEY_HERE"
      }
    }
  }
}
```

Save the file, then reload (see below).

### Important: Reload After Config Changes

Changing the config file (via `claude mcp add` or manual edit) does **not** automatically restart the running MCP server. You must reload:

- **Claude Code:** Run `/reload-plugins` (preferred — no restart needed), or restart Claude Code entirely.
- **Claude Desktop / Cursor:** Restart the app — close it completely and reopen.

Without reloading, the old server process keeps running with the old config, and `1s_setup_check` will still show "Not configured" even though the key is in the file.

### Alternative: Set the Key as an Environment Variable

If the `env` block in the config isn't reaching the server after reloading, you can set the key as an environment variable directly instead:

**bash / zsh (macOS / Linux):**

```bash
export X402_PRIVATE_KEY=0x...
```

To make it persistent, add the line to your `~/.bashrc`, `~/.zshrc`, or `~/.profile`.

**PowerShell (Windows):**

```powershell
$env:X402_PRIVATE_KEY = "0x..."
```

This only lasts for the current session. To make it persistent, either:
- Add it to your PowerShell profile (`notepad $PROFILE`, add the line, restart PowerShell)
- Or set it as a system environment variable: **Settings > System > About > Advanced system settings > Environment Variables > User variables > New** — name: `X402_PRIVATE_KEY`, value: `0x...`

After setting the variable, restart your MCP client and run `1s_setup_check` to confirm.

> **Windows note:** Claude Code's `/doctor` command may warn that Windows requires a `cmd /c` wrapper to execute `npx`. If you encounter issues, update the config to use `"command": "cmd"` with `"args": ["/c", "npx", "-y", "@one-source/mcp@latest"]`.

### Security

- **Never** commit your private key to source control.
- Use environment variables, a `.env` file (excluded from git), or a secrets manager.
- Use a dedicated wallet with minimal funds — only what you need for API calls.

## Step 5: Find Your Wallet Address (x402)

After setting the key and reloading the MCP server:

1. Call `1s_setup_check` — it shows the wallet address derived from your key under "Wallet address". This is the address you need to fund.
2. Alternatively, import the key into MetaMask to see the address.

## Step 6: Fund the Wallet with USDC on Base (x402)

The wallet must hold **USDC on the Base network** (not Ethereum mainnet, not other tokens).

1. Send USDC to the wallet address from Step 5 **on the Base network**.
2. A few dollars ($1–5 USDC) is enough for hundreds of API calls.

If your USDC is on Ethereum mainnet, bridge it to Base using the [Base Bridge](https://bridge.base.org) or any cross-chain bridge that supports Base.

## Step 7: Verify

After setting your auth (either option) and reloading:

1. **Check MCP connection** — Run `/mcp` to confirm the `onesource` server is connected.
2. **Run `1s_setup_check`** — You should see:
   - **Authentication:** `Configured (API key)` or `Configured (x402)` — not "Not configured"
   - **Wallet address:** Your wallet address (x402 only)
   - **API backend:** Reachable
3. **Test a live tool** — Call `1s_network_info` for ethereum. If it returns a block number and gas price, auth is working end-to-end.

> **Tip:** If you edited the config file manually (instead of using `claude mcp add`), you must run `/reload-plugins` for changes to take effect. Restarting Claude Code also works.

## Step 8: Configure Batch Payments (x402, optional)

If you authenticate with x402, you can pay per call (`exact`, default) or open a USDC payment channel (`batch`) that funds many calls from one deposit — cheaper for a burst of calls. You don't need to edit any config for this:

- **`1s_batch_config`** — view or change batch preferences (autonomy, "many calls" threshold, deposit multiplier, default mode) from the session. Changes persist across restarts. See the `onesource-batch-config` skill.
- **`1s_payment_mode`** — switch the live scheme (`exact`/`batch`) for the current session only.
- **`1s_refund`** — reclaim any unspent channel deposit when you're done.

`1s_setup_check` shows your current mode and batch settings, and will prompt you for your preferred batch behavior.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `1s_setup_check` shows "Not configured" | Most common cause: config was changed but the MCP server wasn't reloaded. Run `/reload-plugins` in Claude Code, or restart Claude Desktop / Cursor. If the key still isn't reaching the server, try setting it as an environment variable directly — see **Alternative: Set the Key as an Environment Variable** above. |
| `1s_setup_check` shows API key configured but tools return 402 | The key may be invalid or inactive. Verify the key at app.onesource.io. |
| `1s_setup_check` shows API key configured but tools return 403 | The account does not have an active API key subscription. Subscribe or check the subscription status at app.onesource.io. |
| "MCP server onesource already exists" error | Run `claude mcp remove onesource` first, then re-add it with your updated config. |
| Config changed but nothing happened | Run `/reload-plugins` in Claude Code to reload MCP servers, then `/mcp` to check connection status. |
| Tool returns HTTP 402 error (x402 path) | x402 is not configured, or the wallet has insufficient USDC on Base. Check `1s_setup_check` for wallet address and balance. |
| "x402 setup failed" in server logs | The private key format is wrong. It must be a 64-character hex string (with or without `0x` prefix). |
| Key is set but wallet shows 0 USDC | Make sure USDC is on the **Base** network, not Ethereum mainnet or another chain. |
| Tools work but results seem stale | Check `1s_setup_check` for version — you may need to update to the latest. |
