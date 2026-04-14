# Feature Specification: Array Offset Calculations

**Feature Branch**: `119-array-offset-calc`  
**Created**: 2026-04-10  
**Status**: Draft  
**Input**: User description: "[E07] Array offset calculations"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - PLAIN mode calculates array centre by backtracking along vessel heading (Priority: P1)

An analyst loads a track with a towed-array sensor configured in PLAIN mode. For each sensor contact, the system calculates the array centre by taking the vessel's position at the contact timestamp and backtracking along the vessel's course at that moment by the sensor's offset distance. The resulting position becomes the origin point for bearing lines drawn from that contact.

**Why this priority**: PLAIN mode is the simplest and most fundamental array offset calculation. It provides the baseline capability that all other modes build upon. It is also the fallback mode when MEASURED data is unavailable.

**Independent Test**: Can be fully tested by providing a track with known positions and courses at specific timestamps, a sensor with a known offset distance, and verifying that the calculated array centre positions match expected coordinates computed by hand.

**Acceptance Scenarios**:

1. **Given** a vessel at position (0.0, 50.0) heading 090° with a sensor offset of 500m, **When** a contact at that timestamp is processed in PLAIN mode, **Then** the array centre is positioned approximately 500m west of the vessel (backtracked along 090° heading).
2. **Given** a vessel track with varying courses at different timestamps, **When** contacts at those timestamps are processed, **Then** each contact's array centre uses the vessel's course at the specific contact time, not a single fixed heading.
3. **Given** a sensor with offset of 0 metres in PLAIN mode, **When** contacts are processed, **Then** the array centre equals the vessel position (no backtrack applied).

---

### User Story 2 - WORM mode traces array centre along the vessel's historical track (Priority: P2)

An analyst loads a track with a towed-array sensor configured in WORM ("worm in hole") mode. For each sensor contact, the system walks backwards along the vessel's actual track geometry by the sensor's offset distance in metres. The resulting position — the point on the track path that is exactly the offset distance behind the vessel at the contact time — becomes the bearing line origin. This mode accurately models how a towed array follows the vessel through turns and manoeuvres.

**Why this priority**: WORM mode is the most physically accurate model for towed array positioning. During vessel manoeuvres, the array doesn't instantly change direction but follows the path the vessel took. This mode is essential for accurate bearing line origins during any non-straight-line vessel movement.

**Independent Test**: Can be fully tested by providing a track with a known right-angle turn, a sensor with a known offset that places the array centre before/after the turn point, and verifying that the calculated position lies on the track path at the correct distance behind the vessel.

**Acceptance Scenarios**:

1. **Given** a vessel that has been travelling straight north for 2000m and a sensor offset of 500m, **When** processed in WORM mode, **Then** the array centre is 500m south of the vessel along the track (same result as PLAIN for straight-line travel).
2. **Given** a vessel that turned 90° to starboard (north to east) 300m ago and a sensor offset of 500m, **When** processed in WORM mode, **Then** the array centre is 200m back along the northward leg (500m total track distance behind the vessel, passing through the turn point).
3. **Given** a vessel at its very first track position with a sensor offset of 500m, **When** processed in WORM mode, **Then** the system handles the insufficient track history gracefully by using the available track length (the array centre is placed at the earliest available track position).
4. **Given** a sensor offset that exceeds the total track length traversed so far, **When** processed in WORM mode, **Then** the array centre is placed at the earliest point on the track rather than extrapolating beyond available data.

---

### User Story 3 - MEASURED mode uses actual array position data (Priority: P2)

An analyst loads a track with a towed-array sensor configured in MEASURED mode. The sensor includes a time-series of measured array positions (actual geographic coordinates of the array centre recorded by instrumentation). For each sensor contact, the system interpolates the array's geographic position from the measured position data at the contact's timestamp. If no measured data covers the contact's time, the system falls back to PLAIN mode calculation.

**Why this priority**: MEASURED mode provides the highest-fidelity array positioning when real measurement data is available. The fallback to PLAIN ensures contacts always have a valid origin even when measurement coverage is incomplete.

**Independent Test**: Can be fully tested by providing a sensor with known measured positions at specific timestamps, contacts at times both within and outside the measured range, and verifying interpolated positions match expected values and that fallback to PLAIN occurs correctly.

**Acceptance Scenarios**:

1. **Given** measured positions at T1=(1.0, 50.0) and T3=(1.2, 50.0), **When** a contact at T2 (midpoint between T1 and T3) is processed in MEASURED mode, **Then** the array centre is interpolated to approximately (1.1, 50.0).
2. **Given** measured positions covering the time range T1 to T10, **When** a contact at T5 (within range) is processed, **Then** the origin is interpolated from the two nearest measured positions bracketing T5.
3. **Given** measured positions covering T5 to T10 only, **When** a contact at T2 (before measured range) is processed in MEASURED mode, **Then** the system falls back to PLAIN mode and calculates the origin by backtracking along the vessel's heading.
4. **Given** a sensor with no measured positions at all configured in MEASURED mode, **When** contacts are processed, **Then** all contacts fall back to PLAIN mode calculation.

---

### User Story 4 - Mode and offset changes invalidate and recalculate all contact origins (Priority: P3)

An analyst changes a sensor's array centre mode (e.g., from PLAIN to WORM) or modifies the offset distance. All previously calculated contact origins for that sensor are invalidated and recalculated using the new mode or offset value. The bearing lines on the map update to reflect the new origin positions.

