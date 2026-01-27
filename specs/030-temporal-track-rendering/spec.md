# Feature Specification: Temporal Track Rendering

**Feature Branch**: `030-temporal-track-rendering`
**Created**: 2026-01-27
**Status**: Draft
**Input**: User description: "Implement temporal rendering of tracks. We have two time modes: full-track and snail-trail. In full-track mode, we show the full track, with a highlight marker on the nearest point to the current time. In snail-trail mode we only show a line up to the point nearest the current time. We update tracks on each update of temporal state."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Full-Track Mode with Time Indicator (Priority: P1)

An analyst reviewing track data wants to see the complete track history while understanding exactly where a vessel was at the current time position. They view tracks in full-track mode, seeing the entire path rendered with a distinctive marker highlighting the vessel's position at the selected time.

**Why this priority**: Full-track mode is the default display and provides essential spatial context. Analysts need to see the complete path to understand overall movement patterns while identifying the exact position at any given time.

**Independent Test**: Can be fully tested by loading tracks, setting full-track mode, moving the time scrubber, and verifying that the complete track remains visible with the highlight marker moving to show position at each time.

**Acceptance Scenarios**:

1. **Given** a track is loaded and full-track mode is selected, **When** the map renders, **Then** the entire track path is visible from start to end regardless of current time position.
2. **Given** a track is displayed in full-track mode with time set to 12:00, **When** the user views the map, **Then** a highlight marker appears at the track point closest to 12:00.
3. **Given** a track is displayed in full-track mode, **When** the user moves the time scrubber from 10:00 to 14:00, **Then** the highlight marker smoothly updates to show the new position without the track path changing.
4. **Given** multiple tracks are loaded in full-track mode, **When** the time changes, **Then** each track displays its own highlight marker at its respective position for that time.

---

### User Story 2 - Snail-Trail Mode (Priority: P1)

An analyst wants to understand how a situation developed over time by seeing only the track history up to the current time. They switch to snail-trail mode, where tracks grow as time advances, revealing the path progressively like a "snail trail" being drawn.

**Why this priority**: Snail-trail mode is equally essential for temporal analysis, allowing analysts to replay scenarios and observe how situations developed without future positions cluttering the view.

**Independent Test**: Can be fully tested by loading tracks, switching to snail-trail mode, and advancing time to verify that only the track portion up to the current time is visible.

**Acceptance Scenarios**:

1. **Given** a track is loaded and snail-trail mode is selected with time at 10:00, **When** the map renders, **Then** only the portion of the track from the start up to the 10:00 position is visible.
2. **Given** a track is displayed in snail-trail mode, **When** the user advances time from 10:00 to 14:00, **Then** the visible track extends to include the path from 10:00 to 14:00.
3. **Given** a track is displayed in snail-trail mode, **When** the user moves time backward from 14:00 to 10:00, **Then** the visible track contracts to show only the path up to 10:00.
4. **Given** multiple tracks are loaded in snail-trail mode, **When** time changes, **Then** each track displays only its portion up to the current time.

---

### User Story 3 - Real-Time Track Updates During Playback (Priority: P2)

An analyst is playing back a scenario to observe vessel movements over time. As time advances automatically, the track display updates smoothly to reflect the new time position, whether in full-track mode (marker moves) or snail-trail mode (trail extends).

**Why this priority**: Smooth playback visualization is important for pattern recognition but builds on the foundation of correct rendering at any single point in time (P1 stories).

**Independent Test**: Can be fully tested by initiating playback and observing that track rendering updates continuously and smoothly throughout the playback.

**Acceptance Scenarios**:

1. **Given** tracks are displayed in full-track mode and playback is active, **When** time advances, **Then** highlight markers update their positions at least 10 times per second.
2. **Given** tracks are displayed in snail-trail mode and playback is active, **When** time advances, **Then** track paths extend smoothly without visual stuttering.
3. **Given** playback is running at 4x speed, **When** the user observes the display, **Then** track rendering keeps pace with the accelerated time without lag or dropped updates.

---

### User Story 4 - Mode Switching (Priority: P3)

An analyst reviewing a scenario wants to switch between full-track and snail-trail modes to gain different perspectives. They toggle between modes while maintaining the current time position, and the display updates immediately to reflect the new mode.

**Why this priority**: Mode switching enhances workflow flexibility but is not required for basic temporal analysis in either mode.

**Independent Test**: Can be fully tested by displaying tracks at a specific time, switching modes, and verifying the display changes appropriately while maintaining the same time position.

**Acceptance Scenarios**:

1. **Given** tracks are displayed in full-track mode at 12:00, **When** the user switches to snail-trail mode, **Then** tracks immediately update to show only the path up to 12:00.
2. **Given** tracks are displayed in snail-trail mode at 12:00, **When** the user switches to full-track mode, **Then** the complete track paths appear with highlight markers at the 12:00 position.
3. **Given** mode is switched during active playback, **When** the switch occurs, **Then** playback continues seamlessly with the new rendering style.

