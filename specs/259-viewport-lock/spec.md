# Feature Specification: Viewport Lock

**Feature Branch**: `259-viewport-lock`
**Created**: 2026-05-18
**Status**: Draft
**Input**: User description: "Viewport lock — a session-runtime toggle that freezes the map's viewport (centre + zoom) so a user can capture a series of storyboard scenes that all share the same framing, while still varying time / display mode / selection / visibility between captures."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture a multi-scene story with consistent framing (Priority: P1)

An analyst is building a storyboard that walks a reviewer through how a tactical situation evolved over several hours. They want every scene in the storyboard to be framed identically — same centre, same zoom — so the reviewer's eye stays on the same patch of water and only the *tracks* and *time* change between scenes. Today this is fragile: an accidental scroll-wheel nudge, a stray click on a fit-to-window button, or an automated viewport call from a tool the analyst is using elsewhere can silently shift the framing between captures, ruining the series and forcing a redo.

The analyst pans and zooms the map until the framing is right, turns on the viewport lock from the Storyboard panel, and then captures scenes one after another — changing the time, the display mode, the selection, hiding or showing features as needed — confident that every captured thumbnail will share the same frame.

**Why this priority**: This is the core motivating workflow. Without it the feature has no reason to exist; with it the analyst can produce broadcast-quality storyboards without re-shoots. Every other story in this spec exists in service of this one.

**Independent Test**: Open a plot, frame a region of interest, turn the lock on, capture three scenes at three different timestamps, and verify all three thumbnails share identical centre and zoom while showing different content. Can be tested end-to-end without any of the secondary stories.

**Acceptance Scenarios**:

1. **Given** the analyst has framed the map on a region and turned the viewport lock on, **When** they capture three scenes at different timestamps without changing anything else, **Then** all three scene thumbnails show the same centre and zoom and differ only in time-dependent content.
2. **Given** the lock is on, **When** the analyst drags the map, scrolls the wheel, double-clicks, pinch-zooms, drags a selection box, or presses an arrow key while focus is on the map, **Then** the map does not move and no viewport change is recorded.
3. **Given** the lock is on, **When** the analyst hovers the disabled zoom-in, zoom-out, or fit-to-window button on the map toolbar, **Then** a tooltip explains the buttons are unavailable because the viewport is locked, and clicking them has no effect.
4. **Given** the lock is on, **When** the analyst changes the current time, switches display mode, changes selection, or hides/shows features, **Then** those changes take effect normally and the map content updates without the viewport moving.
5. **Given** the lock is on, **When** the analyst clicks Capture, **Then** the capture proceeds normally and a new scene is added to the storyboard.

---

### User Story 2 - External viewport-change attempts are safely rejected (Priority: P2)

While the analyst is mid-capture-series with the viewport locked, an external automation (for example, a language-model assistant calling a viewport tool) may attempt to programmatically change the framing — perhaps to "zoom to the area of activity" or "centre on the new contact". If those calls silently succeeded, the analyst's capture series would break exactly as if they had been bumped by hand, but with no obvious cause. If they silently *no-op'd*, the assistant would have no way to discover the lock and would keep trying.

**Why this priority**: Important for safety and for the assistant-driven workflow that's already starting to drive Debrief, but only meaningful once Story 1 exists. A user without external automation never notices this.

**Independent Test**: With the viewport locked, invoke the programmatic viewport-change surface (e.g. via the assistant tool) and verify the call returns a structured, machine-readable error identifying the lock as the cause, and the map does not move.

**Acceptance Scenarios**:

1. **Given** the viewport is locked, **When** an external tool requests a viewport change, **Then** the request is refused, the map does not move, and the caller receives a structured error whose code unambiguously identifies "viewport locked" (i.e. a stable, documented error code, not a free-text-only message).
2. **Given** the viewport is not locked, **When** the same external tool requests the same viewport change, **Then** the request succeeds and the map updates as it did before this feature existed (no regression for unlocked sessions).

---

### User Story 3 - Quickly toggle and automatically clear the lock (Priority: P3)

The analyst uses the lock many times across a session. Reaching for the Storyboard panel button every time is fine but slow; a keyboard shortcut from the map itself is faster when iterating. And when the analyst opens a different plot or loads a different session, the lock from the previous context is almost never relevant to the new one — leaving it on would just confuse the analyst when they try to pan the new map and it doesn't move.

**Why this priority**: Ergonomic polish that makes the feature pleasant to live with. Not required for the feature to deliver value, but cheaper to get right at the start than retrofit.

**Independent Test**: With the map focused and the lock off, press the shortcut key and verify the lock turns on (and the visual feedback appears); press again and verify it turns off. Separately, lock the viewport, open a different plot, and verify the new map starts unlocked.

**Acceptance Scenarios**:

