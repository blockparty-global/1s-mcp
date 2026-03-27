# Distribution Plan: P0 Registry Listings for `@one-source/mcp`

## Context

`@one-source/mcp` v1.2.0 is published on npm. It's a combined MCP server with 43 tools (34 blockchain API + 9 docs). TypeScript, supports stdio + HTTP modes. GitHub repo: https://github.com/blockparty-global/1s-mcp

This plan covers the three P0 distribution tasks — registry listings that require no new server code.

---

## Task 1: Glama Listing (Lowest effort)

### What it does
20,000+ server directory. Auto-generates install instructions for Claude Code, Codex CLI, Gemini CLI, VS Code. Quality scoring (Security/Quality/License grades).

### Steps

1. **Create `glama.json`** in repo root:
   ```json
   {
     "$schema": "https://glama.ai/mcp/schemas/server.json",
     "maintainers": ["gz"]
   }
   ```
   Replace `"gz"` with the GitHub username of whoever should have admin access. Multiple maintainers supported as an array.

2. **Commit and push** `glama.json` to `main`.

3. **Submit the repo** at https://glama.ai/mcp/servers — click "Add Server", paste `https://github.com/blockparty-global/1s-mcp`.

4. **Claim ownership** through the Glama UI. Required for org repos (can't just use GitHub OAuth). The `glama.json` file is what proves ownership.

5. **Verify listing** — check that tools are detected, grades are showing. Expect strong scores since LICENSE and README already exist.

6. **(Optional) Embed badge** in README:
   ```html
   <a href="https://glama.ai/mcp/servers/blockparty-global/1s-mcp">
     <img width="380" height="200" src="https://glama.ai/mcp/servers/blockparty-global/1s-mcp/badge" />
   </a>
   ```

### Notes
- Glama indexes from GitHub, not npm. Repo must be public.
- Missing LICENSE = F grade and blocks install. We have one — no issue.
- Glama Release (optional Docker build on their infra) enables deeper security scanning. Not needed for initial listing.
- Auto-syncs daily. Manual re-sync available from admin panel after claiming.

---

## Task 2: MCP Registry / `server.json` (Highest impact)

### What it does
The canonical MCP registry. Auto-syncs to VS Code Gallery and GitHub Copilot. No human review — publish and it's live immediately.

### DNS Auth Setup (for SRE team)

We want the namespace `io.onesource/mcp` (cleaner than `io.github.blockparty-global/one-source-mcp`). This requires a DNS TXT record on `onesource.io`.

**Ask the SRE team to:**

1. Add a TXT record to the `onesource.io` DNS zone:
   - **Host/Name:** `_mcp-registry` (i.e., `_mcp-registry.onesource.io`)
   - **Value:** Will be provided by the `mcp-publisher` CLI during the auth flow. Run `mcp-publisher login dns --domain onesource.io` and it will output the exact TXT record value to set. The value contains a public key fingerprint.
   - **TTL:** 3600 (or default)

2. The record must be publicly resolvable before the `mcp-publisher publish` command will succeed. Verify with: `dig TXT _mcp-registry.onesource.io`

**Alternative if DNS is blocked or slow:** Fall back to GitHub auth with namespace `io.github.blockparty-global/one-source-mcp`. Just run `mcp-publisher login github` instead. No DNS changes needed.

### Steps

1. **Add fields to `package.json`:**
   ```json
   {
     "mcpName": "io.onesource/mcp",
     "repository": {
       "type": "git",
       "url": "https://github.com/blockparty-global/1s-mcp.git"
     }
   }
   ```
   The `mcpName` MUST exactly match the `name` field in `server.json`. If using GitHub auth fallback, use `"mcpName": "io.github.blockparty-global/one-source-mcp"` instead.

2. **Rebuild and republish to npm:**
   ```bash
   npm run build
   npm publish --access public
   ```

3. **Install `mcp-publisher`:**
   Download from https://github.com/modelcontextprotocol/registry/releases (Windows binary available). Or:
   ```bash
   # macOS/Linux
   brew install modelcontextprotocol/tap/mcp-publisher
   ```

4. **Authenticate:**
   ```bash
   # DNS auth (preferred — needs TXT record from step above)
   mcp-publisher login dns --domain onesource.io

   # OR GitHub auth (fallback)
   mcp-publisher login github
   ```

5. **Generate server.json template:**
   ```bash
   mcp-publisher init
   ```

6. **Edit `server.json`** to match this:
   ```json
   {
     "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
     "name": "io.onesource/mcp",
     "description": "43 tools for blockchain data, live chain queries, and API documentation",
     "title": "OneSource MCP",
     "version": "1.2.0",
     "websiteUrl": "https://docs.onesource.io",
     "repository": {
       "url": "https://github.com/blockparty-global/1s-mcp",
       "source": "github"
     },
     "packages": [
       {
         "registryType": "npm",
         "identifier": "@one-source/mcp",
         "version": "1.2.0",
         "transport": {
           "type": "stdio"
         },
         "environmentVariables": [
           {
             "name": "ONESOURCE_BASE_URL",
             "description": "API base URL (default: https://skills.onesource.io)",
             "isRequired": false,
             "isSecret": false
           },
           {
             "name": "ONESOURCE_ANALYTICS",
             "description": "Set to 'false' to disable analytics",
             "isRequired": false,
             "isSecret": false
           }
         ]
       }
     ]
   }
   ```
   Adjust `name` if using GitHub auth fallback. Adjust env vars if an API key is required.

7. **Publish:**
   ```bash
   mcp-publisher publish
   ```

8. **Verify:**
   ```bash
   curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=onesource"
   ```

### Notes
- `description` field has a 100-char max. Current text is 69 chars — fits.
- The npm package must be published BEFORE running `mcp-publisher publish` — the registry validates the package exists.
- `mcpName` in `package.json` must match `name` in `server.json` exactly.
- No human review. Passes validation → immediately live.
- Consider setting up GitHub Actions for automated publishing on version tags later (docs at https://modelcontextprotocol.io/registry/github-actions).

---

## Task 3: Smithery Listing (Broadest MCP-specific discovery)

### What it does
Largest independent MCP registry (2,500-7,300+ servers). Auto-generates install commands for Claude Desktop, Cursor, etc. Has a config UI that lets users fill in API keys before connecting.

### Steps

1. **Create `smithery.yaml`** in repo root:
   ```yaml
   startCommand:
     type: stdio
     configSchema:
       type: object
       properties:
         onesourceBaseUrl:
           type: string
           default: "https://skills.onesource.io"
           description: "OneSource API base URL"
         analytics:
           type: boolean
           default: true
           description: "Enable usage analytics"
     commandFunction:
       |-
       (config) => ({
         command: 'npx',
         args: ['-y', '@one-source/mcp'],
         env: {
           ONESOURCE_BASE_URL: config.onesourceBaseUrl || 'https://skills.onesource.io',
           ONESOURCE_ANALYTICS: config.analytics === false ? 'false' : 'true'
         }
       })
   ```
   Adjust `configSchema` properties to match whatever env vars users actually need to set.

2. **Commit and push** to `main`.

3. **Claim namespace:**
   ```bash
   npx @anthropic-ai/smithery-cli namespace create one-source
   ```
   Or do this through the Smithery web UI.

4. **Connect GitHub repo** at https://smithery.ai/new — connect your GitHub account and select the `blockparty-global/1s-mcp` repo.

5. **Verify listing** at `smithery.ai/server/@one-source/mcp`.

### Notes
- STDIO support is being deprecated on Smithery — they're pushing HTTP. The yaml above works for now, but long-term they want HTTP endpoints.
- For Smithery-hosted HTTP mode, our server would need changes: bind to `0.0.0.0` (not `127.0.0.1`) and read `PORT` from env (not hardcoded 3000). Not needed for the yaml/stdio listing.
- Smithery had a security incident in Oct 2025 exposing ~3,000 hosted servers' API keys. Self-hosting + URL publish is safer than Smithery hosting.
- `configSchema` drives their auto-generated config UI. Good `description` fields matter — users see them.
- The `commandFunction` is a JavaScript arrow function that Smithery evaluates to generate the startup command.

---

## Execution Order

1. **Glama** — create `glama.json`, push, submit URL, claim. ~15 minutes.
2. **MCP Registry** — update `package.json`, republish npm, set up DNS (async with SRE), install `mcp-publisher`, create `server.json`, publish. ~1 hour + DNS propagation wait.
3. **Smithery** — create `smithery.yaml`, push, claim namespace, connect repo. ~30 minutes.

## After P0: What's Next (P1)

Saved to memory for future sessions. In priority order:
- Claude Code plugin (`marketplace.json` + SKILL.md files)
- Awesome list PRs (punkpeye, wong2, awesome-blockchain-mcps)
- Cross-tool awareness (every README references the full suite)

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `glama.json` | Create | Glama ownership claim |
| `server.json` | Create | MCP Registry listing |
| `smithery.yaml` | Create | Smithery listing |
| `package.json` | Modify | Add `mcpName` + `repository` fields |

## Key References

- MCP Registry quickstart: https://modelcontextprotocol.io/registry/quickstart
- MCP Registry auth: https://modelcontextprotocol.io/registry/authentication
- server.json schema: https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json
- Smithery config docs: https://smithery.ai/docs/build/project-config/smithery-yaml
- Smithery publish docs: https://smithery.ai/docs/build/publish
- Glama submission: https://glama.ai/mcp/servers
- glama.json docs: https://glama.ai/blog/2025-07-08-what-is-glamajson
