/**
 * Unit tests for the mppDepositMultiplier batch pref (the runtime knob backing
 * 1s_batch_config { mpp_deposit_multiplier }): default, persistence, and the
 * mirror into process.env.MPP_DEPOSIT_MULTIPLIER that api-mcp's mpp-session
 * deposit sizing reads.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import {
  setBatchPrefs,
  getBatchPrefs,
  loadBatchPrefs,
  DEFAULT_BATCH_PREFS,
} from './batch-prefs.js';

const TEST_DIR = join(tmpdir(), 'onesource-mpp-mult-test');

beforeEach(() => {
  process.env.ONESOURCE_CONFIG_DIR = TEST_DIR;
  rmSync(TEST_DIR, { recursive: true, force: true });
  delete process.env.MPP_DEPOSIT_MULTIPLIER;
  loadBatchPrefs();
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  delete process.env.ONESOURCE_CONFIG_DIR;
  delete process.env.MPP_DEPOSIT_MULTIPLIER;
});

describe('mppDepositMultiplier pref', () => {
  it('defaults to 10', () => {
    expect(DEFAULT_BATCH_PREFS.mppDepositMultiplier).toBe(10);
  });

  it('persists a set value and survives a re-resolve', () => {
    setBatchPrefs({ mppDepositMultiplier: 7 });
    loadBatchPrefs();
    expect(getBatchPrefs().mppDepositMultiplier).toBe(7);
  });

  it('mirrors into process.env.MPP_DEPOSIT_MULTIPLIER (read by api-mcp mpp-session)', () => {
    setBatchPrefs({ mppDepositMultiplier: 6 });
    expect(process.env.MPP_DEPOSIT_MULTIPLIER).toBe('6');
  });
});
