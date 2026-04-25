# Feature Specification: Buffer Scene-Thumbnail Asset Entries Until Save

**Feature Branch**: `219-buffer-asset-entries`
**Created**: 2026-04-25
**Status**: Draft
**Input**: User description: "Buffer item.json asset-entry updates to save-time — today #216's sceneThumbnailService.writeSceneThumbnail rewrites item.json on every capture (PNG write + asset entry merge + JSON rename-on-tmp). Per-capture cost is sub-10ms so not a perf blocker, but it entangles the in-memory session state vs persisted plot boundary that the rest of the editor maintains cleanly (features.geojson is flushed at save-time only). Shift asset-entry updates to an in-memory buffer, reconcile with item.json at the save path (where other on-disk mutations already live). Architectural cleanness win, not a perf win. (follow-up to #216)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discarding unsaved scene captures leaves the persisted plot untouched (Priority: P1)

A plot author opens an existing plot, captures several Scenes into a new or existing Storyboard while reviewing options, then closes the plot without saving (or selects "discard changes"). After this, the on-disk plot descriptor is bit-for-bit identical to the state before they opened it. The captured Scenes, the active Storyboard's in-memory edits, and any references to them are gone — exactly as a user already expects when they discard a session.

**Why this priority**: This is the architectural defect that justifies the work. Today the editor treats the persisted plot descriptor as partially "live" — captures mutate it irrespective of save state — which contradicts the cleanly-bounded session model used everywhere else (features.geojson is only flushed at save-time). Restoring symmetry is the primary user-visible value.

**Independent Test**: Open a plot whose `item.json` has a known set of `assets` keys. Capture three Scenes. Without saving, close the plot (or discard the session). Reopen the plot and inspect `item.json.assets` — it MUST contain exactly the same keys that were present before any captures.

**Acceptance Scenarios**:

1. **Given** a plot with `item.json` containing only the existing `thumbnail` and `thumbnail-sm` asset keys, **When** the user captures two Scenes and then closes the plot without saving, **Then** the on-disk `item.json.assets` is unchanged from the pre-capture state (no `scene-thumbnail-*` keys appear).
2. **Given** the same starting state, **When** the user captures two Scenes and then saves the session, **Then** the on-disk `item.json.assets` contains the original keys plus exactly four new keys (`scene-thumbnail-{id}` and `scene-thumbnail-{id}-sm` for each captured Scene).
3. **Given** a session with three captured but unsaved Scenes, **When** the user uses "undo" until all three captures are reverted and then saves, **Then** the on-disk `item.json.assets` is unchanged from the pre-capture state (the buffer reconciles to "no net change").

---

### User Story 2 - Storyboard panel and existing surfaces continue to render thumbnails for unsaved Scenes (Priority: P1)

While the user is mid-session — captures complete but session unsaved — the Storyboard panel, scene preview surfaces, and any other UI that consumes Scene thumbnails MUST continue to display the captured PNGs without regression. The user sees no functional or visual difference from today's behaviour during the unsaved-session window.

**Why this priority**: Without this guarantee the architectural improvement would be a regression. Scene thumbnails are the core artefact of #216's capture flow; if buffering breaks rendering, the change is unshippable.

**Independent Test**: Capture a Scene and observe its thumbnail in the Storyboard panel. Without saving, switch tabs / refresh the panel / open a peek surface that shows scene thumbnails. The captured Scene's thumbnail MUST render in every surface that renders it today.

**Acceptance Scenarios**:

1. **Given** a captured but unsaved Scene, **When** the Storyboard panel renders the Scene list, **Then** the Scene's thumbnail is shown using the same visual fidelity as today.
2. **Given** a captured but unsaved Scene, **When** another surface (peek panel, summary view, etc.) requests the Scene's thumbnail by its asset reference, **Then** the bytes for that thumbnail are returned successfully.
3. **Given** a session with a mix of saved Scenes (already in `item.json`) and newly captured unsaved Scenes (in the buffer), **When** any consumer iterates Scenes, **Then** all thumbnails — saved and buffered — render with no visual or functional difference between the two groups.

---

### User Story 3 - Save reconciles all buffered asset changes in a single atomic write (Priority: P1)

When the user saves the session, all buffered asset-entry additions for the active plot are merged into `item.json` in one atomic rewrite. If save succeeds the buffer is cleared. If save fails the buffer is preserved so the user can retry without losing pending Scenes.

