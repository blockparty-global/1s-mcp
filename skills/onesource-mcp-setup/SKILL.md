---
name: onesource-mcp-setup
description: >-
  Guide for installing and configuring the OneSource MCP server with x402
  payments. Covers installation, version checking, wallet setup, USDC
  funding on Base, and verification. Use when a user needs help setting up
  OneSource MCP or configuring x402 payments.
---

# OneSource MCP Setup Guide

OneSource MCP provides 24 tools for blockchain data and live chain queries. Blockchain API tools require authentication — either an API key (`ONESOURCE_API_KEY`) or x402 micropayments in USDC on the Base network (`X402_PRIVATE_KEY`).

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

## Step 4: Set the Private Key

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

## Step 5: Fund the Wallet with USDC on Base

The wallet must hold **USDC on the Base network** (not Ethereum mainnet, not other tokens).

1. Get the wallet address — call `1s_setup_check` (it shows the address after you set the key), or import the key into MetaMask to see it.
2. Send USDC to that address **on the Base network**.
3. A few dollars ($1–5 USDC) is enough for hundreds of API calls.

If you have USDC on Ethereum mainnet, bridge it to Base using the [Base Bridge](https://bridge.base.org) or any cross-chain bridge that supports Base.

## Step 6: Verify

After setting the key, reload and verify:

1. **Reload the MCP server** — In Claude Code, run `/reload-plugins` to pick up config changes without restarting the session.
2. **Check MCP connection** — Run `/mcp` to confirm the `onesource` server is connected.
3. **Run `1s_setup_check`** — You should see:
   - **x402 status:** Configured
   - **Wallet address:** Your wallet address
   - **API backend:** Reachable
4. **Test a paid tool** — Try `1s_network_info` to confirm payments work end-to-end.

> **Tip:** If you edited the config file manually (instead of using `claude mcp add`), you must run `/reload-plugins` for changes to take effect. Restarting Claude Code also works.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `1s_setup_check` shows "Not configured" | Most common cause: config was changed but the MCP server wasn't reloaded. Run `/reload-plugins` in Claude Code, or restart Claude Desktop / Cursor. If the key still isn't reaching the server, try setting it as an environment variable directly — see **Alternative: Set the Key as an Environment Variable** above. |
| "MCP server onesource already exists" error | Run `claude mcp remove onesource` first, then re-add it with your updated config. |
| Config changed but nothing happened | Run `/reload-plugins` in Claude Code to reload MCP servers, then `/mcp` to check connection status. |
| Tool returns HTTP 402 error | x402 is not configured, or the wallet has insufficient USDC on Base. |
| "x402 setup failed" in server logs | The private key format is wrong. It must be a 64-character hex string (with or without `0x` prefix). |
| Key is set but wallet shows 0 USDC | Make sure USDC is on the **Base** network, not Ethereum mainnet or another chain. |
| Tools work but results seem stale | Check `1s_setup_check` for version — you may need to update to the latest. |
