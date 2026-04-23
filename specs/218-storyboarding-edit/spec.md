# Feature Specification: Storyboarding — Edit Suite + Housekeeping

**Feature Branch**: `218-storyboarding-edit`
**Created**: 2026-04-20
**Status**: Draft — ready for quality-checklist validation
**Parent Epic**: #024 Storyboarding Briefings — [idea doc](../../docs/ideas/017-storyboarding-briefings.md)
**Sibling Specs**: #215 (schema + CRUD core), #216 (capture), #217 (panel + playback), #218 (this)
**Input**: Fourth of four sibling specs splitting epic #024. This slice delivers the polishing tools that turn raw captures into briefing-ready storyboards, plus the data-integrity guardrails.

## Summary

This spec delivers the **edit suite** on top of the playback panel from
#217: inline Scene rename, markdown description, session-scoped soft-
delete with toast-undo, `update-to-current`, `duplicate` (with
prompted timestamp), and `copy-to-other-storyboard` (deep-copied
thumbnail asset). It also delivers four **housekeeping** capabilities:
stale-thumbnail detection + per-Scene refresh, a **bulk "Refresh all
stale"** action, periodic **orphan-asset garbage collection** on plot
close, and the wiring into the **Analysis Log Panel (#176)** so every
Storyboard or Scene mutation leaves an auditable trail with the
Scene's thumbnail attached. The Log Panel additionally **collapses
consecutive same-op cards** inside a short window so a polish-heavy
session stays legible.

After this slice merges, the full MVP scope of the epic is in place:
capture (#216), brief (#217), polish (#218). The dedicated distraction-
free briefing renderer and animated time-range Scenes remain deferred
beyond the epic.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Refine a captured storyboard (Priority: P1)

After an initial capture pass, the analyst polishes the Storyboard:
renames Scenes from their DTG defaults, writes markdown descriptions,
deletes mistakes (with an undo window), re-snapshots a Scene to the
current map state, inserts a Scene at an intermediate timestamp,
duplicates a Scene to a new timestamp, and copies Scenes to another
Storyboard on the same plot.

**Why this priority**: Refinement turns raw captures into a
presentation-ready briefing. The capture + playback loop (#216 +
#217) is already useful without this, but polished delivery requires
the edit suite.

**Independent Test**: Starting from a fixture Storyboard with at
least three Scenes, exercise each edit op (rename, describe,
delete+undo, update-to-current, duplicate, insert-middle via
capture, copy-to-other-storyboard) and confirm: (a) the mutation
persists in the plot FeatureCollection via #215's module, (b)
provenance fields are updated and a matching `HistoryEntry` is
appended, (c) a corresponding entry appears in the Analysis Log
Panel (#176) with the Scene's thumbnail.

**Acceptance Scenarios**:

1. **Given** a Scene, **When** the analyst renames it or edits its
   markdown description, **Then** the change is persisted,
   `last_modified_{by,at}` are updated, and a `HistoryEntry` (`rename`
   or `describe`) is appended.
2. **Given** a Scene, **When** the analyst deletes it, **Then** a
   toast offers **Undo** for the remainder of the session. Accepting
   undo restores the Scene byte-identically (including `id` and full
   `history`, with an additional `restore` entry appended). Dismissing
   the toast or ending the session finalises the delete.
3. **Given** a Scene, **When** the analyst triggers
   `update-to-current`, **Then** `viewport`, `timestamp`,
   `visible_feature_ids`, `feature_set_hash`, and
   `thumbnail_asset_ref` are all re-snapshotted from the current map
   state as a single atomic write — partial updates are not visible
   to any observer.
4. **Given** a Scene, **When** the analyst triggers **duplicate**,
   **Then** an inline prompt asks for a new `timestamp` (default:
   source + 1 s). On confirm a new Scene with a fresh ULID is
   persisted at that timestamp via #215.
5. **Given** a Scene, **When** the analyst triggers
   **copy-to-other-storyboard** and selects a destination from the
   dropdown, **Then** a new Scene is created on the destination
   Storyboard with a fresh `id`, the destination's `storyboard_id`,
   and a **deep-copied** thumbnail asset distinct from the source's.
6. **Given** any successful edit op, **When** the analyst opens the
   Analysis Log Panel (#176), **Then** the operation appears there
   with its Scene thumbnail attached and a one-line summary.
7. **Given** a Scene whose `visible_feature_ids` do not fully resolve
   in the current plot, **When** the analyst opens the Scene for
   editing (from #217's hard-block prompt or by selecting the Scene
   directly), **Then** the edit form surfaces the specific unresolved
   IDs and routes the natural remediation into
   `update-to-current` or **delete**.

---

### User Story 2 — Detect and refresh stale Scene thumbnails (Priority: P2)

Between capture and briefing the underlying plot features may change.
The panel flags Scenes whose rendered thumbnail no longer matches the
current visible-feature set so the analyst can decide whether to
refresh or leave them.

**Why this priority**: Data-integrity guardrail rather than a new
interaction. Valuable for long-lived Storyboards, but a briefing can
still be delivered (with stale thumbnails) without it.

**Independent Test**: Load a fixture Storyboard, then mutate the
underlying plot so at least one Scene's `visible_feature_ids` no
longer fully resolve. Reopen the plot and confirm: (a) affected
Scenes are flagged as stale in the panel, (b) a per-Scene
**Refresh thumbnail** action regenerates the thumbnail via #174 and
clears the flag, (c) `feature_set_hash` is recomputed and persisted,
(d) a `refresh-thumbnail` history entry + Analysis Log entry are
recorded.

**Acceptance Scenarios**:

1. **Given** a Scene whose `feature_set_hash` no longer matches a
   recomputation over its currently-resolvable `visible_feature_ids`,
   **When** the plot is opened, **Then** the Scene is marked **stale**
   in the panel with a visible indicator and tooltip naming which IDs
   no longer resolve.
2. **Given** a stale Scene, **When** the analyst triggers the per-
   Scene **Refresh thumbnail** action, **Then** the thumbnail is
   re-captured via #174, `feature_set_hash` and `last_modified_{by,at}`
   are updated, a `refresh-thumbnail` entry is appended to `history`,
   and the stale flag clears. On #174 failure the existing thumbnail
   and hash are left untouched and an error toast surfaces the
   failure.

---

### Edge Cases

- **Undo after a capture op.** Toast-undo applies to Scene deletes
  only, not to captures; an accidental capture is removed via the
  standard delete + undo path.
- **Undo window expiry.** The toast is session-scoped: closing the
  plot or the VS Code window finalises any pending deletes.
  Re-opening the plot does not resurrect them.
- **Concurrent edits in two panels.** If the same plot is open in
  two tabs / windows and both edit the same Scene, the last write
  wins at the FeatureCollection level; both panels refresh on save.
  #218 introduces no coordination beyond what #215's CRUD module
  guarantees.
- **Rename collision with another Storyboard name.** Storyboard
  rename (via the #217 overflow menu) surfaces the same uniqueness
  check as first-capture — confirm is blocked until the analyst
  picks a unique name. Scene titles are not unique-constrained.
- **`update-to-current` on the currently-previewing Scene.** The
  re-snapshot completes atomically; the preview position jumps (if
  needed) so the panel, map, and time slider stay in sync.
- **`duplicate` at a timestamp that collides with an existing Scene.**
  The inline prompt displays the collision inline and requires the
  analyst to pick a non-colliding timestamp (or cancel). No write
  occurs on collision.
- **`copy-to-other-storyboard` at a colliding timestamp on the
  destination.** Same Replace / Offset (+1 s) / Cancel prompt as
  capture (per #215 invariants).
- **Deep-copy failure during `copy-to-other-storyboard`.** The op
  rolls back atomically — no destination Scene is persisted and the
  source is untouched (per #215 FR-MODULE-015).
- **Refresh thumbnail while offline from a cached pipeline.** #174
  is local; the refresh proceeds normally. If #174 errors for any
  reason, the Scene's existing thumbnail and hash remain
  authoritative and the stale flag persists.
- **Log panel unavailable.** If #176 is not yet installed, the
  `HistoryEntry` is still written to the Feature's `history[]` by
  #215; the panel integration is behind a feature flag that
  gracefully no-ops. Shipping the edit suite with no visible log
  destination is not acceptable — #176 is a hard dependency for
  this spec's merge.
- **Delete of the last Scene in an empty Storyboard.** Works per
  #217's per-Storyboard empty state. Undo restores the single Scene
  and the panel transitions out of the empty state.
- **Markdown description length.** No hard cap is introduced here;
  the panel scrolls if the description grows long.
- **Orphan thumbnail at plot close.** The `gcOrphanAssets` pass
  (FR-EDIT-024) unlinks PNGs with no referring Scene; if the pass
  itself fails (disk error), a warning is logged to the output
  channel and the orphan survives until the next plot close — no
  user-facing toast, no blocking of plot-close.
- **Bulk "Refresh all stale" with some #174 failures.** Per-Scene
  failures surface in the Log Panel (individual `refresh-thumbnail`
  cards with error details); the rollup card shows `{ succeeded,
  failed }` tallies; the action completes (does not abort on first
  failure) so analysts can address remaining stale Scenes in a
  single pass.
- **Rapid-fire edits collapsed too aggressively.** The
  LogPanel collapse (FR-EDIT-026) kicks in at ≥ 3 consecutive
  same-op entries within 120 s. A user who wants full granularity
  toggles `debrief.logPanel.collapseConsecutiveSameOp` off; the
  audit trail at the `LogEntry`/provenance level is always complete.
- **External delete of the Storyboard while undo toast is visible.**
  `undoDeleteScene` surfaces a specific red toast ("Cannot restore —
  storyboard was deleted") and clears the buffer entry; the
  provenance chain at the `LogEntry` level stays intact (the
  original `delete` entry is not reversed).

## Requirements *(mandatory)*

### Functional Requirements

#### Scene edit operations

- **FR-EDIT-001**: System MUST support per-Scene **inline rename**
  of `title` in the panel. On confirm the new title is persisted via
  #215 and the Scene row updates.
- **FR-EDIT-002**: System MUST support per-Scene **markdown
  description** editing in the panel. Markdown is stored as-is in
  `description` and rendered inline.
- **FR-EDIT-003**: System MUST support per-Scene **soft-delete with
  toast-undo**. The undo window MUST be session-scoped (closing the
  plot or the VS Code window finalises the delete).
- **FR-EDIT-004**: The restore path for soft-delete MUST reinstate
  the Scene byte-identically (same `id`, same `history`, preserved
  provenance) and MUST append a `restore` `HistoryEntry` to record
  the recovery.
- **FR-EDIT-005**: System MUST support per-Scene
  **update-to-current** as a single atomic write: `viewport`,
  `timestamp`, `visible_feature_ids`, `feature_set_hash`, and
  `thumbnail_asset_ref` are all re-snapshotted from the current map
  state. Partial updates MUST NOT be visible to any observer. On
  #174 failure the whole op rolls back; no fields are touched.
- **FR-EDIT-006**: `update-to-current` MUST re-run #215's
  duplicate-timestamp check; collision prompts Replace / Offset
  (+1 s) / Cancel as in capture.
- **FR-EDIT-007**: System MUST support per-Scene **duplicate** with
  an inline prompt for the new `timestamp` (default: source `timestamp`
  + 1 second). On confirm, a new Scene with a fresh ULID `id` is
  persisted on the same Storyboard via #215's `duplicateScene`.
- **FR-EDIT-008**: System MUST support per-Scene **copy-to-other-
  storyboard** via a dropdown quick-pick listing other Storyboards
  on the same plot. On confirm, a new Scene is persisted on the
  destination Storyboard with a fresh `id`, the destination's
  `storyboard_id`, and a deep-copied thumbnail asset (via #215's
  `copySceneToOtherStoryboard`).
- **FR-EDIT-009**: Copy-to-other-storyboard MUST re-run the duplicate-
  timestamp check against the destination Storyboard; collision
  prompts Replace / Offset / Cancel.
- **FR-EDIT-010**: System MUST NOT provide drag-reorder of Scenes.
  Re-ordering is achieved only via `update-to-current` or by editing
  a Scene's `timestamp` through the edit form.
- **FR-EDIT-011**: Every successful edit op MUST update
  `last_modified_{by,at}` and append exactly one `HistoryEntry` with
  the correct `op` value (handled by #215 — this spec relies on that
  guarantee).

#### Storyboard edit operations

- **FR-EDIT-012**: System MUST support **Storyboard rename** via the
  #217 overflow menu, with uniqueness validation (same constraint as
  first-capture naming) before persistence.
- **FR-EDIT-013**: System MUST support **Storyboard markdown
  description** editing via the panel header (collapsed by default).

#### Missing-data handling in edit context

- **FR-EDIT-014**: Opening a Scene for editing MUST invoke #215's
  `detectMissingDataForScene`. If the Scene is `missing-features`
  or `out-of-range`, the edit form MUST surface the specific
  unresolved data and MUST route the natural remediation to either
  `update-to-current` or **delete**.
- **FR-EDIT-015**: The **Open for editing** action offered by #217's
  playback hard-block prompt MUST land on this spec's edit form with
  the missing-data details pre-filled.

#### Stale-thumbnail detection + refresh

- **FR-EDIT-016**: On plot open, System MUST recompute
  `feature_set_hash` over each Scene's currently-resolvable
  `visible_feature_ids` and compare against the stored hash; if they
  differ, the Scene MUST be flagged as **stale** in the panel.
- **FR-EDIT-017**: Stale indication MUST be a persistent per-row
  visual marker (not a transient toast) with a tooltip naming which
  IDs no longer resolve.
- **FR-EDIT-018**: System MUST expose a per-Scene **Refresh
  thumbnail** action that re-captures the thumbnail via #174 and,
  on success, updates `thumbnail_asset_ref`, recomputes
  `feature_set_hash`, updates `last_modified_{by,at}`, appends a
  `refresh-thumbnail` `HistoryEntry`, and clears the stale flag.
- **FR-EDIT-019**: On #174 failure during refresh, the existing
  `thumbnail_asset_ref`, `feature_set_hash`, and all provenance
  fields MUST be left unchanged; an error toast MUST surface the
  failure; the stale flag MUST persist.

#### Analysis Log Panel (#176) integration

- **FR-EDIT-020**: Every edit op from this spec (rename, describe,
  delete, restore, update-to-current, duplicate,
  copy-to-other-storyboard, refresh-thumbnail, Storyboard rename,
  Storyboard description edit, Storyboard delete cascade) MUST emit
  an entry to the Analysis Log Panel (#176) that includes: the op
  name, the affected Scene's `id` (and for Storyboard-level ops, the
  Storyboard `id`), the Scene's current thumbnail, the analyst's
  identifier, and a short one-line summary.
- **FR-EDIT-021**: If #176 is unavailable at runtime, the
  integration MUST degrade gracefully: the underlying `HistoryEntry`
  MUST still be written to the Feature (via #215) and the analyst
  MUST NOT see a blocking error. (Shipping without #176 in place is
  not acceptable; this FR covers only the degraded path during
  development or feature-flag rollback.)

#### Lifecycle & module boundary

- **FR-EDIT-022**: All edit operations MUST flow through #215's
  module API. This spec MUST NOT introduce direct writes to
  Storyboard or Scene Features. **Exception (additive)**: this
  slice ships a `restoreScene` helper and a `checkSceneTimestamp`
  wrapper **inside #215's module** (`shared/components/src/storyboard/
  crud.ts`), maintaining the single-mutation-boundary invariant.
- **FR-EDIT-023**: This spec's UI surface MUST live inside the
  panel established by #217 (Scene row overflow menus, inline edit
  affordances, edit form) and MUST NOT introduce a separate
  window or view.

#### Housekeeping additions (per review fold-in 2026-04-23)

- **FR-EDIT-024**: On plot close, System MUST invoke
  `sceneThumbnailService.gcOrphanAssets(plot)` which scans
  `item.json` asset entries against live Scene `thumbnail_asset_ref`
  values and unlinks any PNG whose Scene has been removed. Reclaimed
  asset hrefs MUST be returned for telemetry.
- **FR-EDIT-025**: System MUST expose a **bulk "Refresh all stale
  thumbnails"** action at the Storyboard level (panel header
  overflow menu). The action iterates every Scene flagged stale on
  the active Storyboard, invokes `#174.captureThumbnail` per Scene,
  emits one `refresh-thumbnail` log card per Scene, and emits a
  single `refresh-all-stale` rollup card on completion carrying
  `{ succeeded, failed }` tallies. The action is a no-op (with an
  info toast) when no Scenes are flagged stale on the active
  Storyboard.
- **FR-EDIT-026**: The Analysis Log Panel (#176) MUST support
  **consecutive-same-op collapse** for `debrief.storyboardEdit`
  entries: when ≥ 3 consecutive entries with identical `op` +
  `actor` fall within a 120-second window, they MUST render as a
  single collapsed card showing the count + an expand action that
  reveals the individual cards. The behaviour MUST be gated on a
  new VS Code setting `debrief.logPanel.collapseConsecutiveSameOp`
  (default **true**) so power users can opt out.

### Key Entities

This slice mutates `Storyboard` and `Scene` entities via #215's
module. Full schema definitions and invariants are authoritative in
[#215 Key Entities](../215-storyboarding-schema/spec.md#key-entities-schema-first-authoritative).

Attributes this spec mutates or reads:

- **Scene**: `title`, `description` (rename, describe ops); full
  attribute set (`viewport`, `timestamp`, `visible_feature_ids`,
  `feature_set_hash`, `thumbnail_asset_ref`) on
  `update-to-current`; `thumbnail_asset_ref` + `feature_set_hash`
  on refresh; the whole Feature on duplicate / copy-to-other-
  storyboard; `history` on every op (append-only).
- **Storyboard**: `name`, `description` (rename, describe ops);
  `history` on every op.

No new Features are introduced and no new sub-entities are added.

## User Interface Flow *(UI feature)*

### Decision Analysis

- **Primary Goal**: Polish captured Storyboards into briefing-ready
  narratives and keep their data integrity intact as the underlying
  plot evolves.
- **Key Decisions**:
  1. **Which Scene to rename or describe**, and what labels help a
     stakeholder audience follow the narrative.
  2. **Which Scenes to delete** (and whether to undo).
  3. **Which Scenes need their snapshot refreshed** — via
     `update-to-current` (full re-snapshot) or `Refresh thumbnail`
     (thumbnail only).
  4. **Where to duplicate or copy a Scene** — same Storyboard
     (`duplicate` at a new timestamp) or a sibling Storyboard
     (`copy-to-other-storyboard`).
  5. **Whether a stale Scene deserves a refresh** or can stay as-is.
  6. **How to respond to a missing-data Scene** opened from #217's
     hard-block prompt — `update-to-current` or delete.
- **Decision Inputs**:
  - **Scene row overflow menu** — exposes the full edit suite.
  - **Edit form** — shows current values, markdown preview,
    timestamp picker (where relevant), and missing-data details.
  - **Stale indicator + tooltip** — names the unresolved IDs.
  - **Analysis Log Panel (#176)** — historical view of what was
    edited and when, with Scene thumbnails attached.
  - **Toast-undo** — reversible window for accidental deletes.

### Screen Progression

| Step | Screen / State | User Action | Result |
|------|----------------|-------------|--------|
| 1 | #217 panel open with Scene list | Click a Scene's title inline | Title becomes editable; confirm persists via #215; log entry (#176) emitted |
| 2 | Scene row | Expand row or open overflow menu → **Edit description** | Markdown editor opens inline; save persists; log entry emitted |
| 3 | Scene row | Overflow menu → **Delete** | Row disappears; toast offers **Undo** for the rest of the session; accepting restores the Scene byte-identically |
| 4 | Scene row (while map is framed on a new state) | Overflow menu → **Update to current** | All Scene fields re-snapshot atomically via #215; thumbnail refreshes via #174; log entry emitted |
| 5 | Scene row | Overflow menu → **Duplicate** | Inline timestamp prompt (default source + 1 s); confirm persists a new Scene with a fresh ULID |
| 6 | Scene row | Overflow menu → **Copy to other storyboard** | Dropdown quick-pick of other Storyboards on the plot; confirm deep-copies the thumbnail asset and persists on the destination |
| 7 | Scene row flagged **stale** after plot open | Click **Refresh thumbnail** | #174 regenerates the thumbnail; hash and provenance update; stale flag clears |
| 8 | Hard-block prompt surfaced by #217 for a missing-data Scene | Click **Open for editing** | Edit form opens with missing-data details pre-filled; analyst chooses `update-to-current` or delete |

### UI States

- **Empty State (Scene list empty after a delete).** Handled by
  #217's per-Storyboard empty state; undo restores the Scene and
  the panel transitions out.
- **Loading State (edit op in flight — update-to-current or refresh
  thumbnail).** The Scene row shows a spinner; other edit
  affordances on that row are disabled until the op settles.
- **Error State (thumbnail pipeline failure during
  update-to-current).** Red toast: *"Update failed — could not
  produce thumbnail. Scene not changed."* No fields are mutated;
  the op rolls back atomically.
- **Error State (thumbnail pipeline failure during refresh).** Red
  toast: *"Refresh failed — could not produce thumbnail. Existing
  thumbnail kept."* `feature_set_hash` and provenance are
  untouched; stale flag persists.
- **Error State (deep-copy failure during
  copy-to-other-storyboard).** Red toast with a copy-specific
  message; no destination Scene is persisted; the source is
  untouched.
- **Error State (duplicate-timestamp collision on duplicate or
  copy-to-other-storyboard).** Inline prompt: *"A scene already
  exists at this timestamp. Replace / Offset (+1 s) / Cancel."*
  No write occurs until resolved.
- **Stale State.** Persistent per-row indicator with a tooltip
  naming unresolved feature IDs; the **Refresh thumbnail** action
  is surfaced on the same row.
- **Undo Toast State.** Transient toast with an **Undo** button;
  dismissal or session end finalises the delete.
- **Success State (generic edit op).** The affected row updates,
  a brief confirmation toast appears, and an entry lands in the
  Analysis Log Panel (#176) with the Scene thumbnail.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 — Edit suite coverage.** **100%** of the edit ops
  named in *Functional Requirements* (rename, describe, delete,
  restore, update-to-current, duplicate, copy-to-other-storyboard,
  refresh-thumbnail, Storyboard rename, Storyboard describe,
  Storyboard cascade delete) are reachable from the panel UI and
  each lands a correct `HistoryEntry` via #215.
- **SC-002 — Atomicity under failure.** For
  `update-to-current`, `duplicate`, and `copy-to-other-storyboard`,
  **0%** of induced-failure runs (thumbnail pipeline failure or
  deep-copy failure) leave partially-applied mutations; in every
  run the FeatureCollection is byte-identical to its pre-op state.
- **SC-003 — Undo faithfulness.** **100%** of soft-deletes followed
  by **Undo** restore the Scene byte-identically (including `id`
  and full pre-delete `history`, with the additional `restore`
  entry appended).
- **SC-004 — Stale-detection accuracy.** On plot open, **100%**
  of Scenes whose `feature_set_hash` no longer matches the
  recomputation are flagged as stale; **0%** of Scenes whose hash
  still matches are falsely flagged.
- **SC-005 — Refresh integrity on failure.** On induced #174
  failure during **Refresh thumbnail**, **0%** of runs mutate the
  Scene; `thumbnail_asset_ref`, `feature_set_hash`, and provenance
  remain byte-identical to their pre-refresh state.
- **SC-006 — Full provenance coverage.** **100%** of edit ops
  produce exactly one new `HistoryEntry` with the correct `op`,
  and **100%** of those ops land a corresponding entry in #176
  with the Scene thumbnail attached.
- **SC-007 — No silent overwrites on copy / duplicate.** **100%**
  of duplicate-timestamp collisions arising from `duplicate` or
  `copy-to-other-storyboard` present the Replace / Offset / Cancel
  prompt; none are silently accepted or silently rejected.
- **SC-008 — Missing-data routing.** **100%** of Scenes opened for
  editing whose `detectMissingDataForScene` is not `ok` surface
  the specific unresolved data in the edit form and expose exactly
  two remediation actions (`update-to-current` and delete).
- **SC-009 — No direct-write bypass.** Automated inspection of
  this spec's code MUST show zero direct writes to Storyboard /
  Scene Features; all writes flow through #215's module.
- **SC-010 — Offline.** The full edit suite (including refresh-
  thumbnail via #174) succeeds end-to-end with no network access
  (Article I).
- **SC-011 — Orphan-asset reclamation.** After a session with N
  delete ops and M `update-to-current` ops, the `gcOrphanAssets`
  pass on plot close MUST unlink **100%** of orphan PNGs (asset
  entries in `item.json` with no referring Scene) and MUST leave
  **100%** of live thumbnails untouched (FR-EDIT-024).
- **SC-012 — Bulk refresh integrity.** `refreshAllStaleThumbnails`
  MUST invoke #174 exactly once per stale Scene, MUST emit exactly
  one `refresh-thumbnail` card per successful refresh, and MUST
  emit exactly one `refresh-all-stale` rollup card per invocation.
  Per-Scene failures do NOT abort the run (FR-EDIT-025).
- **SC-013 — Log collapse fidelity.** With
  `debrief.logPanel.collapseConsecutiveSameOp = true`, ≥ 3
  consecutive same-op+same-actor `debrief.storyboardEdit` entries
  within a 120 s window MUST render as a single collapsed card.
  With the setting off, the same entries MUST render individually.
  In both states, `getTimeline` output MUST be byte-identical —
  the collapse is rendering-only (FR-EDIT-026).
- **SC-014 — Stale-pass perf budget.** `onPlotOpened` stale
  detection MUST complete within **50 ms** at the spec scale bound
  (5 Storyboards × 50 Scenes = 250 hash recomputations) on the
  reference CI runner. Regressions MUST fail CI (review 4A).

## Assumptions

- **Undo window scope**: session-scoped. A session ends when the
  plot is closed or the VS Code window is closed. Undo is
  intentionally simple in MVP — no cross-session undo, no
  per-Scene undo stack depth beyond the most recent delete.
- **Duplicate-timestamp default offset**: source `timestamp` + 1 s
  (same as #216 capture, for consistency).
- **No drag-reorder**: ordering is strictly `timestamp`-derived
  (same rule as #215 and #217); reordering is done via
  `update-to-current` or by editing a Scene's `timestamp` through
  the edit form.
- **Analysis Log entry format**: the log entry is the same shape
  as the `HistoryEntry` plus a rendered thumbnail URL and the op
  name; exact visual styling in #176 is owned by that feature, not
  this spec.
- **Markdown flavour**: standard CommonMark; no custom extensions
  are introduced by this spec.
- **Edit form primitives**: inline editing + a VS Code native
  quick-pick (or equivalent) for the destination-Storyboard picker;
  no custom modal infrastructure is introduced here.

## Dependencies

- **#215 (Storyboarding: Schema + CRUD core)** (hard) — provides
  every mutation entrypoint, the `feature_set_hash` recomputation,
  duplicate-timestamp detection, atomic compound ops, and the
  append-only `history` invariant.
- **#216 (Storyboarding: Capture)** (hard in practice) — without
  capture, no Scenes exist to edit. The edit suite can be tested
  against fixture data without #216 installed.
- **#217 (Storyboarding: Panel + Playback)** (hard) — this spec's
  UI lives entirely inside #217's panel (Scene rows, overflow
  menus, edit form). The missing-data **Open for editing** action
  surfaced by #217 lands on this spec's edit form.
- **#174 (Thumbnail capture pipeline)** (hard) — used by
  `update-to-current` and **Refresh thumbnail**. Failures roll the
  enclosing op back atomically.
- **#176 (Analysis Log Panel)** (hard) — every edit op emits an
  entry. Degraded no-op behaviour is acceptable only during
  development / feature-flag rollback, not at merge.

## Out of Scope

Everything not named in this spec remains in the parent epic's
out-of-scope list:

- **Dedicated distraction-free briefing renderer** — deferred to
  a follow-up beyond the epic.
- **Animated time-range Scenes** — `time_range` stays `null` in
  v1 per #215.
- **Cross-Storyboard drag-reorder or any ordering other than
  `timestamp`** — not introduced here.
- **Cross-session undo, undo stack depth > 1, or redo** — not
  introduced here.
- **Video export, Storyboard sharing, real-time collaboration,
  mini-app packaging with embedded snapshots** — phase-2 non-
  goals (same as parent epic).
- **Production-mode relaxation of the missing-data hard-block** —
  MVP applies it uniformly in playback (#217) and edit (#218); any
  relaxation is beyond the epic.
