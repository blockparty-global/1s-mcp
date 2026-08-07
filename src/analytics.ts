/**
 * Unified analytics wrapper.
 *
 * Uses api-mcp's analytics implementation (superset — includes trackHttp which
 * docs-mcp lacks) and widens ToolCallEvent.category to include 'docs'.
 * The underlying implementations (Noop/Stderr/Dashboard) serialize events to
 * JSON, so the wider category type is safe at runtime.
 */

import {
  createAnalytics as _createAnalytics,
  type Analytics as _Analytics,
  type ToolCallEvent as _ToolCallEvent,
  type HttpCallEvent as _HttpCallEvent,
  type ServiceEvent as _ServiceEvent,
} from '@one-source/api-mcp/analytics';

// Re-exported through this wrapper so callers keep one import seam onto
// api-mcp's analytics. `error_category` is a bounded union, not free text —
// derive it from a thrown error's message with this rather than passing the
// message through, which the dashboard cannot group on.
export {
  errorCategoryFromMessage,
  errorCategoryFromStatus,
  type ErrorCategory,
} from '@one-source/api-mcp/analytics';

/** ToolCallEvent with category and auth_method widened to include unified MCP additions. */
export type ToolCallEvent = Omit<_ToolCallEvent, 'category' | 'auth_method'> & {
  category: _ToolCallEvent['category'] | 'docs' | 'ops';
  auth_method: _ToolCallEvent['auth_method'] | 'api_key' | 'mpp';
  wallet_id?: string;
  source?: string;
};

export type HttpCallEvent = _HttpCallEvent & { source?: string };
export type ServiceEvent = _ServiceEvent & { source?: string };

/** Analytics interface with widened event types that include `source`. */
export interface Analytics extends Omit<_Analytics, 'trackTool' | 'trackHttp' | 'trackService'> {
  trackTool(event: ToolCallEvent): void;
  trackHttp(event: HttpCallEvent): void;
  trackService(event: ServiceEvent): void;
}

/** Create an analytics instance (Noop, Stderr, or Dashboard based on env vars). */
export function createAnalytics(): Analytics {
  // Default to dashboard analytics — users can override with env vars or disable with ONESOURCE_ANALYTICS=false
  process.env.ONESOURCE_ANALYTICS_URL ??= 'https://1s-analytics.vercel.app';
  // Standardized on ONESOURCE_ANALYTICS_KEY to match the Go skills-api
  // collector. The bundled @one-source/api-mcp factory still reads the legacy
  // X402_ANALYTICS_KEY, so resolve the effective key here — ONESOURCE_ANALYTICS_KEY
  // wins, legacy X402_ANALYTICS_KEY is the fallback, then the baked-in default —
  // and feed it to the name that factory reads. Becomes a plain alias once
  // api-mcp ships the renamed lookup.
  process.env.X402_ANALYTICS_KEY =
    process.env.ONESOURCE_ANALYTICS_KEY ?? process.env.X402_ANALYTICS_KEY ?? 'onesource-mcp';
  return _createAnalytics() as Analytics;
}
