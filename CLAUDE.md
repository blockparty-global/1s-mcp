# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build

```bash
npm run build       # tsc → ./dist (ES2022 modules)
npm publish --access public   # prepack swaps README.md → README.npm.md, postpack restores it
```

There is no test suite — validation is done manually per `testing.md`.

## Architecture

This is a **unified meta-package** (`@one-source/mcp`) that combines two independent MCP packages into a single MCP server without duplicating their tool implementations:

- `@one-source/api-mcp` — 25 blockchain API tools (active)
- `@one-source/docs-mcp` — documentation tools (integrated but disabled)

### Server creation flow

`cli.ts` → `createMcpServer()` in `create-server.ts` → three registrar modules:

1. `register-api-tools.ts` — iterates `@one-source/api-mcp/tools`, wraps each with analytics + timing + error sanitization, tracks x402 payment events
2. `register-docs-tools.ts` — same pattern, currently commented out
3. `register-bug-report-tool.ts` — registers `1s_report_bug`, POSTs to analytics endpoint

`createMcpServer()` returns `{ server, analytics, client, toolCount }`. The server and client can be overridden via options — this is used in HTTP mode for shared singletons.

### Dual transport modes

**stdio** (default): single server instance, analytics flush on SIGINT. Used by Claude Desktop, Cursor, Claude Code.

**HTTP** (`--http` flag): per-request server creation (stateless), but shared `analytics`, `client`, and `instructions` singletons across requests. Health check at `GET /health`. Railway deployment uses this mode.

### Authentication

Auth is detected at startup in `cli.ts` and baked into LLM system prompt instructions:
- `ONESOURCE_API_KEY` env var → API key auth (priority)
- `X402_PRIVATE_KEY` env var → x402 micropayment auth
- Neither → unauthenticated (limited access)

API key takes priority. The active auth method changes the instructions injected into the MCP server's system prompt (and suppresses x402 payment prompts when an API key is present).

### Version update notifications

On startup, `cli.ts` checks the npm registry for the latest version (3s timeout, non-blocking). If a newer version exists, a notification is injected into LLM instructions. Version comes from `src/version.ts` via `createRequire` → `package.json`.

## Key environment variables

| Variable | Purpose |
|---|---|
| `ONESOURCE_API_KEY` | API key for authenticated requests |
| `X402_PRIVATE_KEY` | Hex private key for x402 micropayments |
| `ONESOURCE_BASE_URL` | Override API base URL |
| `ONESOURCE_ANALYTICS` | Analytics backend: `noop`, `stderr`, or `dashboard` |
| `PORT` | HTTP server port (default 3000) |
| `BUG_REPORT_ENDPOINT` | Override bug report POST URL |

## MCP Registry publishing

After `npm publish`:

1. Update version fields in `server.json`
2. Authenticate: `mcp-publisher login dns --domain onesource.io --private-key <hex-key>`
3. Publish: `mcp-publisher publish`
4. Glama auto-syncs via `glama.json` maintainer config

The `mcp-publisher` binary and `key.pem` are gitignored.
