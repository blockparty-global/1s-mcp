/**
 * Unified analytics wrapper.
 *
 * Uses api-mcp's analytics implementation (superset — includes trackHttp which
 * docs-mcp lacks) and widens ToolCallEvent.category to include 'docs'.
 * The underlying implementations (Noop/Stderr/Dashboard) serialize events to
 * JSON, so the wider category type is safe at runtime.
 */
import { createAnalytics as _createAnalytics, } from '@one-source/api-mcp/analytics';
/** Create an analytics instance (Noop, Stderr, or Dashboard based on env vars). */
export function createAnalytics() {
    return _createAnalytics();
}
//# sourceMappingURL=analytics.js.map