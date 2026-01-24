# Feature Specification: Time Controller UI/UX

**Feature Branch**: `025-time-controller`
**Created**: 2026-01-24
**Status**: Draft
**Input**: User description: "Design time controller UI/UX for VS Code extension"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manual Time Navigation (Priority: P1)

An analyst loading track data wants to manually navigate to specific points in time to examine track positions at moments of interest, without waiting for playback.

**Why this priority**: This is the core capability that enables all temporal analysis. Without the ability to position time manually, users cannot investigate specific moments or patterns they've identified.

**Independent Test**: Can be fully tested by loading tracks, dragging the time scrubber, and verifying that track positions update on the map to reflect the selected time.

**Acceptance Scenarios**:

1. **Given** track data is loaded with a time range of 09:00-17:00, **When** the user drags the time scrubber to the 12:00 position, **Then** the map displays all track positions as they were at 12:00 and the time display shows "12:00:00".
2. **Given** the time scrubber is at 10:00, **When** the user clicks at a different position on the scrubber track, **Then** the time jumps directly to that position and the map updates immediately.
3. **Given** track data is loaded, **When** the user views the time controller, **Then** the time range boundaries (start and end times) are clearly indicated.

---

### User Story 2 - Animated Playback (Priority: P2)

An analyst wants to watch tracks evolve over time to observe movement patterns, detect interactions between vessels, and understand temporal relationships.

**Why this priority**: Playback builds on manual navigation (P1) and enables pattern recognition through motion, which is essential for tactical analysis but requires the foundation of time positioning.

**Independent Test**: Can be fully tested by loading tracks, pressing play, and verifying that track positions animate smoothly forward through time.

**Acceptance Scenarios**:

1. **Given** the time is positioned at 10:00, **When** the user clicks the Play button, **Then** time advances automatically and tracks animate on the map showing their progression.
2. **Given** playback is active, **When** the user clicks the Pause button, **Then** playback stops immediately and tracks remain at their current positions.
3. **Given** playback is active and reaches the end of the time range, **When** time reaches the maximum, **Then** playback automatically pauses at the end time.

---

### User Story 3 - Playback Speed Control (Priority: P3)

An analyst reviewing long operational periods wants to speed up playback to quickly scan through uneventful periods, then slow down when approaching areas of interest.

**Why this priority**: Speed control enhances the playback experience (P2) but is not essential for basic temporal analysis. Users can still perform analysis at 1x speed without this capability.

**Independent Test**: Can be fully tested by initiating playback, changing speed settings, and measuring that the time advances at the expected accelerated rate.

**Acceptance Scenarios**:

1. **Given** playback is running at 1x speed, **When** the user selects 4x speed, **Then** time advances four times faster than real-time.
2. **Given** playback is running at 8x speed, **When** the user selects 1x speed, **Then** playback immediately slows to real-time progression.
3. **Given** the speed selector is visible, **When** the user views available options, **Then** speeds of 1x, 2x, 4x, and 8x are available.

---

### User Story 4 - Keyboard-Driven Control (Priority: P4)

A power user performing intensive analysis wants to control playback without moving their hands from the keyboard, enabling faster workflow during detailed investigations.

**Why this priority**: Keyboard shortcuts enhance efficiency for power users but are not essential for basic functionality. All features remain accessible via mouse/touch controls.

**Independent Test**: Can be fully tested by focusing the time controller panel and using keyboard shortcuts to play, pause, and scrub through time.

**Acceptance Scenarios**:

1. **Given** the time controller panel has focus and playback is paused, **When** the user presses Space, **Then** playback starts.
2. **Given** the time controller panel has focus and playback is active, **When** the user presses Space, **Then** playback pauses.
3. **Given** the time controller panel has focus, **When** the user presses the Right arrow key, **Then** time advances by a small increment.
4. **Given** the time controller panel has focus, **When** the user presses the Left arrow key, **Then** time moves backward by a small increment.

---

### Edge Cases

