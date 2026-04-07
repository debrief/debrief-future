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
 * Normalise a single provenance entry to snake_case (ADR-010 wire format).
 *
 * New entries from Python and TypeScript both use snake_case.
 * Legacy entries written before ADR-010 may use camelCase — convert them.
 * Entries already in snake_case are passed through unchanged.
 */
/* eslint-disable no-restricted-syntax -- intentionally reads legacy camelCase keys to convert them */
export function normaliseEntry(raw: Record<string, unknown>): Record<string, unknown> {
  // Already snake_case — pass through
  if (raw.activity_id !== undefined) return raw;

  // Legacy camelCase entry — convert to snake_case
  if (raw.activityId === undefined) return raw;

  const wgb = raw.wasGeneratedBy as Record<string, unknown> | undefined;
  const was_generated_by: WasGeneratedBy | undefined = wgb
    ? {
        tool: (wgb.tool as string) ?? 'unknown',
        tool_version: (wgb.tool_version as string) ?? (wgb.toolVersion as string) ?? '',
        parameters: (wgb.parameters as Record<string, ParameterValue>) ?? {},
      }
    : undefined;

  return {
    activity_id: raw.activityId,
    timestamp: raw.timestamp,
    ...(was_generated_by ? { was_generated_by } : {}),
    used: raw.used ?? [],
    generated: raw.generated ?? [],
    execution_duration: raw.executionDuration ?? raw.execution_duration ?? 'PT0S',
    generated_result_id: raw.generatedResultId ?? raw.generated_result_id ?? null,
    tune: raw.tune ?? null,
    deleted: raw.deleted,
    disabled: raw.disabled,
    rationale: raw.rationale,
    input_state: raw.inputState ?? raw.input_state ?? null,
  };
}
/* eslint-enable no-restricted-syntax */

/**
 * Assemble a global timeline from a GeoJSON FeatureCollection.
 *
 * 1. Iterates all features
 * 2. Collects properties.provenance entries
 * 3. Deduplicates on activity_id (first occurrence wins)
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
      if (entry.activity_id && !seen.has(entry.activity_id)) {
        if (includeDeleted || !(entry as LogEntry).deleted) {
          seen.set(entry.activity_id, entry);
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
      const activity_id = entry.activity_id;
      if (typeof activity_id !== 'string' || activity_id.length === 0) continue;

      // Skip deleted entries unless includeDeleted is true
      if (!includeDeleted && (entry as Record<string, unknown>).deleted === true) {
        continue;
      }

      // Dedup by activity_id — merge generated[] across features that
      // share the same activity (e.g. multi-track import from one file).
      const existing = seen.get(activity_id);
      if (existing) {
        // Merge generated IDs that aren't already listed
        const gen = (entry as Record<string, unknown>).generated;
        if (Array.isArray(gen)) {
          const existingSet = new Set(existing.generated);
          for (const id of gen) {
            if (typeof id === 'string' && !existingSet.has(id)) {
              existing.generated.push(id);
            }
          }
        }
      } else {
        seen.set(activity_id, entry as unknown as LogEntry);
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
