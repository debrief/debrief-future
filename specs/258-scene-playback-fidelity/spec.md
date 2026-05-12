# Feature Specification: Storyboard Scene Playback Fidelity & UI Polish

**Feature Branch**: `258-scene-playback-fidelity`
**Created**: 2026-05-12
**Status**: Draft
**Input**: User description: "Storyboard scene playback fidelity & UI polish — four tightly coupled gaps surfaced during PR #606 field testing of scene-click navigation: (a) capture & restore Full/Trail display mode in scene properties; (b) scene-bounds polygon must equal the actual captured viewport rather than a ~100m placeholder square; (c) glow / selection halo on the active scene rectangle, matching the highlight used for selected tracks; (d) Layers panel folds each Storyboard's child Scenes under a single collapsible parent node."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Author captures and replays a Trail-mode scene (Priority: P1)

A storyboard author is composing a scenario that depicts the "minute before contact" by setting the time controller to **Trail** mode (showing only the tail behind each platform), framing the map on the contact area, and clicking "Capture Scene". Later, during playback, clicking that scene must restore both the framed viewport **and** the Trail display mode — not silently revert to Full mode (the current behaviour, which destroys the author's intended visual emphasis).

**Why this priority**: Without this, scenes capture only part of the visual state. Any scenario whose narrative depends on Trail mode (close-range engagements, contact-of-interest highlight reels) is impossible to compose reliably. This is also a precondition for the polygon fidelity work in Story 2: the polygon represents what the audience will actually see when the scene plays, which depends on the display mode being preserved.

**Independent Test**: Author opens a sample storyboard, switches the time controller to Trail mode, frames the map, captures a scene, then switches to Full mode and frames a different area. Clicking the first scene returns the map to Trail mode at the original frame; clicking the second returns to Full mode at its frame.

**Acceptance Scenarios**:

1. **Given** the time controller is in Trail mode and the user clicks "Capture Scene", **When** the scene is created, **Then** its stored properties record the display mode as `trail`.
2. **Given** a scene was captured in Trail mode, **When** the user clicks that scene in the storyboard panel or on the map, **Then** the time controller switches to Trail mode as part of the transition (alongside the existing viewport restore).
3. **Given** existing scenes captured before this feature shipped (no recorded display mode), **When** they are played back, **Then** the time controller is left in its current mode and no error is shown (graceful degradation for legacy scenes).
4. **Given** a scene captured in Full mode, **When** played back while the user happened to be in Trail mode, **Then** the time controller switches back to Full mode.

---

### User Story 2 - Scene rectangles show what the audience will actually see (Priority: P1)

When a storyboard author looks at the map, every scene already exists as a rectangle drawn on the world. Today those rectangles are uniformly ~100 m square at scene-centre — a placeholder that conveys nothing about the captured framing. After this change, each rectangle must match the **actual viewport bounds** at capture time, so the author can see at a glance "Scene 1 is a wide regional view, Scene 2 zooms onto the contact, Scene 3 follows the platform tail."

**Why this priority**: This is the visual contract of the storyboarding feature — the rectangle *is* the scene's preview. A misleading 100 m square actively confuses authors during composition. Tightly coupled with Story 1: the rectangle's meaning ("this is what the audience will see") is only correct once display mode is also restored on playback.

**Independent Test**: Author captures three scenes at clearly different zoom levels (continental, regional, neighbourhood). Inspecting the map immediately after each capture, the corresponding rectangle visibly matches the framed area at each zoom level — small at high zoom, large at low zoom — within visible-eye tolerance of the actual map viewport edges.

**Acceptance Scenarios**:

1. **Given** the author has the map framed on a specific area at a specific zoom level, **When** they capture a scene, **Then** the rectangle drawn for that scene visibly aligns with the four corners of the framed viewport.
2. **Given** two scenes captured at different zoom levels, **When** both rectangles are visible on the map, **Then** their sizes differ in a way that reflects their captured zoom (lower zoom → bigger rectangle).
3. **Given** an existing scene that pre-dates this change, **When** the storyboard is opened, **Then** the rectangle is recomputed (or shown via a fallback) and does not appear as a degenerate ~100 m square.

---

### User Story 3 - Active scene rectangle is visibly highlighted (Priority: P2)

During playback or selection, the audience and author need to know **which** scene is currently active without scanning the panel. The rectangle of the active scene should glow — using the same selection-halo style applied to selected tracks — so it stands out on a busy map.

**Why this priority**: Quality-of-life improvement that becomes essential once Story 2 lands (more rectangles, distinguishable sizes — but still indistinguishable in selection state without a highlight). Lower priority than 1 and 2 because the feature *works* without it; it just looks rougher.

**Independent Test**: Author has three scene rectangles visible. They click Scene 2 in the storyboard panel; the Scene 2 rectangle gains the highlight and Scenes 1 & 3 remain neutral. They click on Scene 1's rectangle directly on the map; the highlight transfers to Scene 1.

**Acceptance Scenarios**:

1. **Given** multiple scene rectangles are visible, **When** a scene becomes the active/current scene (via panel click, map click, or playback transport), **Then** its rectangle shows the selection halo and no other rectangle does.
2. **Given** an active scene is highlighted, **When** the active scene changes, **Then** the previous rectangle returns to its neutral style and the new one gains the halo.
3. **Given** the user clears the selection, **When** no scene is active, **Then** no rectangle is highlighted.

---

### User Story 4 - Layers panel groups scenes under their storyboard (Priority: P2)

A scenario typically contains one (sometimes two) storyboards, each with several scenes. Today every scene appears as a peer leaf in the Layers panel alongside tracks and other features, cluttering the tree and obscuring which scenes belong to which storyboard. After this change, each storyboard appears as a single collapsible parent node whose children are its scenes.

**Why this priority**: Composition-time clarity. Doesn't block playback but materially improves the authoring experience once a storyboard has more than two scenes. Reuses the per-feature selection highlight introduced/clarified in Story 3, which is why it ships in the same wave.

**Independent Test**: Author opens a sample with one storyboard of five scenes. The Layers panel shows one "Storyboard" parent node; clicking the disclosure chevron expands to reveal five scene children. Clicking a child selects only that scene (and triggers the highlight from Story 3).

**Acceptance Scenarios**:

1. **Given** the document contains a storyboard with N scenes, **When** the Layers panel renders, **Then** the storyboard appears as a single parent row with N collapsible children (not N peer rows alongside tracks).
2. **Given** a storyboard parent node is collapsed, **When** the user clicks the disclosure chevron, **Then** its scene children are revealed; clicking again hides them.
3. **Given** two storyboards in the same document, **When** the Layers panel renders, **Then** each storyboard is its own collapsible parent and scenes never appear under the wrong parent.
4. **Given** a scene is the currently active scene, **When** its storyboard parent is collapsed, **Then** the author has an unambiguous indication that an active scene exists inside the collapsed group (e.g., the parent inherits the active-state styling).

---

### Edge Cases

- **Legacy scenes without `display_mode`** — must play back without error; the time controller is left untouched (no implicit reset).
- **Legacy scenes with the placeholder ~100 m polygon** — when next viewed, the rectangle must not appear as a degenerate square. Either the polygon is recomputed from the stored viewport on read, or the saved polygon is migrated on the next storyboard edit. (Acceptable approach: derive the polygon from `viewport.center + viewport.zoom + current map pixel dimensions` on render whenever the stored polygon is detected as the placeholder.)
- **Viewport captured at an extreme zoom level** (e.g., zoomed out past world wrap, or zoomed in to a single tile) — the polygon must remain a valid four-corner GeoJSON polygon with non-degenerate area; rendering must not crash.
- **Selection halo collides with other styling** — if the scene rectangle is already styled (hover, edit mode), the active-scene halo composes cleanly with those states (priority order: editing > active > hover > neutral).
- **Multiple storyboards both expanded** — Layers panel does not double-list a scene; each scene belongs to exactly one storyboard parent.
- **Storyboard with zero scenes** — the parent row still appears (with an empty/disabled chevron) so authors can see the storyboard exists.
- **Active scene inside a collapsed storyboard parent** — selection state is still discoverable to the author (parent shows an inherited indicator, e.g., a dot or the same halo styling).

## Requirements *(mandatory)*

### Functional Requirements

**Display-mode capture & restore (a):**

- **FR-001**: When a scene is captured, the system MUST record the time controller's current display mode (Full or Trail) as part of the scene's properties.
- **FR-002**: When a scene is played back (clicked in panel or on map, or advanced by the playback transport), the system MUST restore the captured display mode as part of the transition, alongside the existing viewport restore.
- **FR-003**: If a scene's stored properties do not contain a display mode (legacy data), the system MUST NOT change the current display mode during playback of that scene, and MUST NOT raise an error.

**Scene-bounds polygon fidelity (b):**

- **FR-004**: When a scene is captured, the system MUST compute the scene-bounds polygon from the actual map viewport's four corners (i.e., the world coordinates of the on-screen top-left, top-right, bottom-right, bottom-left pixels) at the captured zoom.
- **FR-005**: The computed polygon MUST be a valid closed GeoJSON polygon with non-degenerate area at all supported zoom levels.
- **FR-006**: When a stored polygon is detected as the legacy ~100 m placeholder, the system MUST recompute it from the stored viewport on next render (or migrate it on next edit), so authors never see a placeholder square for a captured scene.

**Active-scene highlight (c):**

- **FR-007**: When a scene becomes the active scene (via panel click, map click, or playback transport advancing to it), its rectangle on the map MUST display the same selection-halo styling that is applied to selected tracks elsewhere in the application (visual parity: same outer-glow colour token, same approximate stroke weight).
- **FR-008**: At most one scene rectangle MUST be highlighted at any time; when the active scene changes, the previous highlight MUST be removed before the new one is applied.
- **FR-009**: When no scene is active, no scene rectangle MUST display the highlight.

**Layers panel composition (d):**

- **FR-010**: The Layers panel MUST render each storyboard as a single collapsible parent row whose children are that storyboard's scenes; scenes MUST NOT appear as peer rows alongside tracks or other features.
- **FR-011**: The Layers panel MUST support expanding and collapsing each storyboard parent independently, with state persisting for the duration of the session.
- **FR-012**: When a scene is the active scene and its storyboard parent is collapsed, the parent row MUST indicate that an active scene exists within it (so the author is never "lost" looking for the highlight).
- **FR-013**: An empty storyboard (no scenes) MUST still render as a parent row, so authors can locate it in the tree.

**Cross-cutting:**

- **FR-014**: All four behaviours MUST work together within a single playback session without regressions: capturing a scene in Trail mode at a specific framing produces a correctly-sized rectangle that, when clicked from the Layers panel (under its storyboard parent), highlights with the selection halo and restores both the viewport and Trail mode.

### Key Entities

- **Scene**: A captured snapshot of map state belonging to a storyboard. Properties include transition duration, viewport (centre + zoom), and — newly — the display mode (Full or Trail). The scene's spatial bounds are represented as a GeoJSON polygon that must match the framed viewport.
- **Storyboard**: An ordered collection of Scenes. Now also acts as a grouping node in the Layers panel; previously was invisible there.
- **Scene Rectangle**: The on-map visual representation of a scene's captured viewport. Has visual states: neutral, hover, active (highlighted), and editing.
- **Display Mode**: The time controller's playback rendering mode — either `full` (entire track history shown) or `trail` (only a tail behind each platform). Authoritative source is the time controller; now also a property of each Scene.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: A storyboard author needs to compose a scenario where each scene faithfully captures both **what the audience sees** (viewport framing + display mode) and **what the author intended** (clearly distinguishable rectangles and grouping in the panel).
- **Key Decisions**:
  1. **Which display mode to capture in** — author chooses Full vs Trail by setting the time controller before pressing Capture Scene. The captured scene then locks that decision in.
  2. **Which scene to navigate to** — author selects a scene either by clicking its rectangle on the map or its row in the Layers panel; both must surface a clear active-state indicator.
  3. **Which storyboards to expand/collapse** — when working with multiple storyboards, the author manages tree clutter by collapsing the ones they're not editing.
- **Decision Inputs**:
  - Time controller's current state (visible chip showing Full/Trail).
  - Visible scene rectangles, now sized like the actual framed view, allowing the author to compare framings at a glance.
  - Active-scene highlight, so the currently-playing scene is unambiguous.
  - Layers panel tree structure (storyboard → scenes) so the author knows which scenes belong where.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Map framed at desired view; time controller in Trail mode | Click "Capture Scene" | New scene created; rectangle drawn matching the framed viewport; properties record `display_mode: trail` |
| 2 | Layers panel showing one storyboard parent with new child scene | Reframe map and switch time controller back to Full; click "Capture Scene" | Second scene appended under the same storyboard parent; rectangle visibly larger/smaller than the first to match the new zoom; properties record `display_mode: full` |
| 3 | Multiple scenes visible on map and in Layers panel | Click first scene in Layers panel | Map transitions to scene 1's framing; time controller switches to Trail mode; scene 1's rectangle gains selection-halo highlight; scene 2's rectangle returns to neutral |
| 4 | Storyboard with many scenes | Click disclosure chevron on storyboard parent | Storyboard parent collapses; its scene children are hidden; if a child was active, the parent itself indicates the active state |

### UI States

- **Empty State**: A storyboard with no scenes still shows its parent row in the Layers panel (chevron disabled) so authors know it exists. No rectangles drawn on the map.
- **Loading / Transition State**: Between clicking a scene and the transition completing, the rectangle is highlighted immediately; the map and time-controller animate to the captured state over the scene's `transition_duration_ms`.
- **Error State**: If a scene has malformed properties (e.g., missing viewport), the system MUST NOT crash; the scene's rectangle is omitted or shown in a clearly degraded style, and clicking the scene produces a user-visible warning rather than silent failure.
- **Success State**: After a transition, the map shows the captured framing, the time controller is in the captured display mode, the scene's rectangle is highlighted with the selection halo, and the Layers panel row for that scene is selected (with its parent storyboard, if collapsed, inheriting the active indicator).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of newly captured scenes record their display mode (Full or Trail); replaying any newly captured scene restores the same display mode that was active at capture time.
- **SC-002**: For 100% of newly captured scenes, the scene rectangle's four corners visibly align with the framed viewport's four corners at capture time (within human-eye tolerance — no longer the universal ~100 m placeholder).
- **SC-003**: When a scene becomes the active scene, its rectangle is visually distinguishable from inactive scenes within one transition cycle, and exactly one rectangle is highlighted at a time.
- **SC-004**: For a document containing a storyboard with five or more scenes, the Layers panel renders that storyboard as one collapsible parent (1 row) rather than five peer leaves alongside tracks — measurably reducing the panel's top-level row count.
- **SC-005**: A returning author can re-open a scenario authored before this feature shipped (legacy scenes) and view, click through, and play back every scene without error or visual regression; legacy scenes whose display mode was never captured do not corrupt the time controller during playback.
- **SC-006**: All four behaviours land together within a single feature wave (no partial-merge state where, e.g., display mode is preserved but rectangles still show as placeholder squares); estimated 3–4 dev-days end-to-end.

## Assumptions

- The time controller's display mode is and will remain a binary (`full` | `trail`); no third mode is in scope for this feature.
- Scene properties are schema-versioned (or tolerant of new fields) such that adding `display_mode` is a backward-compatible additive change; legacy scenes lacking the field are accepted at read time.
- The selection halo used by tracks exposes a reusable visual style (CSS token + stroke weight) that can be applied to scene rectangles without re-deriving the look-and-feel.
- The Layers panel already supports collapsible parent nodes for other entity groups; this feature adds a new grouping type (storyboard → scenes) using the same primitive rather than inventing a new pattern.
- The host map provides the pixel dimensions and projection math needed to compute viewport corners from `(center, zoom)`; no new mapping primitive is required.
- "Legacy scene migration" is opportunistic: stored polygons are recomputed on render when detected as the placeholder; we do not require a one-shot batch migration script.
