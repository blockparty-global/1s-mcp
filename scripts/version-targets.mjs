/**
 * Every place the package version is written, in one list.
 *
 * This is shared by bump-version.mjs (which writes them) and
 * check-versions.mjs (which asserts they agree). Keeping one list means the
 * checker cannot fall behind the bumper: add a target here and both the bump
 * and the CI guard pick it up.
 *
 * The list exists because these drifted. plugin.json, marketplace.json and
 * manifest.json sat at 5.9.0 while package.json and server.json moved through
 * 5.10.0, 5.10.1 and 5.10.2 — so the plugin marketplace entry and the desktop
 * extension manifest advertised a version three releases stale, and nothing
 * anywhere failed.
 *
 * `get` returns every version-bearing location in the file, because several
 * files carry it more than once and a check that looked at only the first
 * would have passed on a half-updated file.
 */
export const VERSION_TARGETS = [
  {
    file: 'package.json',
    get: (d) => [d.version],
    set: (d, v) => { d.version = v; },
  },
  {
    file: 'server.json',
    get: (d) => [d.version, d.packages?.[0]?.version],
    set: (d, v) => { d.version = v; d.packages[0].version = v; },
  },
  {
    file: '.claude-plugin/plugin.json',
    get: (d) => [d.version],
    set: (d, v) => { d.version = v; },
  },
  {
    file: '.claude-plugin/marketplace.json',
    get: (d) => [d.plugins?.[0]?.version],
    set: (d, v) => { d.plugins[0].version = v; },
  },
  {
    file: 'manifest.json',
    get: (d) => [d.version],
    set: (d, v) => { d.version = v; },
  },
  {
    // Written by `npm install`, not by the bump script — but it still has to
    // agree, and it drifted along with the rest. Checked, never set: making
    // the bumper edit the lockfile by hand would desync it from the
    // dependency tree npm resolved.
    file: 'package-lock.json',
    checkOnly: true,
    get: (d) => [d.version, d.packages?.['']?.version],
  },
];

/** The file whose version every other location must match. */
export const SOURCE_OF_TRUTH = 'package.json';