**Why this priority**: The whole point of buffering is that save becomes the single point of persistence. The reconciliation must be atomic (no partial updates), and the failure mode must be recoverable.

**Independent Test**: Capture five Scenes, then save. Verify that `item.json.assets` is rewritten exactly once during save and contains all ten new asset keys (large + small per Scene) plus any pre-existing keys. Then induce a save failure (e.g. read-only filesystem) and verify the buffer survives so the next save attempt commits the same set of entries.

**Acceptance Scenarios**:

1. **Given** five captured Scenes pending in the buffer, **When** the user saves successfully, **Then** `item.json` is rewritten exactly once during the save flow, contains all expected new asset keys, and the in-memory buffer is empty afterwards.
2. **Given** five captured Scenes pending in the buffer, **When** the save fails after a successful capture (e.g. the filesystem rejects the rewrite), **Then** the on-disk `item.json` is unchanged, the in-memory buffer still holds all five pending entries, and a subsequent successful save commits all of them.
3. **Given** an existing `item.json` with arbitrary non-thumbnail assets (e.g. `data`, custom roles), **When** save reconciles the buffer, **Then** all pre-existing asset entries are preserved unchanged and only the buffered Scene-thumbnail entries are added.

---

### Edge Cases

- **PNG bytes vs asset-entry registration during the unsaved window**: The captured PNG files are written to disk eagerly today (so the Storyboard panel can load them by path). After this change, those files exist on disk before their `item.json` asset entry is written. The system MUST tolerate this transient state: any consumer that needs to display a buffered Scene's thumbnail must be able to resolve the bytes either from the buffer or from a known on-disk path that matches the buffer's pending entry.
- **Discard leaves orphan PNGs on disk**: When a user discards the session, the PNG files for captured-but-unbuffered Scenes remain on disk without any `item.json` reference. These are reclaimed by the existing orphan-asset garbage collection pass on next plot open or close. The system MUST NOT introduce a new leak class — orphan PNGs from discarded captures must be GC'd via the existing mechanism that already handles this case.
- **Same Scene captured then deleted within a session**: If the user captures a Scene and then removes it before saving (e.g. via undo or an explicit delete), the buffer entry for that Scene MUST be removed too, so save does not register a Scene that no longer exists in the in-memory plot.
- **Multi-plot sessions**: If the user has multiple plots open, each plot has its own independent buffer. Saving one plot only flushes that plot's buffer; captures pending in other plots are unaffected.
- **Crash or hard close mid-session**: If the editor crashes after captures but before save, the on-disk `item.json` is unchanged (matching today's behaviour for features.geojson). Captured PNGs become orphans and are reclaimed on next open by the existing GC.
- **Re-opening a plot whose `item.json` already contains scene-thumbnail entries from prior saved sessions**: The buffer starts empty. Subsequent captures append to the buffer; save merges only the buffered entries on top of whatever is on disk. Already-saved scene-thumbnail entries are not re-written or duplicated.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST NOT mutate `item.json` on disk during a Scene capture. Capture writes the PNG files but defers all `item.json` asset-entry registration to a later save step.
- **FR-002**: The system MUST maintain a per-plot in-memory buffer of pending Scene-thumbnail asset entries (additions only — deletions during the unsaved window are realised by removing the corresponding buffer entry, not by recording a removal).
- **FR-003**: Each pending buffer entry MUST capture exactly the same metadata that would otherwise be written to `item.json` (asset key, href, type, title, roles), so the save-time reconciliation is a faithful merge.
- **FR-004**: The system MUST expose buffered entries to in-process consumers (Storyboard panel, scene-preview surfaces, any other consumer that resolves a Scene's `thumbnail_asset_ref`) so that thumbnails render uniformly for saved and unsaved Scenes during the same session.
- **FR-005**: When the user saves the session, the system MUST merge all buffered entries for that plot into `item.json` in a single atomic rewrite, preserving every pre-existing asset entry that is not being replaced.
- **FR-006**: On a successful save the system MUST clear the per-plot buffer.
- **FR-007**: On a failed save the system MUST preserve the per-plot buffer so a subsequent save attempt commits the same pending entries.
- **FR-008**: When the user discards the session (close-without-save, explicit discard, or session reset), the system MUST drop the per-plot buffer without writing to `item.json`.
- **FR-009**: Captured PNG files written eagerly during the unsaved window that are later discarded MUST be reclaimed by the existing orphan-asset garbage-collection mechanism. This change MUST NOT introduce a new orphan class that the existing GC cannot detect.
- **FR-010**: When a captured Scene is removed from the plot before save (e.g. via undo, or an explicit Scene delete), the system MUST remove its corresponding entry from the buffer so save does not register an orphan asset.
- **FR-011**: Each open plot MUST have an independent buffer. A save of one plot MUST NOT alter another plot's buffer or `item.json`.
- **FR-012**: The system MUST preserve the existing atomicity contract for the save-time reconciliation: a failure during the `item.json` rewrite MUST leave the on-disk `item.json` unchanged (matching the all-or-nothing guarantee already provided by the per-capture rewrite this change replaces).
- **FR-013**: Existing automated tests for the Scene capture and Storyboard edit flows MUST continue to pass. Where tests assert that `item.json` is rewritten on capture, they MUST be migrated to the new model (capture writes PNG only; save merges buffer into `item.json`).

### Key Entities *(include if feature involves data)*

- **Pending Asset Entry Buffer**: An in-memory, per-plot collection of asset-entry descriptors awaiting persistence. Each entry carries the asset key, href, MIME type, title, and roles. The buffer is keyed by plot identifier (so multi-plot sessions stay isolated) and lives for the lifetime of the unsaved session.
- **Scene-Thumbnail Asset Entry**: The metadata describing one PNG asset on a STAC Item — the same shape that exists today inside `item.json.assets`. Two entries are produced per captured Scene (large + small).
- **Persisted Plot Descriptor (`item.json`)**: The on-disk STAC Item document. Becomes a true save-time-only artefact for asset-entry mutations after this change, mirroring how `features.geojson` is already treated.
- **Orphan PNG**: A captured-then-discarded thumbnail file that exists on disk but has no `item.json` reference. Reclaimed by the existing orphan-asset GC pass.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After this change, a user who captures any number of Scenes and then discards the session leaves `item.json` byte-identical (modulo non-thumbnail edits made elsewhere) to its pre-session state in 100% of cases.
- **SC-002**: The number of `item.json` rewrites during a single capture-save cycle drops to exactly one, regardless of how many Scenes were captured. Today the count is N (one per capture); after this change it is one (at save).
- **SC-003**: Storyboard panel and any other thumbnail consumer renders thumbnails for buffered (unsaved) Scenes with zero visual or functional difference from saved Scenes — verified by side-by-side review of a session containing both.
- **SC-004**: No new orphan-asset class appears in the codebase. The existing orphan-asset GC pass continues to be the single mechanism that reclaims PNGs whose Scene was discarded — verified by running the existing GC test suite against a discard-after-capture scenario.
- **SC-005**: All existing Scene-capture, Storyboard-edit, and save-flow tests pass without weakening their assertions. Tests that previously asserted per-capture `item.json` mutation are migrated to assert "PNG written on capture, asset entry merged on save" — and the migrated tests pass.
- **SC-006**: A failed save (e.g. read-only filesystem) preserves the in-memory buffer so a subsequent successful save persists the same set of pending entries — verified by an automated test that injects a save failure and then succeeds on retry.

## Assumptions

- The PNG files for captured Scenes continue to be written to disk eagerly during the capture flow, exactly as they are today. Only the `item.json` asset-entry registration is deferred. This preserves the Storyboard panel's existing path-based render strategy and limits the scope to the boundary problem the backlog item identifies.
- The existing orphan-asset garbage-collection pass (`gcOrphanAssets`) is sufficient to reclaim PNGs from discarded captures. No new GC mechanism is required.
- Multi-plot sessions already have per-plot session state isolation; this feature follows the same isolation pattern for the buffer.
- The save flow already exists as the canonical place where on-disk plot mutations are committed (today it commits `features.geojson`, session-state files, and plot thumbnails). This feature adds Scene-thumbnail asset entries to that same flow.
- "Save" here means the user-initiated save of the active session/plot — the same trigger that flushes `features.geojson` today. No new user-facing save concept is introduced.
- The buffer is held in memory only and is not itself persisted across editor restarts. A crash or hard close discards pending captures — a deliberate match for the existing behaviour of unsaved features.
