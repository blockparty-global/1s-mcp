#!/usr/bin/env node
/**
 * Version bump script.
 *
 * Updates the version everywhere it is written. The list of places lives in
 * version-targets.mjs, shared with check-versions.mjs so the CI guard cannot
 * fall behind this script.
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
import { VERSION_TARGETS } from './version-targets.mjs';

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

function bump(target) {
  const data = readJson(target.file);
  const before = JSON.stringify(data);
  target.set(data, newVersion);
  const changed = JSON.stringify(data) !== before;

  if (dryRun) {
    const oldVersion = target.get(JSON.parse(before))[0] ?? '?';
    console.log(`[dry-run] ${target.file}: ${oldVersion} → ${newVersion}`);
    return;
  }

  writeJson(target.file, data);
  console.log(`updated  ${target.file}`);
  return changed;
}

// checkOnly targets (package-lock.json) are written by `npm install`, not here.
for (const target of VERSION_TARGETS.filter((t) => !t.checkOnly)) {
  bump(target);
}

if (dryRun) {
  console.log('\n[dry-run] no files were written');
} else {
  console.log(`\nversion bumped to ${newVersion}`);
  console.log('next: npm install  (syncs package-lock.json)');
  console.log('      npm run build && npm run validate');
}
