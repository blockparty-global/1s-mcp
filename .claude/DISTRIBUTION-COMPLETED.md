# Distribution Progress: @one-source/mcp

**Last updated:** 2026-03-31

---

## Completed

### 1. Official MCP Registry (io.onesource/mcp)

**Status:** Live
**URL:** https://registry.modelcontextprotocol.io (search "onesource")

**What we did:**
- Generated an ed25519 keypair for DNS authentication
- Added a DNS TXT record on `onesource.io` (root domain) with the public key:
  ```
  v=MCPv1; k=ed25519; p=7D3U5rufgNXb/lH2MthTRZdDzEGeE7/Jvg8YkiArQc8=
  ```
- Installed Go and `mcp-publisher` (downloaded binary from GitHub releases since `go install` module path was outdated)
- Authenticated with: `mcp-publisher login dns --domain onesource.io --private-key <hex-key>`
- Published `server.json` to the registry with `mcp-publisher publish`
- Had to update `server.json` version to match the current npm version — the registry validates against the exact npm version specified

**Key decisions:**
- Chose DNS auth over GitHub auth to get the cleaner namespace `io.onesource/mcp` instead of `io.github.blockparty-global/one-source-mcp`
- The DNS TXT record was placed on the root domain (`onesource.io`) rather than `_mcp-registry.onesource.io` — both work
- The ed25519 private key (hex format) is stored in the team vault — needed for every `mcp-publisher login`

**Publishing a new version (ongoing process):**
1. `npm run build && npm publish --access public`
2. Update both `version` fields in `server.json` to match npm
3. `mcp-publisher login dns --domain onesource.io --private-key <hex-key>`
4. `mcp-publisher publish`

Full instructions are in the README under "Registry Publishing".

---

### 2. Glama

**Status:** Live
**URL:** https://glama.ai/mcp/servers/blockparty-global/1s-mcp

**What we did:**
- Created `glama.json` in repo root with maintainer `GiselleDZ`
- Pushed to `main`
- Submitted the repo URL at https://glama.ai/mcp/servers
- Claimed ownership

**Ongoing:** Glama auto-syncs daily from the GitHub repo. No manual steps needed for new releases.

---

### 3. Smithery

**Status:** Live
**URL:** https://smithery.ai (namespace: `@one-source`)

**What we did:**
- Smithery dropped stdio support and now requires Streamable HTTP transport with a public HTTPS URL
- Updated `src/cli.ts` to bind to `0.0.0.0` (was `127.0.0.1`) and read `PORT` from environment variables for deployment compatibility
- Deployed to Railway:
  - Connected the GitHub repo at https://railway.com
  - Build command: `node node_modules/typescript/bin/tsc` (had to use this path due to permission issues with `npx tsc` and `./node_modules/.bin/tsc` on Railway)
  - Start command: `node dist/cli.js --http`
  - Config stored in `railway.json` in repo root
