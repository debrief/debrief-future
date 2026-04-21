# Feature Specification: Storyboarding — Capture

**Feature Branch**: `216-storyboarding-capture`
**Created**: 2026-04-20
**Status**: Draft — ready for quality-checklist validation
**Parent Epic**: #024 Storyboarding Briefings — [idea doc](../../docs/ideas/017-storyboarding-briefings.md)
**Sibling Specs**: #215 (schema + CRUD core), #216 (this), #217 (panel + playback), #218 (edit suite + housekeeping)
**Input**: Second of four sibling specs splitting epic #024. This slice delivers the capture flow — the first user-visible slice.

## Summary

This spec delivers the **capture flow**: the `Ctrl/Cmd+Alt+C` keybinding
(scoped to the Map Viewer), the first-capture quick-pick that prompts
for a new Storyboard name, the synchronous thumbnail integration with
#174, the DTG-default Scene title, and the duplicate-timestamp Replace
/ Offset / Cancel prompt.

Scope is deliberately narrow: capture only. A minimal Storyboard panel
opens on first capture and confirms the Scene has been persisted (shows
the Scene list) but provides **no playback transport, no editing
affordances, no multi-storyboard dropdown, no on-map rectangles, and no
stale indicator** — those belong to #217 and #218.

The value of shipping this slice: after merge, an analyst can create
durable, schema-validated Scenes from the Map Viewer with a single
keystroke, and those Scenes round-trip through plot save/reopen. That
alone is verifiable end-to-end without any downstream spec in place.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Capture a scene from the current map state (Priority: P1)

An analyst reviewing a recorded exercise reaches a moment of interest —
the map viewport is framed, the time slider is on the right instant,
and a chosen set of tracks is toggled visible. They press
`Ctrl/Cmd+Alt+C`. The current state is frozen as a new **Scene** inside
a **Storyboard** attached to the plot. The first capture on a plot also
creates the Storyboard itself via an inline quick-pick; subsequent
captures append to that Storyboard.

**Why this priority**: This is the sole scope of this spec and the
gateway to every downstream spec. Without capture, nothing exists for
#217 to play back or #218 to edit.

