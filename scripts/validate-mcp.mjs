#!/usr/bin/env node
/**
 * MCP health validation script.
 *
 * Runs after `npm run build`. Imports from ./dist/ and inspects the live
 * server registration state. Exit 1 with diagnostics if any check fails.
 * Exit 0 with a summary line if all pass.
 *
 * Run: npm run validate
 * CI:  npm run build && npm run validate
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Fail fast with a clear message if dist/ hasn't been built yet.
if (!existsSync(join(root, 'dist/create-server.js'))) {
  console.error('[validate-mcp] FATAL: dist/ not found — run npm run build first');
  process.exit(1);
}

const serverJson = JSON.parse(readFileSync(join(root, 'server.json'), 'utf8'));
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const { createMcpServer } = await import(pathToFileURL(join(root, 'dist/create-server.js')).href);
const { TOOL_META } = await import(pathToFileURL(join(root, 'dist/register-api-tools.js')).href);
const { allTools } = await import('@one-source/api-mcp/tools');

// Proxy absorbs any method the SDK or future analytics interface may call during registration.
const noopAnalytics = new Proxy({}, { get: () => () => {} });

const failures = [];

function fail(check, message) {
  failures.push(`[validate-mcp] FAIL ${check}: ${message}`);
}

let server, toolCount;
try {
  ({ server, toolCount } = createMcpServer({ analytics: noopAnalytics }));
} catch (err) {
  fail('check-0', `createMcpServer() threw during registration: ${String(err?.message ?? err).slice(0, 300)}`);
  for (const f of failures) console.error(f);
  console.error(`[validate-mcp] ${failures.length} error(s) — fix before build`);
  process.exit(1);
}

const registered = server._registeredTools;
if (!registered || typeof registered !== 'object') {
  console.error('[validate-mcp] FATAL: server._registeredTools is inaccessible — SDK internal API may have changed');
  process.exit(1);
}

// Pre-compute for use across multiple checks.
const apiToolNameSet = new Set(allTools.map((t) => t.name));

// Check 1 — TOOL_META coverage
// Every upstream tool must have an explicit entry. Missing entries default to
// readOnlyHint: true — dangerous if the new tool is write/destructive.
for (const tool of allTools) {
  if (!TOOL_META[tool.name]) {
    fail('check-1', `${tool.name} — not found in TOOL_META (add entry with title and annotations)`);
  }
}

// Check 2 — TOOL_META metadata completeness
for (const [name, meta] of Object.entries(TOOL_META)) {
  if (typeof meta.title !== 'string' || meta.title.trim().length === 0) {
    fail('check-2', `${name} — TOOL_META.title is empty or missing`);
  }
  if (typeof meta.annotations?.readOnlyHint !== 'boolean') {
    fail('check-2', `${name} — TOOL_META.annotations.readOnlyHint is not a boolean (got: ${typeof meta.annotations?.readOnlyHint})`);
  }
  if (typeof meta.annotations?.destructiveHint !== 'boolean') {
    fail('check-2', `${name} — TOOL_META.annotations.destructiveHint is not a boolean (got: ${typeof meta.annotations?.destructiveHint})`);
  }
}

// Check 2b — Orphaned TOOL_META entries
// Check 1 finds tools missing from TOOL_META; this is the reverse — TOOL_META
// entries whose tool no longer exists in allTools (stale after upstream removal).
for (const name of Object.keys(TOOL_META)) {
  if (!apiToolNameSet.has(name)) {
    fail('check-2b', `${name} — in TOOL_META but not in allTools (stale entry — remove it)`);
  }
}

// Check 3 — Read-back correctness
// Values stored in the SDK's _registeredTools must match TOOL_META.
// Catches regressions where a field is passed but silently ignored by the SDK.
for (const tool of allTools) {
  const meta = TOOL_META[tool.name];
  if (!meta) continue; // already caught by check-1
  const reg = registered[tool.name];
  if (!reg) {
    fail('check-3', `${tool.name} — not found in server._registeredTools after createMcpServer()`);
    continue;
  }
  if (reg.title !== meta.title) {
    fail('check-3', `${tool.name} — registered title is ${JSON.stringify(reg.title)}, TOOL_META says ${JSON.stringify(meta.title)}`);
  }
  if (reg.annotations?.readOnlyHint !== meta.annotations.readOnlyHint) {
    fail('check-3', `${tool.name} — registered readOnlyHint is ${reg.annotations?.readOnlyHint}, TOOL_META says ${meta.annotations.readOnlyHint}`);
  }
  if (reg.annotations?.destructiveHint !== meta.annotations.destructiveHint) {
    fail('check-3', `${tool.name} — registered destructiveHint is ${reg.annotations?.destructiveHint}, TOOL_META says ${meta.annotations.destructiveHint}`);
  }
}

// Check 3b — Local tool read-back
// Checks 1–3 cover api-mcp tools via TOOL_META. Local tools (1s_setup_check,
// 1s_batch_config, 1s_report_bug) are not in TOOL_META — this pass validates
// they have a title and correct annotation types regardless of TOOL_META coverage.
for (const [name, reg] of Object.entries(registered)) {
  if (apiToolNameSet.has(name)) continue; // already covered by check-3
  if (reg.enabled === false) continue;
  if (!reg.title || typeof reg.title !== 'string' || reg.title.trim().length === 0) {
    fail('check-3b', `${name} — registered title is missing or empty`);
  }
  if (typeof reg.annotations?.readOnlyHint !== 'boolean') {
    fail('check-3b', `${name} — registered readOnlyHint is not a boolean (got: ${typeof reg.annotations?.readOnlyHint})`);
  }
  if (typeof reg.annotations?.destructiveHint !== 'boolean') {
    fail('check-3b', `${name} — registered destructiveHint is not a boolean (got: ${typeof reg.annotations?.destructiveHint})`);
  }
}

// Check 4 — Tool count consistency
const registeredCount = Object.keys(registered).length;
if (registeredCount !== toolCount) {
  fail('check-4', `registered ${registeredCount} tools but createMcpServer().toolCount reports ${toolCount}`);
}
const countMatch = serverJson.description?.match(/^(\d+) tools/);
if (!countMatch) {
  fail('check-4', `server.json description does not start with a tool count — expected format: "N tools ..."`);
} else {
  const declaredCount = Number(countMatch[1]);
  if (!Number.isInteger(declaredCount)) {
    fail('check-4', `server.json description tool count is not a valid integer: "${countMatch[1]}"`);
  } else if (registeredCount !== declaredCount) {
    fail('check-4', `registered ${registeredCount} tools but server.json description says ${declaredCount}`);
  }
}

// Check 5 — server.json validity
if (!serverJson.privacyPolicyUrl || typeof serverJson.privacyPolicyUrl !== 'string' || serverJson.privacyPolicyUrl.trim().length === 0) {
  fail('check-5', 'server.json missing privacyPolicyUrl');
}
if (serverJson.version !== packageJson.version) {
  fail('check-5', `server.json version "${serverJson.version}" does not match package.json version "${packageJson.version}"`);
}

// Check 6 — No deprecated server.tool() calls
// Filters out comment lines (JSDoc and // comments) to avoid false positives.
// Note: a string literal containing 'server.tool(' would also match — known
// limitation, acceptable given current codebase has no such string literals.
let grepOut = '';
try {
  grepOut = execFileSync('grep', ['-rn', '--include=*.ts', 'server\\.tool(', 'src/'], {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf8',
  });
} catch (err) {
  // grep exits 1 when no matches found — that's the success case here
  if (err.status !== 1) {
    fail('check-6', `grep command failed unexpectedly: ${String(err.message).slice(0, 200)}`);
  }
}
if (grepOut.trim()) {
  const callLines = grepOut
    .trim()
    .split('\n')
    .filter((line) => {
      const content = line.split(':').slice(2).join(':').trimStart();
      return !content.startsWith('*') && !content.startsWith('/');
    });
  for (const line of callLines) {
    fail('check-6', `deprecated server.tool() call found — ${line.trim()}`);
  }
}

// Check 7 — Description minimum length
for (const [name, reg] of Object.entries(registered)) {
  if (reg.enabled === false) continue;
  const desc = (reg.description ?? '').trim();
  if (desc.length <= 20) {
    fail('check-7', `${name} — description is ${desc.length} chars (minimum 21)`);
  }
}

// Output
if (failures.length > 0) {
  for (const f of failures) {
    console.error(f);
  }
  console.error(`[validate-mcp] ${failures.length} error(s) — fix before build`);
  process.exit(1);
}

console.log(`[validate-mcp] OK — ${registeredCount} tools validated (9 checks passed)`);
