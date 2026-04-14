/**
 * Contract: Selection Store Actions
 * Feature: 186-nested-child-selection
 *
 * Extends `services/session-state/src/store/slices/features.ts` with
 * the toggle, anchor, and range actions required by spec 186. Drops the
 * flat-ID fallback semantics from `setSelection` and friends.
 */

import type { FeatureSelection, TimeInstant } from '@debrief/schemas';

// ─── Selection slice actions ─────────────────────────────────────────

export interface SelectionActions {
  /**
   * Replace selection wholesale (single-click semantics).
   *
   * FR-010: every entry must be a path. Flat IDs are not accepted;
   *         callers must pre-wrap with the root feature ID if needed.
   * FR-016: input is deduplicated by path; order preserved by first
   *         occurrence.
   * FR-020: `primary` defaults to the first entry (or null for empty).
   * FR-021: `anchor` is set to the last entry (or null for empty).
   *
   * Throws synchronously if any path fails `validateAgainstRegistry`.
   */
  setSelection(paths: readonly string[], primary?: string): void;

  /**
   * Toggle a single path in the selection (Ctrl+click semantics).
   *
   * FR-016: if `path` is present, remove it (and rebind `primary` to
   *         the next entry or null); otherwise append it and make it
   *         primary. `anchor` is set to `path` in both cases (even on
   *         removal — the anchor tracks the last-clicked location).
   *
   * Throws if `path` fails `validateAgainstRegistry`.
   */
  toggleInSelection(path: string): void;

  /**
   * Select an inclusive range of siblings from the current `anchor`
   * to `target` (Shift+click semantics).
   *
   * FR-022: range replaces any entries under the shared parent; entries
   *         under other parents are untouched.
   * FR-023: if preconditions fail (no anchor, no shared parent, last
   *         level is not index-based without canonical order), this
   *         action falls back to `setSelection([target])`.
   * FR-024: only index-based last levels are supported today; ID-based
   *         ordering is a future registry extension.
   *
   * Throws if `target` fails `validateAgainstRegistry`.
   */
  selectRange(target: string): void;

  /**
   * Set the anchor explicitly (used by tests and by imperative
   * programmatic selection flows). Rarely needed in UI code — the
   * other actions maintain the anchor automatically.
   *
   * Accepts `null` to clear the anchor.
   */
  setAnchor(path: string | null): void;

  /**
   * Clear the entire selection (FR-015).
   * Resets `featureIds`, `primary`, and `anchor`.
   */
  clearSelection(): void;

  /**
   * Restore a persisted selection after a plot reopen or tab refocus
   * (FR-017, FR-018). Re-resolves every path against current data;
   * unresolvable entries are retained and flagged; each flag is
   * emitted as a structured log entry per FR-027.
   *
   * Returns the `UnresolvableFlag[]` collected during restoration so
   * the caller can surface an aggregate count in the UI (FR-028).
   */
  restoreSelection(
    persisted: FeatureSelection,
    featureCollection: FeatureCollectionLike
  ): ReadonlyArray<UnresolvableFlag>;
}

// ─── Removed actions (semantics rolled into above) ────────────────────

// addToSelection(paths) — replaced by `toggleInSelection` per-path at the
//                        UI layer, and by `selectRange` for Shift+click.
// removeFromSelection(paths) — replaced by `toggleInSelection` per-path.
//
// Kept as thin deprecation shims during the in-flight migration? NO.
// Article XIV.1 — no deprecation path. Rename call sites atomically.

// ─── Selectors ───────────────────────────────────────────────────────

export interface SelectionSelectors {
  /** All selected paths, in insertion order. */
  selectedPaths(state: SessionState): readonly string[];

  /** Primary path (or null). */
  primarySelection(state: SessionState): string | null;

  /** Anchor path (or null). */
  selectionAnchor(state: SessionState): string | null;

  /** Root feature IDs with at least one selected path under them (dedup). */
  selectedRootIds(state: SessionState): readonly string[];

  /** Subset of `selectedPaths` that share a root feature ID. */
  getPathsForRoot(state: SessionState, rootId: string): readonly string[];

  /**
   * Unresolvable entries in the current selection, as computed most
   * recently. Populated by `restoreSelection` and by click-time
   * resolution when a path is added against data that cannot resolve
   * it. Consumed by the aggregate-count UI (FR-028).
   */
  unresolvableFlags(state: SessionState): ReadonlyArray<UnresolvableFlag>;
}

// ─── Modifier-aware dispatcher (webview integration) ─────────────────

/**
 * Map a click-event payload into a store action call. Implemented once
 * and reused by both the VS Code webview bridge and web-shell direct
 * integration.
 *
 * Modifier-combination table (FR-022 et seq):
 *   { }                 → setSelection([path])           (replace)
 *   { ctrl }            → toggleInSelection(path)
 *   { meta }            → toggleInSelection(path)        (macOS parity)
 *   { shift }           → selectRange(path)
 *   { ctrl, shift }     → toggleInSelection(path)        (reserved; conservative fallback)
 *   { }  + empty area   → clearSelection()
 *
 * The dispatcher is pure; tests can exercise every combination without
 * touching DOM events.
 */
export interface ClickDispatcher {
  dispatch(
    actions: SelectionActions,
    event: {
      path: string | null; // null when clicking empty area
      shift: boolean;
      ctrl: boolean;
      meta: boolean;
    }
  ): void;
}

// Import-path placeholders used by the contract
type SessionState = unknown;
type UnresolvableFlag = import('./selection-path').UnresolvableFlag;
type FeatureCollectionLike = import('./selection-path').FeatureCollectionLike;
