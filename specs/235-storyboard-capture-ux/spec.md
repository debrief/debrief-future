# Feature Specification: Storyboard Capture & Maintenance UX (Cross-Host)

**Feature Branch**: `235-storyboard-capture-ux`
**Created**: 2026-04-28
**Status**: Draft — ready for quality-checklist validation
**Parent Epic**: #024 Storyboarding Briefings — [idea doc](../../docs/ideas/017-storyboarding-briefings.md)
**Related Specs**: #215 (schema + CRUD core), #216 (capture flow), #217 (panel + playback), #218 (edit suite), #230 (storyboard edit wiring), #234 (storyboard edit polish follow-up)
**Input**: Enable storyboard capture and maintenance in web-shell, with a unified UI/UX design that the VS Code host adopts at the same time. Hard constraint: during capture, the analyst MUST retain simultaneous visibility and operability of the time controller and map, because both directly determine the Scene's temporal and spatial viewport.

## Summary

The Storyboarding epic has shipped capture (#216), playback (#217), and the
edit suite (#218) inside the **VS Code host only**. The web-shell currently
exposes a fixture-driven `StoryboardEditHarness` for component development,
but has **no end-to-end capture or maintenance path** against a real plot —
analysts running the browser-based shell cannot author a storyboard at all.

This spec closes that gap. It is **not a port** of the VS Code flow. The
existing VS Code flow leans on host-specific primitives — a top-of-window
quick-pick for first-capture naming, a `ctrl/cmd+alt+c` keybinding scoped
via a `when`-clause, and a side panel that opens on first capture — and
these primitives bake an assumption that the analyst's eye is on the
quick-pick or panel at the critical moment, not on the map and time
controller. In practice the temporal viewport (current time / playhead
position) and the spatial viewport (map center / zoom / visible feature
toggles) are the *whole point* of a Scene: occluding either control during
capture means the analyst is committing a Scene they can't see.

This spec re-designs the capture and maintenance UX so:

1. The **time controller and map are continuously visible and operable**
   throughout every capture, re-capture, and Scene-edit flow.
2. The **Storyboard panel becomes a modeless side rail** with all naming,
   duplicate-timestamp resolution, and per-Scene editing happening inline
   inside it — never as a top-of-window quick-pick or modal that occludes
   the map.
3. The web-shell host gains the **same** capture and maintenance flow as
   VS Code; both hosts use one shared component-level Storyboard panel
   from `@debrief/components`.
4. The existing VS Code flow **evolves** to the new pattern: the keyboard
   shortcut and `when`-clause stay; the quick-pick and modal prompts go
   away, replaced by inline panel affordances.

After this slice merges, an analyst on either host can capture, name,
re-capture, rename, describe, delete (with undo), duplicate, copy across
storyboards, and refresh stale thumbnails for Scenes — all without ever
losing sight of the time controller or the map.

## Clarifications

### Session 2026-04-28

- Q: Does this spec replace the current VS Code capture/edit UX outright, or run the new panel-centric UX in parallel with the legacy quick-pick / modal flow? → A: Replace outright in the same PR — legacy VS Code first-capture quick-pick and Replace/Offset/Cancel modal are removed when this spec ships; FR-VSC-025 and SC-009 stand as written.
- Q: Should the rail expose a Scene reorder affordance (drag-to-reorder, timestamp edit, or both)? → A: No reorder affordance. A Scene's `timestamp` is its temporal viewport — editing it would not preserve "the same Scene at a different position", it would make a different Scene. To change the order, the analyst deletes the misplaced Scene and captures a new one at the desired moment. The rail therefore exposes no drag handle, and the Scene's `timestamp` is read-only in every in-row form.
- Q: How much of #218's edit suite ships into web-shell in this slice? → A: Full parity. Web-shell delivers every Scene-level maintenance op listed in FR-MAINT-018 (rename, describe, delete+undo, update-to-current, duplicate, copy-to-other-storyboard, refresh-stale-thumbnail) plus every Storyboard-level op in FR-UX-006 (create, rename, delete with cascade, switch active) in the same PR; analysts switching between hosts on the same plot find no "VS Code only" gaps.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Capture a scene in web-shell without losing sight of map or time controls (Priority: P1)

An analyst working in the web-shell has loaded a plot, framed the map,
positioned the time playhead, and toggled the right tracks visible. They
want to freeze that moment as a Scene. Throughout the capture flow — from
clicking the capture button to confirming the Storyboard name and
resolving any duplicate-timestamp collision — the **map and the time
controller stay fully visible and remain operable**: the analyst can
nudge the playhead by a second, pan the map a degree east, or toggle one
more track on, and the Scene captures the corrected state.

**Why this priority**: This is the new capability that this spec
introduces. Web-shell users have no capture path today; the user-visible
gap is total. The "continuous visibility" requirement is the design
spine — every other story below depends on it being established here.

**Independent Test**: With a plot open in the web-shell Analysis view,
the storyboard side rail visible, and no Storyboards on the plot, the
analyst:

1. Sees the map and time controller continuously throughout — neither
   is hidden, dimmed below operable contrast, or moved off-screen at
   any point.
2. Clicks **Capture Scene** in the side rail.
3. Sees an inline naming row appear *inside the side rail* (not as a
   top-of-window prompt), pre-populated with a default Storyboard name.
4. While the inline row is open, drags the time controller back two
   seconds — the new Scene's `timestamp` updates live to follow.
5. Confirms; one Storyboard and one Scene are persisted via #215's
   shared CRUD module; the Scene's `viewport`, `timestamp`,
   `visible_feature_ids`, `feature_set_hash`, and `thumbnail_asset_ref`
   match the *final* live state at the moment of confirmation, not the
   state at button-press.

**Acceptance Scenarios**:

1. **Given** an analyst in the web-shell with a plot open and no
   Storyboards, **When** they click Capture Scene, **Then** an inline
   naming row appears inside the side rail; the central area continues
   to render the map and the time controller at full size and full
   interactivity.
2. **Given** the inline naming row is open and the analyst nudges the
   time playhead while it is open, **When** they confirm, **Then** the
   persisted Scene's `timestamp` reflects the *latest* playhead value,
   not the value at the moment Capture Scene was clicked.
3. **Given** the active Storyboard already has a Scene at the live
   playhead `timestamp`, **When** the analyst clicks Capture Scene,
   **Then** an inline collision banner appears *above the affected
   Scene row in the side rail* offering Replace / Offset (+1 s) /
   Cancel; the central area remains uncovered; the analyst can still
   pan the map or move the playhead while the banner is open.
4. **Given** the thumbnail pipeline (#174) errors during capture,
   **When** the analyst confirms, **Then** an inline error message
   appears in the side rail (not a host-level modal); no Scene is
   persisted; the plot's dirty state is unchanged.

---

### User Story 2 — Maintain a captured scene without leaving the live map or time view (Priority: P1)

After capturing one or more Scenes the analyst polishes the storyboard:
renames a Scene, edits its description, deletes a wrong capture (with an
undo window), updates a Scene to the current map state ("update-to-
current"), duplicates a Scene to a new timestamp, copies a Scene into a
different Storyboard on the same plot, and refreshes a stale thumbnail.
Every one of these operations happens **inside the side rail** — there
is no modal dialog, no quick-pick, and no full-screen edit form. Throughout
each op the live map and time controller stay visible and operable, so
the analyst can verify a re-capture's framing in the central area at the
exact moment they trigger it.

**Why this priority**: Without maintenance, capture (P1 above) yields an
unpolished list the analyst can't fix without leaving the host. The
"never occlude the map or time controller" rule that P1 establishes
generalises only if every maintenance op honours it too.

**Independent Test**: Starting from a plot with a fixture Storyboard of
three Scenes, the analyst exercises each maintenance op in the side rail
and confirms: (a) the mutation persists via #215's CRUD module, (b) the
appropriate provenance entry is appended (per #215's `LogEntry` encoding),
(c) at no point during any op does the side rail expand, a modal open,
or any other UI element occlude the map or the time controller in the
central area.

**Acceptance Scenarios**:

1. **Given** a Scene row in the side rail, **When** the analyst clicks
   the rename affordance, **Then** the Scene title becomes editable
   in-place inside its own row; the row's height grows by at most one
   line; the central area is unchanged.
2. **Given** a Scene row, **When** the analyst clicks **Update to
   current**, **Then** the Scene's `viewport`, `timestamp`,
   `visible_feature_ids`, `feature_set_hash`, and `thumbnail_asset_ref`
   are replaced with the live state, an `update-to-current` provenance
   entry is appended, and at no point during the op does the central
   area dim or hide.
3. **Given** a Scene row, **When** the analyst clicks delete, **Then**
   the row collapses with an inline toast-style undo affordance *inside
   the side rail*; clicking Undo within the toast window restores the
   Scene; the central area is unchanged throughout.
4. **Given** a Scene with a `feature_set_hash` that no longer matches
   the canonicalised `visible_feature_ids` of the live plot, **When**
   the side rail renders, **Then** the row shows a stale badge and a
   refresh affordance that re-runs the thumbnail pipeline (#174) in
   place; on success the Scene is updated; on failure the badge stays
   and an inline error appears under the row.

---

### User Story 3 — Manage multiple storyboards on a plot from the side rail (Priority: P2)

A plot can carry several storyboards (commander's view, ASW evidence,
training debrief). The analyst creates additional storyboards, renames
them, switches the active storyboard, and deletes a storyboard with
cascade — all from the side rail header, with the same "never occlude
the central area" rule.

**Why this priority**: Multi-storyboard support is already in #217's
scope; this spec inherits the requirement but moves the affordances into
the unified side rail. It is P2 because most analysts on most plots will
work with a single storyboard, but multi-storyboard plots are a
first-class supported case.

**Independent Test**: With a plot carrying two Storyboards, the analyst
opens the side rail, switches between them via the header dropdown,
creates a third via the header overflow menu, renames it, and deletes
the second — all without any modal or full-window prompt opening.

**Acceptance Scenarios**:

1. **Given** a plot with two Storyboards, **When** the analyst opens
   the side rail header dropdown, **Then** both names are listed and
   the active one is marked; selecting the other switches the active
   storyboard for the panel only (the on-map Scene rectangles from
   #217 follow the panel's active selection).
2. **Given** the side rail is showing a Storyboard with three Scenes,
   **When** the analyst chooses **Delete storyboard** from the
   overflow menu, **Then** an inline confirmation appears in the
   header area listing the cascade count ("3 Scenes will also be
   deleted"); confirming deletes the Storyboard and its Scenes via
   #215's cascade; an inline toast-undo affordance restores all of
   them within the undo window.
3. **Given** a plot with no Storyboards, **When** the analyst opens
   the side rail, **Then** the empty state offers a single primary
   action — **Capture Scene** — and clicking it triggers the User
   Story 1 first-capture flow.

---

### User Story 4 — VS Code adopts the same panel-centric UX (Priority: P2)

VS Code users keep their `ctrl/cmd+alt+c` shortcut and the Map Viewer
`when`-clause that scopes it. What changes: the first-capture name
prompt no longer surfaces as a top-of-window VS Code quick-pick; the
duplicate-timestamp prompt no longer surfaces as a Replace / Offset /
Cancel modal; both move into the side rail, identical to the web-shell
experience. The side rail itself is the existing VS Code Storyboard
panel view (`storyboardPanelView`), now driven by the same
`@debrief/components` panel as web-shell.

**Why this priority**: Cross-host UX consistency is a non-functional
goal of this spec but a real one — analysts who switch between hosts
on the same plot must not have to re-learn the flow. P2 reflects that
without this story we ship two diverging UXes; with it, we ship one.

**Independent Test**: A VS Code user presses `ctrl/cmd+alt+c` on a plot
with no Storyboards. The Storyboard panel opens (it already does in
#216), but instead of a quick-pick at the top of the window, the
in-panel naming row appears — the same component-level row as web-shell.
The Map Viewer is uncovered; the time controller is uncovered; the
analyst confirms and the Scene is persisted via the same path as before.

**Acceptance Scenarios**:

1. **Given** a VS Code user on a plot with no Storyboards, **When**
   they press `ctrl/cmd+alt+c` in the Map Viewer, **Then** the
   Storyboard panel opens (existing behaviour) and shows the in-panel
   naming row inside it (new behaviour); no VS Code quick-pick opens
   at the top of the window.
2. **Given** a duplicate-timestamp collision in VS Code, **When** the
   analyst captures, **Then** the Replace / Offset / Cancel banner
   appears inline in the panel above the affected Scene row, identical
   to web-shell; no modal dialog opens.
3. **Given** the Storyboard panel is open in VS Code, **When** any
   maintenance op is invoked from a Scene row, **Then** the affordance
   is identical to web-shell — same component, same layout, same
   keyboard targets — and the Map Viewer is uncovered throughout.

---

### Edge Cases

- **Window narrower than the side rail's minimum**: when the host's
  central area would shrink below a usable map width, the side rail
  collapses to a tab strip on the right edge; expanding it back is a
  one-click action; capture is still possible from the collapsed
  state via a single icon button (the only entry point) but the
  inline naming row is replaced with a slide-out drawer that overlays
  *only the side rail's column*, never the central area.
- **Live state changes mid-edit row**: if the analyst opens a Scene's
  rename row and then moves the time playhead, only the *title* is
  edited; `viewport`, `timestamp`, and `visible_feature_ids` are
  untouched. To reset those, the analyst clicks Update to current
  explicitly.
- **Capture clicked while another capture is in flight**: the second
  click is ignored (the button shows a spinner); no second pipeline
  call is queued or batched.
- **Time controller hidden by host chrome (e.g. VS Code zen mode)**:
  capture is still triggerable via the keyboard shortcut, but the
  side rail surfaces a one-line warning ("Time controller is hidden;
  press the toggle to show it before capturing") rather than failing
  silently.
- **Scene deletion mid-undo-window**: if a second deletion happens
  before the previous Scene's undo window closes, both undo toasts
  stack inside the side rail; each is independently dismissible /
  undoable; neither occludes the central area.
- **Storyboard deletion cascade with stale thumbnails**: cascade
  deletes the parent and child Features but the thumbnail assets are
  garbage-collected on plot close per #218's housekeeping pass — this
  spec does not introduce a new GC path.
- **First capture on a plot when the analyst dismisses the inline
  naming row** (clicks away or presses Escape): no Storyboard and no
  Scene are persisted; the plot is not marked dirty; the side rail
  returns to its empty state.
- **Offset (+1 s) advances past the plot's time range**: at any
  Offset press, if the resulting timestamp would fall outside the
  plot's time range, the banner replaces the Offset button with an
  inline "this would push past the plot's time range — pick a
  different moment" message; only Replace and Cancel remain
  enabled. The 60-step Offset cap (per `CollisionBannerState`)
  applies independently and is reached first only when the plot's
  time range exceeds 60 seconds beyond the original capture
  timestamp.
- **Browser tab closes mid-capture in web-shell**: a `pagehide` /
  unmount listener on the web-shell capture command resets the
  `captureInFlight` reducer slice and aborts the in-flight
  thumbnail-capture promise. No Scene is persisted by a closed tab.

## Requirements *(mandatory)*

### Functional Requirements

#### Cross-host UX (host-agnostic)

- **FR-UX-001**: System MUST provide a Storyboard side rail in **both**
  the web-shell host and the VS Code host, sourced from a single
  `@debrief/components` component (the panel surface; no host-specific
  panel implementation).
- **FR-UX-002**: The side rail MUST render in a column adjacent to —
  not on top of — the host's central area. The central area MUST
  continue to render the map and the time controller without
  occlusion, dimming below operable contrast, or geometry change for
  the duration of every capture and every maintenance op covered by
  FR-CAP-* and FR-MAINT-* below.
- **FR-UX-003**: The first-capture Storyboard naming prompt MUST be an
  inline editable row *inside the side rail*. The prompt MUST NOT be a
  host-level quick-pick, host-level modal, or any element that overlays
  the central area.
- **FR-UX-004**: The duplicate-timestamp resolution prompt (Replace /
  Offset / Cancel from #216) MUST be an inline banner *inside the side
  rail*, anchored to the affected Scene row, and MUST NOT be a host-
  level modal.
- **FR-UX-005**: All Scene-level maintenance affordances (rename,
  describe, delete + undo, update-to-current, duplicate, copy-to-other-
  storyboard, refresh stale thumbnail) MUST surface as in-row controls
  inside the side rail; none MUST require a separate edit window or
  modal.
- **FR-UX-006**: All Storyboard-level affordances (create, rename,
  delete with cascade preview, switch active) MUST surface as side
  rail header / overflow controls; none MUST require a separate edit
  window or modal.
- **FR-UX-007**: The side rail MUST collapse to a tab strip on hosts /
  viewport widths where keeping it expanded would shrink the central
  area below the host's documented map-minimum width. Expanding it
  back MUST be a one-click action and MUST NOT navigate the analyst
  away from the plot.
- **FR-UX-008**: When the side rail is collapsed, the only capture
  entry point MUST be the rail's expand-trigger button; clicking it
  expands the rail and immediately presents the inline capture
  affordance (no second click required).

#### Capture (cross-host)

- **FR-CAP-009**: System MUST provide a primary **Capture Scene**
  affordance in the side rail (button, with a label) that is operable
  by mouse and by keyboard (focus + Enter / Space).
- **FR-CAP-010**: VS Code MUST retain the `ctrl/cmd+alt+c` keybinding
  scoped via the existing Map Viewer `when`-clause; pressing it MUST
  trigger the same code path as the side rail's Capture Scene button.
- **FR-CAP-011**: Web-shell MUST bind a host-appropriate keyboard
  shortcut to Capture Scene (default `ctrl/cmd+alt+c`, but suppressed
  when the browser intercepts the chord), routed through the
  Analysis-view focus scope so it does not fire when the analyst is
  typing in any other input.
- **FR-CAP-012**: At the moment of confirmation (not at the moment of
  Capture Scene press), the System MUST snapshot, in order: `viewport`
  (center / zoom / `bearing = 0`), the time controller `timestamp`,
  the set of currently visible feature IDs, and the
  `feature_set_hash` (computed by #215). The snapshot MUST reflect any
  changes the analyst made between the press and the confirmation.
- **FR-CAP-013**: The capture flow MUST request a thumbnail from the
  #174 pipeline synchronously and MUST receive a STAC asset reference
  before persisting the Scene. On pipeline error, no Scene is persisted
  (consistent with #216 FR-CAP-008).
- **FR-CAP-014**: The capture flow MUST guard against an out-of-range
  `timestamp` (per #216 FR-CAP-009) and MUST surface the failure as an
  inline error in the side rail, not as a host-level toast.
- **FR-CAP-015**: First capture MUST present the inline naming row
  pre-filled with a sensible default Storyboard name (e.g. plot name +
  `" — storyboard"`), but the analyst MUST confirm or change it before
  persistence. Dismissing the row MUST abort with no side effects
  (consistent with #216 FR-CAP-003).
- **FR-CAP-016**: On duplicate Storyboard name, the inline naming row
  MUST flag the collision and block confirmation until the analyst
  supplies a unique name (consistent with #216 FR-CAP-004).
- **FR-CAP-017**: On duplicate-timestamp collision the inline collision
  banner MUST offer Replace / Offset (+1 s) / Cancel; Offset MUST
  re-run the collision check after each press (consistent with #216
  FR-CAP-010).
- **FR-CAP-017a**: On any Offset press, if the resulting timestamp
  would fall outside the plot's time range (the same range checked
  by FR-CAP-014), the banner MUST hide the Offset button and surface
  an inline "this would push past the plot's time range" message
  instead; Replace and Cancel MUST remain available; no further
  Offset re-run is attempted by the host.

#### Maintenance (cross-host)

- **FR-MAINT-018**: For each Scene the side rail MUST expose: rename,
  edit description (markdown), delete (with toast-undo), update-to-
  current, duplicate, copy-to-other-storyboard, refresh stale thumbnail.
  These mutations MUST go through #215's CRUD module exactly as #218's
  VS Code flow does today.
- **FR-MAINT-019**: Update-to-current MUST replace the Scene's
  `viewport`, `timestamp`, `visible_feature_ids`, `feature_set_hash`,
  and `thumbnail_asset_ref` with the live state at the moment of click,
  appending one `update-to-current` provenance entry. The live time
  controller and map MUST remain visible and operable for the whole op.
- **FR-MAINT-019a**: A Scene's `timestamp` MUST be treated as immutable
  by every in-row edit affordance. The rename form and any per-Scene
  properties form MUST NOT expose `timestamp` as editable. The rail MUST
  NOT expose a drag-to-reorder handle. Reordering is achieved by
  deleting the misplaced Scene and capturing a new one at the desired
  moment; `update-to-current` (FR-MAINT-019) is the only sanctioned path
  by which a Scene's `timestamp` may change after creation, and that op
  re-anchors the entire Scene to live state by design.
- **FR-MAINT-020**: Stale-thumbnail detection per #218 MUST surface a
  per-row badge with an in-row refresh affordance; refresh MUST not
  open a modal and MUST not occlude the central area.
- **FR-MAINT-021**: Storyboard delete MUST present an inline cascade
  preview (Scene count) inside the side rail header before persisting;
  confirming triggers #215's cascade; an inline toast-undo affordance
  MUST restore the Storyboard and all child Scenes within the undo
  window.

#### Visibility invariants

- **FR-VIS-022**: For the duration of every capture flow (from press
  through confirmation), and every maintenance op listed in FR-MAINT-*,
  System MUST NOT render any UI element (modal, overlay, dropdown,
  tooltip, toast, drawer, popover, secondary panel, focus trap, or
  scrim) that overlaps the bounding box of the host's map view or the
  bounding box of the host's time controller.
- **FR-VIS-023**: For the duration of every flow named in FR-VIS-022,
  System MUST keep both the map view and the time controller fully
  interactive (pointer events, keyboard focus, scrolling/zooming) — no
  pointer-event blocker, focus trap, or `aria-hidden` attribute may be
  applied to either control or any of their ancestors.
- **FR-VIS-024**: Programmatic verification of FR-VIS-022 and FR-VIS-023
  MUST exist as automated tests (Playwright for both hosts) covering at
  minimum: first capture (with naming row), capture with duplicate-
  timestamp banner, every maintenance op listed in FR-MAINT-*, and
  Storyboard delete confirmation.

#### VS Code migration

- **FR-VSC-025**: The existing VS Code first-capture quick-pick MUST be
  replaced by the inline naming row; the existing Replace / Offset /
  Cancel modal MUST be replaced by the inline collision banner. The
  `ctrl/cmd+alt+c` keybinding, the Map Viewer `when`-clause, and the
  `apps/vscode/src/commands/captureScene.ts` command entry MUST remain.
- **FR-VSC-026**: All existing VS Code message-passing surfaces (the
  `storyboardPanelMessages.ts` types, the `StoryboardPanel` webview
  bootstrap, and the `storyboardEdit` reducer wiring from #230) MUST
  remain; the new inline affordances reuse those surfaces rather than
  introducing a parallel host channel.

#### Web-shell wiring

- **FR-WEB-027**: The web-shell MUST replace the fixture-driven
  `StoryboardEditHarness` mounting with a real session-state-backed
  panel, wired to the live `featureCollection`, the live time
  controller, and the live MapView. Fixture mounting MAY remain
  available for component development under a non-default route.
- **FR-WEB-028**: The web-shell capture path MUST route thumbnail
  capture through the same #174 pipeline VS Code uses, adapted to the
  browser environment per #174's existing host-adaptor pattern. No new
  thumbnail capture path may be introduced by this spec.
- **FR-WEB-029**: Web-shell MUST persist storyboard mutations into the
  same plot FeatureCollection that VS Code mutates; opening the same
  plot in either host MUST show the same Storyboards and Scenes (no
  host-specific persistence side channel).
- **FR-WEB-029a**: While the web-shell host has no production STAC
  write path, captured Storyboards and Scenes are **session-only** —
  they live in the live `getSessionStore()` FeatureCollection and
  vanish on page reload. The side rail MUST display a persistent
  badge / status line in its header reading "Session-only — save in
  VS Code to persist" whenever any captured-but-unpersisted
  Storyboard or Scene exists in the active session. The badge MUST
  clear when the session is empty of unpersisted captures or when a
  future spec wires real persistence. This requirement honours
  Article I.3 (no silent failures) — the analyst is never left
  guessing whether their captures will survive.

### Key Entities

This spec creates and mutates `Storyboard` and `Scene` Features as
defined by [#215 Key Entities](../215-storyboarding-schema/spec.md#key-entities-schema-first-authoritative).
No new entities are introduced. Provenance encoding follows #215's
`LogEntry` mapping (`was_generated_by.tool = "storyboard-crud"`,
`parameters.op` per the existing op vocabulary).

## User Interface Flow *(UI feature)*

### Decision Analysis

- **Primary Goal**: Capture and maintain a storyboard from either host
  with continuous, unobstructed access to the map and time controller —
  the two controls that define every Scene's viewport.

- **Key Decisions**:

  1. **When to capture** — the analyst's hands stay on the time
     controller and map until the moment of confirmation; the inline
     naming row co-exists with both controls so the moment can be
     adjusted right up to confirm.
  2. **What to name the first Storyboard** — chosen once per plot in
     the inline naming row, with a sensible default and inline
     duplicate-name detection.
  3. **How to resolve a timestamp collision** — Replace / Offset (+1 s)
     / Cancel, decided in the inline banner with the live time
     controller still visible (so Offset's effect is visible
     immediately).
  4. **Whether a captured Scene needs adjusting** — rename, edit
     description, update-to-current, duplicate, copy-to-other-
     storyboard, delete + undo — all available as in-row controls.
  5. **Which Storyboard is active** — switched from the side rail
     header dropdown when more than one exists.

- **Decision Inputs**:

  - **Live map + live time controller + live feature toggles** — the
    state being captured; visible at all times.
  - **Side rail Scene list** — thumbnails, DTG titles, stale badges —
    the analyst's visual record of what's already captured.
  - **Inline naming row** — Storyboard name field with collision
    feedback.
  - **Inline collision banner** — Replace / Offset / Cancel.
  - **Inline error messages** — surface in the side rail's status
    region, never as a host modal.

### Screen Progression

| Step | Screen / State | User Action | Result |
|------|----------------|-------------|--------|
| 1 | Plot open in central area, side rail visible at right, no Storyboards | Frame map, position time playhead, toggle tracks | Live state ready to freeze |
| 2 | Same | Click **Capture Scene** in side rail (or press shortcut) | Inline naming row appears in the side rail; map and time controller unchanged |
| 3 | Naming row open | Adjust default name if desired; nudge time playhead by a second | Name validates inline against existing Storyboards on the plot; Scene's eventual `timestamp` follows the playhead |
| 4 | Naming row open, valid name, no collision | Confirm | Storyboard + first Scene persist via #215; thumbnail produced via #174; side rail now shows the Scene row; central area unchanged |
| 5 | Side rail with one Scene row | Re-frame map and time, click **Capture Scene** again | Inline naming row not shown (subsequent capture); Scene appended to active Storyboard; side rail row count increments |
| 6 | Side rail with multiple Scenes; analyst captures at an existing timestamp | Click **Capture Scene** | Inline collision banner appears anchored above the conflicting row; Replace / Offset / Cancel; map and time controller still operable |
| 7 | Side rail shows a Scene row | Click rename / Update to current / Delete / Duplicate / Copy-to / Refresh | Action executes inline; central area unchanged; provenance entry appended; for delete, toast-undo appears in the rail |
| 8 | Plot has 2+ Storyboards | Open header dropdown | Active storyboard switches; on-map Scene rectangles (#217) re-render for the new active storyboard; map and time controller unchanged |

### UI States

- **Empty State (no Storyboards on plot).** Side rail shows a brief
  "No storyboards yet" header and a single primary **Capture Scene**
  button. Map and time controller are unchanged in the central area.
- **Inline Naming State (first capture).** Naming row is the only
  interactive element below the rail header; the row carries a text
  field, an inline collision warning slot, Confirm and Cancel buttons.
  Map and time controller remain fully interactive.
- **Loading State (capture in flight).** Capture button shows a
  spinner; the in-rail row reserved for the new Scene shows a
  placeholder thumbnail and an inline "capturing…" label until #174
  returns. Map and time controller remain interactive.
- **Inline Collision State.** A banner ("A scene already exists at
  this timestamp") appears anchored above the conflicting row with
  three buttons: Replace, Offset (+1 s), Cancel. The conflicting row
  is highlighted. Map and time controller remain interactive — the
  analyst can move the playhead and Offset's effect is reflected.
- **Error States.**
  - Thumbnail pipeline error: inline message under the in-flight row,
    "Thumbnail capture failed. Try again?" with a retry button.
  - Out-of-range timestamp: inline message in the rail status region,
    "Time controller is outside this plot's time range." No #174
    call is made.
  - Duplicate Storyboard name (first capture): naming row's collision
    slot shows the conflict; Confirm is disabled until resolved.
- **Stale-Thumbnail Indicator State.** Affected Scene rows carry a
  small badge plus an in-row refresh button; clicking refresh runs
  #174 in place; on success the badge clears; on failure an inline
  message appears under the row.
- **Undo State.** Deletion of a Scene leaves a toast-style row in the
  side rail showing the Scene's title and an Undo button; the toast
  disappears at the end of the undo window or when the analyst clicks
  Undo or dismiss.
- **Collapsed-Rail State (narrow viewport).** The rail collapses to a
  vertical tab strip on the right edge of the host. A single icon
  button expands it. While collapsed, no in-rail controls are
  reachable; capture is gated behind expansion (one click).
- **Multi-Storyboard State.** Side rail header shows the active
  storyboard's name as a dropdown trigger; opening the dropdown lists
  all Storyboards on the plot with their Scene counts and a
  **Create new** action. An overflow menu on the header exposes
  rename / delete on the active Storyboard.
- **VS Code Parity State.** When the rail is rendered inside the VS
  Code Storyboard panel webview (the existing `storyboardPanelView`),
  every state above MUST be visually and behaviourally identical to
  the web-shell render at the same viewport width.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 — No occlusion during capture.** During every automated
  capture-flow run on both hosts, the bounding boxes of the map view
  and the time controller are reachable by pointer and keyboard for
  **100%** of the flow's duration; **0 frames** show any UI element
  overlapping either bounding box.

- **SC-002 — No occlusion during maintenance.** SC-001's invariant
  holds for **100%** of every maintenance op exercised in test
  (rename, describe, delete + undo, update-to-current, duplicate,
  copy-to-other-storyboard, refresh stale thumbnail, delete storyboard
  with cascade).

- **SC-003 — Cross-host visual parity.** Side-by-side renders of the
  storyboard rail in web-shell and in the VS Code panel webview at
  the same viewport width agree on: row layout, button positions,
  inline naming row geometry, collision banner geometry, and undo
  toast geometry. Discrepancies above the host-chrome baseline (VS
  Code title bar, panel border) are **0** in count.

- **SC-004 — Capture latency.** From Capture Scene press to Scene
  visible in the rail, the median end-to-end time is **under 1.5
  seconds** on both hosts (matches #216 SC-001 and extends the
  guarantee to web-shell).

- **SC-005 — Continuous live-state updates.** In **100%** of test
  runs that adjust the time playhead between Capture Scene press and
  inline-naming-row confirm, the persisted Scene's `timestamp`
  matches the playhead value at the *moment of confirm*, not at the
  moment of press (verified by parameterised test).

- **SC-006 — Round-trip across hosts.** A Storyboard captured in
  web-shell, saved, and re-opened in VS Code is byte-identical to the
  state captured (delegated to #215's round-trip guarantee + this
  spec's host-agnostic persistence requirement).

- **SC-007 — Failure integrity.** When thumbnail production fails on
  capture or refresh, **0** partial Scenes are persisted; the plot's
  dirty state is unchanged; the inline error appears in the rail (not
  as a host modal) — verified across **100%** of induced-failure runs.

- **SC-008 — Keyboard reachability.** Every action surfaced in the
  side rail (Capture Scene, naming row Confirm/Cancel, collision
  Replace/Offset/Cancel, every Scene-row maintenance affordance,
  storyboard switch / rename / delete) is reachable by keyboard
  alone, with focus order matching visual order, on both hosts.

- **SC-009 — VS Code legacy elements removed.** The VS Code first-
  capture quick-pick, the Replace / Offset / Cancel modal, and any
  full-window edit forms for Scene properties are absent from the
  shipped extension after this spec merges, verified by automated
  checks that fail if those legacy elements re-appear.

- **SC-010 — Offline.** Every flow above (capture, all maintenance
  ops, storyboard switch / create / rename / delete) succeeds with
  no network access on both hosts (Article I).

## Assumptions

- **Side rail dock position default**: right edge of the host's
  central area in both web-shell and VS Code, matching VS Code's
  existing Storyboard panel placement. Repositioning beyond the
  collapse / expand affordance is out of scope.
- **Sensible default Storyboard name**: derived from the plot's
  display name plus a suffix; the helper lives in
  `shared/components/storyboard/` (#215's module) so both hosts pick
  it up.
- **Web-shell shortcut chord**: same as VS Code (`ctrl/cmd+alt+c`)
  unless the browser intercepts; fallback chord is documented in
  `plan.md` once selected, but does not affect this spec's
  scope.
- **Inline-naming-row default focus**: the name field is auto-
  focused on open; pressing `Enter` confirms; pressing `Escape`
  cancels and clears the row.
- **Article IV exception**: per #215's existing exception, the panel
  surface and its inline affordances live in the shared TypeScript
  module under `shared/components/storyboard/`; both hosts mount the
  same React component. This spec does not introduce additional
  Python or service-layer code.
- **Thumbnail pipeline (#174) host adaptor**: the web-shell adaptor
  for #174 already exists for development purposes; this spec relies
  on that adaptor being production-ready in web-shell — if it is not,
  that gap is called out in `plan.md`'s Constitution Check rather than
  re-opened here.
- **DTG default Scene title** and **`transition_duration_ms = 500`**:
  inherited from #216's defaults via #215's CRUD module.

## Dependencies

- **#215 (Storyboarding: Schema + CRUD core)** (hard) — all mutations
  go through this module on both hosts.
- **#216 (Storyboarding: Capture)** (hard, evolves) — capture
  semantics inherited; the host-specific quick-pick / modal surfaces
  are *replaced* by the inline rail affordances introduced here.
- **#217 (Storyboarding: Panel + Playback)** (hard, evolves) — the
  panel shell, multi-storyboard dropdown, and on-map Scene rectangle
  rendering are inherited; their host-specific webview wiring continues
  to be valid.
- **#218 (Storyboarding: Edit Suite + Housekeeping)** (hard, evolves) —
  rename / describe / delete + undo / update-to-current / duplicate /
  copy-to-other-storyboard / stale-thumbnail refresh affordances are
  re-homed into in-row controls, but their underlying CRUD ops and
  provenance encoding are unchanged.
- **#174 (Thumbnail capture pipeline)** (hard) — synchronous thumbnail
  production must be available in both hosts; the web-shell adaptor
  must be production-ready for FR-WEB-028 to land.
- **#230 (Storyboard edit wiring)** (hard) — the existing
  `useStoryboardEditReducer` hook and message types are reused on both
  hosts; this spec does not introduce a parallel reducer.
- **Plot save/dirty-state mechanism** (hard, indirect) — capture and
  every maintenance op marks the plot dirty; the host-level save path
  is unchanged.
- **Host time controller** (hard) — both hosts already render a time
  controller in their central areas; this spec does not introduce one.

## Out of Scope

- **A new dedicated briefing renderer** (distraction-free playback
  view). Already deferred by the parent epic; remains so.
- **Animated time-range Scenes** (Scenes that span an interval
  rather than an instant). Schema reserves `time_range`; activation
  is post-MVP, post this spec.
- **Storyboard sharing or real-time collaboration** across analysts.
  Out of scope per the parent epic.
- **Video export of a played-back storyboard.** Deferred per the
  parent epic.
- **Mobile-specific layouts** beyond the narrow-viewport collapse-to-
  tab-strip behaviour described in FR-UX-007 / Edge Cases.
- **Re-homing playback transport (#217)** into the new rail. The
  transport buttons and arrow-key bindings introduced by #217 are
  unchanged by this spec; their layout already lives inside the
  panel.
- **Analysis Log Panel (#176) integration changes.** Provenance
  entries continue to flow into the Log Panel via #218's existing
  wiring; this spec does not retune that surface.