1. **Given** the map has keyboard focus and the lock is off, **When** the analyst presses the lock shortcut key, **Then** the lock turns on and the visual indicators appear.
2. **Given** the map has keyboard focus and the lock is on, **When** the analyst presses the lock shortcut key, **Then** the lock turns off and the visual indicators are removed.
3. **Given** the viewport is locked, **When** the analyst opens a different plot, **Then** the new plot's map starts in the unlocked state and the padlock button reflects that.
4. **Given** the viewport is locked, **When** the analyst loads a different session file, **Then** the loaded session's map starts in the unlocked state regardless of how the previous session ended.
5. **Given** the analyst locked the viewport, then saved and reopened the session, **When** the session reopens, **Then** the viewport starts unlocked (the lock is a runtime workflow state, not a saved property of the session).

---

### Edge Cases

- **Lock toggled mid-capture**: If the analyst toggles the lock while a capture is already in flight, the capture in progress completes against whatever viewport it had already read; the lock state change applies to the *next* capture.
- **Storyboard panel hidden**: If the Storyboard panel is closed or hidden, the padlock toggle is not reachable from the panel — the keyboard shortcut and the on-map banner (when already locked) remain the available controls.
- **Multiple maps visible simultaneously**: The lock is scoped to the single session map shown in the active view; if a future surface ever shows two maps at once they are out of scope for this feature.
- **Lock requested but no plot is open**: The padlock toggle is disabled when there is no map to lock; the keyboard shortcut is a no-op in that state.
- **External tool calls during the brief unlock-then-relock window**: A caller racing the lock toggle may get one accepted call followed by rejected calls (or vice versa). This is expected — the lock state at the moment the call is evaluated wins.
- **Window resize while locked**: The map renders the same locked centre/zoom at the new size; the framing is defined by centre + zoom, not by pixel bounds.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a single explicit control to turn the viewport lock on and off from the Storyboard panel header, placed adjacent to the existing Capture control so the relationship between locking and capture is visually obvious.
- **FR-002**: The system MUST provide a keyboard shortcut, available when the map has keyboard focus, that toggles the viewport lock without requiring the Storyboard panel to be visible.
- **FR-003**: While the viewport is locked, the system MUST ignore every user gesture on the map that would otherwise change the centre or zoom — including mouse drag, scroll-wheel zoom, double-click zoom, pinch/touch zoom, drag-rectangle zoom, and keyboard panning.
- **FR-004**: While the viewport is locked, the map toolbar's zoom-in, zoom-out, and fit-to-window controls MUST be visibly disabled (not removed) and MUST present a tooltip stating the viewport is locked when the user hovers or focuses them.
- **FR-005**: While the viewport is locked, the system MUST display an unmistakable on-map indicator that the lock is active, and that indicator MUST itself be a control the user can activate to turn the lock off.
- **FR-006**: When the viewport is unlocked (whether by the panel button, the keyboard shortcut, the on-map indicator, or automatically by a session/plot change), the system MUST restore every map gesture and toolbar control to the same enabled/disabled state it would have had if the lock had never been engaged — the unlock MUST NOT enable any control or handler that was previously disabled for an independent reason.
- **FR-007**: The system MUST allow the Capture action to succeed whether the viewport is locked or unlocked; locking is a workflow modifier and not a precondition for capture.
- **FR-008**: While the viewport is locked, the system MUST allow the user to change the current time, display mode, selection, and per-feature visibility freely; the lock applies only to viewport (centre + zoom) and to nothing else.
- **FR-009**: When an external programmatic surface (such as an assistant/tool integration) requests a viewport change while the lock is on, the system MUST refuse the request without changing the viewport and MUST return a structured error whose code unambiguously identifies the lock as the cause, so that an automated caller can detect and reason about the condition.
- **FR-010**: When an external programmatic surface requests a viewport change while the lock is off, the system MUST process the request exactly as it did before this feature existed (no regression on the unlocked path).
- **FR-011**: The viewport lock state MUST be session-runtime only — it MUST NOT be written into a saved session file, and a session that is opened MUST start with the lock off regardless of what the lock state was when that session was last saved.
- **FR-012**: Opening a different plot or loading a different session MUST automatically turn the lock off, so that the user is never left with a locked-but-stale viewport on an unrelated map.
- **FR-013**: The lock toggle MUST be disabled when there is no map to lock (no plot open), and the keyboard shortcut MUST be a no-op in that state.

### Key Entities

- **Viewport Lock State**: A single per-session boolean indicating whether the map's centre and zoom are currently frozen. Defaults to off. Cleared by plot/session change. Not persisted across save/reload.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Capture a series of storyboard scenes that share an identical map frame so the reviewer's attention stays fixed on a single area while the underlying content (time, display, selection, visibility) varies.
- **Key Decision(s)**:
  1. *When* to engage the lock — after framing the region of interest and before the first of a multi-scene series.
  2. *When* to release the lock — once the series is complete, before reframing for the next region of interest.