**Independent Test**: With a plot open in the Map Viewer, press
`Ctrl/Cmd+Alt+C` on a plot that has no Storyboards. Confirm: (a) the
panel prompts for a Storyboard name, (b) on confirmation a Scene Feature
whose `viewport`, `timestamp`, `visible_feature_ids`, `feature_set_hash`,
and `thumbnail_asset_ref` all match the current map state is persisted,
(c) the plot is marked dirty, (d) save-close-reopen restores the Scene
unchanged (schema round-trip via #215).

**Acceptance Scenarios**:

1. **Given** a plot in the Map Viewer with no Storyboards, **When** the
   analyst presses `Ctrl/Cmd+Alt+C` or clicks the capture button,
   **Then** the panel presents an inline quick-pick for a new Storyboard
   name, and on confirmation persists one Storyboard plus one Scene via
   #215's CRUD module.
2. **Given** a plot with exactly one active Storyboard, **When** the
   analyst captures again at a new timestamp, **Then** a new Scene is
   appended to that Storyboard, ordered by `timestamp` (per #215).
3. **Given** the #174 thumbnail pipeline returns an error for the
   current viewport, **When** capture is triggered, **Then** no Scene
   is persisted, an error toast surfaces the failure, and the plot's
   dirty state is unchanged by the failed op.
4. **Given** the active Storyboard already has a Scene at the current
   time-slider `timestamp`, **When** the analyst triggers capture,
   **Then** the panel prompts **Replace / Offset (+1 s) / Cancel** and
   no write occurs until the prompt is resolved. Replace overwrites the
   existing Scene; Offset adds one second and retries the collision
   check; Cancel abandons the capture.
5. **Given** a successful capture, **When** the new Scene appears in
   the panel, **Then** its default title is the DTG of its `timestamp`
   in `DDHHmmZ MMM YY` format (ISO-8601 fallback), and the plot is
   marked dirty so the analyst's explicit save makes the change
   durable.

---

### Edge Cases

- **Capture shortcut pressed outside the Map Viewer.** The `when`-
  clause scopes `Ctrl/Cmd+Alt+C` to the Map Viewer; pressing it
  elsewhere does nothing and does not surface an error.
- **Capture triggered during a thumbnail capture that's already in
  flight.** The second press is ignored (or queued — see below) to
  prevent overlapping #174 calls; UI surfaces a transient "capturing…"
  state.
- **Active-Storyboard selection missing.** If more than one Storyboard
  exists on the plot (created by a future run of #217) and none is
  currently selected, capture falls back to the one with the most
  recent `last_modified_at` (via #215's `getActiveStoryboardDefault`).
  This spec never offers a dropdown — that's #217.
- **Time-slider `timestamp` falls outside the plot's time range.**
  Capture is rejected with an error toast *before* the #174 call is
  made; no Scene is persisted. (This is a capture-time guard; the
  hard-block at playback/edit time is #217/#218's concern.)
- **Quick-pick dismissed without a name.** No Storyboard and no Scene
  are persisted; the plot is not marked dirty.
- **Duplicate Storyboard name** (if the plot already has a Storyboard
  with the proposed name). The quick-pick flags the collision inline
  and asks for a different name before persisting.
- **#174 returns a thumbnail whose dimensions differ from convention.**
  The capture still persists; the dimension contract is owned by #174,
  not enforced here.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-CAP-001**: System MUST provide a capture shortcut
  `Ctrl/Cmd+Alt+C`, scoped via a VS Code `when`-clause to the Map
  Viewer, that triggers the capture flow.
- **FR-CAP-002**: System MUST provide a capture button in the (minimal)
  Storyboard panel whose behaviour is identical to the shortcut.
- **FR-CAP-003**: On the first capture for a plot with no Storyboards,
  System MUST prompt the analyst for a Storyboard name via an inline
  quick-pick *before* persisting anything. Dismissing the quick-pick
  MUST abort the capture without side effects.
- **FR-CAP-004**: If the proposed Storyboard name collides with an
  existing Storyboard on the same plot, the quick-pick MUST flag the
  collision inline and block confirmation until the analyst supplies a
  unique name.
- **FR-CAP-005**: On subsequent captures, System MUST append the new
  Scene to the Storyboard returned by #215's
  `getActiveStoryboardDefault(plotFeatures)` (the one with the most
  recent `last_modified_at`) when no panel-selected Storyboard exists.
- **FR-CAP-006**: At capture time the System MUST snapshot, in order:
  `viewport` (center / zoom / bearing = 0), the time-slider `timestamp`,
  the set of currently visible plot feature IDs, and
  `feature_set_hash` computed by #215.
- **FR-CAP-007**: At capture time the System MUST request a thumbnail
  from the #174 pipeline **synchronously** and MUST receive a STAC
  asset reference before persisting the Scene.
- **FR-CAP-008**: If the #174 pipeline errors, System MUST NOT persist
  the Scene, MUST surface an error toast naming the failure, and MUST
  leave the plot's dirty state unchanged by the failed op.
- **FR-CAP-009**: Capture MUST reject a current time-slider `timestamp`
  that lies outside the plot's time range with an error toast; no
  Scene is persisted and no #174 call is made.
- **FR-CAP-010**: On duplicate-timestamp collision within the active
  Storyboard, System MUST present a Replace / Offset (+1 s) / Cancel
  prompt and MUST NOT write until the prompt is resolved. Offset MUST
  re-run the collision check after adding one second.
- **FR-CAP-011**: Default Scene `title` MUST be the DTG of
  `timestamp` in `DDHHmmZ MMM YY` (ZULU), falling back to ISO-8601 if
  the DTG format cannot be produced.
- **FR-CAP-012**: Capture MUST mark the plot dirty on success;
  changes become durable only on the analyst's explicit save via the
  existing plot-edit path.
- **FR-CAP-013**: On success, System MUST auto-open the minimal
  Storyboard panel so the analyst can see the new Scene confirmed.
  The panel's scope in this spec is limited to: current Storyboard's
  Scene list (thumbnail, title, DTG). Transport, edit affordances, and
  dropdown are out of scope.
- **FR-CAP-014**: Every successful capture MUST append a
  `HistoryEntry` with `op: "create"` to the Scene's `history` (handled
  by #215).
- **FR-CAP-015**: Capture MUST NOT introduce a second active-
  Storyboard concept beyond #215's "most-recent default"; multi-
  Storyboard dropdown UX belongs to #217.

### Key Entities

This slice creates `Storyboard` and `Scene` instances. Full schema
definitions and invariants are authoritative in
[#215 Key Entities](../215-storyboarding-schema/spec.md#key-entities-schema-first-authoritative).
Attributes this spec populates at capture time:

- **Storyboard** — on first-capture flow: `id` (ULID), `name` (analyst
  input), `schema_version = 1`, full provenance, initial `history` with
  a `create` entry.
- **Scene** — `id` (ULID), `storyboard_id`, DTG-default `title`,
  `viewport` with `bearing = 0`, `timestamp`, `visible_feature_ids`,
  `feature_set_hash`, `thumbnail_asset_ref` (from #174),
  `transition_duration_ms = 500`, `time_range = null`, full provenance,
  initial `history` with a `create` entry.

## User Interface Flow *(UI feature)*

### Decision Analysis

- **Primary Goal**: Turn the current map state into a durable, schema-
  validated Scene with one keystroke.
- **Key Decisions**:
  1. **When to capture** — the analyst decides the combination of map
     framing, plot-time, and visible-feature selection that's worth
     freezing.
  2. **What to name the first Storyboard** — on the first capture, the
     analyst chooses a meaningful Storyboard name (only required once
     per plot).
  3. **How to resolve a timestamp collision** — Replace, Offset (+1 s),
     or Cancel.
- **Decision Inputs**:
  - **Map + time slider + feature toggles** — live state that capture
    freezes.
  - **Quick-pick** — first-capture text field with inline collision
    feedback.
  - **Collision prompt** — names the conflicting Scene and exposes the
    three resolution options.
  - **Error toast** — on #174 failure or out-of-range timestamp.

### Screen Progression

| Step | Screen / State | User Action | Result |
|------|----------------|-------------|--------|
| 1 | Plot in Map Viewer, no Storyboards, panel hidden | Frame map, move time slider, toggle tracks | Live state ready to freeze |
| 2 | Same | Press `Ctrl/Cmd+Alt+C` | Inline quick-pick prompts for a Storyboard name |
| 3 | Quick-pick open | Type a name (unique on this plot) and confirm | Storyboard + first Scene persisted via #215; #174 produces the thumbnail synchronously; plot marked dirty |
| 4 | Minimal Storyboard panel auto-opens, single Scene row with thumbnail + DTG title | — | Analyst sees the Scene confirmed; can re-frame and press `Ctrl/Cmd+Alt+C` again to append more |
| 5 | Subsequent capture at a duplicate timestamp | Press `Ctrl/Cmd+Alt+C` | Collision prompt: Replace / Offset (+1 s) / Cancel; on resolution the Scene is persisted, offset retried, or the op abandoned |

### UI States

- **Empty State (no Storyboards).** Minimal panel is hidden; the
  shortcut + capture button are the only affordances. First capture
  opens the quick-pick.
- **Loading State (capture in flight).** Capture button shows a
  spinner; the shortcut is temporarily ignored; the panel (once auto-
  opened) shows an inline pending row with a placeholder thumbnail
  until #174 returns. Plot is not marked dirty until the Scene is
  actually persisted.
- **Error State (thumbnail pipeline failure).** Red toast: *"Capture
  failed — could not produce thumbnail. Scene not saved."* No row is
  added; panel stays in its pre-capture state.
- **Error State (time-slider out of range).** Red toast: *"Capture
  failed — time slider is outside this plot's time range."* No #174
  call is made.
- **Error State (duplicate timestamp).** Inline prompt: *"A scene
  already exists at this timestamp. Replace / Offset (+1 s) /
  Cancel."* No write occurs until the prompt is resolved.
- **Error State (duplicate Storyboard name on first-capture).** Quick-
  pick flags the collision inline; confirm button disabled until a
  unique name is entered.
- **Success State.** New Scene row appears in the minimal panel with
  its thumbnail, DTG-default title, and a brief toast confirming
  persistence. The plot is marked dirty.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 — Fast capture loop.** From shortcut-press to Scene visible
  in the minimal panel, the median end-to-end time is **under 1.5
  seconds** (including synchronous #174 thumbnail) on the reference
  test plot.
- **SC-002 — Integrity on failure.** When thumbnail production fails on
  a capture attempt, **no partial Scene** is persisted and the plot's
  dirty state is unchanged — measured across **100%** of induced-
  failure test runs.
- **SC-003 — No silent overwrites.** **100%** of capture attempts at
  an already-used timestamp present the Replace / Offset / Cancel
  prompt; none are silently accepted or silently rejected.
- **SC-004 — Out-of-range guard.** **100%** of capture attempts with a
  time-slider `timestamp` outside the plot's time range are rejected
  **before** #174 is invoked (verified by asserting #174 is not called
  in the failure path).
- **SC-005 — Round-trip across save / reopen.** A Scene created by
  capture and persisted via the host's save path is byte-identical to
  its pre-save state after save-close-reopen on the reference plot
  (delegated to #215's round-trip guarantee).
- **SC-006 — Scoped shortcut.** The `Ctrl/Cmd+Alt+C` shortcut is
  triggerable only when the Map Viewer has focus; pressing it with any
  other VS Code view focused is a no-op with no error and no #174 call.
- **SC-007 — First-capture UX.** On a plot with no prior Storyboards,
  a trained analyst completes the full first-capture flow (frame →
  shortcut → name → confirm) in **under 10 seconds** median.
- **SC-008 — Offline.** The capture flow succeeds end-to-end (including
  #174 thumbnail production) with no network access (Article I).

## Assumptions

- **DTG format**: `DDHHmmZ MMM YY` (ZULU); fallback ISO-8601 when DTG
  cannot be formatted (formatter lives in #215's module).
- **Default `transition_duration_ms`**: `500` (written by capture,
  consumed by #217).
- **Active Storyboard on non-first capture**: the most recently
  modified Storyboard on the plot. Analyst-driven selection is
  introduced by #217.
- **Duplicate-timestamp offset default**: `+1 second`, compounded per
  Offset press if the new timestamp also collides.
- **Quick-pick is a VS Code native quick-pick** (or an equivalent
  inline prompt primitive); no custom modal infrastructure is
  introduced by this spec.

## Dependencies

- **#215 (Storyboarding: Schema + CRUD core)** (hard) — provides
  `createStoryboard`, `createScene`, duplicate-timestamp detection,
  `feature_set_hash` computation, the DTG formatter, and
  `getActiveStoryboardDefault`.
- **#174 Thumbnail capture pipeline** (hard) — synchronous thumbnail
  production from the Map Viewer's current state. Capture aborts on
  #174 failure.
- **VS Code Map Viewer** (hard) — the host for the shortcut and the
  live viewport / time-slider / feature-toggle state that capture
  freezes.
- **Plot save/dirty-state mechanism** (hard) — capture marks the plot
  dirty; durability requires the analyst's explicit save via the
  existing plot-edit path.

## Out of Scope

- **Storyboard panel beyond a minimal Scene list** — dropdown, empty
  states beyond "no Storyboards", active-Storyboard switching,
  overflow menu for create/rename/delete Storyboard → #217.
- **Playback transport, `flyTo`, time-slider tween, scrub-window
  lock, on-map Scene rectangles, missing-data hard-block** → #217.
- **Edit suite** (rename, description, delete+undo, update-to-
  current, duplicate, copy-to-other-storyboard) → #218.
- **Stale-thumbnail detection and refresh action** → #218.
- **Analysis Log (#176) integration** — the `HistoryEntry` is written
  to the Feature's `history[]` by #215, but surfacing it in the Log
  Panel is wired up by #218.
