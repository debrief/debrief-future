/**
 * Contract: Selection Persistence
 * Feature: 186-nested-child-selection
 *
 * Adds per-plot persistence of the selection state with re-resolution
 * on restore. Consumed by `services/session-state/src/persistence/`.
 */

import type { FeatureSelection } from '@debrief/schemas';
import type { UnresolvableFlag, FeatureCollectionLike } from './selection-path';

// ─── Save (FR-017) ───────────────────────────────────────────────────

/**
 * Serialise the selection alongside other per-plot session state.
 * Called during the existing save pipeline — this contract does not
 * replace `persistence/save.ts`, it extends the payload shape.
 */
export interface PersistedSessionStateV1 {
  readonly schemaVersion: 1;
  // … existing per-plot slices (features excl. selection, hidden IDs, etc.)

  /**
   * Persisted selection. All fields carry through unchanged — including
   * `anchor`, so that resuming a plot preserves a Shift+click anchor.
   * Paths must pass structural validation before serialisation.
   */
  readonly selection: FeatureSelection;
}

/**
 * Produce the persisted payload from the live session state. Validates
 * all selection paths structurally; throws if any is malformed (should
 * never happen if the store enforced validation on write).
 */
export declare function serialiseSessionState(
  state: SessionStateSlice
): PersistedSessionStateV1;

// ─── Load (FR-018) ───────────────────────────────────────────────────

/**
 * Deserialise the persisted payload into a live session state. The
 * selection paths are carried across as-is; resolution happens in a
 * subsequent step via `resolvePersistedSelection`.
 *
 * Throws on schema-version mismatch, malformed JSON, or schema
 * violations reported by Pydantic/Zod.
 */
export declare function deserialiseSessionState(
  raw: unknown
): PersistedSessionStateV1;

/**
 * Result of restoring a selection against a live feature collection.
 */
export interface RestoreResult {
  readonly selection: FeatureSelection;
  readonly unresolvable: ReadonlyArray<UnresolvableFlag>;
}

/**
 * Re-resolve every persisted path against the current data. Resolvable
 * paths are kept in `selection.featureIds` unchanged. Unresolvable paths
 * are also retained in `selection.featureIds` (FR-018: "MUST NOT silently
 * drop entries") and reported in `unresolvable` so the UI can surface
 * an aggregate count and the LogService can record each occurrence.
 *
 * Every entry in the returned `unresolvable` array has
 * `discoveredAt: 'restore-time'`.
 */
export declare function resolvePersistedSelection(
  persisted: FeatureSelection,
  featureCollection: FeatureCollectionLike
): RestoreResult;

// ─── Refocus / tab-switch (FR-017) ───────────────────────────────────

/**
 * Lifecycle hook triggered when a plot regains focus (for example, user
 * switches to another tab and back). Re-resolves the current persisted
 * selection against live data if the data layer has changed since the
 * plot was last focused.
 *
 * Implementation note: the persistence layer maintains a "last-resolved"
 * data-version marker; if unchanged, this is a no-op. If changed, it
 * re-runs `resolvePersistedSelection` and dispatches the result into
 * the store.
 */
export declare function onPlotRefocus(
  plotId: string,
  featureCollection: FeatureCollectionLike
): Promise<RestoreResult>;

// Import-path placeholder
type SessionStateSlice = unknown;