---

### Edge Cases

- What happens when the current time is before a track's start time? The track is not visible in snail-trail mode; in full-track mode, the complete track is shown but no highlight marker appears (or marker appears at track start with visual indication).
- What happens when the current time is after a track's end time? In snail-trail mode, the complete track is visible; in full-track mode, the highlight marker appears at the final position.
- What happens when a track has no data points near the current time (sparse data)? The system selects the nearest available point without erroring.
- What happens with tracks that have non-monotonic timestamps? The system uses the nearest point by timestamp value regardless of position order in the data.
- What happens when time changes very rapidly (fast scrubbing)? The display updates as quickly as possible without queuing stale updates.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render tracks in full-track mode showing the complete path from start to end at all times.
- **FR-002**: System MUST display a highlight marker on each track in full-track mode indicating the position nearest to the current time.
- **FR-003**: System MUST render tracks in snail-trail mode showing only the path from start up to the point nearest the current time.
- **FR-004**: System MUST update track rendering when the temporal state changes (time position updates).
- **FR-005**: System MUST support multiple simultaneous tracks, each responding independently to temporal state based on their own timestamp data.
- **FR-006**: System MUST maintain rendering performance of at least 10 updates per second during playback.
- **FR-007**: System MUST handle tracks with varying time ranges, rendering each appropriately for its own temporal extent.
- **FR-008**: System MUST find the nearest track point to the current time using timestamp comparison.
- **FR-009**: System MUST visually distinguish the highlight marker from the track path (different color, size, or symbol).
- **FR-010**: System MUST function fully offline without network connectivity.

### Key Entities

- **Track**: A GeoJSON LineString or MultiLineString feature representing a vessel's path, with coordinates containing timestamps.
- **Current Time**: The temporal position selected by the user via the time controller, used to determine rendering behavior.
- **Display Mode**: Either "full-track" (complete path with position marker) or "snail-trail" (partial path up to current time).
- **Highlight Marker**: A visual indicator showing the track position at the current time in full-track mode.
- **Nearest Point**: The track coordinate whose timestamp is closest to the current time.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Visualize track positions relative to a specific point in time for temporal analysis.
- **Key Decision(s)**:
  1. Which display mode to use (full-track vs snail-trail) based on analysis task
  2. Where in time to position the view to examine specific moments
- **Decision Inputs**: The time controller provides mode selection and time position; the map shows the resulting track visualization.

### Screen Progression

| Step | Screen/State              | User Action                         | Result                                                     |
|------|---------------------------|-------------------------------------|------------------------------------------------------------|
| 1    | Tracks loaded             | View map with default mode          | All tracks render in full-track mode with markers at start |
| 2    | Time selected             | Drag time scrubber to 12:00         | Highlight markers move to 12:00 positions on each track    |
| 3    | Mode changed              | Toggle to snail-trail mode          | Tracks contract to show only paths up to 12:00             |
| 4    | Playback started          | Click Play button                   | Tracks extend progressively as time advances               |
| 5    | Analysis point identified | Pause at time of interest           | Track state frozen for detailed examination                |

### UI States

- **Empty State**: No tracks loaded; map displays without any track features.
- **Loading State**: Tracks are being processed; existing tracks remain at last known state until new data ready.
- **Full-Track State**: Complete track paths visible with highlight markers at current time position.
- **Snail-Trail State**: Partial track paths visible from start to current time position.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Track rendering updates within 100ms of any temporal state change.
- **SC-002**: Users can visually identify vessel position at the current time within 2 seconds of looking at the display.
- **SC-003**: Display maintains smooth updates (10+ frames per second) during playback with up to 20 simultaneous tracks.
- **SC-004**: Mode switching completes within 200ms, with immediate visual feedback.
- **SC-005**: System correctly renders 100% of tracks that have timestamp data, regardless of time range variations.
- **SC-006**: All temporal rendering functions work without network connectivity (offline-first requirement).

## Assumptions

- Track GeoJSON features include timestamp information in coordinate properties or feature properties following Debrief schema conventions.
- The time controller (spec 025) provides the current time position and display mode to the map component.
- Track data has sufficient temporal resolution for meaningful temporal analysis (positions at regular intervals).
- Highlight markers use styling consistent with the Debrief design system.
- Default display mode is full-track when tracks are first loaded.
- Time controller and map component share state through the session state system (spec 024).

## Dependencies

- **025-time-controller**: Provides the time position and display mode controls.
- **001-shared-react-components**: MapView component that renders track features.
- **024-document-session-state**: Shared state for temporal position synchronization.
- **@debrief/schemas**: TypeScript types for track features and temporal data.

## Out of Scope

- Track styling beyond the highlight marker (colors, line weights handled by existing styling).
- Per-track individual time controls (all tracks share the same temporal state).
- Predictive/future path rendering (extrapolation beyond known data).
- Track filtering by time range (hiding tracks entirely based on temporal overlap).
- Animation of the highlight marker between discrete positions (marker jumps to nearest point).
