/**
 * Contract: extension to apps/vscode/src/services/stacService.ts introducing
 * item-level metadata write support and making updateTemporalMetadata
 * override-aware.
 *
 * This contract MUST be implemented as methods on the existing StacService
 * class — not as free functions — so the single write-gatekeeper invariant
 * (Article IV.2) holds.
 *
 * Decision references:
 *   - Decision 2:  direct-write (no session-state staging)
 *   - Decision 7:  provenance into item.properties["debrief:provenance_log"]
 *   - Decision 8:  updateTemporalMetadata respects debrief:overrides
 *   - Decision 9:  atomic temp+rename write; mtime-based stale-edit detection
 *   - Decision 12: bounded provenance log with archive rotation
 */

import type { PropertiesProvenanceEntry } from './provenance-entry';

export type FieldKey = string;
export type FieldValue = unknown;

// ============================================================================
// New method: updateItemMetadata
// ============================================================================

export interface UpdateItemMetadataInput {
  /** Absolute path to the STAC store root. */
  storePath: string;

  /** Relative path (from storePath) to the item.json being edited. */
  itemPath: string;

  /**
   * Flat patch — keys are field names on item.properties, values replace the
   * existing value (no deep-merge: callers supply the full intended value for
   * arrays/objects). Empty patch MUST be rejected with an error.
   */
  patch: Record<FieldKey, FieldValue>;

  /**
   * Fields to add to item.properties["debrief:overrides"] as a side effect.
   * Deduplicated before write. Typically === Object.keys(patch) but callers
   * MAY pass a subset (e.g. if a field is not in the auto-derived set, no
   * override is needed — though adding it redundantly is safe).
   */
  overrideFields: FieldKey[];

  /**
   * Provenance entry "payload" — writer fills in activity_id (new ULID),
   * timestamp (ISO-8601 UTC now), method (`properties-panel@${packageVersion}`),
   * and source ('user'). Caller supplies only tool (sentinel) and fields (non-empty).
   */
  provenance: Pick<PropertiesProvenanceEntry, 'tool' | 'fields'>;

  /**
   * Package version, used to populate provenance.method =
   * `properties-panel@${version}`. Caller-supplied so tests can pin it.
   */
  packageVersion: string;
}

export interface UpdateItemMetadataResult {
  /** The patched item.properties as written to disk. */
  updatedProperties: Record<FieldKey, FieldValue>;

  /** The new debrief:overrides array on disk (sorted, deduplicated). */
  overrides: FieldKey[];

  /** ULID of the provenance entry just written. */
  activityId: string;
}

/**
 * Error thrown when the file was modified externally between the read and
 * the write (mtime fingerprint differs). UI MUST treat this as a write-error
 * state and reload from disk.
 */
export class StaleItemJsonError extends Error {
  readonly name = 'StaleItemJsonError' as const;
  constructor(
    readonly storePath: string,
    readonly itemPath: string,
    message: string = 'item.json was modified externally since this edit began',
  ) {
    super(message);
  }
}

/** Schema validation failed on the merged item.properties. */
export class SchemaValidationError extends Error {
  readonly name = 'SchemaValidationError' as const;
  constructor(
    readonly violations: Array<{ field: FieldKey; message: string }>,
    message: string = 'Merged item.properties failed schema validation',
  ) {
    super(message);
  }
}

/** Disk / filesystem refused the write (permissions, read-only mount, etc.). */
export class ReadOnlyFilesystemError extends Error {
  readonly name = 'ReadOnlyFilesystemError' as const;
  constructor(
    readonly path: string,
    message: string = 'Cannot write item.json — filesystem is read-only',
  ) {
    super(message);
  }
}

// ============================================================================
// Contract: StacService (subset)
// ============================================================================

export interface StacServicePropertiesContract {
  /**
   * Write item-level metadata to item.json in place.
   *
   * Semantics (MUST be this order):
   *
   *  1. Read item.json (through the cache layer). Record its mtime + inode
   *     fingerprint.
   *  2. Reject if patch is empty.
   *  3. Merge patch into item.properties.
   *  4. Merge overrideFields into item.properties["debrief:overrides"]
   *     (deduplicated, sorted alphabetically for deterministic output).
   *  5. Construct a PropertiesProvenanceEntry: activity_id = new ULID,
   *     timestamp = ISO now, method = `properties-panel@${packageVersion}`,
   *     source = 'user', tool + fields from input.provenance.
   *  6. Append entry to item.properties["debrief:provenance_log"].
   *     If resulting length > PROVENANCE_LOG_CAP (500), rotate the oldest
   *     (length - CAP) entries into <item_dir>/provenance_log_archive.jsonl
   *     (newline-delimited JSON, append-only, atomic write). The log array
   *     is then truncated to CAP entries, newest retained.
   *  7. Validate the full merged item.properties against the LinkML-generated
   *     JSON Schema. Throw SchemaValidationError on failure, without writing.
   *  8. Re-stat item.json; if mtime/inode fingerprint differs from step 1,
   *     throw StaleItemJsonError without writing.
   *  9. Write item.json atomically: write to <itemPath>.<pid>.<rand>.tmp,
   *     then fs.renameSync onto the destination. fs.unlink the temp on any
   *     intermediate failure.
   * 10. Invalidate the item cache for this path.
   * 11. Return { updatedProperties, overrides, activityId }.
   *
   * MUST throw (not silently swallow):
   *  - empty patch
   *  - item.json missing or unparseable
   *  - SchemaValidationError (step 7)
   *  - StaleItemJsonError (step 8)
   *  - ReadOnlyFilesystemError (step 9)
   *
   * MUST NOT:
   *  - leave a partial item.json on disk
   *  - call LogService.recordToolResult (Decision 7)
   *  - write to the session-state store (Decision 2)
   */
  updateItemMetadata(input: UpdateItemMetadataInput): Promise<UpdateItemMetadataResult>;

  /**
   * EDIT to existing method (stacService.ts:1050). Make override-aware and
   * idempotent.
   *
   * New behaviour (MUST):
   *  1. Read current item.properties["debrief:overrides"] into a Set.
   *  2. For each auto-derived field (start_datetime / end_datetime /
   *     datetime):
   *     - If field ∈ overrides set → skip (leave existing value untouched).
   *     - Else compute derived value from features (unchanged logic).
   *     - If computed === existing → no-op (skip, do not write).
   *     - Else write new value.
   *  3. Only write item.json and invalidate cache IF at least one field
   *     changed. No change → no write, no mtime bump, no spurious dirty.
   *  4. Use the same atomic temp+rename recipe as updateItemMetadata.
   */
  updateTemporalMetadata(storePath: string, itemPath: string): Promise<void>;
}

/**
 * Exported read-only list of field keys currently auto-derived by
 * updateTemporalMetadata. Also imported by the webview to render the
 * "auto-derived" chip in PropertiesForm. Single source of truth for both the
 * service-side skip logic and the UI-side chip logic.
 */
export const AUTO_DERIVED_FIELDS: readonly FieldKey[] = Object.freeze([
  'start_datetime',
  'end_datetime',
  'datetime',
]);
