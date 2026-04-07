# Distribution & Analytics Progress: @one-source/mcp

**Last updated:** 2026-04-02

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

### 6. Analytics Fix (2026-04-02)

**Status:** Implemented, pending commit/publish
**Plan:** `.claude/fix-analytics-unified-mcp-2026-04-02.md`

**Problem:** `createAnalytics()` required users to manually set `ONESOURCE_ANALYTICS_URL` and `X402_ANALYTICS_KEY` env vars. Without them, analytics silently fell back to `StderrAnalytics`. No user would ever set these — analytics needed to work out of the box.

**What we changed:**

1. **`src/analytics.ts`** — Added default env vars before `_createAnalytics()` call:
   - `ONESOURCE_ANALYTICS_URL` defaults to `https://1s-analytics.vercel.app`
   - `X402_ANALYTICS_KEY` defaults to `onesource-mcp`
   - Uses `??=` so user-provided values are preserved
   - `ONESOURCE_ANALYTICS=false` still disables analytics entirely

2. **`src/cli.ts`** — Added analytics startup log in both HTTP and stdio modes:
   ```
   [onesource] analytics: dashboard (https://1s-analytics.vercel.app)
   ```
   Or if disabled: `[onesource] analytics: disabled`

**Key decisions:**
- Analytics URL and API key are hardcoded as defaults — users won't provide these, and they don't need to be secret
- The analytics team specified these values; they are authoritative
- The `??=` operator ensures any user overrides still work
- Verified that `src/analytics.ts` is the single chokepoint — only file importing from `@one-source/api-mcp/analytics`
- All callers (`create-server.ts`, `cli.ts`, `register-api-tools.ts`, `register-docs-tools.ts`) go through this wrapper

**Behavior matrix:**

| User configuration | Result |
|---|---|
| Nothing (default install) | DashboardAnalytics → `https://1s-analytics.vercel.app` |
| Sets custom `ONESOURCE_ANALYTICS_URL` | DashboardAnalytics → their URL |
| Sets `ONESOURCE_ANALYTICS=false` | NoopAnalytics (disabled) |

**Verification:** `npm run build` passes clean. After publish, stderr should show analytics endpoint on startup.

**Still needed:** Commit, `npm publish`, redeploy Railway, verify events appear in dashboard.

---

## Blocked / Deprioritized

### 7. Awesome Lists (awesome-mcp-servers)

**Status:** Blocked — all three major lists are inaccessible as of 2026-04-07
- **appcypher/awesome-mcp-servers** — repo owner has disabled pull requests
- **punkpeye/awesome-mcp-servers** — offline/404 as of 2026-03-31
- **royyannick/awesome-blockchain-mcps** — offline/404 as of 2026-03-31

**Prepared entry (if a viable list opens up):**
```markdown
- <img src="https://onesource.io/favicon.ico" height="14"/> [OneSource MCP](https://github.com/blockparty-global/1s-mcp) - 33 tools for live blockchain queries, ENS resolution, NFT metadata, contract detection, and built-in API documentation across Ethereum, Sepolia, and Avalanche with x402 USDC payments on Base
```

**Fork with entry ready:** https://github.com/GiselleDZ/awesome-mcp-servers (branch: add-onesource-mcp)

---

## Completed (2026-04-07)

### 8. Claude Code Plugin

**Status:** Implemented, pending commit/publish

**What we did:**
- Created `.claude-plugin/plugin.json` — plugin manifest (name: `onesource`, v4.0.2)
- Created `.claude-plugin/marketplace.json` — self-hosted marketplace catalog (name: `onesource-mcp`)
- Moved `SKILL.md` to `skills/onesource-mcp-setup/SKILL.md` (plugin spec requires `skills/<name>/` path)
- Updated `.mcp.json` from dev config (`node dist/cli.js`) to user-facing config (`npx -y @one-source/mcp@latest`)
- Updated `package.json`: bumped version to 4.0.2, changed `files` array to include `skills/` instead of `SKILL.md`
- Removed outdated `smithery.yaml` (Smithery listing already live via HTTP)
- Updated `server.json` version to 4.0.2

**How users install:**
```
claude plugin marketplace add blockparty-global/1s-mcp
claude plugin install onesource@onesource-mcp
```

**Still needed:** Commit, npm publish, push to main, then submit to official Anthropic marketplace at https://claude.ai/settings/plugins/submit

---

## Not Started (P1)

### 9. Cross-tool Awareness
- Update all READMEs to reference the full suite of registry listings with badges/links

---

## DNS Records on onesource.io

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
| Go | Required for mcp-publisher install | Installed from go.dev/dl (Windows AMD64 MSI) |
| Railway | Hosts the public HTTP MCP server | GitHub auth at railway.com |
| Smithery | MCP server listing | Account at smithery.ai |
| Glama | MCP server listing | GitHub auth, controlled by `glama.json` |
| npm | Package registry | `@one-source/mcp` |

---

## Key Files in Repo

| File | Purpose |
|------|---------|
| `server.json` | MCP Registry listing metadata — version must match npm |
| `glama.json` | Glama ownership claim |
| `.claude-plugin/plugin.json` | Claude Code plugin manifest |
| `.claude-plugin/marketplace.json` | Self-hosted marketplace catalog |
| `skills/onesource-mcp-setup/SKILL.md` | Setup skill for plugin users |
| `.mcp.json` | User-facing MCP config (installed with plugin) |
| `railway.json` | Railway build/deploy config |
| `README.md` | Includes Registry Publishing instructions for MCP Registry and Glama |
| `src/analytics.ts` | Analytics wrapper with hardcoded defaults |
| `src/cli.ts` | Entry point — HTTP/stdio modes, analytics log, 0.0.0.0 bind |

---

## Session Timeline

**2026-03-30:**
- Published to official MCP Registry with DNS-verified namespace `io.onesource/mcp`
- Confirmed Glama listing is live
- Deployed to Railway with public endpoint `mcp.onesource.io`
- Published to Smithery with HTTP transport
- Submitted to mcpservers.org
- Added Registry Publishing instructions to README
- Researched awesome lists — punkpeye and royyannick repos are offline; pivoted to appcypher

**2026-04-02:**
- Reviewed and implemented analytics fix plan from the analytics repo team
- Changed `src/analytics.ts` to hardcode default analytics URL and API key
- Added analytics startup logging to both HTTP and stdio modes in `src/cli.ts`
- Build verified clean
- Pending: commit, npm publish, Railway redeploy, dashboard verification