- What happens when no track data is loaded? The time controller displays a disabled state with no usable range.
- What happens when tracks have different time ranges? The controller shows the union of all loaded track time ranges.
- What happens when the user drags the scrubber during playback? Playback pauses and time jumps to the dragged position.
- What happens on very short time ranges (under 1 minute)? The scrubber still functions with appropriate granularity.
- What happens on very long time ranges (multiple days)? The scrubber allows navigation across the full range without performance issues.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a time scrubber allowing users to navigate to any point within the loaded time range.
- **FR-002**: System MUST display the current time position in human-readable format (HH:MM:SS minimum).
- **FR-003**: System MUST provide a Play button to start automatic time progression.
- **FR-004**: System MUST provide a Pause button to stop time progression.
- **FR-005**: System MUST support playback speed options of 1x, 2x, 4x, and 8x real-time.
- **FR-006**: System MUST synchronize the map display to show track positions at the current time.
- **FR-007**: System MUST apply time changes globally to all loaded tracks simultaneously.
- **FR-008**: System MUST display the time range boundaries (start and end times) of loaded data.
- **FR-009**: System MUST pause playback automatically when the end of the time range is reached.
- **FR-010**: System MUST function fully offline without network connectivity.
- **FR-011**: System MUST support keyboard shortcut Space to toggle play/pause when the panel has focus.
- **FR-012**: System MUST support keyboard shortcuts Left/Right arrows to scrub backward/forward in small increments when the panel has focus.

### Key Entities

- **Time Position**: The current point in time being displayed, represented within the bounds of the loaded data's time range.
- **Time Range**: The span from earliest to latest timestamps across all loaded track data.
- **Playback State**: Whether time is progressing automatically (playing) or stationary (paused).
- **Playback Speed**: The rate at which time advances relative to real-time (1x, 2x, 4x, 8x).

## User Interface Flow

### UI Location

The time controller lives as a **separate panel in the VS Code sidebar**, alongside other Debrief panels. This provides:
- Standard VS Code interaction patterns
- Ability to collapse when not needed
- Consistent positioning across sessions

### Decision Analysis

- **Primary Goal**: Navigate through time to analyze track positions at specific moments or observe movement patterns over time.
- **Key Decision(s)**:
  1. Where in time to position the view (manual navigation)
  2. Whether to play or pause animation
  3. What speed to use for playback
- **Decision Inputs**: Current time position display, visual feedback of track positions on map, time range boundaries showing available data extent.

### Screen Progression

| Step | Screen/State     | User Action                       | Result                                       |
|------|------------------|-----------------------------------|----------------------------------------------|
| 1    | Initial load     | Track data loaded                 | Controller becomes active, shows time range  |
| 2    | Time positioned  | Drag scrubber to time of interest | Map updates to show tracks at selected time  |
| 3    | Playback started | Click Play button                 | Time advances automatically, tracks animate  |
| 4    | Speed adjusted   | Select faster playback speed      | Animation accelerates to selected rate       |
| 5    | Playback paused  | Click Pause or drag scrubber      | Time stops, tracks freeze at current position|

### UI States

- **Empty State**: Controller appears disabled with "No data loaded" message; scrubber and controls are inactive.
- **Loading State**: Controller shows "Loading..." while track data is being processed; controls remain inactive.
- **Ready State**: Controller is fully active with scrubber positioned at start time; Play button enabled, time display shows start of range.
- **Playing State**: Play button changes to Pause icon; time display updates continuously; scrubber position advances.
- **Paused State**: Pause button changes to Play icon; time display shows frozen position; scrubber shows current position.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can navigate to any point in a loaded time range within 1 second of interaction (scrubber drag or click).
- **SC-002**: Playback animation is visually smooth, updating track positions at least 10 times per second.
- **SC-003**: Time position display is accurate to within 1 second of the actual data timestamp being shown.
- **SC-004**: All time controller functions work without network connectivity (offline-first requirement).
- **SC-005**: Users can successfully complete a "find the closest point of approach" task using only the time controller within 2 minutes.
- **SC-006**: 90% of users can discover and use all three core functions (scrub, play, speed) without documentation on first attempt.

## Assumptions

- Track data includes timestamp information for each position.
- The map component can render track positions based on a provided time value.
- The VS Code extension webview environment supports the required animation capabilities.
- Time ranges can span multiple days but typically represent hours to days of operational data.
- Default playback speed is 1x (real-time) when playback begins.
- Step forward/backward buttons are not needed; the scrubber combined with keyboard arrow keys provides sufficient precision for frame-by-frame navigation.

## Dependencies

- Requires track data to be loaded via the existing VS Code extension infrastructure (backlog item 021).
- Map display component must support time-filtered rendering of track positions.
- Part of the shared-react-components library as specified in the architecture.

## Out of Scope

- Per-track individual time controls (all tracks share the same time position).
- Recording or export of playback as video.
- Time filtering to show/hide tracks by time range.
- Historical playback caching or precomputation.
