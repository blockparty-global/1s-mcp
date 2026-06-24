/**
 * Unit tests for batch-prefs: the field coercers, file persistence, the
 * file > env > default resolution, and the mirror into process.env that the
 * api-mcp payment layer reads.
 *
 * Note: ENV_SNAPSHOT is captured once at module import, so these tests assert
 * env-independent behaviour — pure coercers, persisted-value-wins, mirror
 * effects, and invalid-field handling — rather than env-derived defaults the
 * host shell could perturb.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync, writeFileSync, mkdirSync } from 'node:fs';
import {
  coercePrompt,
  coerceThreshold,
  coerceMultiplier,
  coerceMode,
  coerceMaxDeposit,
  setBatchPrefs,
  getBatchPrefs,
  resetBatchPrefs,
  loadBatchPrefs,
  batchConfigPath,
  hasPersistedConfig,
  DEFAULT_BATCH_PREFS,
  MIN_DEPOSIT_MULTIPLIER,
} from './batch-prefs.js';

const TEST_DIR = join(tmpdir(), 'onesource-batch-prefs-test');
const MIRRORED = [
  'ONESOURCE_PAYMENT_MODE',
  'X402_PAYMENT_MODE',
  'MPP_PAYMENT_MODE',
  'X402_DEPOSIT_MULTIPLIER',
  'MPP_MAX_DEPOSIT',
] as const;

beforeEach(() => {
  process.env.ONESOURCE_CONFIG_DIR = TEST_DIR;
  rmSync(TEST_DIR, { recursive: true, force: true });
  for (const k of MIRRORED) delete process.env[k];
  loadBatchPrefs(); // re-resolve against the clean temp dir
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  delete process.env.ONESOURCE_CONFIG_DIR;
  for (const k of MIRRORED) delete process.env[k];
});

describe('coercePrompt', () => {
  it('accepts the three valid values, case/space-insensitively', () => {
    expect(coercePrompt('ask')).toBe('ask');
    expect(coercePrompt(' AUTO ')).toBe('auto');
    expect(coercePrompt('Off')).toBe('off');
  });
  it('rejects anything else', () => {
    expect(coercePrompt('sometimes')).toBeUndefined();
    expect(coercePrompt(5)).toBeUndefined();
    expect(coercePrompt(undefined)).toBeUndefined();
  });
});

describe('coerceThreshold', () => {
  it('accepts positive integers (number or numeric string)', () => {
    expect(coerceThreshold(5)).toBe(5);
    expect(coerceThreshold('12')).toBe(12);
  });
  it('rejects zero, negatives, and non-integers', () => {
    expect(coerceThreshold(0)).toBeUndefined();
    expect(coerceThreshold(-3)).toBeUndefined();
    expect(coerceThreshold(5.5)).toBeUndefined();
    expect(coerceThreshold('abc')).toBeUndefined();
  });
});

describe('coerceMultiplier', () => {
  it('accepts values at or above the SDK minimum', () => {
    expect(coerceMultiplier(MIN_DEPOSIT_MULTIPLIER)).toBe(MIN_DEPOSIT_MULTIPLIER);
    expect(coerceMultiplier('10')).toBe(10);
  });
  it('rejects values below the minimum and non-finite input', () => {
    expect(coerceMultiplier(2)).toBeUndefined();
    expect(coerceMultiplier(0)).toBeUndefined();
    expect(coerceMultiplier('nope')).toBeUndefined();
  });
});

describe('coerceMode', () => {
  it('accepts all four unified rail+modes', () => {
    for (const m of ['x402-exact', 'x402-batch', 'mpp-charge', 'mpp-session']) {
      expect(coerceMode(m)).toBe(m);
    }
  });
  it('maps legacy exact/batch to the x402 rail', () => {
    expect(coerceMode('exact')).toBe('x402-exact');
    expect(coerceMode('BATCH')).toBe('x402-batch');
  });
  it('rejects unknown modes', () => {
    expect(coerceMode('mpp-exact')).toBeUndefined();
    expect(coerceMode('')).toBeUndefined();
  });
});

describe('coerceMaxDeposit', () => {
  it('accepts positive numeric strings/numbers, returning the string form', () => {
    expect(coerceMaxDeposit('1')).toBe('1');
    expect(coerceMaxDeposit('0.5')).toBe('0.5');
    expect(coerceMaxDeposit(2)).toBe('2');
  });
  it('rejects zero, negative, and non-numeric', () => {
    expect(coerceMaxDeposit('0')).toBeUndefined();
    expect(coerceMaxDeposit('-1')).toBeUndefined();
    expect(coerceMaxDeposit('abc')).toBeUndefined();
    expect(coerceMaxDeposit('')).toBeUndefined();
  });
});

describe('persistence + resolution', () => {
  it('persists a set value so it survives a re-resolve (file wins)', () => {
    expect(hasPersistedConfig()).toBe(false);
    const res = setBatchPrefs({ threshold: 9, mode: 'mpp-session' });
    expect(res.persisted).toBe(true);
    expect(hasPersistedConfig()).toBe(true);
    loadBatchPrefs(); // fresh resolve from disk
    expect(getBatchPrefs().threshold).toBe(9);
    expect(getBatchPrefs().mode).toBe('mpp-session');
  });

  it('reset deletes the file', () => {
    setBatchPrefs({ threshold: 9 });
    expect(hasPersistedConfig()).toBe(true);
    resetBatchPrefs();
    expect(hasPersistedConfig()).toBe(false);
  });

  it('ignores invalid persisted fields, keeping the rest of the config valid', () => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(
      batchConfigPath(),
      JSON.stringify({ threshold: -1, prompt: 'bogus', mode: 'exact', depositMultiplier: 1 }),
      'utf8',
    );
    loadBatchPrefs();
    const prefs = getBatchPrefs();
    // mode 'exact' is a valid legacy alias → applied; the invalid fields are dropped.
    expect(prefs.mode).toBe('x402-exact');
    expect(prefs.threshold).toBe(DEFAULT_BATCH_PREFS.threshold); // -1 rejected
    expect(prefs.depositMultiplier).toBe(DEFAULT_BATCH_PREFS.depositMultiplier); // 1 < min rejected
  });

  it('survives a malformed config file (falls back without throwing)', () => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(batchConfigPath(), '{ not json', 'utf8');
    expect(() => loadBatchPrefs()).not.toThrow();
    expect(getBatchPrefs().mode).toBe(DEFAULT_BATCH_PREFS.mode);
  });
});

describe('mirrorToEnv (api-mcp payment layer reads these)', () => {
  it('mirrors an mpp-session config to the MPP env vars', () => {
    setBatchPrefs({ mode: 'mpp-session', mppMaxDeposit: '2', depositMultiplier: 7 });
    expect(process.env.ONESOURCE_PAYMENT_MODE).toBe('mpp-session');
    expect(process.env.MPP_PAYMENT_MODE).toBe('session');
    expect(process.env.MPP_MAX_DEPOSIT).toBe('2');
    expect(process.env.X402_DEPOSIT_MULTIPLIER).toBe('7');
  });

  it('mirrors an x402-batch config to the x402 sub-mode env', () => {
    setBatchPrefs({ mode: 'x402-batch' });
    expect(process.env.ONESOURCE_PAYMENT_MODE).toBe('x402-batch');
    expect(process.env.X402_PAYMENT_MODE).toBe('batch');
  });
});
