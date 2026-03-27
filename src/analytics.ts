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
  type HttpCallEvent,
  type ServiceEvent,
} from '@one-source/api-mcp/analytics';

/** ToolCallEvent with category widened to include docs tools. */
export type ToolCallEvent = Omit<_ToolCallEvent, 'category'> & {
  category: _ToolCallEvent['category'] | 'docs';
};

/** Analytics interface with trackTool accepting the widened ToolCallEvent. */
export interface Analytics extends Omit<_Analytics, 'trackTool'> {
  trackTool(event: ToolCallEvent): void;
}

/** Create an analytics instance (Noop, Stderr, or Dashboard based on env vars). */
export function createAnalytics(): Analytics {
  return _createAnalytics() as Analytics;
}

export type { HttpCallEvent, ServiceEvent };
