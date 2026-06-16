#!/usr/bin/env node
/**
 * Version bump script.
 *
 * Updates the version in all four places that must stay in sync:
 *   - package.json
 *   - server.json (top-level version + packages[0].version)
 *   - .claude-plugin/plugin.json
 *   - .claude-plugin/marketplace.json
 *
 * Run: npm run bump-version -- <new-version>
 *      npm run bump-version -- 5.5.0
 *      npm run bump-version -- 5.5.0 --dry-run
 *
 * After running, commit the changes and run npm install to sync package-lock.json.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const newVersion = args.find((a) => !a.startsWith('--'));

if (!newVersion) {
  console.error('Usage: npm run bump-version -- <new-version> [--dry-run]');
  console.error('Example: npm run bump-version -- 5.5.0');
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error(`Invalid version: "${newVersion}" — must be semver (e.g. 5.5.0)`);
  process.exit(1);
}

function readJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), 'utf8'));
}

function writeJson(rel, data) {
  const path = join(root, rel);
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function bump(rel, updater) {
  const data = readJson(rel);
  const before = JSON.stringify(data);
  updater(data);
  const changed = JSON.stringify(data) !== before;

  if (dryRun) {
    const oldVersion = JSON.parse(before).version ?? JSON.parse(before).plugins?.[0]?.version ?? '?';
    console.log(`[dry-run] ${rel}: ${oldVersion} → ${newVersion}`);
    return;
  }

  writeJson(rel, data);
  console.log(`updated  ${rel}`);
  return changed;
}

bump('package.json', (d) => {
  d.version = newVersion;
});

bump('server.json', (d) => {
  d.version = newVersion;
  d.packages[0].version = newVersion;
});

bump('.claude-plugin/plugin.json', (d) => {
  d.version = newVersion;
});

bump('.claude-plugin/marketplace.json', (d) => {
  d.plugins[0].version = newVersion;
});

if (dryRun) {
  console.log('\n[dry-run] no files were written');
} else {
  console.log(`\nversion bumped to ${newVersion}`);
  console.log('next: npm install  (syncs package-lock.json)');
  console.log('      npm run build && npm run validate');
}
