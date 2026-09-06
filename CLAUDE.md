# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build

```bash
npm run build       # tsc → ./dist (ES2022 modules)
npm publish --access public   # prepack swaps README.md → README.npm.md, postpack restores it
```

**Before publishing**, always run the version bump script so all four version fields stay in sync:

```bash
npm run bump-version -- <new-version>   # e.g. npm run bump-version -- 5.5.0
npm install                              # syncs package-lock.json
npm run build && npm run validate        # confirm build is clean
```

The script updates `package.json`, `server.json` (both fields), `.claude-plugin/plugin.json`, and `.claude-plugin/marketplace.json`. Use `--dry-run` to preview without writing.

## Tests

```bash
npm test            # build:tsc, then vitest run
npm run test:watch  # vitest in watch mode
npm run validate    # in-process tool-registration checks; never opens a socket
```

`.github/workflows/ci.yml` runs `validate` and `test` as two independent required
checks on every PR to `develop`/`main`, in parallel rather than one behind the other.

| Layer | Where | Covers |
|---|---|---|
| Unit | `src/auth-header.test.ts` | Bearer parsing: scheme case, whitespace, absent/non-Bearer/empty, repeated header |
| Unit | `src/http-utils.test.ts` | The body reader: chunk reassembly, the byte cap on both sides, no partial resolve when the cap trips mid-stream, stream errors, stream left exhausted for later readers |
| Unit | `src/session-store.test.ts` | Single-use consume (in-memory and Valkey `GETDEL`), concurrent double-submit yielding exactly one winner, CSRF cookie hashing, rate-limit windows and TTL preservation, capacity caps, fail-closed on corrupt entries, URL redaction |
| Integration | `src/http-transport.test.ts` | Spawns the built `dist/cli.js` as a real subprocess and POSTs over a real socket: `initialize` handshake, `tools/list`, `-32700` on malformed JSON, and the 64KB cap on both sides plus a chunked body |
| Registration | `scripts/validate-mcp.mjs` | `TOOL_META` coverage in both directions, SDK read-back of annotations, tool count, `server.json`, no deprecated `server.tool()` |

The integration test exists because of todo 036: for five weeks the hosted server
answered `-32700 Parse error` to every POST while `GET /health` stayed green. It
drives a real subprocess instead of importing the handler because the bug lived in
how the Node request stream was consumed, and only a real socket reproduces that.
**Never treat `/health` as evidence that the transport works** — that applies to
probes and manual checks as much as to tests.

Still manual, per `testing.md`: install/uninstall cycles (Phase 7), auth edge cases
(Phase 6), OAuth multi-replica (Phase 8a), and the x402 payment and refund phases
(9–11, which spend real funds; Phase 11 is destructive). The suite boots in auth
mode `none` with analytics off, so it proves the transport works — not that tools
return correct data.

## Architecture

This is a **unified meta-package** (`@one-source/mcp`) that combines two independent MCP packages into a single MCP server without duplicating their tool implementations:

- `@one-source/api-mcp` — 35 tools (active): 27 blockchain API tools + 8 Deepstate market-data tools (`1s_ds_*`, `markets.onesource.io`)
- `@one-source/docs-mcp` — documentation tools (integrated but disabled)

**Known gap (found 2026-09-06, not yet fixed):** `register-api-tools.ts` registers the 8 Deepstate tools with `TOOL_META` rows and an `onesource-deepstate` analytics `service` label, but its `registerApiTools()` only ever constructs one client — `createClientFromEnv()` (`ONESOURCE_BASE_URL`, api.onesource.io) — and passes it to every tool handler via `client.withContext(...)`, including the Deepstate ones. Unlike api-mcp's own `create-server.ts` (which dispatches to a second `createDeepstateClientFromEnv()` client by `tool.category`), this repo's registrar has no such branch, so `DEEPSTATE_BASE_URL` is inert here and Deepstate tool calls hit `api.onesource.io`, which does not serve `/deepstate/*` by design (see `odap/DEEPSTATE_API_RUNBOOK.md` API-D2 in sre-services). Needs a fix — a second client + category dispatch mirroring api-mcp's — before release.

### Server creation flow

`cli.ts` → `createMcpServer()` in `create-server.ts` → three registrar modules:

1. `register-api-tools.ts` — iterates `@one-source/api-mcp/tools`, wraps each with analytics + timing + error sanitization, tracks x402 payment events
2. `register-docs-tools.ts` — same pattern, currently commented out
3. `register-bug-report-tool.ts` — registers `1s_report_bug`, POSTs to analytics endpoint

