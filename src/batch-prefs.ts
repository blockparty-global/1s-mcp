/**
 * Batch-settlement preferences — server-managed and runtime-configurable.
 *
 * The x402 batch knobs (autonomy prompt, "many" threshold, deposit multiplier,
 * and default payment mode) were previously settable only via env vars, which
 * meant editing the MCP client config and restarting. This module lets them be
 * set from within a session (via the `1s_batch_config` tool) and persists them
 * to a server-owned file so they survive restarts without touching the client
 * config.
 *
 * Resolution priority per field: persisted file > env var > built-in default.
 *
 * Resolved values are mirrored back into process.env (X402_PAYMENT_MODE,
 * X402_DEPOSIT_MULTIPLIER) so the downstream @one-source/api-mcp x402 code —
 * which reads those env vars directly — transparently honours them. This module
 * intentionally has no dependency on api-mcp: applying the live payment scheme
 * (setPaymentMode) is left to the caller.
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import type { PaymentRailMode } from '@one-source/api-mcp/payment';

export type BatchPromptPref = 'ask' | 'auto' | 'off';
/** Unified rail+mode. Legacy 'exact'/'batch' map to 'x402-exact'/'x402-batch'. */
export type PaymentMode = PaymentRailMode;

const ALL_MODES: readonly PaymentRailMode[] = ['x402-exact', 'x402-batch', 'mpp-charge', 'mpp-session'];

export interface BatchPrefs {
  /** Agent autonomy when deciding to switch to batch mode. */
  prompt: BatchPromptPref;
  /** Anticipated call count at/above which batching is worth considering. */
  threshold: number;
  /** x402 channel deposit = call price × this multiplier. */
  depositMultiplier: number;
  /** MPP session channel max deposit, in human token units (e.g. '1'). */
  mppMaxDeposit: string;
  /** MPP session channel deposit = call price × this multiplier (capped by mppMaxDeposit). */
  mppDepositMultiplier: number;
  /** Payment rail+mode the session starts in. */
  mode: PaymentMode;
}

export const DEFAULT_BATCH_PREFS: BatchPrefs = {
  prompt: 'ask',
  threshold: 5,
  depositMultiplier: 10,
  mppMaxDeposit: '1',
  mppDepositMultiplier: 10,
  mode: 'x402-exact',
};

/** Lowest deposit multiplier the batch-settlement SDK accepts. */
export const MIN_DEPOSIT_MULTIPLIER = 3;

function configDir(): string {
  const override = process.env.ONESOURCE_CONFIG_DIR?.trim();
  return override && override.length > 0 ? override : join(homedir(), '.onesource');
}

function configFile(): string {
  return join(configDir(), 'batch-config.json');
}

// --- field coercers: return undefined when the raw value is absent/invalid ---

export function coercePrompt(v: unknown): BatchPromptPref | undefined {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
  return s === 'ask' || s === 'auto' || s === 'off' ? s : undefined;
}

