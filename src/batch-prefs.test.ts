/**
 * Tests for batch-prefs — focused on the x402 deposit-cap (X402_MAX_DEPOSIT)
 * set/clear path and its env mirroring, the piece most likely to break silently
 * because it's the one optional/no-default channel knob: setting it must mirror
 * into process.env, clearing it must DELETE the env var (not leave a stale
 * value), and the built-in default must stay uncapped (asymmetric with MPP).
 *
 * The persisted-file path is isolated via ONESOURCE_CONFIG_DIR pointed at a
 * fresh temp dir per test. Note: ENV_SNAPSHOT is captured once at module import,
 * so these tests assume X402_MAX_DEPOSIT is not set in the ambient environment
 * at load time (true in CI / a clean shell).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  loadBatchPrefs,
  getBatchPrefs,
  setBatchPrefs,
  resetBatchPrefs,
  batchConfigPath,
  coerceMaxDeposit,
} from './batch-prefs.js';

let tmp: string;

/** Parse the persisted config file as a plain object. */
function readConfig(): Record<string, unknown> {
  return JSON.parse(readFileSync(batchConfigPath(), 'utf8')) as Record<string, unknown>;
}

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), 'onesource-bp-'));
  process.env.ONESOURCE_CONFIG_DIR = tmp;
  delete process.env.X402_MAX_DEPOSIT;
  // Clean slate: delete any file and re-resolve from env-snapshot + defaults,
  // which also mirrors the (uncapped) default back into process.env.
  resetBatchPrefs();
});

afterEach(() => {
  delete process.env.ONESOURCE_CONFIG_DIR;
  delete process.env.X402_MAX_DEPOSIT;
  rmSync(tmp, { recursive: true, force: true });
});

describe('batch-prefs — X402_MAX_DEPOSIT cap', () => {
  it('defaults to uncapped (no env var), unlike the always-capped MPP rail', () => {
    const prefs = getBatchPrefs();
    expect(prefs.x402MaxDeposit).toBeUndefined();
    expect(process.env.X402_MAX_DEPOSIT).toBeUndefined();
    // The deliberate asymmetry: MPP always resolves to some cap (default '1' or
    // an env override), x402 is opt-in and absent by default. Assert the shape,
    // not the exact MPP value (ENV_SNAPSHOT may carry a local override).
    expect(prefs.mppMaxDeposit).toBeTruthy();
  });

  it('mirrors a set cap into process.env and persists it to the file', () => {
    const { prefs, persisted } = setBatchPrefs({ x402MaxDeposit: '1' });
    expect(prefs.x402MaxDeposit).toBe('1');
    expect(process.env.X402_MAX_DEPOSIT).toBe('1');
    expect(persisted).toBe(true);
    expect(readConfig().x402MaxDeposit).toBe('1');
  });

  it('clearing the cap deletes the env var and drops it from the file', () => {
    setBatchPrefs({ x402MaxDeposit: '2' });
    expect(process.env.X402_MAX_DEPOSIT).toBe('2');

    setBatchPrefs({ x402MaxDeposit: undefined });
    expect(getBatchPrefs().x402MaxDeposit).toBeUndefined();
    // Deleted, not set to an empty string — the downstream api-mcp must see a
    // genuinely absent cap.
    expect('X402_MAX_DEPOSIT' in process.env).toBe(false);
    expect(readConfig().x402MaxDeposit).toBeUndefined();
  });

  it('does not disturb the cap when other fields change', () => {
    setBatchPrefs({ x402MaxDeposit: '1.5' });
    setBatchPrefs({ depositMultiplier: 20 });
    expect(getBatchPrefs().x402MaxDeposit).toBe('1.5');
    expect(process.env.X402_MAX_DEPOSIT).toBe('1.5');
  });

  it('persists the cap across a reload (file > default)', () => {
    setBatchPrefs({ x402MaxDeposit: '3' });
    delete process.env.X402_MAX_DEPOSIT; // simulate a fresh process
    loadBatchPrefs(); // re-resolve from the persisted file
    expect(getBatchPrefs().x402MaxDeposit).toBe('3');
    expect(process.env.X402_MAX_DEPOSIT).toBe('3');
  });

  it('reset restores the uncapped default and clears the env var', () => {
    setBatchPrefs({ x402MaxDeposit: '5' });
    expect(process.env.X402_MAX_DEPOSIT).toBe('5');

    resetBatchPrefs();
    expect(getBatchPrefs().x402MaxDeposit).toBeUndefined();
    expect(process.env.X402_MAX_DEPOSIT).toBeUndefined();
  });
});

describe('coerceMaxDeposit (cap validation, shared by both rails)', () => {
  it('accepts a positive number string', () => {
    expect(coerceMaxDeposit('1')).toBe('1');
    expect(coerceMaxDeposit('0.5')).toBe('0.5');
    expect(coerceMaxDeposit(2)).toBe('2');
  });

  it('rejects non-positive, empty, or non-numeric values', () => {
    expect(coerceMaxDeposit('0')).toBeUndefined();
    expect(coerceMaxDeposit('-1')).toBeUndefined();
    expect(coerceMaxDeposit('')).toBeUndefined();
    expect(coerceMaxDeposit('abc')).toBeUndefined();
    expect(coerceMaxDeposit(undefined)).toBeUndefined();
  });
});