`createMcpServer()` returns `{ server, analytics, client, toolCount }`. The server and client can be overridden via options — this is used in HTTP mode for shared singletons.

### Dual transport modes

**stdio** (default): single server instance, analytics flush on SIGINT. Used by Claude Desktop, Cursor, Claude Code.

**HTTP** (`--http` flag): per-request server creation (stateless), but shared `analytics`, `client`, and `instructions` singletons across requests. Health check at `GET /health`. This is the mode the hosted server at `mcp.onesource.io` runs in — see [Deploying to production](#deploying-to-production-mcponesourceio).

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
| `VALKEY_URL` | HTTP mode only. When set, OAuth flow state (authState, pendingCode, CSRF cookies, rate limits) lives in a shared Valkey store instead of per-process memory, so the server runs correctly on ≥2 replicas. Unset → in-memory (single-process). On startup the server connects + PINGs; if it fails, it refuses to start (fail loud, redacted error). |
| `VALKEY_PASSWORD` | Password for an authenticated Valkey instance (paired with `VALKEY_URL`). |

**Multi-replica note:** the hosted server may run on ≥2 replicas only when the image is ≥5.9.0 **and** `VALKEY_URL` points at a live Valkey — any pod can then serve any step of the OAuth flow. Without `VALKEY_URL` the server must stay single-replica (per-process state does not cross pods). See the "OAuth Multi-Replica" phase in `testing.md` for the cross-pod verification procedure.

## MCP Registry publishing

Releases are normally driven by the **coordinated release script** in the
sre-services repo (`scripts/release-mcp.mjs`; see `sre-services/RELEASING.md`).
It publishes `@one-source/api-mcp` and `@one-source/mcp` in the required order,
refreshes this repo's `@one-source/api-mcp` dependency, bumps `server.json`, and
runs `mcp-publisher publish` — so the steps below normally happen for you.

Run it from the `sre-services` repo, logged in to npm:

```bash
npm login                                          # publishing needs an authenticated npm session
node scripts/release-mcp.mjs <version>             # e.g. 5.8.2 — bumps + publishes both packages in order
node scripts/release-mcp.mjs <version> --dry-run   # preview the plan; no mutations, no publish
```

The script prompts at each step, so you can stop and back out mid-run if something looks off.

Manual fallback (registry-only fixes, or when the script can't run) — after `npm publish`:

1. Update version fields in `server.json` (both `version` and `packages[].version`)
2. Authenticate: `mcp-publisher login dns --domain onesource.io --private-key <hex-key>`
3. Publish: `mcp-publisher publish`
4. Glama auto-syncs via `glama.json` maintainer config

The `mcp-publisher` binary and `key.pem` are gitignored.

## Deploying to production (mcp.onesource.io)

The hosted HTTP server runs on AWS EKS, managed by ArgoCD. Its deploy config lives in the **`sre-services`** repo under `mcp/` (`build/Dockerfile`, `deploy/base/*.yaml`, `deploy/argocd-app.yaml`), not here. This repo only produces the npm package the container installs.

That last point is the one that trips people up: the container builds from the published npm package (`npm install -g @one-source/mcp@<MCP_VERSION>` in `sre-services/mcp/build/Dockerfile`), so the hosted server and the `npx` package are the same artifact. **Every change — including HTTP-only changes — needs an npm publish to reach production.** Merging to `develop` here deploys nothing on its own; ArgoCD watches `sre-services`, not this repo.

To ship a release to production:

1. Merge code changes to `develop` (this repo).
2. Log in to npm (`npm login`), then from `sre-services` run `node scripts/release-mcp.mjs <version>` (add `--dry-run` to preview). This publishes both packages to npm and the MCP Registry — see [MCP Registry publishing](#mcp-registry-publishing) for detail.
3. In `sre-services/mcp/build/Dockerfile`, bump **both** `MCP_VERSION` and `API_MCP_VERSION` to the new version, then commit. This is the deploy trigger.
4. That commit touches `mcp/build/**`, firing the `build-mcp.yaml` workflow. It builds the image, pushes it to ECR, and auto-commits the new image SHA into `mcp/deploy/base/deployment.yaml`.
5. Confirm the auto-pin landed in `deployment.yaml`. Pin it by hand only if the workflow's pin step exhausted its retries.
6. ArgoCD auto-syncs and rolls out. Verify with `curl https://mcp.onesource.io/health` — it should report the new version.

`release-mcp.mjs` covers npm and the MCP Registry only; it does not touch the Dockerfile or the k8s manifests. The `MCP_VERSION` / `API_MCP_VERSION` bump in step 3 is a separate manual step, and it is what actually moves a published version onto the cluster.
