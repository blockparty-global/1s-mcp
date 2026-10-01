# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build

```bash
npm run build       # tsc → ./dist (ES2022 modules)
npm publish --access public   # release-mcp.mjs runs this; don't run it by hand (prepack swaps README.md → README.npm.md, postpack restores it)
```

Releases go through `scripts/release-mcp.mjs` in sre-services (see [MCP Registry publishing](#mcp-registry-publishing)), which runs the version bump and the publish for you. To run the bump on its own:

```bash
npm run bump-version -- <new-version>   # e.g. npm run bump-version -- 5.5.0
npm install                              # syncs package-lock.json
npm run build && npm run validate        # confirm build is clean
```

The script updates `package.json`, `server.json` (both fields), `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, and `manifest.json` (the list is `scripts/version-targets.mjs`). It only checks `package-lock.json`; `npm install` syncs that. Use `--dry-run` to preview without writing.

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
| Unit | `src/register-api-tools.test.ts` | Reported tool count matches what registered on each transport (HTTP omits the two stdio-only payment tools); `1s_multi_balance_live` contract: 20-token cap in the schema, description says bounded query, no discovery, no portfolio value |
| Unit | `src/register-docs-tools.test.ts` | Docs roster, docs tools registered on both stdio and HTTP, real corpus lookups, analytics `service` split (`onesource-docs` vs `onesource-ops`) |
| Unit | `src/tool-meta-api-mcp-parity.test.ts` | Every installed api-mcp tool has a `TOOL_META` row and no row is orphaned; every `DESCRIPTION_OVERRIDE` still differs from upstream |
| Unit | `src/tool-count-parity.test.ts` | Every hand-written tool count listed in `tool-count-sites.json` (READMEs, `package.json`, `server.json`, plugin/marketplace/manifest JSON) equals the count computed in `src/tool-count-actual.ts` |
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

- `@one-source/api-mcp` — live chain tools, chain utilities, payments, Deepstate market data (`1s_ds_*`) and The Standard Reserve (`1s_std_*`), all served from `api.onesource.io`, the one canonical API front door
- `@one-source/docs-mcp` — 8 REST API documentation tools (active, free, no auth)

`register-api-tools.ts` constructs a single client — `createClientFromEnv()` (`ONESOURCE_BASE_URL`, default `api.onesource.io`) — and passes it to every tool handler via `client.withContext(...)`, Deepstate and Standard Reserve included. That's correct: api-mcp's own `create-server.ts` also has one client, since Deepstate moved onto `api.onesource.io` alongside every other route (host consolidation, `odap/DEEPSTATE_API_RUNBOOK.md` API-D17 in sre-services). Each tool needs a `TOOL_META` row (title, annotations, analytics `service` label: `onesource-api` by default, `onesource-deepstate` for `1s_ds_*`, `onesource-standard` for `1s_std_*`). `src/tool-meta-api-mcp-parity.test.ts` fails if a row is missing or orphaned.

Shipping new upstream tools = bump `@one-source/api-mcp` to the version that has them + add their `TOOL_META` rows + update the hand-written counts the parity test flags + publish. Nothing else in this repo changes.

### Tool counts

**The server never hardcodes its tool count.** `expectedToolCount(transport)` in `create-server.ts` computes it from the same tables the registrars iterate (`apiToolsFor(transport)` + `DOCS_TOOL_COUNT` + 1 for `1s_report_bug`). `cli.ts` quotes it in the MCP instructions, and check 4 of `scripts/validate-mcp.mjs` asserts it equals what `createMcpServer()` actually registered. `DOCS_TOOL_COUNT` in `register-docs-tools.ts` is the 8 docs tools plus the 2 ops tools (`OPS_TOOL_NAMES`). A hardcoded count went stale at 38 while the server grew to 65, which is why this exists.

HTTP registers 2 fewer tools than stdio: `1s_payment_mode` and `1s_refund` (`STDIO_ONLY_API_TOOL_NAMES`) operate on a module-level payment singleton that can't be shared across tenants. So `GET /health` on the hosted server reports the HTTP count.

Prose counts (READMEs, `package.json`, plugin/marketplace/manifest JSON) are still written by hand, but each one is listed in `tool-count-sites.json` and checked by `src/tool-count-parity.test.ts`. `server.json`'s description must not contain a count at all (validator check 4).

### Server creation flow

`cli.ts` → `createMcpServer()` in `create-server.ts` → three registrar modules:

1. `register-api-tools.ts` — iterates `apiToolsFor(transport)` from `@one-source/api-mcp/tools` and wraps each one with analytics, timing and error sanitization; tracks x402 payment events. Tool descriptions come from upstream verbatim, except for two local layers: `DESCRIPTION_OVERRIDE` (currently only `1s_multi_balance_live`) and `DESCRIPTION_NOTE` (a `warnings` addendum on several chain-read tools). It also swaps in a local Zod schema for `1s_multi_balance_live`'s `tokens` (20-address max). That schema was added while upstream had no bound (the code comment cites api-mcp 5.11.0). Published api-mcp 5.21.0 has the same `{0,19}` bound itself, so the local schema is now redundant, though harmless. The description override is still live, and the parity test above will flag it once upstream's wording matches.
2. `register-docs-tools.ts` — registers the 8 documentation tools from `@one-source/docs-mcp` plus the `1s_setup_check` and `1s_batch_config` ops tools, on both transports
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

### Documentation tools

The 8 documentation tools (`1s_search_docs`, `1s_get_api_overview`, `1s_list_endpoints`, `1s_get_endpoint_reference`, `1s_search_use_cases`, `1s_list_networks`, `1s_get_payment_info`, `1s_get_authentication_guide`) read a corpus bundled inside `@one-source/docs-mcp`. `register-docs-tools.ts` loads it lazily, once per process, through a memoized `docs()` wrapper around `loadData()`, so a session that never asks a docs question doesn't pay for it, and HTTP mode doesn't reload it on every request. Tool names match the standalone `@one-source/docs-mcp` server exactly; that's a stable contract, because the corpus itself documents those names. Descriptions are written locally so each one can point at the right sibling tool. `DOCS_TOOL_NAMES` is the authoritative roster: validator check 8 and `register-docs-tools.test.ts` both assert against it.

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

Releases are driven by the **coordinated release script** in the sre-services
repo (`scripts/release-mcp.mjs`; `sre-services/RELEASING.md` is the full procedure
and the only supported one). It releases `@one-source/api-mcp` and
`@one-source/mcp` at one shared version, in the required order: it bumps this
repo's versions, refreshes the `@one-source/docs-mcp` dependency if npm has a newer
one, moves the `@one-source/api-mcp` dependency once api-mcp is published, and runs
`mcp-publisher publish`. The steps below normally happen for you.

Run it from the `sre-services` root, logged in to npm. Each subcommand is safe to
re-run, and each takes `--dry-run`:

```bash
npm login                                         # publishing needs an authenticated npm session
node scripts/release-mcp.mjs status  <version>    # read-only: where the release stands, and the next command
node scripts/release-mcp.mjs prepare <version>    # opens 3 draft PRs: api-mcp bump, this repo's bump, Dockerfile pin
node scripts/release-mcp.mjs publish <version>    # npm publish both packages + MCP Registry
node scripts/release-mcp.mjs finish  <version>    # leftovers PR, un-drafts the Dockerfile pin PR, checks /health
```

After `prepare`, merge the api-mcp bump and this repo's bump, but leave the
Dockerfile pin PR open until `publish` has run. `publish` asks for confirmation
once, then for the npm OTP once per package. Publish a new `@one-source/docs-mcp`
(1s-developer-docs repo, manual) before `prepare` if one is needed, since
`prepare` only picks up a version already on npm.

`node scripts/release-mcp.mjs <version>` still works as an alias for `publish`.

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
2. Log in to npm (`npm login`), then from `sre-services` run `release-mcp.mjs` `prepare`, `publish` and `finish` for the version. This publishes both packages to npm and the MCP Registry; see [MCP Registry publishing](#mcp-registry-publishing) for detail.
3. Merge the Dockerfile pin PR (`chore(deploy): pin mcp image to <version>`) in `sre-services` once `publish` has run. `prepare` opens it with **both** `MCP_VERSION` and `API_MCP_VERSION` in `mcp/build/Dockerfile` set to the new version, and `finish` takes it out of draft. Merging it is the deploy trigger.
4. That commit touches `mcp/build/**`, firing the `build-mcp.yaml` workflow. It builds the image, pushes it to ECR, and auto-commits the new image SHA into `mcp/deploy/base/deployment.yaml`.
5. Confirm the auto-pin landed in `deployment.yaml`. Pin it by hand only if the workflow's pin step exhausted its retries.
6. ArgoCD auto-syncs and rolls out. Verify with `curl https://mcp.onesource.io/health` — it should report the new version.

`release-mcp.mjs` writes the `MCP_VERSION` / `API_MCP_VERSION` bump, but only as a PR: nothing reaches the cluster until you merge the pin PR in step 3. Merging it before `publish` builds a broken image, because the Dockerfile installs those exact versions from npm. The script never touches the k8s manifests; the image SHA pin in step 4 is the build workflow's job.
