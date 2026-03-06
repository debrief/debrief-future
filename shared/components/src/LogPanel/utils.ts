/**
 * Utility functions for the LogPanel component.
 *
 * Feature: 072-log-panel
 */

import type {
  TimelineEntry,
  OperationCategory,
  FilterState,
  FeatureDisplayInfo,
} from './types';

/**
 * Static mapping of tool IDs to operation categories.
 * Default is 'calculation' for any unrecognized tool.
 */
const TOOL_CATEGORY_MAP: Record<string, OperationCategory> = {
  // Import tools
  'import-rep': 'import',
  'import-csv': 'import',
  'load-rep': 'import',
  // Export tools
  'export-png': 'export',
  'export-csv': 'export',
  'export-geojson': 'export',
  // Property edit tools
  'change-color': 'property-edit',
  'change-track-color': 'property-edit',
  'set-display-mode': 'property-edit',
  'delete-features': 'property-edit',
};

/**
 * Classify a tool into an operation category.
 */
export function classifyOperation(toolId: string): OperationCategory {
  return TOOL_CATEGORY_MAP[toolId] ?? 'calculation';
}

/**
 * Apply filters to timeline entries.
 * Filters combine with AND logic.
 */
export function filterEntries(
  entries: TimelineEntry[],
  filterState: FilterState,
  featureNames: Record<string, string>
): TimelineEntry[] {
  let result = entries;

  // Text search — matches tool name, feature names, parameter values
  if (filterState.searchText.trim()) {
    const query = filterState.searchText.trim().toLowerCase();
    result = result.filter((entry) => {
      // Match tool name
      if (entry.toolName.toLowerCase().includes(query)) return true;

      // Match feature names (used + generated)
      const allFeatureIds = [...entry.usedFeatureIds, ...entry.generatedFeatureIds];
      for (const fid of allFeatureIds) {
        const name = featureNames[fid];
        if (name && name.toLowerCase().includes(query)) return true;
      }

      // Match parameter values
      for (const [key, param] of Object.entries(entry.parameters)) {
        if (key.toLowerCase().includes(query)) return true;
        const valStr = String(param.value).toLowerCase();
        if (valStr.includes(query)) return true;
      }

      return false;
    });
  }

  // Tool type filter
  if (filterState.toolType) {
    result = result.filter((entry) => entry.toolName === filterState.toolType);
  }

  // Operation category filter
  if (filterState.operationCategory) {
    result = result.filter(
      (entry) => entry.operationCategory === filterState.operationCategory
    );
  }

  return result;
}

/**
 * Extract unique tool names from timeline entries for the filter dropdown.
 */
export function getAvailableToolTypes(entries: TimelineEntry[]): string[] {
  const names = new Set<string>();
  for (const entry of entries) {
    names.add(entry.toolName);
  }
  return Array.from(names).sort();
}

/**
 * Resolve feature display info, marking missing features as "(deleted)".
 */
export function resolveFeatureDisplay(
  featureId: string,
  featureNames: Record<string, string>
): FeatureDisplayInfo {
  const name = featureNames[featureId];
  if (name) {
    return { featureId, displayName: name, exists: true };
  }
  return { featureId, displayName: '(deleted)', exists: false };
}

/**
 * Get all affected feature IDs for an entry (used + generated, deduplicated).
 */
export function getAffectedFeatureIds(entry: TimelineEntry): string[] {
  const ids = new Set<string>([...entry.usedFeatureIds, ...entry.generatedFeatureIds]);
  return Array.from(ids);
}

/**
 * Get only existing feature IDs (for map selection — skip deleted features).
 */
export function getSelectableFeatureIds(
  entry: TimelineEntry,
  featureNames: Record<string, string>
): string[] {
  return getAffectedFeatureIds(entry).filter((id) => featureNames[id] !== undefined);
}

/**
 * Group entries by feature for the By-Feature view.
 * Multi-feature entries appear in multiple groups.
 * Returns groups sorted by feature name, entries within each group sorted most-recent-first.
 */
export function groupEntriesByFeature(
  entries: TimelineEntry[],
  featureNames: Record<string, string>
): Array<{ featureId: string; displayName: string; entries: TimelineEntry[] }> {
  const groups = new Map<string, TimelineEntry[]>();

  for (const entry of entries) {
    const affectedIds = getAffectedFeatureIds(entry);
    for (const fid of affectedIds) {
      if (!groups.has(fid)) {
        groups.set(fid, []);
      }
      groups.get(fid)!.push(entry);
    }
  }

  // Build result array, sorted by feature display name
  const result: Array<{ featureId: string; displayName: string; entries: TimelineEntry[] }> = [];
  for (const [featureId, featureEntries] of groups) {
    const info = resolveFeatureDisplay(featureId, featureNames);
    result.push({
      featureId,
      displayName: info.displayName,
      entries: featureEntries,
    });
  }

  result.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return result;
}

/**
 * Format an ISO 8601 duration to a human-readable string.
 * e.g., "PT0.5S" → "0.5s", "PT1M2S" → "1m 2s"
 */
export function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
  if (!match) return isoDuration;

  const parts: string[] = [];
  if (match[1]) parts.push(`${match[1]}h`);
  if (match[2]) parts.push(`${match[2]}m`);
  if (match[3]) parts.push(`${match[3]}s`);

  return parts.length > 0 ? parts.join(' ') : '< 1s';
}

/**
 * Format an ISO 8601 timestamp to a short display string.
 */
export function formatTimestamp(isoTimestamp: string): string {
  try {
    const date = new Date(isoTimestamp);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoTimestamp;
  }
}

/**
 * Calculate the cascade of entries that should be auto-disabled
 * when a given entry is disabled.
 *
 * Uses a visited guard (F1) to prevent infinite loops in circular
 * dependency graphs.
 *
 * Feature: 113-prov-card-flip
 */
export function cascadeDisable(
  entryId: string,
  timeline: TimelineEntry[]
): string[] {
  const visited = new Set<string>();
  const disabled: string[] = [];
  const queue = [entryId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const entry = timeline.find((e) => e.activityId === currentId);
    if (!entry) continue;

    const generatedFeatures = new Set(entry.generatedFeatureIds);

    // Only check entries that come after the current entry in the timeline
    const entryIndex = timeline.indexOf(entry);
    for (let i = entryIndex + 1; i < timeline.length; i++) {
      const subsequent = timeline[i];
      if (!subsequent || visited.has(subsequent.activityId)) continue;
      const dependsOnDisabled = subsequent.usedFeatureIds.some((f) =>
        generatedFeatures.has(f)
      );
      if (dependsOnDisabled) {
        disabled.push(subsequent.activityId);
        queue.push(subsequent.activityId);
      }
    }
  }

  return disabled;
}
