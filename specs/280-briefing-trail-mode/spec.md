# Feature Specification: Briefing Renderer Honours Trail Display Mode

**Feature Branch**: `280-briefing-trail-mode`  
**Created**: 2026-06-01  
**Status**: Draft  
**Input**: User description: "Briefing renderer honours captured per-Scene display_mode (Full/Trail): in Trail mode the track grows up to the current playback time instead of always rendering the full LineString" (backlog item #280, epic E13)

## Overview

When a storyboard author composes a scene in **Trail** mode, they are deliberately emphasising the recent history of each platform — the "snail-trail" tail leading up to a moment (e.g. "the minute before contact"). Spec #258 made the main application capture that Full/Trail choice onto each scene and honour it on playback. The **standalone briefing renderer** (the exported, shareable, offline-playable briefing) does not honour it: it always draws each platform's complete route, with only a moving position marker as the time-driven element. The result is that every Trail-mode scene plays back as a static full track in the exported briefing, silently discarding the author's narrative intent.

This feature makes the briefing renderer honour the per-scene display mode that is already carried in the exported data, so a Trail-mode track **grows** during playback and a Full-mode (or legacy) track continues to show in full.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Viewer watches a Trail-mode scene and the track grows (Priority: P1)

A viewer opens an exported briefing and plays (or scrubs through) a scene that the author captured in **Trail** mode. As playback time advances, each platform's track grows from its starting point up to the moving position marker — a snail-trail — rather than showing the entire route at once.

**Why this priority**: This is the core defect. A Trail-mode storyboard is visually meaningless if the whole track is shown from the first frame; the author's narrative emphasis (recent history, approach to a contact) is destroyed. Fixing this is the entire point of the feature.

**Independent Test**: Open a briefing whose current scene records display mode `trail`. Move the playback position from the start of the scene's time window to the end. The visible portion of each time-stamped track increases as time advances, and at the end the full track is shown.

**Acceptance Scenarios**:

1. **Given** the current scene was captured in Trail mode, **When** playback time is at the very start of the track's window, **Then** little or none of the track is drawn (only the earliest segment, if any).
2. **Given** the current scene was captured in Trail mode, **When** playback time advances toward the end of the track's window, **Then** the drawn portion of the track grows monotonically, always trailing the moving position marker.
3. **Given** the current scene was captured in Trail mode, **When** playback time reaches or passes the track's last recorded time, **Then** the entire track is drawn (the trail has fully grown).

---

### User Story 2 - Viewer watches a Full-mode or legacy scene and sees the whole track (Priority: P2)

A viewer plays a scene captured in **Full** mode, or opens a legacy briefing that was exported before display mode was captured. The track displays in its entirety at every playback position, exactly as it does today.

**Why this priority**: Regression guard. The fix must change behaviour *only* for Trail scenes; Full and legacy briefings must look exactly as before. Equally important for correctness, but framed as "preserve existing behaviour" rather than "fix the defect".

**Independent Test**: Open a briefing whose current scene records display mode `full`, and separately a legacy briefing whose scene has no recorded display mode. In both, move the playback position across the full window. The complete track is visible at every position.

**Acceptance Scenarios**:

1. **Given** the current scene was captured in Full mode, **When** playback time is anywhere in the scene's window, **Then** the entire track is drawn.
2. **Given** a legacy briefing whose scene has no recorded display mode, **When** it is played back, **Then** the entire track is drawn and no error occurs.

---

### User Story 3 - A briefing mixing Trail and Full scenes applies the right mode per scene (Priority: P3)

A briefing contains several scenes — some captured in Trail mode, some in Full. As the viewer moves between scenes during a single playback session, each scene renders according to its own recorded display mode.

**Why this priority**: This composes Stories 1 and 2 across scene transitions. It is lower priority because it is the combination of the two individual behaviours, validated once each works on its own.

**Independent Test**: Open a briefing with scene A in Trail mode and scene B in Full mode. Play scene A (track grows), advance to scene B (full track shown), return to scene A (track grows again from the scene's time origin).

**Acceptance Scenarios**:

1. **Given** a briefing whose scene A is Trail and scene B is Full, **When** the viewer is on scene A and advances playback, **Then** the track grows; **When** the viewer moves to scene B, **Then** the full track is shown.
2. **Given** the viewer returns from scene B (Full) back to scene A (Trail), **When** playback advances on scene A, **Then** the trail behaviour applies again.

---

### Edge Cases

- **Track without per-vertex timing in a Trail scene** — a track that lacks the timestamps needed to compute a trail cannot grow; the renderer falls back to showing the full track (no blank track, no error). This mirrors today's behaviour where the moving marker is simply omitted for such tracks.
- **Playback time before a track's first recorded time (Trail)** — the track shows nothing yet; it appears and begins growing once playback reaches its time window. (Consistent with the moving marker, which is also absent before the track starts.)
- **Playback time at or after a track's last recorded time (Trail)** — the trail equals the full track.
- **Non-track line and area features** (annotations, region outlines, multi-segment shapes without per-vertex timing) — render in full regardless of mode; they are static context, not time-driven.
- **Static reference points** — shown as markers in both modes; unaffected by the trail/full distinction.
- **Unrecognised display-mode value** (neither `full` nor `trail`) — treated as Full (show everything), the safe non-destructive default.
- **Single-vertex or very short tracks** — behave gracefully: in Trail mode a one-point track shows at most its single position once its time is reached.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When the current scene's display mode is **Trail**, the renderer MUST display each time-stamped track only from its start up to the current playback time, and that visible portion MUST grow as playback time advances.
- **FR-002**: When the current scene's display mode is **Full**, the renderer MUST display each track in its entirety at every playback position.
- **FR-003**: When the current scene has **no recorded display mode** (legacy briefings exported before display mode was captured), the renderer MUST behave exactly as Full mode — the whole track is shown — and MUST NOT raise an error. (Parity with #258 FR-003: leave the track untouched when the slot is absent.)
- **FR-004**: The growing trail MUST be governed by the **same current-playback-time value** that drives the moving position marker, so the trail's leading edge and the marker advance together as time changes.
- **FR-005**: When the viewer moves between scenes in a single playback session, the renderer MUST re-evaluate display mode **per scene**, so a Trail scene grows and a Full scene shows the complete track within the same session.
- **FR-006**: The change MUST be confined to the briefing renderer's display behaviour. It MUST NOT require changes to scene capture, the storyboard schema, or the export/scoping pipeline — the per-scene display mode and per-vertex track timing are already carried into the exported briefing.
- **FR-007**: For a track that lacks the per-vertex timing needed to compute a trail, the renderer MUST fall back to showing the full track (no blank track, no error) even when the scene is Trail.
- **FR-008**: Trail rendering MUST be visually consistent with how the main application renders Trail mode for the same track and the same time, so a scene looks equivalent in the in-app preview and in the exported briefing.
- **FR-009**: Non-time-stamped line and area features and static reference points MUST render identically in Trail and Full modes (they are static context, unaffected by the distinction).

### Key Entities *(include if feature involves data)*

- **Scene**: A captured snapshot belonging to a storyboard. Carries the framed viewport, a transition, the set of features it makes visible, and a **display mode** (Full or Trail). The display mode may be absent in legacy briefings.
- **Track**: A time-stamped path for a platform — an ordered sequence of positions, each with a timestamp. The portion shown depends on the active scene's display mode and the current playback time.
- **Display Mode**: A per-scene value, either Full (entire track shown) or Trail (only the tail up to the current playback time). When absent or unrecognised it is treated as Full.
- **Current Playback Time**: The single time value advanced by the transport controls / slider. It selects both the trail's leading edge and the moving marker's position.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: A viewer watches an exported, offline briefing and perceives each scene as the author intended — including whether a track should reveal its full route or grow as a recent-history trail.
- **Key Decision(s)**:
  1. The **author's** Full-vs-Trail decision was already made and locked in when the scene was captured (#258). The renderer's job is to *honour* it, not to re-prompt for it.
  2. The **viewer's** only decisions are transport actions — play / pause and where to scrub the playback position.
- **Decision Inputs**: The scene's recorded display mode (carried in the exported briefing) and the current playback time supplied by the transport controls. No new input is asked of the viewer.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Briefing loaded; first scene framed | (none — automatic) | Track is drawn per the scene's display mode: full if Full/legacy, just the early tail if Trail near the window start |
| 2 | Trail scene, playback advancing | Press Play or drag the slider forward | Each track grows from its start toward the moving position marker as time advances |
| 3 | Trail scene, end of window | Continue to the scene's end | The trail has fully grown — the entire track is shown, marker at the final position |
| 4 | Transition to a Full scene | Advance to the next scene | The complete track is shown immediately and stays constant as time advances |

### UI States

- **Empty State**: In a Trail scene, before a track's first recorded time, that track shows no line yet (and no marker); it appears once playback reaches its time window.
- **Loading State**: While the briefing data is loading, the basemap is shown with no tracks (unchanged from today); display-mode handling applies only once data is ready.
- **Error State**: A track missing the per-vertex timing needed for a trail falls back to its full line in Trail mode — no blank track and no crash.
- **Success State**: During Trail playback the visible track length increases monotonically with time and trails the moving marker; in Full and legacy scenes the complete track is visible throughout.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a scene captured in Trail mode, advancing playback from the start to the end of the track's time window increases the visible track length monotonically — near 0% of the track is drawn at the window start and 100% at the window end (the track demonstrably "grows").
- **SC-002**: For a scene captured in Full mode, the visible track length is constant (the complete track) at every playback position — verified at the start, middle, and end of the window.
- **SC-003**: A legacy briefing exported before display mode was captured plays back without error and shows the full track throughout — no regression versus today's behaviour.
- **SC-004**: For the same track, scene, and playback time, the trail shown in the exported briefing matches (is visually equivalent to) the trail the main application shows in its preview.
- **SC-005**: 100% of newly captured Trail-mode scenes exhibit a growing track on playback in the exported briefing — the reported defect no longer reproduces for any newly captured Trail scene.

## Assumptions

- The exported briefing already carries everything the fix needs: each scene's display mode and each track's per-vertex timing. (The export/scoping pipeline passes scene properties through unchanged, and the moving position marker already relies on per-vertex timing — so the data is present.) No new data must be captured or exported.
- "Trail" means the snail-trail from a track's start up to the current playback time, matching the main application's existing Trail rendering. The renderer should reuse / mirror that canonical behaviour so the two surfaces stay visually identical, rather than inventing a separate slicing rule.
- Trail trimming applies only to time-stamped tracks. Static context — area outlines, annotation lines without per-vertex timing, and reference points — is unaffected by display mode.
- An absent or unrecognised display-mode value is treated as Full (show everything), the safe non-destructive default consistent with #258.
- Scenes legitimately captured in Full mode (or before #258 existed) will **not** grow even after this fix — that is correct behaviour, not a residual defect.

## Dependencies

- Builds on **#258** (scene playback fidelity), which introduced capturing and restoring the per-scene Full/Trail display mode in the main application and defines the Full/Trail semantics this feature honours.
- The defect surfaced during live-Preview testing of **#273** (storyboard preview button) under code-server (PR #657). This spec is renderer-only and independent of #273, but the most compelling demonstration of the fix is via that Preview path.

## Out of Scope

- Any change to how scenes are captured, scored, validated, or stored.
- Any storyboard or scene schema change.
- Any change to Full-mode or legacy-scene behaviour beyond preserving it.
- Trail behaviour in the **main application** (already correct per #258) — this feature concerns the standalone briefing renderer only.
- The moving position marker itself (already works); the only requirement on it here is that the trail stays consistent with it (FR-004).
