# Feature Specification: Storyboarding — Panel + Playback

**Feature Branch**: `217-storyboarding-playback`
**Created**: 2026-04-20
**Status**: Draft — ready for quality-checklist validation
**Parent Epic**: #024 Storyboarding Briefings — [idea doc](../../docs/ideas/017-storyboarding-briefings.md)
**Sibling Specs**: #215 (schema + CRUD core), #216 (capture), #217 (this), #218 (edit suite + housekeeping)
**Input**: Third of four sibling specs splitting epic #024. This slice delivers the end-to-end briefing delivery flow — the epic's core value.

## Summary

This spec delivers **the briefing-delivery flow**: the full Storyboard
panel shell (Scene list, multi-Storyboard dropdown, overflow menu for
create / rename / delete Storyboard, empty states), the **playback
transport** (forward / backward buttons and scoped `Left` / `Right`
arrow keys), `flyTo` + time-slider tween, the scrub-window lock, on-map
Scene rectangle rendering for the active Storyboard, and the missing-
data **hard-block** at playback entry.

After this slice merges, an analyst who has captured Scenes via #216
can walk a stakeholder audience through them in order with keyboard or
on-screen transport, without leaving the Map Viewer. This is the epic's
stated purpose — "guided walkthroughs of recorded exercises."

