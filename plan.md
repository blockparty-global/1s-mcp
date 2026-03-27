# Plan: Unified `onesource-mcp` Meta-Package

## Context

Both MCP servers (API + Docs) are published and working independently on npm. The goal is a single `npx onesource-mcp` command that gives users all 43 tools. This is a meta-package that imports both existing packages as dependencies — no code duplication, independent release cycles.

## Prerequisites (update existing packages)

### 1. Add subpath exports to `@one-source/docs-mcp`

In the docs-mcp `package.json`, add exports so the meta-package can import individual tool handlers:

```json
"exports": {
  ".": "./dist/create-server.js",
  "./tools/search-docs": "./dist/tools/search-docs.js",
  "./tools/get-query-reference": "./dist/tools/get-query-reference.js",
  "./tools/get-type-definition": "./dist/tools/get-type-definition.js",
  "./tools/list-examples": "./dist/tools/list-examples.js",
  "./tools/list-supported-chains": "./dist/tools/list-supported-chains.js",
  "./tools/get-filter-reference": "./dist/tools/get-filter-reference.js",
  "./tools/get-pagination-guide": "./dist/tools/get-pagination-guide.js",
  "./tools/get-schema-overview": "./dist/tools/get-schema-overview.js",
  "./tools/get-authentication-guide": "./dist/tools/get-authentication-guide.js",
  "./analytics": "./dist/analytics.js"
}
```

Bump version → `2.3.0` (additive, non-breaking). Rebuild and republish.

### 2. Add subpath exports to `@one-source/api-mcp`

In the api-mcp `package.json`, add exports:

```json
"exports": {
  ".": { "types": "./dist/create-server.d.ts", "default": "./dist/create-server.js" },
  "./tools": { "types": "./dist/tools/index.d.ts", "default": "./dist/tools/index.js" },
  "./client": { "types": "./dist/client.d.ts", "default": "./dist/client.js" },
  "./analytics": { "types": "./dist/analytics.d.ts", "default": "./dist/analytics.js" },
  "./types": { "types": "./dist/types.d.ts", "default": "./dist/types.js" }
}
```

Bump version → `1.1.0`. Rebuild and republish.

---

## New Repo Structure

```
onesource-mcp/
├── package.json
├── tsconfig.json
├── LICENSE
├── README.md
└── src/
    ├── cli.ts                  # Entry point (bin: onesource-mcp)
    ├── create-server.ts        # Unified factory → { server, analytics }
    ├── analytics.ts            # Thin wrapper over api-mcp analytics (widens category type)
    ├── register-api-tools.ts   # Registers 34 API tools from api-mcp
    ├── register-docs-tools.ts  # Registers 9 docs tools from docs-mcp
    └── version.ts              # Package version constant
```

---

## File-by-File Specification

### `package.json`