export function coerceThreshold(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export function coerceMultiplier(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n >= MIN_DEPOSIT_MULTIPLIER ? n : undefined;
}

export function coerceMode(v: unknown): PaymentMode | undefined {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
  // Legacy values from older persisted configs / env.
  if (s === 'exact') return 'x402-exact';
  if (s === 'batch') return 'x402-batch';
  return (ALL_MODES as readonly string[]).includes(s) ? (s as PaymentMode) : undefined;
}

export function coerceMaxDeposit(v: unknown): string | undefined {
  const s = typeof v === 'number' ? String(v) : typeof v === 'string' ? v.trim() : '';
  const n = Number(s);
  return s.length > 0 && Number.isFinite(n) && n > 0 ? s : undefined;
}

// Snapshot the launch-time env vars ONCE at module load. We mirror resolved
// values back into process.env (so api-mcp's x402 layer honours them), which
// would otherwise corrupt the env baseline — a later reset() would read our own
// mirror instead of the original env. Reading the snapshot keeps env precedence
// stable across set/reset cycles.
const ENV_SNAPSHOT = {
  prompt: process.env.X402_BATCH_PROMPT,
  threshold: process.env.X402_BATCH_THRESHOLD,
  depositMultiplier: process.env.X402_DEPOSIT_MULTIPLIER,
  mppMaxDeposit: process.env.MPP_MAX_DEPOSIT,
  mppDepositMultiplier: process.env.MPP_DEPOSIT_MULTIPLIER,
  // Prefer the unified mode; fall back to the legacy x402 sub-mode env.
  mode: process.env.ONESOURCE_PAYMENT_MODE ?? process.env.X402_PAYMENT_MODE,
};

let _cache: BatchPrefs | undefined;

/** Read + validate the persisted file, ignoring any invalid/missing fields. */
function readPersisted(): Partial<BatchPrefs> {
  try {
    const data = JSON.parse(readFileSync(configFile(), 'utf8')) as Record<string, unknown>;
    const out: Partial<BatchPrefs> = {};
    const prompt = coercePrompt(data.prompt);
    if (prompt) out.prompt = prompt;
    const threshold = coerceThreshold(data.threshold);
    if (threshold) out.threshold = threshold;
    const depositMultiplier = coerceMultiplier(data.depositMultiplier);
    if (depositMultiplier) out.depositMultiplier = depositMultiplier;
    const mppMaxDeposit = coerceMaxDeposit(data.mppMaxDeposit);
    if (mppMaxDeposit) out.mppMaxDeposit = mppMaxDeposit;
    const mppDepositMultiplier = coerceMultiplier(data.mppDepositMultiplier);
    if (mppDepositMultiplier) out.mppDepositMultiplier = mppDepositMultiplier;
    const mode = coerceMode(data.mode);
    if (mode) out.mode = mode;
    return out;
  } catch {
    // No file, unreadable, or malformed JSON — fall back to env/defaults.
    return {};
  }
}

function fromEnv(): Partial<BatchPrefs> {
  const out: Partial<BatchPrefs> = {};
  const prompt = coercePrompt(ENV_SNAPSHOT.prompt);
  if (prompt) out.prompt = prompt;
  const threshold = coerceThreshold(ENV_SNAPSHOT.threshold);
  if (threshold) out.threshold = threshold;
  const depositMultiplier = coerceMultiplier(ENV_SNAPSHOT.depositMultiplier);
  if (depositMultiplier) out.depositMultiplier = depositMultiplier;
  const mppMaxDeposit = coerceMaxDeposit(ENV_SNAPSHOT.mppMaxDeposit);
  if (mppMaxDeposit) out.mppMaxDeposit = mppMaxDeposit;
  const mppDepositMultiplier = coerceMultiplier(ENV_SNAPSHOT.mppDepositMultiplier);
  if (mppDepositMultiplier) out.mppDepositMultiplier = mppDepositMultiplier;
  const mode = coerceMode(ENV_SNAPSHOT.mode);
  if (mode) out.mode = mode;
  return out;
}

/**
 * Mirror api-mcp-consumed values into process.env so its payment layer honours
 * them. setupPayments resolves the initial mode from ONESOURCE_PAYMENT_MODE; the
 * per-rail sub-mode + rail params are read by x402.ts / mpp.ts respectively.
 */
function mirrorToEnv(prefs: BatchPrefs): void {
  process.env.ONESOURCE_PAYMENT_MODE = prefs.mode;
  if (prefs.mode.startsWith('x402-')) {
    process.env.X402_PAYMENT_MODE = prefs.mode.slice('x402-'.length); // exact | batch
  } else if (prefs.mode.startsWith('mpp-')) {
    process.env.MPP_PAYMENT_MODE = prefs.mode.slice('mpp-'.length); // charge | session
  }
  process.env.X402_DEPOSIT_MULTIPLIER = String(prefs.depositMultiplier);
  process.env.MPP_MAX_DEPOSIT = prefs.mppMaxDeposit;
  process.env.MPP_DEPOSIT_MULTIPLIER = String(prefs.mppDepositMultiplier);
}

function resolve(): BatchPrefs {
  return {
    ...DEFAULT_BATCH_PREFS,
    ...fromEnv(), // env over default
    ...readPersisted(), // file over env
  };
}

/**
 * Resolve preferences (file > env > default), cache them, and mirror the
 * api-mcp-consumed values into process.env. Call once at startup BEFORE
 * setupX402() so the deposit multiplier and initial mode are in place before
 * the batch channel is built.
 */
export function loadBatchPrefs(): BatchPrefs {
  _cache = resolve();
  mirrorToEnv(_cache);
  return _cache;
}

/** Current preferences (lazily resolved on first access). */
export function getBatchPrefs(): BatchPrefs {
  if (!_cache) loadBatchPrefs();
  return _cache!;
}

export interface SetBatchResult {
  prefs: BatchPrefs;
  /** True when the change was written to the config file. */
  persisted: boolean;
  /** Set when persistence failed — the in-memory update still took effect. */
  persistError?: string;
}

/**
 * Merge a (pre-validated) patch into the current preferences, persist to the
 * config file, and mirror to process.env. Caller is responsible for validating
 * raw user input (use the coerce* helpers) and for applying any mode change to
 * the live payment scheme via setPaymentMode().
 */
export function setBatchPrefs(patch: Partial<BatchPrefs>): SetBatchResult {
  const next: BatchPrefs = { ...getBatchPrefs(), ...patch };

  let persisted = false;
  let persistError: string | undefined;
  try {
    mkdirSync(configDir(), { recursive: true });
    writeFileSync(configFile(), JSON.stringify(next, null, 2) + '\n', 'utf8');
    persisted = true;
  } catch (err) {
    persistError = err instanceof Error ? err.message : String(err);
  }

  _cache = next;
  mirrorToEnv(next);
  return { prefs: next, persisted, persistError };
}

/** Clear persisted overrides — delete the file and re-resolve from env/defaults. */
export function resetBatchPrefs(): SetBatchResult {
  let persistError: string | undefined;
  try {
    rmSync(configFile(), { force: true });
  } catch (err) {
    persistError = err instanceof Error ? err.message : String(err);
  }
  return { prefs: loadBatchPrefs(), persisted: persistError === undefined, persistError };
}

/** Absolute path to the config file (for display in setup output). */
export function batchConfigPath(): string {
  return configFile();
}

/** Whether a persisted config file currently exists. */
export function hasPersistedConfig(): boolean {
  try {
    return existsSync(configFile());
  } catch {
    return false;
  }
}