Still deferred to #218: editing individual Scenes (rename, description,
delete+undo, update-to-current, duplicate, copy-to-other-storyboard),
stale-thumbnail detection + refresh, and Analysis Log (#176)
integration.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Step through a storyboard to deliver a briefing (Priority: P1)

With Scenes captured, the analyst opens the Storyboard panel, picks a
board from the header dropdown, and steps forward and backward through
its Scenes using on-screen transport buttons or scoped arrow keys. The
map animates between Scenes and the time slider moves with them;
between Scenes the analyst can scrub within the current segment.

**Why this priority**: This is the epic's stated value. Without it,
capture (#216) produces data nobody can walk through inside the tool.

**Independent Test**: Load a plot with a fixture Storyboard of at least
three Scenes (no #216 capture run needed). Confirm: (a) the forward
button and scoped Right-arrow advance to the next Scene, (b) the map
performs an animated `flyTo` and the time slider tweens to the Scene's
`timestamp` over `transition_duration_ms`, (c) scrubbing is constrained
to `[current_scene.t, next_scene.t]` and is locked beyond the last
Scene's timestamp, (d) Scene viewport rectangles render on the map
only for the active Storyboard.

**Acceptance Scenarios**:

1. **Given** an active Storyboard with multiple Scenes, **When** the
   analyst presses Forward (button or scoped `Right` arrow), **Then**
   the map animates via `flyTo` to the next Scene's `viewport` and the
   time slider tweens to its `timestamp` over
   `transition_duration_ms`.
2. **Given** playback is positioned on Scene N, **When** the analyst
   drags the time slider, **Then** scrub is constrained to
   `[Scene[N].timestamp, Scene[N+1].timestamp]`. On the last Scene,
   scrubbing past `timestamp` is disabled.
3. **Given** the active Storyboard is selected, **When** the map
   renders, **Then** each Scene's viewport Polygon appears as a faint
   rectangle. Clicking a rectangle selects that Scene in the panel and
   animates the map to its viewport using the same transport used by
   Forward / Backward. Rectangles for non-active Storyboards are hidden.
4. **Given** a Scene whose `visible_feature_ids` do not fully resolve
   or whose `timestamp` is outside the plot's time range, **When** the
   analyst tries to step onto that Scene, **Then** playback is **hard-
   blocked** with a prompt naming the missing data and offering to
   either (a) jump past this Scene, or (b) open it for editing in
   #218. No partial animation occurs.

---

### User Story 2 — Maintain multiple storyboards per plot (Priority: P2)

A plot can support several narratives — e.g. "commander's view", "ASW
evidence", "training debrief". The analyst creates, renames, deletes,
and switches between Storyboards from the panel header dropdown. The
"active" Storyboard is an ephemeral UI selection (defaults to most-
recently-modified on plot open) and is not stored on disk.

**Why this priority**: Layered on top of single-Storyboard playback.
A useful briefing is deliverable without it, but most real workflows
will accumulate multiple Storyboards per plot over time.

**Independent Test**: With two Storyboards on a plot, switch between
them via the header dropdown and confirm: (a) the Scene list updates
to the selected Storyboard, (b) Scene viewport rectangles on the map
update to only those of the active Storyboard, (c) the selection is
not persisted across plot close/open — the most-recently-modified
Storyboard is chosen on re-open.

**Acceptance Scenarios**:

1. **Given** a plot with no Storyboards, **When** the analyst creates a
   new Storyboard from the panel overflow menu, **Then** it appears in
   the dropdown and becomes the active selection.
2. **Given** a plot with two or more Storyboards, **When** the analyst
   changes the dropdown selection, **Then** the Scene list, the
   playback transport, and the on-map Scene rectangles all update to
   the new active Storyboard within the same user interaction.
3. **Given** a plot is re-opened, **When** the panel initialises,
   **Then** the active Storyboard defaults to the one with the most
   recent `last_modified_at`.
4. **Given** a Storyboard, **When** the analyst deletes it from the
   overflow menu and confirms, **Then** it is removed from the dropdown
   and all its Scenes and their thumbnail assets are deleted via
   #215's cascading delete.

---

### Edge Cases

- **Arrow-key scope leakage.** `Left` / `Right` are bound only when
  the Storyboard panel (or the Map Viewer while a Storyboard is the
  active selection) has focus. Pressing them elsewhere in VS Code must
  not step the transport.
- **Very short `transition_duration_ms`** (e.g. `0`). The map jumps
  without animation; the time slider snaps to the target timestamp;
  this is a supported per-Scene override.
- **Very long `transition_duration_ms`** (e.g. `10000`). Transport
  buttons remain disabled for the full duration; the analyst can
  cancel by clicking a specific Scene row, which selects and jumps
  without animation.
- **Forward at the last Scene / Backward at the first Scene.** Button
  and key are disabled (with a visual hint). No wrap-around.
- **Hard-block on a mid-sequence Scene.** Stepping past it is allowed
  (the prompt offers "Jump past this scene"); Backward onto a blocked
  Scene presents the same prompt.
- **Empty active Storyboard** (all Scenes deleted by #218). Transport
  is disabled; the panel shows the per-Storyboard empty state.
- **Active Storyboard deleted by another tab / window.** The panel
  refreshes the dropdown; active selection falls back to the most-
  recently-modified remaining Storyboard, or the empty state if none
  remain.
- **Antimeridian-crossing viewport rectangle.** Rendered as a best-
  effort Polygon (warned by #215). The on-map click-to-select still
  works against the best-effort geometry.
- **Overlapping Scene rectangles** (multiple Scenes frame similar
  regions). Click targets the topmost rectangle; all rectangles remain
  visible with slight opacity variation so the analyst can see overlap.
- **Simultaneous transport + scrub.** Starting a scrub while a
  transition is in flight cancels the transition at its current frame
  and yields control to scrub.

## Requirements *(mandatory)*

### Functional Requirements

#### Panel shell & dropdown

- **FR-PLAY-001**: System MUST expose a full Storyboard panel with (a)
  a header dropdown of all Storyboards on the current plot, (b) an
  overflow menu with **Create / Rename / Delete** Storyboard actions,
  (c) a Scene list for the active Storyboard sorted by `timestamp`
  ascending and rendering thumbnail + title + DTG per row, (d) the
  playback transport described below.
- **FR-PLAY-002**: The active Storyboard selection MUST be ephemeral
  (not persisted to disk). On plot open, System MUST default the
  active selection to the Storyboard with the most recent
  `last_modified_at` (via #215's `getActiveStoryboardDefault`); if no
  Storyboards exist, the panel MUST show an empty state.
- **FR-PLAY-003**: Changing the dropdown selection MUST update the
  Scene list, the playback transport state, and the on-map Scene
  rectangles within the same user interaction (no visible stale state
  after the dropdown closes).
- **FR-PLAY-004**: Deleting a Storyboard MUST invoke #215's cascading
  delete (removing Scenes and their thumbnail assets). The dropdown
  MUST refresh and the active selection MUST fall back to the most-
  recently-modified remaining Storyboard, or to the empty state if
  none remain.

#### Playback transport

- **FR-PLAY-005**: System MUST provide **Forward** and **Backward**
  transport buttons in the panel that step to the next / previous
  Scene by `timestamp` ordering.
- **FR-PLAY-006**: System MUST bind scoped `Left` / `Right` arrow keys
  to Backward / Forward transport. The binding MUST be active only
  when the Storyboard panel or the Map Viewer (with a Storyboard
  active) has focus — not globally in VS Code.
- **FR-PLAY-007**: On transport advance, System MUST animate the map
  via Leaflet `flyTo` to the target Scene's `viewport` and MUST tween
  the time slider to its `timestamp` over `transition_duration_ms`
  with `ease-in-out` easing.
- **FR-PLAY-008**: Default `transition_duration_ms` is `500`; per-Scene
  overrides written by capture or edit are honoured.
- **FR-PLAY-009**: During an in-flight transition, transport buttons
  and arrow keys MUST be disabled; starting a scrub MUST cancel the
  transition at its current frame and yield control to scrub.
- **FR-PLAY-010**: Forward at the last Scene and Backward at the first
  Scene MUST be disabled (no wrap-around); the UI MUST signal the
  disabled state.
- **FR-PLAY-011**: Clicking a Scene row in the panel MUST select that
  Scene and animate the map to its `viewport` using the same transport
  path as Forward / Backward.

#### Scrub-window lock

- **FR-PLAY-012**: While a Storyboard is active and transport is
  positioned on Scene N, the time slider MUST be scrubbable only
  within `[Scene[N].timestamp, Scene[N+1].timestamp]`.
- **FR-PLAY-013**: On the last Scene, scrubbing past its `timestamp`
  MUST be disabled.
- **FR-PLAY-014**: Switching Storyboard or stepping transport MUST
  recompute the scrub window.

#### On-map Scene rectangles

- **FR-PLAY-015**: The parent Storyboard Feature MUST NOT render on
  the map layer (panel-only entity — enforced here).
- **FR-PLAY-016**: Scene viewport Polygons MUST render as faint
  rectangles **only when their parent Storyboard is the active panel
  selection**. Rectangles for non-active Storyboards MUST NOT render.
- **FR-PLAY-017**: Clicking a Scene rectangle on the map MUST select
  that Scene in the panel and animate to its viewport using the same
  transport path.
- **FR-PLAY-018**: Overlapping rectangles MUST remain individually
  visible (slight opacity variation is acceptable) and click MUST
  target the topmost rectangle.

#### Missing-data hard-block (playback)

- **FR-PLAY-019**: Before advancing onto a Scene, System MUST invoke
  #215's `detectMissingDataForScene`. If the classification is not
  `ok`, System MUST block the step with a prompt naming the specific
  missing features or out-of-range condition.
- **FR-PLAY-020**: The hard-block prompt MUST offer two actions: (a)
  **Jump past this scene** (advance the transport without animating
  into the blocked Scene), and (b) **Open for editing** (which is
  wired up by #218; until #218 lands the action opens the Scene in
  read-only mode).
- **FR-PLAY-021**: The hard-block MUST apply on both Forward and
  Backward transport and on click-to-select from the map.

#### Lifecycle

- **FR-PLAY-022**: The Storyboard panel MUST be hidden by default and
  openable via the Command Palette or the view menu.
- **FR-PLAY-023**: The panel and transport MUST operate exclusively
  via #215's module API for all reads and writes; the transport MUST
  NOT bypass the module to touch Features directly.

### Key Entities

This slice reads `Storyboard` and `Scene` entities; full schema
definitions are authoritative in
[#215 Key Entities](../215-storyboarding-schema/spec.md#key-entities-schema-first-authoritative).
Attributes this spec consumes:

- **Storyboard** — `id`, `name`, `last_modified_at` (to default the
  active selection), and the Scene set (for rectangle rendering + the
  scrub window).
- **Scene** — `viewport` (for `flyTo` and on-map rectangles),
  `timestamp` (for ordering and time-slider tween),
  `transition_duration_ms` (per-Scene override), and
  `visible_feature_ids` + `feature_set_hash` (for the hard-block
  check, via #215).

This slice **creates** Storyboards (via the overflow menu's Create
action) and **deletes** them (via the cascading delete). It does not
create / update / delete Scenes — those writers are #216 (capture)
and #218 (edit suite).

## User Interface Flow *(UI feature)*

### Decision Analysis

- **Primary Goal**: Deliver a narrated, in-order walk-through of a
  captured Storyboard to a stakeholder audience, entirely inside the
  Map Viewer.
- **Key Decisions**:
  1. **Which Storyboard to play.** The dropdown selection.
  2. **Which direction to step.** Forward / Backward (button or arrow
     key).
  3. **Whether to scrub within a segment.** Time-slider drag inside
     the locked window.
  4. **How to respond to a hard-block.** Jump past the Scene, or open
     it for editing.
  5. **When to rename or delete a Storyboard.** Overflow menu, with
     cascade-delete confirmation for Storyboards that hold Scenes.
- **Decision Inputs**:
  - **Dropdown** — names all Storyboards on the plot.
  - **Scene list** — thumbnails + titles + DTGs for the active
    Storyboard, highlighting the current transport position.
  - **Transport counter** — "Scene N of M", so the analyst knows how
    much of the briefing remains.
  - **Time slider** — reflects the scrub window; its endpoints change
    as transport moves.
  - **On-map rectangles** — spatial context for what's already been
    covered and what's coming next.
  - **Hard-block prompt** — names the specific missing data and the
    remediation options.

### Screen Progression

| Step | Screen / State | User Action | Result |
|------|----------------|-------------|--------|
| 1 | Plot open with captured Scenes; panel hidden | Open the Storyboard panel via Command Palette or view menu | Panel opens; dropdown lists all Storyboards; active selection defaults to most-recently-modified |
| 2 | Panel showing the active Storyboard's Scene list and transport; map shows the active Storyboard's Scene rectangles | Press **Forward** (button or scoped `Right`) | Map `flyTo` to next Scene's viewport; time slider tweens to its timestamp; transport counter advances |
| 3 | Positioned on Scene N | Drag the time slider | Scrub constrained to `[Scene[N].t, Scene[N+1].t]`; locked at or before the boundaries |
| 4 | Any state | Click a Scene rectangle on the map | Panel selection jumps; map animates to that Scene's viewport via the same transport path |
| 5 | Any state | Switch the dropdown to a different Storyboard | Scene list, transport, and on-map rectangles update within the same interaction |
| 6 | Forward onto a Scene with unresolved feature IDs | Press **Forward** | Hard-block prompt: *Jump past this scene / Open for editing*; no partial animation until the analyst chooses |
| 7 | Any state | Open overflow menu → **Delete storyboard** → confirm | Storyboard and its Scenes (with thumbnails) are removed via #215's cascade; dropdown refreshes; active selection falls back |

### UI States

- **Empty State (no Storyboards on plot).** Dropdown disabled; panel
  shows: *"No storyboards yet. Press Ctrl/Cmd+Alt+C (or capture from
  the Map Viewer) to create your first scene."* Transport buttons and
  arrow-key bindings are disabled.
- **Empty State (active Storyboard has no Scenes).** Dropdown shows
  the Storyboard name; panel body shows: *"No scenes in this
  storyboard yet."* Transport disabled.
- **Loading State (transport transition in flight).** Transport
  buttons disabled; map animating; time slider tweening.
- **Loading State (dropdown switching).** Briefly disabled while the
  Scene list + rectangles refresh; no longer than one paint frame
  under normal conditions.
- **Error State (missing-data hard-block).** Modal prompt naming
  either the unresolved feature IDs or the out-of-range timestamp;
  offers *Jump past this scene* and *Open for editing* actions.
- **Error State (Storyboard deleted by another tab/window).** Dropdown
  refreshes; active selection falls back silently; no error surface.
- **Success State (transport step).** Map centred on the target
  Scene's viewport; time slider on its timestamp; panel row
  highlighted; transport counter updated.
- **Success State (dropdown switch).** Scene list + on-map rectangles
  fully reflect the new active Storyboard; no ghost rectangles from
  the previous selection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 — Smooth playback.** The visible map transition between
  Scenes completes within **`transition_duration_ms` + 150 ms**
  tolerance; the time slider lands on the target timestamp at
  transition end with no perceptible overshoot.
- **SC-002 — End-to-end briefing delivery.** A prepared Storyboard of
  at least **5 Scenes** can be walked forward and backward from first
  to last using **only the on-screen transport or scoped arrow keys**
  — no extra clicks, no menu detours, and no observable desync between
  map, time slider, and panel selection.
- **SC-003 — Instant dropdown switch.** Changing the active Storyboard
  via the header dropdown updates the Scene list and the on-map Scene
  rectangles **within the same user interaction**; no visible stale
  state persists after the dropdown closes.
- **SC-004 — Scrub window correctness.** On **100%** of transport
  positions, the time slider's scrubbable range equals
  `[Scene[N].timestamp, Scene[N+1].timestamp]` (or is locked at the
  last Scene's `timestamp` on the final step).
- **SC-005 — Hard-block coverage.** **100%** of Scenes whose
  `visible_feature_ids` do not fully resolve or whose `timestamp`
  falls outside the plot's time range activate the hard-block prompt
  on attempted step-onto — on both Forward and Backward transport and
  on click-to-select from the map.
- **SC-006 — Rectangle scoping.** On **100%** of map renders, only
  the active Storyboard's Scene rectangles are visible; changing the
  dropdown replaces the rendered rectangle set without ghost
  carryover.
- **SC-007 — No global key leakage.** Pressing `Left` / `Right` with
  focus in any VS Code view other than the Storyboard panel or Map
  Viewer MUST NOT step the transport (verified under a test harness
  that focuses unrelated views and presses the keys).
- **SC-008 — No bypass of #215.** Automated inspection of this spec's
  code MUST show zero direct writes to Storyboard / Scene Features;
  all writes flow through #215's module.
- **SC-009 — Offline.** Full end-to-end playback (open panel, step
  forward, step backward, scrub, switch Storyboard, click rectangle)
  succeeds with no network access (Article I).

## Assumptions

- **`flyTo` easing**: `ease-in-out` for both the map `flyTo` and the
  time-slider tween.
- **Scrub-cancel during transition**: starting a scrub cancels the
  in-flight transition at its current frame and yields control to the
  scrub; no forced snap-to-target.
- **Scene rectangle styling**: faint outline fill, opacity chosen so
  multiple overlapping rectangles remain distinguishable; exact
  colours are a design call owned by the implementation, not
  specified here.
- **Cascade-delete confirmation**: deleting a Storyboard that holds
  one or more Scenes presents a confirmation dialog listing the Scene
  count; deleting an empty Storyboard skips the dialog.
- **Transport disabled at list boundaries**: no wrap-around; both
  button and key are disabled at the first / last Scene respectively.

## Dependencies

- **#215 (Schema + CRUD core)** (hard) — Scene ordering,
  `getActiveStoryboardDefault`, cascading `deleteStoryboard`,
  `detectMissingDataForScene`.
- **#216 (Capture)** (hard in practice) — without capture, no Scenes
  exist to play back. Playback can still be tested against fixture
  data without #216 present.
- **VS Code Map Viewer** (hard) — host of the transport, the on-map
  rectangle layer, and the time-slider tween.
- **Leaflet integration** (hard) — provides `flyTo` and the polygon
  layer used by Scene rectangles.
- **Plot time-slider component** (hard) — this spec tweens to it and
  constrains its range.

## Out of Scope

- **Creating or mutating Scenes** (capture, rename, description edit,
  delete+undo, update-to-current, duplicate, copy-to-other-storyboard)
  → capture is #216; all Scene edits are #218.
- **Stale-thumbnail detection and refresh action** → #218.
- **Analysis Log (#176) integration** for playback observability →
  #218.
- **Dedicated distraction-free briefing renderer** — this spec ships
  in-panel playback only; the distraction-free surface is a follow-
  up beyond the epic.
- **Animated time-range Scenes** — all Scenes remain single-instant
  in v1 (`time_range = null` per #215).
- **Drag-reorder of Scenes** — ordering is strictly derived from
  `timestamp`.
