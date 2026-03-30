# Smithery Deployment Plan: Public HTTP MCP Server

## Context

Smithery requires Streamable HTTP transport with a public HTTPS URL. Our server already supports HTTP mode but binds to `127.0.0.1`. We need to deploy it publicly, add a custom domain, and submit to Smithery.

---

## Step 1: Code Change (DONE)

Update `src/cli.ts` to bind to `0.0.0.0` instead of `127.0.0.1` and read port from the `PORT` environment variable (Railway injects this automatically).

- Bind: `0.0.0.0` (accepts external connections)
- Port: `process.env.PORT` takes priority, then `--port` flag, then default `3000`
- No breaking changes for local use — `--port` flag still works

---

## Step 2: Railway Deployment

1. Go to https://railway.com and sign in with GitHub
2. Click **New Project** > **Deploy from GitHub Repo**
3. Select `blockparty-global/1s-mcp`
4. Set the following in Railway project settings:

   **Build settings:**
   - Builder: Nixpacks (auto-detected for Node.js)
   - Build command: `npm run build`
   - Start command: `node dist/cli.js --http`

   **Environment variables:**
   - `ONESOURCE_BASE_URL` = `https://skills.onesource.io` (or leave unset for default)
   - `ONESOURCE_ANALYTICS` = `true` (or `false` to disable)
   - Any other env vars the server needs

   Railway auto-injects `PORT` — the code reads it.

5. Deploy. Railway gives you a URL like `https://1s-mcp-production-xxxx.up.railway.app`
6. Test the health endpoint:
   ```
   curl https://<railway-url>/health
   ```
7. Test MCP endpoint:
   ```
   curl -X POST https://<railway-url>/ \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":1}'
   ```

---

## Step 3: Custom Domain (WAITING ON SRE)

### What to ask SRE

Add a CNAME record:

- **Host/Name:** `mcp` (resolves as `mcp.onesource.io`)
- **Type:** CNAME
- **Value:** The Railway-provided domain (e.g., `1s-mcp-production-xxxx.up.railway.app`)
- **TTL:** 3600

> NOTE: The exact CNAME target will be available after Railway deployment (Step 2). Update this plan with the actual value before sending to SRE.

### After SRE adds the record

1. In Railway project settings > **Settings** > **Networking** > **Custom Domain**, add `mcp.onesource.io`
2. Railway will provision an SSL certificate automatically
3. Verify:
   ```
   curl https://mcp.onesource.io/health
   ```

---

## Step 4: Submit to Smithery

1. Go to https://smithery.ai/new
2. Enter the public URL: `https://mcp.onesource.io`
3. Smithery will scan the server automatically and detect the tools
4. If auto-scan fails, we may need to add a `/.well-known/mcp/server-card.json` endpoint (see Smithery docs)
5. Verify listing at Smithery

---

## Step 5: Update smithery.yaml

The current `smithery.yaml` in the repo is outdated (uses stdio `commandFunction`). After Smithery listing is confirmed, either:
- Update it to reflect HTTP transport
- Or remove it if Smithery no longer needs it (they may only use the URL now)

---

## Step 6: Update README

Add Smithery publishing instructions to the Registry Publishing section of README.md, similar to the MCP Registry and Glama sections.

---

## Files Modified

| File | Change | Status |
|------|--------|--------|
| `src/cli.ts` | Bind to `0.0.0.0`, read `PORT` env var | DONE |
| `smithery.yaml` | Update or remove after listing confirmed | TODO |
| `README.md` | Add Smithery section to Registry Publishing | TODO |

## Blockers

- **Custom domain**: Waiting on SRE to add CNAME record for `mcp.onesource.io`
