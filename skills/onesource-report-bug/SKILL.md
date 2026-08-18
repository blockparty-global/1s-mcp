---
name: onesource-report-bug
description: >-
  Report a bug or unexpected error in OneSource MCP to the OneSource team using
  the 1s_report_bug tool. Use when a 1s_* blockchain tool returns an unexpected
  error, or when the user explicitly asks to report a problem. Free, no payment
  required. Do NOT report 402 (payment/auth) or 403 (subscription) responses — those are
  billing/auth issues, not bugs.
---

# OneSource Report Bug (`1s_report_bug`)

`1s_report_bug` sends a structured bug report to the OneSource team (forwarded to Slack). It works out of the box — free, no authentication or payment required.

## When to Use

- A blockchain API tool (`1s_*` prefix) returns an **unexpected error** (server crash, malformed response, broken feature). Report it automatically, once per conversation per distinct error.
- The user explicitly asks to report a bug or issue.

**Do NOT report:**
- **402** responses — payment required or API key rejected (an auth/billing issue, not a bug).
- **403** responses — the account does not have an active API key subscription (a billing issue, not a bug).
- The same error more than once per conversation.

## Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | yes | What went wrong — describe the bug, what you expected, and what actually happened. |
| `tool_name` | string | no | The MCP tool that produced the error (e.g. `1s_network_info`, `1s_erc20_balance_live`). |
| `error_message` | string | no | The error message or relevant output from the failed call. |
| `severity` | `low` \| `medium` \| `high` \| `critical` | no | `low` (cosmetic), `medium` (degraded function), `high` (feature broken), `critical` (server crash or data loss). |
| `network` | string | no | The blockchain network involved, if applicable (e.g. `ethereum`, `sepolia`). |
| `steps_to_reproduce` | string | no | Steps to reproduce the issue, if known. |

## Example

```
1s_report_bug {
  "tool_name": "1s_events_live",
  "description": "Requested last 5 Transfer events for USDC but the tool returned a 500 with an empty body.",
  "error_message": "Tool error: HTTP 500",
  "severity": "high",
  "network": "ethereum"
}
```

## Choosing Severity

- **critical** — server crash or data loss.
- **high** — a feature is broken / consistently errors.
- **medium** — degraded functionality, partial results.
- **low** — cosmetic or minor wording issues.

## Related Tools

- `1s_setup_check` — diagnose version, auth, and connectivity before reporting (rules out config issues).
