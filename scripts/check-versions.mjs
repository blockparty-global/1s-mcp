#!/usr/bin/env node
/**
 * Assert every version-bearing file agrees with package.json.
 *
 * Added after three of them spent three releases at 5.9.0 while package.json
 * moved to 5.10.2. Nothing failed, nothing warned; the gap was only visible to
 * someone who thought to look. A release is exactly when nobody is looking.
 *
 * Run: npm run check-versions
 * Runs in CI on every push and pull request.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { VERSION_TARGETS, SOURCE_OF_TRUTH } from './version-targets.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readJson(rel) {
  try {
    return JSON.parse(readFileSync(join(root, rel), 'utf8'));
  } catch (err) {
    console.error(`[check-versions] cannot read ${rel}: ${err.message}`);
    process.exit(1);
  }
}

const source = VERSION_TARGETS.find((t) => t.file === SOURCE_OF_TRUTH);
const expected = source.get(readJson(SOURCE_OF_TRUTH))[0];

if (!expected) {
  console.error(`[check-versions] no version found in ${SOURCE_OF_TRUTH}`);
  process.exit(1);
}

const problems = [];

for (const target of VERSION_TARGETS) {
  const found = target.get(readJson(target.file));

  found.forEach((value, i) => {
    // A location the list expects but the file doesn't have is a problem too:
    // it means the file's shape changed and the bump script has been silently
    // writing nothing there.
    const where = found.length > 1 ? `${target.file} [location ${i + 1}]` : target.file;
    if (value === undefined) {
      problems.push(`${where}: no version found — has the file's shape changed?`);
    } else if (value !== expected) {
      problems.push(`${where}: ${value} (expected ${expected})`);
    }
  });
}

if (problems.length > 0) {
  console.error(`[check-versions] version mismatch — ${SOURCE_OF_TRUTH} is ${expected}\n`);
  for (const p of problems) console.error(`  ${p}`);
  console.error(`\nFix with:  npm run bump-version -- ${expected} && npm install`);
  process.exit(1);
}

const locations = VERSION_TARGETS.reduce((n, t) => n + t.get(readJson(t.file)).length, 0);
console.log(
  `[check-versions] OK — ${expected} across ${locations} locations in ${VERSION_TARGETS.length} files`
);
