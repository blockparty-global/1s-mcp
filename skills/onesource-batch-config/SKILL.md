---
name: onesource-batch-config
description: >-
  Configure OneSource MCP x402 batch-settlement preferences from the session
  using the 1s_batch_config tool — autonomy (ask/auto/off), the "many calls"
  threshold, the channel deposit multiplier, and the default payment mode.
  Settings persist across restarts with no config-file editing. Use when the
  user wants to change how/when batch mode kicks in, set a default payment mode,
  or review current batch settings.
---

# OneSource Batch Config (`1s_batch_config`)

`1s_batch_config` lets you view and change the x402 batch-settlement preferences for OneSource MCP **from within the session**. Changes are saved to a server-managed file (`~/.onesource/batch-config.json`, override with `ONESOURCE_CONFIG_DIR`) and persist across restarts — the user never has to edit the MCP client config or set environment variables by hand.

This only matters when paying via **x402** (`X402_PRIVATE_KEY` set). With an API key, blockchain calls are covered by the plan and there is nothing to batch.

## When to Use

- The user asks how/when the agent should switch to batch mode, or wants to change that behavior.
- The user wants a default payment mode (`exact` or `batch`) that sticks across restarts.
- The user wants to tune the channel deposit size (deposit multiplier).
- You want to show the current batch settings.
- `1s_setup_check` prompts you to confirm the user's batch preference — apply the answer here.

## Parameters

All are optional. Call with **no arguments** to view current settings.

| Param | Type | Description |
|-------|------|-------------|
| `prompt` | `ask` \| `auto` \| `off` | Agent autonomy when deciding to switch to batch: `ask` (confirm first — default), `auto` (switch on its own), `off` (only on explicit request). |
| `threshold` | integer > 0 | Anticipated call count at/above which batch mode is worth considering. Default `5`. |
| `deposit_multiplier` | number ≥ 3 | Channel deposit = call price × this multiplier. Default `10`. Applies to the **next** channel opened. |
| `mode` | `exact` \| `batch` | Default payment scheme the session starts in. Also switches the live scheme immediately when x402 is active. |
| `reset` | boolean | Restore all settings to defaults (deletes the saved config file). |

## Examples

View current settings:
```
1s_batch_config
```

Make the agent switch automatically once it expects 8+ calls:
```
1s_batch_config { "prompt": "auto", "threshold": 8 }
```

Default to batch mode and switch now:
```
1s_batch_config { "mode": "batch" }
```

Larger deposits (fund more calls per channel):
```
1s_batch_config { "deposit_multiplier": 20 }
```

Reset to defaults:
```
1s_batch_config { "reset": true }
```

## Notes

- `prompt`, `threshold`, and `mode` take effect **immediately** for the rest of the session; `deposit_multiplier` applies to the next payment channel that opens.
- A saved config takes priority over the matching install-time env vars (`X402_BATCH_PROMPT`, `X402_BATCH_THRESHOLD`, `X402_PAYMENT_MODE`, `X402_DEPOSIT_MULTIPLIER`).
- To switch the scheme for the current session only (without changing the saved default), use `1s_payment_mode` instead.
- After a batch burst, reclaim any unspent channel deposit with `1s_refund`.

## Related Tools

- `1s_payment_mode` — switch the live payment scheme (`exact`/`batch`) for this session only.
- `1s_refund` — reclaim unused batch-channel deposit back to your wallet.
- `1s_setup_check` — shows current batch settings and prompts for the user's preference.
