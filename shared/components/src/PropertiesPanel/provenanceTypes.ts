/**
 * Provenance entry shape + archive constants shared between webview and
 * extension-side stacService. Type sourced from LinkML
 * (shared/schemas/src/linkml/stac-extension.yaml lines 63–110); literal-string
 * narrowing on tool/method/source reinstated here via a hybrid intersection
 * because LinkML's `gen-typescript` cannot translate `pattern` constraints
 * into TS literal types. See spec 240 / research R2 for the full rationale.
 */

import type { PropertiesProvenanceEntry as Generated } from '@debrief/schemas';

export const PROPERTIES_PANEL_TOOL_SENTINEL = 'debrief.propertiesPanel' as const;

/**
 * Per-commit provenance entry for the Properties Panel.
 *
 * Inherits `activity_id`, `timestamp`, `fields` from the LinkML-generated type;
 * narrows `tool`, `method`, `source` to the literal forms that today's
 * production write sites (stacService.ts, stacWriterIdb.ts) rely on for
 * compile-time typo detection.
 */
export type PropertiesProvenanceEntry =
  Omit<Generated, 'tool' | 'method' | 'source'> &
  {
    /** Sentinel identifying the Properties Panel as the writer. */
    tool: typeof PROPERTIES_PANEL_TOOL_SENTINEL;
    /** Versioned method identifier, e.g. `properties-panel@1.0.0`. */
    method: `properties-panel@${string}`;
    /** Always 'user' for Properties Panel entries. */
    source: 'user';
  };

/**
 * Runtime predicate used by integration tests to verify a written entry
 * satisfies the contract.
 */
export function isValidPropertiesProvenanceEntry(
  entry: unknown,
): entry is PropertiesProvenanceEntry {
  if (typeof entry !== 'object' || entry === null) return false;
  const e = entry as Record<string, unknown>;
  return (
    typeof e.activity_id === 'string' &&
    e.activity_id.length > 0 &&
    typeof e.timestamp === 'string' &&
    e.tool === PROPERTIES_PANEL_TOOL_SENTINEL &&
    typeof e.method === 'string' &&
    (e.method as string).startsWith('properties-panel@') &&
    Array.isArray(e.fields) &&
    (e.fields as unknown[]).length >= 1 &&
    (e.fields as unknown[]).every((v) => typeof v === 'string') &&
    e.source === 'user'
  );
}

/** Max entries retained on `item.properties["debrief:provenance_log"]`. */
export const PROVENANCE_LOG_CAP = 500 as const;

/** Sibling JSONL archive for rotated entries. */
export const PROVENANCE_LOG_ARCHIVE_FILENAME = 'provenance_log_archive.jsonl' as const;
