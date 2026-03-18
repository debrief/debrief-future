# Feature Specification: REP Loader Temporal Metadata

**Feature Branch**: `137-rep-temporal-metadata`
**Created**: 2026-03-18
**Status**: Draft
**Input**: User description: "Compute start_datetime/end_datetime from track position timestamps during REP file loading; enables accurate Timeline/Gantt view and Duration filter"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Accurate temporal extent on loaded plots (Priority: P1)

When a user loads a REP file containing track data, the resulting plot automatically reflects the true time span of the exercise. The Timeline/Gantt view shows the correct duration, and temporal filters match expected results without any manual intervention.

**Why this priority**: This is the core value of the feature — without accurate temporal metadata, downstream consumers (Timeline, Duration filter, CQL2 temporal queries) produce misleading results.

**Independent Test**: Load a REP file with known track timestamps, inspect the resulting STAC Item properties, and verify `start_datetime`, `end_datetime`, and `datetime` match expected values derived from the track data.

**Acceptance Scenarios**:

1. **Given** a REP file with two tracks spanning 2022-08-27T09:00:00Z to 2022-09-10T16:44:49Z, **When** the file is loaded, **Then** the STAC Item has `start_datetime` = "2022-08-27T09:00:00Z" and `end_datetime` = "2022-09-10T16:44:49Z"
2. **Given** a REP file with multiple tracks, **When** the file is loaded, **Then** `start_datetime` is the earliest timestamp across all tracks and `end_datetime` is the latest timestamp across all tracks
3. **Given** a loaded REP file with temporal metadata, **When** the Timeline/Gantt view renders, **Then** the exercise duration bar spans the correct time range

---

### User Story 2 - Representative datetime for single-value consumers (Priority: P1)

The `datetime` field on the STAC Item is set to the start of the exercise (earliest track timestamp) rather than the file creation time. This ensures consumers that use only `datetime` (e.g., sorting, simple search) get a meaningful value.

**Why this priority**: Equal to P1 because `datetime` is the most commonly used temporal field in STAC and must be meaningful for correct behaviour across the system.

**Independent Test**: Load a REP file and verify that the `datetime` property equals the earliest track timestamp, not the current time.

**Acceptance Scenarios**:

1. **Given** a REP file with tracks starting at 2022-08-27T09:00:00Z, **When** the file is loaded, **Then** the STAC Item `datetime` equals "2022-08-27T09:00:00Z"
2. **Given** a REP file with tracks, **When** the user sorts plots by date, **Then** the plot appears in chronological order based on the exercise start time, not load time

---

### User Story 3 - Graceful handling of temporal edge cases (Priority: P2)

When a REP file contains no track data, or tracks have no temporal information, the system falls back to current behaviour (creation timestamp) without errors.

**Why this priority**: Edge case handling is important for robustness but secondary to the core temporal extraction capability.

**Independent Test**: Load a REP file with no tracks (or tracks lacking timestamps) and verify the STAC Item retains current fallback behaviour.

**Acceptance Scenarios**:

1. **Given** a REP file with no track data, **When** the file is loaded, **Then** `datetime` is set to the creation/load time and `start_datetime`/`end_datetime` are absent
2. **Given** a REP file with a single track containing exactly one position, **When** the file is loaded, **Then** `start_datetime` and `end_datetime` are both set to that position's timestamp, and `datetime` equals the same value

---

### Edge Cases

- What happens when a REP file has tracks with overlapping time ranges? The system uses the global minimum and maximum across all tracks.
- What happens when track timestamps are not in chronological order within a single track? The system considers all timestamps regardless of order within the file.
- What happens when a REP file contains non-track features (e.g., annotations) alongside tracks? Only track features with temporal data contribute to the temporal extent calculation.
- What happens when all tracks have identical timestamps (zero duration)? `start_datetime` and `end_datetime` are both set to that single timestamp, and `datetime` equals the same value.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST compute the temporal extent (earliest and latest timestamps) from all track position data when loading a REP file
- **FR-002**: System MUST set `start_datetime` on the STAC Item to the earliest position timestamp across all tracks in the loaded file
- **FR-003**: System MUST set `end_datetime` on the STAC Item to the latest position timestamp across all tracks in the loaded file
- **FR-004**: System MUST set `datetime` on the STAC Item to the earliest track timestamp (exercise start time)
- **FR-005**: System MUST retain current fallback behaviour (`datetime` = creation time, no `start_datetime`/`end_datetime`) when the REP file contains no track data or no temporal information
- **FR-006**: System MUST consider all tracks in the file when computing temporal extent, not just the first or last track
- **FR-007**: System MUST produce valid ISO 8601 datetime strings with timezone (UTC) for all temporal fields
- **FR-008**: System MUST NOT alter existing track-level temporal properties (`start_time`, `end_time`, `times` arrays) — the new fields are Item-level metadata only

### Key Entities

- **STAC Item**: The primary container for a loaded plot. Gains three temporal properties: `datetime`, `start_datetime`, `end_datetime`
- **Track Feature**: A GeoJSON Feature representing a vessel track. Contains `start_time` and `end_time` properties that serve as input for the Item-level temporal extent
- **Plot Metadata**: The intermediate metadata object used during STAC Item creation. Must be extended to carry temporal extent information

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All REP files with track data produce STAC Items with accurate `start_datetime` and `end_datetime` matching the actual temporal extent of the track data
- **SC-002**: `datetime` reflects the exercise start time rather than the file load time for all REP files with track data
- **SC-003**: REP files without track data continue to load successfully with creation-time fallback, with no regressions
- **SC-004**: Timeline/Gantt view displays correct exercise duration when rendering plots loaded after this change
- **SC-005**: Duration-based temporal filters return correct results for plots with the new temporal metadata
- **SC-006**: Test coverage includes at least: multi-track file, single-track file, no-track file, single-position track, and overlapping-tracks scenarios

## Assumptions

- The REP parser already extracts per-track `start_time` and `end_time` correctly; this feature aggregates those values at the Item level
- `datetime` is set to the exercise start time (earliest timestamp) rather than the midpoint, as start time is more intuitive for users browsing exercises chronologically
- UTC timezone is used for all STAC temporal fields, consistent with existing behaviour
- Existing downstream consumers (collection extent, CQL2 filter engine) already support `start_datetime`/`end_datetime` and require no changes

## Dependencies

- REP parser (`services/io`) must be producing correct per-track temporal data (already implemented)
- STAC Item creation (`services/stac`) must support optional `start_datetime`/`end_datetime` fields

## Traceability

- SRD action item BP-4 (§13.3 of `docs/stac-browser-srd.md`) — rated **High** priority
- Supports Timeline/Gantt view (#131) and Duration filter (SRD §4.4)
- Supports accurate CQL2 temporal queries (#126)