**Why this priority**: Analysts frequently compare different array positioning models to assess their impact on target motion analysis. The ability to switch modes and see immediate results is essential to the analytical workflow.

**Independent Test**: Can be fully tested by calculating origins for a set of contacts, changing the mode, recalculating, and verifying that the new origins differ from the previous values and match the expected results for the new mode.

**Acceptance Scenarios**:

1. **Given** a sensor in PLAIN mode with calculated origins for 50 contacts, **When** the mode is changed to WORM, **Then** all 50 contact origins are recalculated using the WORM algorithm and the new positions differ where the vessel was manoeuvring.
2. **Given** a sensor in PLAIN mode with offset 500m, **When** the offset is changed to 1000m, **Then** all contact origins are recalculated with the larger backtrack distance.
3. **Given** a sensor with 1000 contacts, **When** mode or offset changes, **Then** the recalculation completes and bearing lines update without noticeable delay to the analyst.

---

### Edge Cases

- What happens when the vessel track contains only a single position? The array centre calculation should still produce a valid result: PLAIN mode backtracks along the vessel's course (if available) or defaults to the vessel position; WORM mode places the centre at the single available position.
- How does the system handle a zero offset distance? The array centre equals the vessel position regardless of mode, effectively disabling the offset calculation.
- What happens when WORM mode encounters a track with very closely spaced positions? The system must accumulate distances between consecutive positions accurately without floating-point drift causing significant errors over long tracks.
- How does MEASURED mode handle a contact exactly at a measured position timestamp? The system uses the exact measured position without interpolation.
- What happens when measured positions are not in chronological order? The system should treat the measured positions as a time-ordered series (sort by timestamp if necessary) before interpolation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST calculate the array centre in PLAIN mode by backtracking from the vessel's position along its course at the contact timestamp by the sensor's offset distance in metres.
- **FR-002**: System MUST calculate the array centre in WORM mode by walking backwards along the vessel's track geometry from the vessel's position at the contact timestamp for the sensor's offset distance in metres of track-path length.
- **FR-003**: System MUST calculate the array centre in MEASURED mode by interpolating the geographic position from the sensor's measured position time-series at the contact timestamp.
- **FR-004**: System MUST fall back to PLAIN mode calculation when MEASURED mode is selected but no measured position data covers the contact's timestamp.
- **FR-005**: System MUST invalidate and recalculate all contact origins for a sensor when the sensor's array centre mode changes.
- **FR-006**: System MUST invalidate and recalculate all contact origins for a sensor when the sensor's offset distance changes.
- **FR-007**: System MUST use the vessel's interpolated course at the exact contact timestamp for PLAIN mode, not the course from the nearest discrete track position.
- **FR-008**: System MUST handle the case where the sensor offset exceeds available track history in WORM mode by placing the array centre at the earliest available track position.
- **FR-009**: System MUST produce an array centre equal to the vessel position when the sensor offset is zero, regardless of mode.
- **FR-010**: System MUST provide the calculated array centre as a geographic coordinate pair (longitude, latitude) suitable for use as a bearing line origin.

### Key Entities

- **Array Centre**: The calculated geographic position from which a sensor contact's bearing lines originate. Determined by combining the vessel's position/track, the sensor's offset distance, and the selected array centre mode.
- **Array Offset Mode**: An enumeration (PLAIN, WORM, MEASURED) stored on the SensorData entity that selects which calculation algorithm determines the array centre for all contacts belonging to that sensor.
- **Sensor Offset**: A distance in metres stored on the SensorData entity representing how far behind the vessel's reference point the towed array centre is located.
- **Measured Array Position**: A timestamped geographic coordinate representing an actual observed position of the towed array centre, stored as a time-series on the SensorData entity. Used by MEASURED mode for interpolation.
- **Track Path**: The ordered sequence of timestamped vessel positions that forms the vessel's historical movement geometry. Used by WORM mode to trace the array's path behind the vessel.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All three array offset modes (PLAIN, WORM, MEASURED) produce array centre positions that match reference test case values within 1 metre of accuracy.
- **SC-002**: WORM mode correctly positions the array centre through vessel manoeuvres, producing visibly different origins from PLAIN mode when the vessel has turned.
- **SC-003**: MEASURED mode falls back to PLAIN mode for 100% of contacts whose timestamps fall outside the measured position time range.
- **SC-004**: Switching array centre mode or changing offset distance recalculates all contact origins, with bearing lines updating within 1 second for datasets of up to 1000 contacts.
- **SC-005**: Sensor analysis tools that depend on array position (range plot generation, arc insertion) use the calculated array centre as the bearing line origin.

### Assumptions

- The vessel track data includes interpolatable course values at each position, enabling course determination at arbitrary timestamps between track fixes.
- The sensor schema from #116 (SensorData.offset, SensorData.array_centre_mode, SensorData.measured_positions) is implemented and available before this feature begins.
- Measured array positions are provided in chronological order or can be sorted by timestamp without ambiguity.
- Geographic distance calculations use a standard geodesic model appropriate for the scale of typical towed array offsets (tens to hundreds of metres).
- The rendering layer (#118) already draws bearing lines from a contact's origin position; this feature provides the origin calculation, not the rendering.

### Dependencies

- **#116 — Sensor Schema Overhaul**: Provides the SensorData fields (offset, array_centre_mode, measured_positions) and the ArrayCentreModeEnum that this feature's calculations depend on.
- **#118 — Sensor Rendering**: Consumes the calculated array centre as the bearing line origin point. Array offset calculations must produce results in the format expected by the rendering layer.
