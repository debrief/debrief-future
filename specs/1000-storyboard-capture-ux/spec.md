# Feature Specification: Storyboard Authoring UX (Web-Shell + VS Code)

**Feature Branch**: `1000-storyboard-capture-ux`
**Created**: 2026-05-01
**Status**: Draft
**Input**: User description: "I really want to be able to capture/maintain storyboards through the web-shell interface. Please write a spec to add that capability. Note: when capturing a scene, it's important that the analyst can see/maintain the time controller and map, to control the temporal and spatial viewports for the scene. Note: this also relates to the vs-code UI. So, we shouldn't just be enabling storyboard capture from web-shell, we should be doing proper UI/UX design for how the job actually gets done."

## Overview

This feature is a **UI/UX design exercise**, not a new data feature. Storyboards and Scenes are already defined by the schema (#215). Capture (#216), edit (#218, #230, #234), and thumbnail capture (#174) are already specified. What is missing is a **coherent authoring experience** that lets an analyst build and maintain a storyboard from start to finish — and that experience must work in **both** the web-shell preview surface (today: edit harness only; no capture path) and the VS Code extension (today: capture via Map Viewer keybinding, edit via side-panel webview, but no unified authoring layout).

The defining constraint: a Scene encodes both a **temporal viewport** (timestamp on the time slider) and a **spatial viewport** (map centre/zoom). The analyst is choosing both at the moment of capture. The interaction therefore **MUST** keep the time controller and the map live, visible, and operable while the analyst is in authoring mode — capture is not a modal hand-off, it is an in-context commit.

This spec does not redefine the schema, the CRUD module (`shared/components/src/storyboard/crud.ts`), the per-scene thumbnail pipeline, or the playback flow. It builds on them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Open the authoring layout with map, time controller, and storyboard panel all live (Priority: P1)

An analyst working on a plot wants to begin building a storyboard. They open the storyboard authoring view. Without anything else changing, the map remains the dominant surface, the time controller remains in its usual location, and a Storyboard panel appears beside (not over) the map. All three are interactive at once: the analyst can pan the map, scrub the time slider, and click on a scene in the panel without any of those three areas obscuring or freezing the others. This holds in both the web-shell and the VS Code extension; the chrome around the panels differs, but the spatial relationship between map / time controller / storyboard panel is the same.

**Why this priority**: Without this layout, every other story in this spec is impossible to deliver as designed. The "live map and time controller during capture" constraint is structural; it must come first.

**Independent Test**: Open the authoring view in the web-shell. Confirm map, time controller, and storyboard panel are simultaneously visible and that each accepts input (pan map, drag time slider, click a scene row) without dismissing or freezing the others. Repeat in the VS Code extension. Compare side-by-side: a screenshot from each surface should show the same three regions in the same relative positions.

**Acceptance Scenarios**:

1. **Given** a plot is open with no storyboard yet, **When** the analyst opens the storyboard authoring view, **Then** the storyboard panel appears beside the map without resizing the map below a usable threshold, the time controller remains in its existing position, and the panel shows an empty-state prompt to capture the first scene.
2. **Given** the authoring view is open, **When** the analyst drags the time slider, **Then** the slider responds normally and the panel does not steal focus or block the gesture.
3. **Given** the authoring view is open, **When** the analyst pans or zooms the map, **Then** the map responds normally and the panel updates any "current viewport" preview without re-laying-out.
4. **Given** the authoring view is open in the web-shell and again in VS Code, **When** the analyst compares the two, **Then** the panel header, scene list, and capture affordance are recognisable as the same component (same visual language, same gesture vocabulary), even if the surrounding chrome differs.

---

### User Story 2 — Capture a scene without losing sight of the map or time controller (Priority: P1)

An analyst has framed a moment of interest: they have moved the time slider to a specific instant and panned/zoomed the map to the area they want the scene to show. They commit that framing as a Scene. The commit is a single in-place gesture — a button in the panel header, an inline keystroke, or both — and **does not** open a modal dialog over the map, does not move focus away from the time controller, and does not require the analyst to re-confirm fields they already chose by manipulating the map and time slider. The newly-captured scene appears in the panel's scene list with its thumbnail, timestamp, and a default editable title; the map and time controller remain exactly as they were.

**Why this priority**: This is the core capture interaction the user asked for, and it is what differentiates this feature from existing modal-style capture flows.

**Independent Test**: With the authoring view open, the analyst sets a specific timestamp and a specific map view. They invoke capture. Verify: (a) no modal dialog covers the map or time controller; (b) within a short time the new scene row appears in the panel; (c) the map view and time slider position are unchanged after the capture; (d) the scene's stored viewport and timestamp match what was on screen at the moment of capture.

**Acceptance Scenarios**:

1. **Given** the authoring view is open and the analyst has a timestamp and viewport framed, **When** they click the "Capture scene" affordance in the panel header, **Then** a new scene is appended to the storyboard with that timestamp and viewport, the thumbnail is generated, and the panel scrolls to (or highlights) the new row — all without dismissing the map or time controller.
2. **Given** the analyst is in the authoring view, **When** they press the established capture keybinding (`Ctrl/Cmd+Alt+C` from #216), **Then** the panel-button path and the keybinding path produce the same scene record and the same on-screen feedback.
3. **Given** a scene already exists at the chosen timestamp, **When** the analyst captures, **Then** the system surfaces the existing collision-handling choice (Replace / Offset by +1 s / Cancel — defined by #216) inline in the panel, not as a screen-blocking modal.
4. **Given** the analyst captures a scene, **When** they immediately keep working (move time slider, pan map, capture again), **Then** they can produce a sequence of scenes without the map or time controller ever ceding focus.

---

### User Story 3 — Maintain a storyboard (rename, re-caption, re-capture, reorder, delete) inline (Priority: P1)

An analyst returns to a storyboard and refines it. They rename scenes, edit captions/descriptions, re-capture a scene from the current viewport (because the framing has improved), delete a scene with the option to undo, and put scenes into the order they want them played back. Every one of these operations happens **inside the storyboard panel** — no full-screen modal, no command-palette-only path, no surface change that pushes the map or time controller out of view. Clicking a scene row restores both the temporal and spatial viewport that scene encodes.

**Why this priority**: A capture-only experience is half a feature. Maintenance is where most of the analyst's time is spent and where the "keep map+time-controller live" constraint matters most, because the analyst is constantly re-framing.

**Independent Test**: Open a storyboard with several scenes. Within the authoring view, rename a scene, edit its description, re-capture it from a new viewport, click another scene to restore its viewport, drag-reorder, and delete a scene then undo. Confirm none of these actions opens a screen-blocking modal and that the map + time controller remain visible and live throughout.

**Acceptance Scenarios**:

1. **Given** the authoring view is open with scenes present, **When** the analyst clicks a scene row, **Then** the time slider moves to that scene's timestamp and the map flies to that scene's viewport, and the panel highlights the active scene.
2. **Given** a scene is selected, **When** the analyst chooses "Update to current viewport" (existing #218 op), **Then** the scene's viewport, timestamp, visible-features set, and thumbnail are atomically replaced from the current map and time-slider state, with the map and time controller untouched.
3. **Given** the analyst wants to change scene order, **When** they reorder scenes in the panel, **Then** the new order is reflected in the storyboard's playback sequence (see Assumptions for ordering semantics).
4. **Given** the analyst deletes a scene, **When** the deletion completes, **Then** an undo affordance is shown for a short window (matching #218) and the deletion can be reverted with a single click; the panel layout does not jump.
5. **Given** the analyst edits a scene title or description, **When** they commit the edit, **Then** the change appears immediately in the panel and is persisted; if the edit is rejected (validation), the panel shows the error inline without modal interruption.

---

### User Story 4 — Web-shell parity with VS Code (Priority: P2)

An analyst trying the web-shell preview can carry out the same authoring tasks as in VS Code: open the authoring view, capture, maintain, restore viewports. They do not need to switch to VS Code to complete a storyboard. The two surfaces look like the same product — same panel layout, same scene-row visual treatment, same keybinding for capture, same affordances for maintenance — even though VS Code wraps the panel in its workbench chrome and the web-shell hosts it as part of a single-page app.

**Why this priority**: P2 because P1 stories already specify the cross-surface constraint; this story exists to make web-shell parity an explicit, separately-testable deliverable rather than implicit in the others.

**Independent Test**: A reviewer follows the same user-task script (open authoring view → capture three scenes → rename one → re-capture one → reorder → delete one → click first scene to restore) on both surfaces. The two videos should differ only in surrounding chrome.

**Acceptance Scenarios**:

1. **Given** the web-shell preview app is running, **When** the analyst opens the storyboard authoring view, **Then** they see the same panel component as VS Code with the same scene-row layout, header affordances, and empty state.
2. **Given** the analyst captures, edits, and reorders scenes in the web-shell, **When** they reload the same plot in VS Code, **Then** all changes are present and the storyboard renders identically.
3. **Given** a Playwright test exercises the authoring flow, **When** it runs against the web-shell preview, **Then** it can complete capture, maintenance, and restore without relying on VS Code-specific commands.

---

### User Story 5 — Discoverable entry point and empty state (Priority: P3)

A first-time analyst on either surface can find the storyboard authoring view without prior instruction. There is a clearly-labelled entry point (button, command, or activity-bar icon as appropriate to the surface). With no storyboards yet, the empty state explains in one short sentence what a storyboard is and offers a single primary action to capture the first scene.

**Why this priority**: Important for adoption but does not block the analyst who already knows the workflow; lower than the core P1 stories.

**Independent Test**: A user new to the feature opens a plot, finds and opens the authoring view from the entry point, and reaches a state where they can press one button to make their first scene — all without consulting documentation.

**Acceptance Scenarios**:

1. **Given** a plot is open and no storyboard exists, **When** the analyst opens the authoring view, **Then** the panel shows an empty-state explanation and a single primary "Capture first scene" action.
2. **Given** the analyst has never used the feature, **When** they look at the surface (web-shell or VS Code), **Then** they can locate the storyboard authoring entry point within a small number of glances (verified via task-completion test).

---

### Edge Cases

- **No plot loaded**: The authoring view either is not available, or shows a clear empty state explaining that a plot is required. It does not attempt to render scenes against a missing dataset.
- **Map or time controller hidden by user layout**: If the analyst has manually collapsed the map or hidden the time controller before opening the authoring view, the system should restore them (or at minimum prompt to do so), because capture is meaningless without both.
- **Very small viewport**: On narrow displays the panel may need to dock differently (collapse to a slide-over, or move below the map). The constraint that capture remain non-modal still holds; the panel can become temporarily hidden by the user, but the capture gesture itself never blocks the map.
- **Panel torn off / undocked (VS Code)**: VS Code allows panels to be moved. If the analyst tears the storyboard panel out, the capture gesture must still work; the viewport that gets captured is the one in the original Map Viewer.
- **Rapid repeated capture**: An analyst may capture several scenes in quick succession. The panel must not enter a "busy" state that swallows the next capture. Thumbnail generation may be queued; the scene record must commit immediately.
- **Timestamp collision** (covered by #216): the existing Replace / Offset / Cancel choice is presented inline in the panel, not as a screen-blocking modal.
- **Scene whose visible features no longer exist**: When clicked for restore, the scene's stored viewport still applies; absent features are surfaced via the existing stale-thumbnail indicator (#218) rather than blocking the restore.
- **Reorder vs. timestamp**: Scenes are stored ordered by timestamp. See Assumptions for the chosen reordering semantics.
- **Web-shell without persistence backend**: If the web-shell preview is running against a read-only or in-memory store, the authoring view must clearly indicate that changes will not persist beyond the session, and capture/maintenance must still work locally.
- **Concurrent edits across surfaces**: Out of scope (single-author assumption — see Out of Scope).

## Requirements *(mandatory)*

### Functional Requirements

#### Layout and visibility (the non-modal constraint)

- **FR-001**: The system MUST provide a Storyboard authoring view in both the web-shell and the VS Code extension. The view co-locates the map, the time controller, and a Storyboard panel; all three MUST be simultaneously visible and interactive while the view is active.
- **FR-002**: The capture gesture MUST NOT open a modal dialog or any overlay that obscures the map or the time controller. Inline panel forms, inline confirmation rows, and toast-style notifications are permitted; full-screen or map-blocking modals are not.
- **FR-003**: While the authoring view is active, the time controller MUST remain operable (slider drag, play/pause, step) without focus being stolen by the panel.
- **FR-004**: While the authoring view is active, the map MUST remain operable (pan, zoom, click-through to features) without focus being stolen by the panel.
- **FR-005**: On narrow viewports where the three regions cannot all fit, the system MUST degrade by docking the panel beneath the map (or as a side drawer), but MUST preserve FR-002 (no map-blocking modal capture).

#### Capture

- **FR-006**: The system MUST expose a "Capture scene" affordance inside the Storyboard panel header (button), in addition to the existing keybinding from #216. Both paths MUST produce identical scene records.
- **FR-007**: A capture commit MUST persist a Scene whose `timestamp`, `viewport.center`, `viewport.zoom`, `visible_feature_ids`, `feature_set_hash`, and `thumbnail_asset_ref` reflect the live state of the time controller and map at the moment of capture, using the existing schema (#215) and thumbnail pipeline (#174).
- **FR-008**: A capture commit MUST complete without dismissing or repositioning the map or the time controller.
- **FR-009**: After a capture commit, the panel MUST surface the new scene (insert row, scroll-to-row, or highlight) in such a way that the analyst can immediately continue capturing more scenes.
- **FR-010**: Timestamp-collision handling (Replace / Offset / Cancel from #216) MUST be presented inline within the panel, not as a screen-blocking modal.

#### Maintenance

- **FR-011**: The Storyboard panel MUST expose, inline, all maintenance operations already specified in #218: rename scene, edit description, delete (with toast undo), update-to-current-viewport, duplicate, copy-to-other-storyboard, refresh-thumbnail, bulk refresh stale.
- **FR-012**: Storyboard-level operations (rename, edit description, create new storyboard, switch storyboard) MUST be accessible from the panel without requiring command-palette use.
- **FR-013**: The system MUST allow the analyst to control the order in which scenes appear in the storyboard's playback sequence. (Default order is by `timestamp` per #215; the chosen reorder mechanism is documented in Assumptions.)
- **FR-014**: Clicking a scene row MUST restore both the temporal viewport (set the time slider to the scene's `timestamp`) and the spatial viewport (fly the map to the scene's `viewport.center` / `viewport.zoom`). Restore MUST be a single gesture.
- **FR-015**: Edits made in the panel MUST validate inline (per existing CRUD module rules) and surface errors inline; failures MUST NOT lose user input.

#### Cross-surface consistency

- **FR-016**: The Storyboard panel component MUST be shared between the web-shell and the VS Code extension (single React component implementation, surface-specific wrappers only).
- **FR-017**: The capture keybinding (`Ctrl/Cmd+Alt+C`, per #216) MUST be active in the web-shell authoring view as well as in VS Code, with the same scope (active when the authoring view has focus or the map is focused within it).
- **FR-018**: Visible affordances (Capture button, scene-row layout, overflow menus, undo toast) MUST present the same labels, icons, and behaviour in both surfaces. Surface-specific theming (VS Code workbench tokens vs. web-shell styling) is permitted; gesture vocabulary is not.

#### Discoverability

- **FR-019**: The web-shell MUST provide a clearly-labelled entry point that opens the storyboard authoring view (e.g., a top-level button or activity item). The VS Code extension MUST provide an equivalent entry point in its established surface conventions (activity bar, command).
- **FR-020**: When no storyboard exists for the active plot, the panel MUST show an empty state with one primary call-to-action that captures the first scene and creates the storyboard in one step.

#### Out-of-scope guardrails

- **FR-021**: The system MUST NOT add playback/animation behaviour beyond what is already specified for click-to-restore (covered by #217 separately).
- **FR-022**: The system MUST NOT add export-to-video or export-to-PDF capabilities.
- **FR-023**: The system MUST NOT introduce concurrent multi-author editing semantics; single-author behaviour is assumed.

### Key Entities

This feature does not introduce new persistent entities. It uses:

- **Storyboard** (defined in #215): parent feature with `id`, `name`, `description`, `provenance`. Surfaced in the panel header.
- **Scene** (defined in #215): child feature with `storyboard_id`, `timestamp`, `viewport` (centre, zoom, bearing=0), `visible_feature_ids`, `feature_set_hash`, `thumbnail_asset_ref`, `transition_duration_ms`. Surfaced as scene rows in the panel.
- **Authoring View State** (transient, not persisted): which storyboard is currently being authored, which scene (if any) is selected, panel docked state. Held in session state.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Build and maintain a storyboard — a sequenced set of map+time framings — without ever losing the live tools (map and time controller) the analyst uses to choose those framings.
- **Key Decisions** the analyst makes:
  1. Which moment in time and which map view together constitute a meaningful scene.
  2. Whether a captured scene is good enough or should be re-captured from a refined framing.
  3. How scenes should be titled, described, and ordered to read as a coherent narrative.
- **Decision Inputs**: the live map (showing tracks, features, drawings at the current time), the time controller (showing where in the dataset the analyst is), the panel's scene list (showing what has already been captured), and per-scene thumbnails (showing what each captured scene looked like).

### Screen Progression

| Step | Screen / State | User Action | Result |
|------|----------------|-------------|--------|
| 1 | Plot open, no storyboard yet | Click "Storyboard" entry point (web-shell button or VS Code activity item) | Authoring view opens: map + time controller + panel all visible; panel shows empty state with "Capture first scene" CTA |
| 2 | Empty authoring view | Frame the time slider and map; click "Capture first scene" | Inline prompt asks for storyboard name (single field, in-panel); on confirm, scene 1 is captured, storyboard is created, thumbnail renders in panel |
| 3 | Authoring view with one scene | Re-frame map and time; click "Capture scene" in panel header (or use keybinding) | Scene 2 appears in panel; map and time controller untouched |
| 4 | Authoring view with multiple scenes | Click an earlier scene row | Time slider snaps to that scene's timestamp; map flies to that scene's viewport; row is highlighted |
| 5 | Scene selected | Re-frame map (or time); click "Update to current" in scene row's overflow menu | Scene's viewport, timestamp, features, and thumbnail update atomically; no modal |
| 6 | Multiple scenes | Drag a scene row to a new position (or use up/down affordance) | Scene order changes for playback; on-disk timestamp behaviour follows the rule documented in Assumptions |
| 7 | Scene no longer wanted | Click "Delete" in scene row overflow | Row removed; toast shows "Scene deleted — Undo" for a short window |
| 8 | Maintenance complete | Close the authoring view | Storyboard persists; panel can be re-opened later with state restored |

### UI States

- **Empty State**: "No storyboard yet for this plot. Capture a scene to get started." with a single primary "Capture first scene" button. Map and time controller remain live.
- **Loading State**: When opening an existing storyboard, scene rows appear with thumbnail placeholders; rows become interactive as soon as their metadata is loaded, even if thumbnails are still rendering. Thumbnail rendering for a fresh capture happens out-of-band; the row is committed immediately with a placeholder that swaps in.
- **Error State**: Validation errors (e.g., name collision, schema rejection) appear inline next to the offending field. Capture failures (e.g., thumbnail-generation error) leave the scene record committed (so the analyst doesn't lose work) but show an inline "Refresh thumbnail" prompt on the affected row.
- **Success State**: New scenes appear in the panel within a short window of the capture gesture; no banner or toast required for the happy path. Destructive operations (delete) get an undo toast.
- **Active-Scene State**: The currently-selected scene row is visually distinguished; the map and time controller reflect that scene's stored viewport, but remain freely editable (so the analyst can drift away from the scene's framing and re-capture if they choose).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An analyst new to the feature, given a loaded plot, can capture their first scene in under 30 seconds from opening the authoring view, without consulting documentation.
- **SC-002**: An analyst can capture five consecutive scenes (different timestamps and viewports) in under 90 seconds. Throughout the sequence, the map and time controller remain visible and operable; no point in the sequence requires dismissing a modal.
- **SC-003**: 100% of capture and maintenance operations complete without opening a screen-blocking modal that obscures the map or the time controller. (Verified by automated test that asserts no modal element overlays the map region during these flows.)
- **SC-004**: An analyst who completes a representative authoring task (open → capture 3 scenes → rename one → re-capture one → reorder → delete one with undo → click first scene to restore) succeeds in both the web-shell and the VS Code extension. The two task completions differ only in surrounding chrome (qualitative review against side-by-side recordings).
- **SC-005**: Clicking a scene row restores the analyst to that scene's stored timestamp and viewport in under 1 second on a representative plot.
- **SC-006**: At least 90% of analysts in usability testing report that the authoring layout (map + time controller + panel together) feels natural, and that the capture gesture "doesn't get in the way" of map and time-slider work. (Qualitative metric, captured via post-task survey.)
- **SC-007**: The Storyboard panel component used in the web-shell and the VS Code extension shares a single source-of-truth implementation; surface-specific code is restricted to the wrappers that mount it. (Verified by code inspection — single panel component path used by both surfaces.)

## Assumptions

- **Reordering semantics**: Scenes are stored ordered by `timestamp` per #215. "Reordering" in the panel is achieved by adjusting the affected scene's `timestamp` (e.g., re-timestamp to fit between two siblings, with optional confirm if the new value collides). An analyst-visible drag-to-reorder gesture is permitted; under the hood it edits timestamps. This avoids introducing a separate display-order field that would diverge from the schema's chronological ordering. If a future requirement needs a manual order independent of timestamp, that is a schema change tracked separately.
- **Where the panel lives**:
  - In the **web-shell**, the panel docks to the right of the map by default, with the time controller spanning the bottom under both. This keeps the existing main-area map prominent and parallels the VS Code layout.
  - In **VS Code**, the existing storyboard panel webview (`apps/vscode/src/views/storyboardPanelView.ts`) continues to host the panel; the new work is enforcing that opening the authoring view also makes the Map Viewer and time controller visible (auto-restore if the user has them collapsed) and arranging them so all three regions are usable concurrently.
- **Capture entry point**: A button in the panel header is the primary affordance; the `Ctrl/Cmd+Alt+C` keybinding from #216 remains the secondary affordance and is wired up in both surfaces.
- **Empty state on first capture**: The "name your storyboard" prompt is rendered as an inline form inside the panel rather than as a quick-pick or modal, to satisfy the non-modal constraint. Implementation may differ from #216's quick-pick reference if needed.
- **Persistence in web-shell**: The web-shell preview is assumed to use the same plot/storage layer the existing edit harness uses; if running against a read-only fixture, the panel surfaces a "preview-only — changes won't persist" notice.
- **No new entities**: This spec does not propose schema changes; #215's `Storyboard` and `Scene` are sufficient.

## Dependencies

- **Builds on #215** (Storyboarding Schema) — Storyboard and Scene records, viewport substructure, CRUD module.
- **Builds on #216** (Storyboarding Capture) — capture keybinding, collision-handling rules, snapshot semantics. Replaces #216's modal/quick-pick first-capture interaction with an inline panel form.
- **Builds on #218 / #230 / #234** (Storyboarding Edit and follow-ups) — rename, describe, delete-with-undo, update-to-current, duplicate, copy-to-other-storyboard, refresh-thumbnail. These maintenance ops are surfaced inline in the panel.
- **Builds on #174** (Thumbnail Capture) — per-scene thumbnail generation.
- **Builds on #219** (Buffer Asset Entries) — thumbnail asset buffering during capture.
- **Touches #217** (Storyboarding Playback) only at the boundary: clicking a scene to restore its viewport uses the existing flyTo/time-tween service. No playback/animation work in this spec.

## Out of Scope

- **Playback / animation of storyboards.** Click-to-restore on a single scene row is in scope; sequential auto-play of a storyboard is the responsibility of #217 and is not extended here.
- **Export to video, PDF, or any rendered artefact.** A storyboard remains a structured set of scenes; exporting them to a fixed format is a separate, downstream feature.
- **Multi-author / concurrent editing.** Single-author semantics assumed throughout. Locking, conflict resolution, and presence indicators are not part of this work.
- **Schema changes.** No new fields on `Storyboard` or `Scene`; no new entities.
- **Separate display-order field.** Reordering uses timestamp adjustment (see Assumptions). A dedicated `display_order` field would be a separate schema change.
- **Storyboard-level preview/cover image.** Not addressed.
