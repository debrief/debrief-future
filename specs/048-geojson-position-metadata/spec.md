# Feature Specification: GeoJSON Position Metadata Strategy

**Feature Branch**: `048-geojson-position-metadata`
**Created**: 2026-02-04
**Status**: Draft
**Input**: User description: "GeoJSON position metadata strategy - remove coordinate duplication, add interval-based display rules and sparse styling overrides"

## Background

Legacy Debrief users are accustomed to:
- Expanding tracks in the Outline view to see a list of positions (fixes)
- Applying per-position formatting: show symbol, symbol type, show label, label text
- Right-clicking on individual points on the map to set formatting
- Using track-level "show symbols at" and "show labels at" menus with interval options (1 second to 1 day)

The current GeoJSON model stores coordinates in two places:
1. `geometry.coordinates` - the GeoJSON LineString
2. `properties.positions[].coordinates` - duplicated in each TimestampedPosition

Additionally, the current model has no support for per-position styling or interval-based display rules.

## Design Decision

**Principle**: Geometry holds coordinates. Properties hold metadata. All arrays are parallel.

```
geometry.coordinates[i] ←→ positions[i] ←→ position_style_overrides[i]
```

Same length, same order. Position `i` metadata and styling override (if any) describe coordinate `i`. The `position_style_overrides` array contains `null` for positions without custom styling.

### Style Resolution Cascade

```
default_position_style → interval rules → position_style_overrides
```

1. Start with `default_position_style` defaults
2. Apply `symbol_interval` / `label_interval` rules (override defaults at matching intervals)
3. Apply explicit `position_style_overrides` (highest priority)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure Interval-Based Symbol Display (Priority: P1)

As an analyst, I want to configure a track to show position symbols at regular time intervals (e.g., every 5 minutes) so that I can see vessel progress without cluttering the display with symbols at every position.

**Why this priority**: This is the most common use case from legacy Debrief - users rarely want symbols at every position, but regularly use interval-based display.

**Independent Test**: Can be fully tested by loading a track, setting `symbol_interval: "PT5M"`, and verifying symbols appear only at 5-minute intervals on the map.

**Acceptance Scenarios**:

1. **Given** a track with positions every 30 seconds spanning 1 hour, **When** `symbol_interval` is set to "PT5M", **Then** symbols appear at approximately 12 positions (one every 5 minutes from start)
2. **Given** a track with `symbol_interval: "PT5M"`, **When** the interval is changed to "PT1M", **Then** symbols update to appear at approximately 60 positions
3. **Given** a track with no `symbol_interval` set (null), **When** rendered, **Then** no position symbols are shown based on interval (only explicit overrides)

---

### User Story 2 - Override Individual Position Styling (Priority: P2)

As an analyst, I want to mark specific positions with custom symbols or labels (e.g., "Contact detected here") so that I can highlight significant events along a track.

**Why this priority**: Per-position overrides are essential for marking significant events, but less frequently used than interval-based display.

**Independent Test**: Can be fully tested by adding an override at a specific index and verifying that position renders with the custom style.

**Acceptance Scenarios**:

1. **Given** a track with default styling (no symbols), **When** I set `position_style_overrides[i]` to `{ show_symbol: true }`, **Then** only position `i` shows a symbol
2. **Given** a track with `symbol_interval: "PT5M"`, **When** I set an override with `show_symbol: false` at an index that would normally show a symbol, **Then** that position has no symbol while others at 5-min intervals do
3. **Given** a track, **When** I set an override with `label: "Contact Alpha"` and `show_label: true` at index `i`, **Then** position `i` shows the custom label text

---

### User Story 3 - Configure Default Position Style (Priority: P2)

As an analyst, I want to set default styling for all positions on a track (symbol shape, whether to show symbols/labels by default) so that I have consistent baseline styling before applying intervals or overrides.

**Why this priority**: Defaults provide the foundation for the style cascade, enabling consistent track appearance.

**Independent Test**: Can be fully tested by setting `default_position_style` values and verifying they apply to positions without overrides.

**Acceptance Scenarios**:

1. **Given** a track with `default_position_style.symbol: "square"`, **When** symbols are displayed (via interval or override), **Then** they render as squares
2. **Given** a track with `default_position_style.show_symbol: true`, **When** rendered without any interval set, **Then** all positions show symbols
3. **Given** a track with `default_position_style.show_label: true`, **When** rendered, **Then** all positions show labels (using timestamp as default text)

---

### User Story 4 - Schema Migration (Priority: P1)

As a developer, I want the schema to store coordinates only in `geometry.coordinates` (not duplicated in positions) so that data is normalized and consistent.

**Why this priority**: Coordinate duplication is a data integrity risk and increases storage requirements. This is foundational for all other stories.

**Independent Test**: Can be fully tested by validating that sample data passes schema validation with coordinates only in geometry, and positions array has matching length.

**Acceptance Scenarios**:

1. **Given** a TrackFeature JSON, **When** validated against the schema, **Then** `properties.positions[].coordinates` is rejected as invalid
2. **Given** a TrackFeature, **When** `len(geometry.coordinates) != len(properties.positions)`, **Then** validation fails
3. **Given** existing sample data with duplicated coordinates, **When** migration script runs, **Then** coordinates are removed from positions and validation passes

---

### Edge Cases

- What happens when `position_style_overrides` array length doesn't match `positions` array? (Validation fails - arrays must be same length)
- How does system handle tracks with fewer than 2 positions? (Minimum 2 required by existing schema constraint)
- What happens when `symbol_interval` is longer than the track duration? (No interval symbols shown, only explicit overrides apply)
- How are labels rendered when `show_label: true` but no explicit `label` text? (Use formatted timestamp HH:MM:SS)
- What happens when interval doesn't align exactly with position timestamps? (Show symbol at nearest position to each interval mark)
- What if `position_style_overrides` is omitted entirely? (All positions use defaults + interval rules only)

## Requirements *(mandatory)*

### Functional Requirements

#### Schema Changes

- **FR-001**: System MUST remove `coordinates` attribute from `TimestampedPosition` class in LinkML schema
- **FR-002**: System MUST add `PositionStyle` class with attributes: `show_symbol` (boolean), `symbol` (PointShapeEnum), `show_label` (boolean)
- **FR-003**: System MUST add `PositionStyleOverride` class with attributes: `show_symbol` (boolean, optional), `symbol` (PointShapeEnum, optional), `show_label` (boolean, optional), `label` (string, optional). No `time` field - position determined by array index.
- **FR-004**: System MUST add `default_position_style` (PositionStyle, required) attribute to `TrackProperties`
- **FR-005**: System MUST add `symbol_interval` (string, ISO 8601 duration format, optional) attribute to `TrackProperties`
- **FR-006**: System MUST add `label_interval` (string, ISO 8601 duration format, optional) attribute to `TrackProperties`
- **FR-007**: System MUST add `position_style_overrides` (array of PositionStyleOverride or null, optional) attribute to `TrackProperties`. When present, must be same length as `positions` array with `null` entries for positions without overrides.
- **FR-008**: System MUST validate that all parallel arrays have equal length: `len(geometry.coordinates) == len(positions) == len(position_style_overrides)` (when overrides present)

#### Data Migration

- **FR-009**: System MUST provide migration script to transform existing fixtures removing coordinates from positions
- **FR-010**: System MUST update all golden fixtures in `shared/schemas/src/fixtures/valid/` to match new schema
- **FR-011**: System MUST regenerate all derived schemas (Pydantic, TypeScript, JSON Schema) after LinkML changes

#### Map Rendering

- **FR-012**: Track renderer MUST implement style resolution cascade: default_position_style → interval rules → overrides
- **FR-013**: Track renderer MUST render position symbols according to resolved style at each position
- **FR-014**: Track renderer MUST render position labels according to resolved style at each position
- **FR-015**: Track renderer MUST use formatted timestamp as label text when `show_label: true` but no explicit `label` provided

### Key Entities

- **TimestampedPosition**: Temporal and kinematic metadata for a single track position. Contains: time (required), depth (optional), course (optional), speed (optional). Coordinates removed - now indexed by parallel position in geometry.coordinates array.

- **PositionStyle**: Default styling configuration for track positions. Contains: show_symbol (boolean), symbol (shape enum), show_label (boolean). Applied as baseline before intervals and overrides.

- **PositionStyleOverride**: Per-position style override indexed by array position. Contains: show_symbol (optional), symbol (optional), show_label (optional), label (optional). No `time` field - index `i` applies to `positions[i]`. Array entries are `null` for positions without custom styling.

- **TrackProperties**: Extended with position styling fields: default_position_style (PositionStyle), symbol_interval (ISO 8601 duration), label_interval (ISO 8601 duration), position_style_overrides (parallel array of PositionStyleOverride or null).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All existing track fixtures pass schema validation after migration with zero coordinate duplication
- **SC-002**: Round-trip tests (Python to JSON to TypeScript to JSON to Python) pass for tracks with position styling
- **SC-003**: Tracks with 1000+ positions render with interval-based symbols without visible delay
- **SC-004**: Style resolution correctly applies cascade (default then interval then override) for 100% of test cases
- **SC-005**: Users can configure interval-based symbol display matching legacy Debrief intervals (1 second to 1 day range)

## Assumptions

- ISO 8601 duration format (e.g., "PT5M" for 5 minutes, "PT1H" for 1 hour, "P1D" for 1 day) is suitable for interval specification
- Position timestamps are unique within a track (no duplicate timestamps)
- The map renderer has access to the full TrackFeature including properties when rendering
- Label text defaults to formatted timestamp (HH:MM:SS) when not explicitly specified
- Interval alignment uses "nearest position" logic when intervals don't match exact position timestamps
