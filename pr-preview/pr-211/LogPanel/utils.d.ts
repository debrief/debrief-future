import { TimelineEntry, OperationCategory, FilterState, FeatureDisplayInfo } from './types';

/**
 * Classify a tool into an operation category.
 */
export declare function classifyOperation(toolId: string): OperationCategory;
/**
 * Apply filters to timeline entries.
 * Filters combine with AND logic.
 */
export declare function filterEntries(entries: TimelineEntry[], filterState: FilterState, featureNames: Record<string, string>): TimelineEntry[];
/**
 * Extract unique tool names from timeline entries for the filter dropdown.
 */
export declare function getAvailableToolTypes(entries: TimelineEntry[]): string[];
/**
 * Resolve feature display info, marking missing features as "(deleted)".
 */
export declare function resolveFeatureDisplay(featureId: string, featureNames: Record<string, string>): FeatureDisplayInfo;
/**
 * Get all affected feature IDs for an entry (used + generated, deduplicated).
 */
export declare function getAffectedFeatureIds(entry: TimelineEntry): string[];
/**
 * Get only existing feature IDs (for map selection — skip deleted features).
 */
export declare function getSelectableFeatureIds(entry: TimelineEntry, featureNames: Record<string, string>): string[];
/**
 * Group entries by feature for the By-Feature view.
 * Multi-feature entries appear in multiple groups.
 * Returns groups sorted by feature name, entries within each group sorted most-recent-first.
 */
export declare function groupEntriesByFeature(entries: TimelineEntry[], featureNames: Record<string, string>): Array<{
    featureId: string;
    displayName: string;
    entries: TimelineEntry[];
}>;
/**
 * Format an ISO 8601 duration to a human-readable string.
 * e.g., "PT0.5S" → "0.5s", "PT1M2S" → "1m 2s"
 */
export declare function formatDuration(isoDuration: string): string;
/**
 * Format an ISO 8601 timestamp to a short display string.
 */
export declare function formatTimestamp(isoTimestamp: string): string;
//# sourceMappingURL=utils.d.ts.map