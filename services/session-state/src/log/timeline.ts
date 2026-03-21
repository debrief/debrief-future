/**
 * Timeline assembly from per-feature provenance arrays.
 * Feature: 071-log-recording-service
 *
 * Pure function — collects, deduplicates, sorts.
 */

import type { LogEntry, ParameterValue, WasGeneratedBy } from './types.js';

/**
 * Normalise a provenance value to an array.
 * Handles: undefined, null, single object, array.
 */
function normaliseProvenance(raw: unknown): unknown[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') return [raw];
  return [];
}

/**
 * Normalise a single provenance entry from snake_case (Python-generated)
 * to camelCase (TypeScript LogEntry format).
 *
 * Python importers (debrief-io) write provenance with snake_case keys:
 *   activity_id, was_generated_by, execution_duration, tool_version
 * TypeScript consumers expect camelCase:
 *   activityId, wasGeneratedBy, executionDuration, toolVersion
 *
 * Entries already in camelCase are passed through unchanged.
 */
export function normaliseEntry(raw: Record<string, unknown>): Record<string, unknown> {
  // Already camelCase — pass through
  if (raw.activityId !== undefined) return raw;

  // Snake_case entry from Python — convert
  if (raw.activity_id === undefined) return raw;

  const wgb = raw.was_generated_by as Record<string, unknown> | undefined;
  const wasGeneratedBy: WasGeneratedBy | undefined = wgb
    ? {
        tool: (wgb.tool as string) ?? 'unknown',
        toolVersion: (wgb.tool_version as string) ?? (wgb.toolVersion as string) ?? '',
        parameters: (wgb.parameters as Record<string, ParameterValue>) ?? {},
      }
    : undefined;

  return {
    activityId: raw.activity_id,
    timestamp: raw.timestamp,
    ...(wasGeneratedBy ? { wasGeneratedBy } : {}),
    used: raw.used ?? [],
    generated: raw.generated ?? [],
    executionDuration: raw.execution_duration ?? raw.executionDuration ?? 'PT0S',
    generatedResultId: raw.generated_result_id ?? raw.generatedResultId ?? null,
    tune: raw.tune ?? null,
    deleted: raw.deleted,
    disabled: raw.disabled,
    rationale: raw.rationale,
    inputState: raw.input_state ?? raw.inputState ?? null,
  };
}

/**
 * Assemble a global timeline from a GeoJSON FeatureCollection.
 *
 * 1. Iterates all features
 * 2. Collects properties.provenance entries
 * 3. Deduplicates on activityId (first occurrence wins)
 * 4. Sorts by timestamp ascending
 *
 * @param featureCollection - A GeoJSON FeatureCollection (parsed from disk)
 * @param options - Optional previous entries for cross-snapshot assembly
 * @returns Sorted, deduplicated LogEntry array
 */
export function assembleTimeline(
  featureCollection: { features: Array<Record<string, unknown>> },
  options?: { previousEntries?: LogEntry[]; includeDeleted?: boolean }
): LogEntry[] {
  const seen = new Map<string, LogEntry>();
  const includeDeleted = options?.includeDeleted ?? false;

  // Merge previous snapshot entries first (cross-snapshot assembly)
  if (options?.previousEntries) {
    for (const entry of options.previousEntries) {
      if (entry.activityId && !seen.has(entry.activityId)) {
        if (includeDeleted || !(entry as LogEntry).deleted) {
          seen.set(entry.activityId, entry);
        }
      }
    }
  }

  for (const feature of featureCollection.features) {
    const props = feature.properties as Record<string, unknown> | null;
    if (!props) continue;

    const entries = normaliseProvenance(props.provenance);
    for (const raw of entries) {
      const entry = normaliseEntry(raw as Record<string, unknown>);
      const activityId = entry.activityId;
      if (typeof activityId !== 'string' || activityId.length === 0) continue;

      // Skip deleted entries unless includeDeleted is true
      if (!includeDeleted && (entry as Record<string, unknown>).deleted === true) {
        continue;
      }

      // First occurrence wins (dedup)
      if (!seen.has(activityId)) {
        seen.set(activityId, entry as unknown as LogEntry);
      }
    }
  }

  // Sort by timestamp ascending
  const timeline = Array.from(seen.values());
  timeline.sort((a, b) => {
    if (a.timestamp < b.timestamp) return -1;
    if (a.timestamp > b.timestamp) return 1;
    return 0;
  });

  return timeline;
}
