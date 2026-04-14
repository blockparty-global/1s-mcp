/**
 * Unified analytics wrapper.
 *
 * Uses api-mcp's analytics implementation (superset — includes trackHttp which
 * docs-mcp lacks) and widens ToolCallEvent.category to include 'docs'.
 * The underlying implementations (Noop/Stderr/Dashboard) serialize events to
 * JSON, so the wider category type is safe at runtime.
 */
import { type Analytics as _Analytics, type ToolCallEvent as _ToolCallEvent, type HttpCallEvent as _HttpCallEvent, type ServiceEvent as _ServiceEvent } from '@one-source/api-mcp/analytics';
/** ToolCallEvent with category widened to include docs tools. */
export type ToolCallEvent = Omit<_ToolCallEvent, 'category'> & {
    category: _ToolCallEvent['category'] | 'docs' | 'ops';
    source?: string;
};
export type HttpCallEvent = _HttpCallEvent & {
    source?: string;
};
export type ServiceEvent = _ServiceEvent & {
    source?: string;
};
/** Analytics interface with widened event types that include `source`. */
export interface Analytics extends Omit<_Analytics, 'trackTool' | 'trackHttp' | 'trackService'> {
    trackTool(event: ToolCallEvent): void;
    trackHttp(event: HttpCallEvent): void;
    trackService(event: ServiceEvent): void;
}
/** Create an analytics instance (Noop, Stderr, or Dashboard based on env vars). */
export declare function createAnalytics(): Analytics;
//# sourceMappingURL=analytics.d.ts.map