- Set up custom domain `mcp.onesource.io`:
  - Added CNAME record: `mcp` → `hy0s4cdp.up.railway.app` (Railway-generated hostname, not the public URL)
  - Added TXT record for Railway domain verification (exact value from Railway's networking tab)
  - Initial TLS certificate failed — resolved by regenerating it in Railway's UI
- Published on Smithery at https://smithery.ai/new with URL `https://mcp.onesource.io`
- Added `X402_PRIVATE_KEY` as an optional connection parameter with description: "EVM private key (hex, 0x-prefixed) for automatic USDC payments on Base via x402"

**Key decisions:**
- Namespace: `one-source`, Server ID: not `mcp` (taken), used alternative
- Railway over Vercel — MCP needs persistent HTTP connections; Vercel's serverless functions have execution time limits
- Custom domain `mcp.onesource.io` for credibility and direct linking
- The `smithery.yaml` in the repo is now outdated (references stdio) — needs updating or removal

**Gotchas encountered:**
- Railway's build environment has permission issues with `tsc` — must invoke via `node node_modules/typescript/bin/tsc`
- Railway's custom domain CNAME target is a different hostname than the public URL (e.g., `hy0s4cdp.up.railway.app` not `1s-mcp-production.up.railway.app`)
- TXT record values are exact-match — a space after `=` caused verification to fail
- TLS certificate initially failed to issue — regenerating in Railway's UI fixed it
- If using Cloudflare for DNS, the proxy must be turned off (grey cloud) during certificate issuance

---

### 4. mcpservers.org (wong2/awesome-mcp-servers)

**Status:** Submitted
**URL:** https://mcpservers.org/submit

**What we did:**
- Submitted through their web form (this list doesn't accept PRs)
- Category: Development
- Description: "Unified MCP server with 43 tools for live blockchain queries across Ethereum, Sepolia, and Avalanche — including token balances, NFT metadata, event logs, contract detection, ENS resolution, and GraphQL API documentation."

---

### 5. Public MCP Endpoint

**Status:** Live
**URL:** https://mcp.onesource.io

- Health check: `GET https://mcp.onesource.io/health`
- MCP endpoint: `POST https://mcp.onesource.io/`
- Hosted on Railway, auto-deploys from GitHub
- 43 tools (34 API + 9 docs)

---

## In Progress

### 6. punkpeye/awesome-mcp-servers (PR needed)

**Status:** Not started
**Repo:** https://github.com/punkpeye/awesome-mcp-servers

**Draft entry (Blockchain category, alphabetical order):**
```markdown
- [OneSource MCP](https://github.com/blockparty-global/1s-mcp) ([Glama](https://glama.ai/mcp/servers/blockparty-global/1s-mcp)) - 43 tools for blockchain data, live chain queries (Ethereum, Sepolia, Avalanche), and GraphQL API documentation with x402 USDC payments on Base.
```

**Requirements:** Glama verification (done), alphabetical placement, Glama link after GitHub link.

### 7. royyannick/awesome-blockchain-mcps (PR needed)

**Status:** Not started
**Repo:** https://github.com/royyannick/awesome-blockchain-mcps

**Draft entry (On-Chain Integration category):**
```markdown
**[OneSource MCP](https://github.com/blockparty-global/1s-mcp)** – **43 tools** for blockchain data and live chain queries across **Ethereum, Sepolia, and Avalanche**. Includes ERC20/ERC721/ERC1155 balance checks, event log queries, ENS resolution, contract detection, gas estimation, and **9 GraphQL documentation tools**. Supports automatic **x402 USDC payments** on Base.
```

---

## Not Started (P1)

### 8. Claude Code Plugin
- `marketplace.json` + SKILL.md files for Claude Code's skill marketplace

### 9. Cross-tool Awareness
- Update all READMEs to reference the full suite of registry listings with badges/links

---

## DNS Records Added to onesource.io

| Record | Host | Type | Value | Purpose |
|--------|------|------|-------|---------|
| MCP Registry auth | `onesource.io` (root) | TXT | `v=MCPv1; k=ed25519; p=7D3U5rufgNXb/...` | Proves ownership of `io.onesource` namespace |
| Railway custom domain | `mcp` | CNAME | `hy0s4cdp.up.railway.app` | Routes `mcp.onesource.io` to Railway |
| Railway TLS verification | *(from Railway UI)* | TXT | *(from Railway UI)* | Enables TLS certificate issuance |

---

## Tools & Accounts Used

| Tool | Purpose | Access |
|------|---------|--------|
| `mcp-publisher` | Publish to official MCP Registry | Binary in `C:\Users\gz\tools\` |
| Railway | Hosts the public HTTP MCP server | GitHub auth at railway.com |
| Smithery | MCP server listing | Account at smithery.ai |
| Glama | MCP server listing | GitHub auth, controlled by `glama.json` |
| npm | Package registry | `@one-source/mcp` |

## Key Files in Repo

| File | Purpose |
|------|---------|
| `server.json` | MCP Registry listing metadata — version must match npm |
| `glama.json` | Glama ownership claim |
| `smithery.yaml` | Smithery config (outdated — uses stdio, needs update) |
| `railway.json` | Railway build/deploy config |
| `README.md` | Includes Registry Publishing instructions |