```json
{
  "name": "onesource-mcp",
  "version": "1.0.0",
  "type": "module",
  "description": "Unified MCP server for OneSource — 43 tools for blockchain data and API documentation",
  "bin": { "onesource-mcp": "./dist/cli.js" },
  "main": "./dist/create-server.js",
  "types": "./dist/create-server.d.ts",
  "exports": {
    ".": { "types": "./dist/create-server.d.ts", "default": "./dist/create-server.js" }
  },
  "files": ["dist/", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@one-source/api-mcp": "^1.1.0",
    "@one-source/docs-mcp": "^2.3.0",
    "@modelcontextprotocol/sdk": "^1.27.1",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0"
  },
  "engines": { "node": ">=18" },
  "keywords": ["mcp", "model-context-protocol", "onesource", "web3", "blockchain", "graphql", "documentation", "x402"],
  "author": "BlockParty",
  "license": "MIT",
  "homepage": "https://docs.onesource.io"
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### `src/version.ts`

Reads version from the meta-package's own `package.json` using `createRequire`. Same pattern both existing packages use.

### `src/analytics.ts`

**Problem:** The api-mcp `ToolCallEvent` has `category: 'indexed' | 'live' | 'chain'` — doesn't include `'docs'`.

**Solution:** Thin wrapper that imports `createAnalytics` from `@one-source/api-mcp/analytics` (superset — has `trackHttp` which docs-mcp lacks) and widens the `ToolCallEvent.category` type to include `'docs'`. The underlying implementations (Noop/Stderr/Dashboard) just serialize to JSON so the wider type is safe at runtime.

Exports:
- `createAnalytics(): Analytics`
- `Analytics` interface (with `trackTool`, `trackHttp`, `trackService`, `flush`, `stop`)
- `ToolCallEvent` (widened), `HttpCallEvent`, `ServiceEvent` types

### `src/register-api-tools.ts`

Imports:
- `allTools` from `@one-source/api-mcp/tools` — array of 34 `ToolDef` objects
- `createClientFromEnv` from `@one-source/api-mcp/client` — HTTP client factory

Registers all 34 tools on the provided `McpServer` using `server.registerTool()` with the same instrumentation pattern from the api-mcp `create-server.ts`:
- `performance.now()` timing
- `Object.keys(input)` for param names
- SHA-256 session hash (first 16 hex chars)
- `server.server.getClientVersion()` for client info
- Per-call client via `client.withContext({ tool })` to avoid race conditions
- x402 detection via `onHttpEvent` callback closure
- try/catch: tracks success/failure events with `service: 'onesource-api'`
- Error messages sanitized with `0x***` regex
- Returns the `OneSourceClient` instance

### `src/register-docs-tools.ts`

Imports:
- `loadData` from `@one-source/docs-mcp` (main entry)
- Individual tool handlers + schemas from `@one-source/docs-mcp/tools/*` (subpath exports)

Accepts optional pre-loaded `LoadedData` (for HTTP mode where data is loaded once at startup). Falls back to `loadData()` if not provided.

Defines an array of 9 docs tool definitions, each with name, description, schema (`.shape`), and handler bound to the loaded data (sections, index, schema).

Registers all 9 tools with instrumented wrappers using `server.tool()`:
- Same timing/session/client pattern as API tools
- Analytics events use `service: 'onesource-docs'`, `category: 'docs'`, `auth_method: 'none'`
- No network field (docs tools aren't chain-specific)

### `src/create-server.ts`

Creates ONE `McpServer` named `'onesource'`, calls `registerApiTools()` + `registerDocsTools()`, returns `{ server, analytics }`.

Options:
- `docsData?: LoadedData` — pre-loaded docs content for HTTP mode
- `analytics?: Analytics` — override for shared instances
- `transport?: 'stdio' | 'http'`

Re-exports: `loadData`, `LoadedData`, `VERSION`, `StreamableHTTPServerTransport`

### `src/cli.ts`

**Stdio mode** (default — `npx onesource-mcp`):
- Calls `createMcpServer({ transport: 'stdio' })`
- Connects to `StdioServerTransport`
- Emits `service_start` event
- `process.once('SIGINT')` with `stop()` → `flush()` wrapped in 5s `Promise.race` timeout

**HTTP mode** (`npx onesource-mcp --http [--port=N]`):
- Default port `3000` (avoids api-mcp's 3002 and docs-mcp's 3001)
- Pre-loads docs data once via `loadData()`
- Creates shared analytics singleton
- Per-request: fresh `McpServer` + `StreamableHTTPServerTransport`
- Endpoints: `POST /` (MCP), `GET /health`, `OPTIONS` (CORS)
- Binds to `127.0.0.1` (localhost only)
- Same graceful shutdown pattern with 5s timeout

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Analytics events preserve `service: 'onesource-api'` / `service: 'onesource-docs'` | Dashboard can filter by service. Unified server lifecycle uses `service: 'onesource'`. |
| No tool name conflicts | API tools use `1s_` prefix, docs tools use descriptive names (`search_docs`, etc.) |
| HTTP binds to `127.0.0.1` | Localhost only, no network exposure |
| Default port `3000` | Avoids collision with api-mcp (3002) and docs-mcp (3001) |
| `process.once('SIGINT')` not `process.on` | Prevents double-flush race on rapid SIGINT |
| `stop()` before `flush()` in shutdown | Clears 30s timer to prevent concurrent flush race |
| 5s timeout on shutdown flush | Prevents process hang if dashboard endpoint is down |
| `loadData()` resolves from docs-mcp's own `__dirname` | Works correctly from `node_modules` — data dir ships in the npm package |

## Environment Variables

```
ONESOURCE_BASE_URL          # API backend (default: https://skills.onesource.io)
ONESOURCE_ANALYTICS         # true|false (default: true, stderr mode)
ONESOURCE_ANALYTICS_URL     # Dashboard endpoint (enables dashboard mode)
X402_ANALYTICS_KEY          # Dashboard auth token
```

---

## Implementation Sequence

1. Update `@one-source/docs-mcp` package.json with subpath exports → rebuild → republish as `2.3.0`
2. Update `@one-source/api-mcp` package.json with subpath exports → rebuild → republish as `1.1.0`
3. Create new repo with `package.json`, `tsconfig.json`, `LICENSE`
4. Implement `src/version.ts`
5. Implement `src/analytics.ts`
6. Implement `src/register-api-tools.ts`
7. Implement `src/register-docs-tools.ts`
8. Implement `src/create-server.ts`
9. Implement `src/cli.ts`
10. `npm install && npm run build` — verify zero type errors
11. Test stdio: `node dist/cli.js` — verify 43 tools
12. Test HTTP: `node dist/cli.js --http` — verify `/health` and tool calls
13. Publish `onesource-mcp@1.0.0`

## Verification

1. `npm run build` — zero type errors
2. `node dist/cli.js` — stdio mode, verify 43 tools listed
3. `node dist/cli.js --http` — HTTP mode, verify `/health` returns `{ tools: 43 }`
4. Call an API tool (e.g., `1s_network_info`) + a docs tool (e.g., `search_docs`) — both work
5. Check stderr for analytics JSON from both `onesource-api` and `onesource-docs` services
6. `npx onesource-mcp` from a clean directory — installs and runs correctly
