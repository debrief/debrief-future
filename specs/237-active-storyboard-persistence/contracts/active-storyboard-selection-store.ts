/**
 * Spec #237 — Active-Storyboard Selection Persistence
 *
 * Contract: ActiveStoryboardSelectionStore
 *
 * This is the host-side abstraction that the host mount layers
 * (`apps/vscode/src/services/storyboardPlayback.ts` and
 * `apps/web-shell/src/StoryboardPanelMount.tsx`) call to read and
 * write the analyst's last-selected Storyboard for each plot.
 *
 * The shared `StoryboardPanel` React component in `@debrief/components`
 * does NOT receive this store as a prop — persistence is a host
 * concern, not a panel concern. This file declares the contract that
 * each host's adapter must implement; it lives in `@debrief/components`
 * (re-exported from `shared/components/src/storyboard/index.ts`)
 * because that is the only TS-side package both hosts already share.
 *
 * Implementation files (out of scope for this contract):
 *   - `apps/vscode/src/services/activeStoryboardSelectionStoreVscode.ts`
 *     — Node adapter wrapping `@debrief/config`.
 *   - `apps/web-shell/src/services/activeStoryboardSelectionStoreWebShell.ts`
 *     — browser adapter wrapping `localStorage` (with the
 *     ESLint-rule exception entry).
 *
 * See data-model.md for the on-disk shape and lifecycle, and
 * research.md §1–§4 for the design rationale.
 */

/**
 * Stable plot identifier — the absolute path to the plot's STAC
 * `item.json`. Both hosts already use this exact string to identify
 * open plots: `EditSessionManager.resolveStoreContext(documentUri).itemPath`
 * in VS Code and `currentPlot.itemPath` in the web-shell `App.tsx`.
 *
 * Treated as opaque by the store — no decomposition, no normalisation,
 * no canonicalisation. If a host passes two strings that differ only
 * in case or trailing slash, the store treats them as different plots.
 * The hosts are responsible for plumbing the same exact string they
 * use elsewhere.
 */
export type ItemPath = string;

/**
 * The `properties.id` field of a `StoryboardFeature` (per #215 schema).
 * Stable across edits to the Storyboard's name, scenes, or other
 * mutable properties.
 */
export type StoryboardId = string;

/**
 * Host-side adapter for persisting an analyst's last-selected
 * Storyboard per plot.
 *
 * **Lifecycle expectations:**
 * - `get` is called on plot open (in the host's `onPlotOpened`
 *   lifecycle for VS Code, or in a `useEffect` keyed on
 *   `(itemPath, plot)` for web-shell). It MUST be safe to call
 *   before any `set` has ever happened — return `null` in that case.
 * - `set` is called immediately on every analyst override, before
 *   the next render completes (FR-003). Hosts MUST NOT batch or
 *   defer writes.
 * - `clear` is called on the rare path where the host wants to
 *   explicitly remove a plot's record (e.g. forced reset). It is
 *   equivalent to `set(itemPath, null)` and is exposed only for
 *   call-site readability.
 *
 * **Failure semantics (FR-012, SC-006):**
 * - `get` MUST NOT throw. On read failure (corrupted store,
 *   filesystem lock timeout, browser storage disabled), implementations
 *   MUST return `null` and emit at most one non-fatal log entry per
 *   process lifetime per failure mode.
 * - `set` and `clear` MUST NOT throw. On write failure (quota
 *   exceeded, file lock timeout, read-only filesystem), implementations
 *   MUST swallow the exception, emit at most one non-fatal log entry
 *   per process lifetime per failure mode, and return as if the write
 *   succeeded. The host's in-memory state remains the source of truth
 *   for the current session.
 *
 * **Threading and atomicity:**
 * Implementations are responsible for atomic read-modify-writes when
 * the underlying container holds multiple plots' records. `@debrief/config`
 * provides this via `proper-lockfile` + atomic rename;
 * `localStorage` is single-threaded within an origin so atomicity is
 * trivial there.
 */
export interface ActiveStoryboardSelectionStore {
  /**
   * Read the last-selected Storyboard ID for `itemPath`, or `null`
   * if no selection has ever been recorded for that plot, the recorded
   * value is malformed, or the underlying store cannot be read.
   *
   * Hosts MUST validate the returned `StoryboardId` against the live
   * plot before using it (validation rule V-2 in data-model.md).
   * If the recorded ID is no longer in `plot.features`, the host
   * MUST ignore the return value and fall back to
   * `getActiveStoryboardDefault(plot)`.
   *
   * Synchronous: both backends offer sync APIs that fit the panel-mount
   * lifecycle; an async variant is reserved for a future evolution (see
   * research.md §1).
   */
  get(itemPath: ItemPath): StoryboardId | null;

  /**
   * Persist `storyboardId` as the last-selected Storyboard for
   * `itemPath`. Passing `null` removes the entry (equivalent to
   * `clear(itemPath)`).
   *
   * Implementations MUST persist before returning — hosts rely on
   * the next `get(itemPath)` (in any process) seeing the new value.
   * Implementations MUST NOT throw on failure (see Failure semantics).
   */
  set(itemPath: ItemPath, storyboardId: StoryboardId | null): void;

  /**
   * Remove any record for `itemPath`. Equivalent to `set(itemPath, null)`.
   * Provided for call-site readability at the rare path where a host
   * wants to express "forget this plot".
   */
  clear(itemPath: ItemPath): void;
}

/**
 * Conformance contract — every adapter MUST satisfy these
 * behavioural assertions. The unit-test file
 * `shared/components/src/storyboard/__tests__/activeStoryboardSelectionStore.test.ts`
 * provides a parameterised test suite that runs against any
 * `ActiveStoryboardSelectionStore` implementation; both host adapters
 * import and exercise it against in-memory fakes of their respective
 * backends.
 *
 * 1. **Empty-read returns null.** A `get` against any `itemPath` for
 *    which no `set` has ever been called returns `null`.
 * 2. **Set-then-get round-trip.** `set(p, sb)` followed by `get(p)`
 *    returns `sb` (regardless of process boundary, given a stable
 *    backend).
 * 3. **Plot independence.** `set(p1, sb1); set(p2, sb2); get(p1)`
 *    returns `sb1` (per-plot keying — FR-002, US3 acceptance #2).
 * 4. **Overwrite.** `set(p, sb1); set(p, sb2); get(p)` returns `sb2`.
 * 5. **Null clears.** `set(p, sb); set(p, null); get(p)` returns `null`.
 *    `clear(p)` is exactly equivalent.
 * 6. **Malformed-value tolerance.** Manually corrupting the underlying
 *    container value to a non-string, non-JSON, or wrong-shape value
 *    causes the next `get` to return `null` (and a single log entry
 *    to fire). Subsequent `set` MUST overwrite the corrupted container
 *    cleanly.
 * 7. **Read-failure tolerance.** Simulating a read-throwing backend
 *    (file lock timeout / `localStorage` `SecurityError`) causes
 *    `get` to return `null`, NOT throw.
 * 8. **Write-failure tolerance.** Simulating a write-throwing backend
 *    (quota exceeded / read-only filesystem) causes `set` to return
 *    normally, NOT throw. A subsequent `get` returns the previous
 *    value (or `null` if there was none).
 */
export const _ConformanceContract = null;