- **Decision Inputs**: The current map framing is visible to the user. The lock state is visible at two places (Storyboard panel padlock + on-map banner when locked), so the user can always tell at a glance whether they are in locked mode. Disabled-with-tooltip toolbar buttons surface the reason ("Viewport locked") at the point of attempted interaction.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Map shown, lock off (default), Storyboard panel visible with padlock-open icon next to Capture | Pan/zoom map to desired framing | Map updates normally |
| 2 | Map at desired framing, lock off | Click padlock in Storyboard panel header (or press lock shortcut with map focused) | Lock turns on: padlock icon flips to closed/active; on-map banner appears reading "Viewport locked"; toolbar zoom/fit buttons go disabled with tooltip; mouse drag/scroll on map produces no movement |
| 3 | Map locked | Click Capture | Scene captured at the locked viewport; scene appears in list |
| 4 | Map locked | Change time / display mode / selection / hide-show features, then click Capture again | New scene captured at the same viewport with the new content |
| 5 | Map locked, series complete | Click padlock in panel header, or click the on-map banner, or press the lock shortcut | Lock turns off: padlock icon returns to open/inactive; banner disappears; toolbar buttons re-enable; map gestures work again |
| 6 | Lock on, but user opens a different plot or loads a different session | (Implicit) | Lock automatically clears; new map starts unlocked |

### UI States

- **Empty State**: With no plot open, the padlock toggle in the Storyboard panel header is disabled (greyed, not clickable) and the keyboard shortcut is a no-op. There is no banner to show because there is no map.
- **Loading State**: Not applicable — the lock toggle is a single boolean and engages/disengages instantly. No progress indicator is required.
- **Error State**: A user cannot put the lock into an error state via the UI (every toggle either succeeds instantly or is a no-op because of empty state). For external programmatic callers blocked by the lock, the surface returns a structured error that includes a stable code identifying the lock; what the calling tool does with that error is the caller's concern.
- **Locked State** *(success state for engaging the lock)*: Padlock icon in panel header shows closed/active and is announced as pressed (`aria-pressed="true"`); on-map banner is visible along the top edge of the map with text identifying the lock and offering a click-to-unlock affordance; toolbar zoom and fit controls visibly disabled with a "Viewport locked" tooltip; map gestures inert.
- **Unlocked State** *(success state for releasing the lock)*: Padlock icon shows open/inactive and is announced as not-pressed; no banner; toolbar zoom/fit controls in their normal enabled state; map gestures fully responsive.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An analyst can capture a series of at least three storyboard scenes from the same locked viewpoint and, on visual inspection of the resulting scene thumbnails, every thumbnail shares the same centre and zoom to within visual identity (no perceptible drift). Measured by direct thumbnail comparison.
- **SC-002**: While the viewport is locked, the proportion of user-attempted viewport-changing gestures (drag, scroll, double-click, pinch, box, keyboard pan, toolbar zoom/fit click) that actually change the viewport is **0%**. Measured by exercising every listed gesture in an end-to-end test.
- **SC-003**: While the viewport is locked, the proportion of external programmatic viewport-change requests that succeed is **0%**, and **100%** of refused requests return a structured error whose code is documented and machine-detectable. Measured by automated test against the programmatic surface.
- **SC-004**: When the viewport is locked and a user opens a different plot or loads a different session, the resulting map is in the unlocked state in **100%** of cases. Measured by automated test covering both plot-switch and session-load entry points.
- **SC-005**: When the viewport is unlocked (default state and after every unlock), every map gesture and every toolbar control behaves identically to how it behaved before this feature was introduced. Measured by regression test against the pre-feature behaviour of the unlocked path.
- **SC-006**: A user encountering the locked state for the first time can determine, within 10 seconds and without consulting documentation, (a) that the map is intentionally locked rather than broken, and (b) how to unlock it. Measured by usability check: the on-map banner and the disabled-button tooltips together provide both pieces of information at the point of attempted interaction.

## Assumptions

- The "map" in this spec is the single session map rendered in the active view (VS Code map panel and web-shell map both apply); the feature does not address future multi-map surfaces.
- "External programmatic surface" in FR-009/FR-010 refers to the viewport-mutation tool exposed through the assistant integration. Other host-internal code paths that *could* mutate the viewport are not in scope for this feature because the UI offers no way for the user to trigger them while locked (this is a deliberate scoping decision recorded in the audit at `docs/project_notes/viewport-mutation-audit.md` Section E — only the externally-callable surface needs an explicit reject).
- The on-map banner's exact text, icon, and styling are visual-design details to be finalised during implementation; the spec requires only that the indicator is unmistakable and click-to-unlock.
- The keyboard shortcut character ("L") is a working default agreed during specification; if it collides with a binding introduced before implementation, an equivalent single-character shortcut may be substituted.
- The padlock icon visual is a placeholder for an appropriate open/closed lock glyph from the existing icon set used elsewhere in the application chrome.

## Dependencies

- The Storyboard panel exists and exposes a header with a Capture control (already shipped — this feature adds a sibling control to that header).
- The map view exposes the user-gesture handlers enumerated in FR-003 (already present — this feature toggles them on the lock state).
- The map toolbar exposes the zoom-in, zoom-out, and fit-to-window controls referenced in FR-004 (already present — this feature adds the disabled-with-tooltip state).
- The session-state layer can hold a runtime-only boolean that is **not** included in the saved-session payload (per FR-011); this is consistent with how other runtime-only UI states are held today.
- An external programmatic viewport-change surface exists and can return a structured error to its caller (already present — this feature adds the reject-while-locked branch).
