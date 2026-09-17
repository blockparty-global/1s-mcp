/**
 * Tool-count parity test.
 *
 * Every file in tool-count-sites.json that states a tool count (in any
 * grouping prose chooses to present) is asserted equal to the number
 * actualToolCounts() derives from TOOL_META's row count / api-mcp's
 * registered tools. A regex that no longer matches its file fails loudly
 * (a stale manifest is a bug, not a skip) — playbook §7 lesson 27.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { actualToolCounts } from './tool-count-actual.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(REPO_ROOT, 'tool-count-sites.json');

interface Site {
  path: string;
  category: string;
  regex: string;
}

const manifest: Site[] = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

describe('tool-count-sites.json manifest is well-formed', () => {
  it('is non-empty', () => {
    expect(manifest.length).toBeGreaterThan(0);
  });

  it('every manifest file exists', () => {
    for (const site of manifest) {
      expect(() => readFileSync(path.join(REPO_ROOT, site.path), 'utf8'), `${site.path} does not exist`).not.toThrow();
    }
  });
});

describe('every count-bearing site agrees with TOOL_META / api-mcp', () => {
  const counts = actualToolCounts();
  const actualByCategory: Record<string, number> = {
    total: counts.total,
    totalHttp: counts.totalHttp,
    live: counts.live,
    chainUtils: counts.chainUtils,
    payments: counts.payments,
    deepstate: counts.deepstate,
    standard: counts.standard,
    docs: counts.docs,
    setup: counts.setup,
    'live-chain-utils': counts.live + counts.chainUtils,
  };

  const fileCache = new Map<string, string>();
  const contentsOf = (p: string): string => {
    if (!fileCache.has(p)) fileCache.set(p, readFileSync(path.join(REPO_ROOT, p), 'utf8'));
    return fileCache.get(p)!;
  };

  it('every manifest regex matches its file', () => {
    for (const site of manifest) {
      const m = contentsOf(site.path).match(new RegExp(site.regex));
      expect(m, `${site.path}: /${site.regex}/ did not match`).not.toBeNull();
      expect(m![1], `${site.path}: /${site.regex}/ captured no group`).toBeDefined();
    }
  });

  it('every site equals the actual count for its category', () => {
    for (const site of manifest) {
      const m = contentsOf(site.path).match(new RegExp(site.regex))!;
      const value = Number(m[1]);
      const actual = actualByCategory[site.category];
      expect(actual, `manifest references unknown category "${site.category}"`).toBeDefined();
      expect(
        value,
        `${site.path} states ${value} "${site.category}" (via /${site.regex}/) but the generated count is ${actual}`,
      ).toBe(actual);
    }
  });
});
