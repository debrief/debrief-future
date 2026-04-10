# Feature Specification: Sensor Rendering

**Feature Branch**: `118-sensor-rendering`
**Created**: 2026-04-10
**Status**: Draft
**Input**: User description: "[E07] Sensor rendering -- Leaflet custom layer for bearing lines, ambiguous bearings, sensor arcs, snail mode (requires #116, #117)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bearing lines render from sensor origin to range extent (Priority: P1)

An analyst loads a track that has sensor data attached (bearing observations from a hull-mounted or towed-array sensor). Each sensor contact with `has_bearing=true` and `visible=true` draws a line on the map from the sensor origin outward along the bearing direction. If the contact includes a range value, the line extends exactly to that distance. If no range is present, the line extends to a large default distance capped so that sensor bearings never appear to exceed 5 degrees of arc on screen (matching the legacy MAXIMUM_SENSOR_BEARING_RANGE constant). Only contacts whose timestamps fall within the current time filter window are drawn.

**Why this priority**: Bearing lines are the fundamental sensor visualisation. Without them, no sensor data is visible on the map. Every other sensor rendering feature (ambiguous bearings, labels, arcs, snail mode) builds on top of this core capability.

**Independent Test**: Can be fully tested by loading a track fixture containing sensor contacts with known bearings and ranges, rendering the map at a specific currentTime, and verifying that bearing lines appear at the correct geographic positions and extents.

**Acceptance Scenarios**:

1. **Given** a track with a sensor containing 10 contacts each with bearing and range, **When** the map renders at a time within the sensor's time span, **Then** bearing lines are drawn from each visible contact's origin position to the correct range extent.
2. **Given** a sensor contact with bearing=045 and no range value, **When** rendered, **Then** the bearing line extends to the viewport clip distance, capped at the equivalent of 5 degrees of latitude/longitude.
3. **Given** a sensor contact with `has_bearing=false`, **When** rendered, **Then** no bearing line is drawn for that contact (regardless of the bearing value stored in data).
4. **Given** a sensor contact with `visible=false`, **When** rendered, **Then** no bearing line is drawn for that contact.
5. **Given** a currentTime outside the time range of all sensor contacts, **When** rendered, **Then** no bearing lines are drawn.

---

### User Story 2 - Ambiguous bearings render in a darker shade (Priority: P1)

When a sensor contact has an ambiguous bearing (common with towed-array sonar where port/starboard is indeterminate), the map draws a second bearing line at the ambiguous bearing angle. The ambiguous line is drawn in a darker shade of the contact's base color to visually distinguish it from the primary bearing. Port/starboard determination uses the host vessel's course at the contact time: the bearing on the port side of the vessel uses the base color, and the bearing on the starboard side uses the darker shade.

**Why this priority**: Ambiguous bearings are a core element of passive sonar analysis. Without correct port/starboard color assignment, an analyst cannot visually determine which bearing solution is primary, which is critical for target motion analysis.

**Independent Test**: Can be fully tested by loading a fixture with contacts that have both bearing and ambiguous_bearing populated, alongside a host track with known courses, and verifying that two lines are drawn per contact with the correct color assignments based on relative bearing.

**Acceptance Scenarios**:

1. **Given** a contact with bearing=045 and ambiguous_bearing=315 on a track heading 000, **When** rendered, **Then** two bearing lines are drawn: one at 045 (starboard, darker shade) and one at 315 (port, base color).
2. **Given** a contact with `has_ambiguous=false`, **When** rendered, **Then** only the primary bearing line is drawn.
3. **Given** a contact with ambiguous_bearing but no explicit color, **When** the sensor parent has color="#FF0000", **Then** the primary line uses #FF0000 (or the port-side line does) and the ambiguous line uses a programmatically darkened variant.

---

### User Story 3 - Sensor arc coverage fans render on the map (Priority: P2)

When a track contains SENSORARC data (dynamic track coverage shapes), the map renders a fan/wedge shape from the sensor origin. The arc is defined by left and right angular bounds plus inner and outer range bounds. The fill is semi-transparent and the outline is styled. Arcs are time-filtered: they only appear when the current time falls within the arc's start/end time window.

**Why this priority**: Sensor arcs provide essential tactical context showing the coverage area of a sensor system. While less common than bearing lines, they are a standard element of maritime tactical displays.

**Independent Test**: Can be fully tested by loading a fixture with SENSORARC data containing known angles and ranges, setting the currentTime within the arc's valid window, and verifying the rendered wedge geometry on the map.

**Acceptance Scenarios**:

1. **Given** a SENSORARC with left_angle=350, right_angle=010, inner_range=1000, outer_range=5000, start_time=T1, end_time=T2, **When** currentTime is between T1 and T2, **Then** a wedge/fan shape is drawn spanning 20 degrees (from 350 clockwise to 010) between 1000m and 5000m radii.
2. **Given** the same SENSORARC, **When** currentTime is outside T1-T2 range, **Then** the arc is not rendered.
3. **Given** a SENSORARC, **When** rendered, **Then** the fill is semi-transparent and the outline matches the sensor's configured color.

---

### User Story 4 - Snail mode time-trail fading for sensor contacts (Priority: P2)

When the display is in trail (snail) mode, sensor contacts within the trail window are drawn with a fade-to-black effect. The newest contact (at currentTime) is drawn at full color intensity. Older contacts fade proportionally: `proportion = (trailLength - age) / trailLength`, and the faded color is calculated as `Color(R * proportion, G * proportion, B * proportion)`. Contacts older than the trail length are not drawn.

**Why this priority**: Snail mode is a core temporal visualisation that shows contact history and bearing rate. It is used routinely in target motion analysis to observe bearing drift patterns over time.

**Independent Test**: Can be fully tested by loading a track with sensor contacts at regular time intervals, setting trail mode with a known trail length, and verifying that contacts are drawn with progressively fading colors from the current time backward.

**Acceptance Scenarios**:

1. **Given** a sensor with contacts every minute from T0 to T10, a currentTime of T10, and a trail length of 5 minutes, **When** rendered in trail mode, **Then** contacts at T6-T10 are drawn with proportional fading (T10 at full color, T6 nearly black), and contacts at T0-T5 are not drawn.
2. **Given** a contact at the exact edge of the trail window (age equals trailLength), **When** rendered, **Then** the contact is drawn with proportion 0.0 (fully black).
3. **Given** trail mode is not active (display mode is "full"), **When** rendered, **Then** all visible contacts are drawn at full color intensity without fading.

---

### User Story 5 - Labels render at configurable positions on bearing lines (Priority: P3)

When a sensor contact has `show_label=true`, the contact's label text is drawn on the map near the bearing line. The label position along the line is determined by the `put_label_at` property (START at the origin, MIDDLE at the midpoint, END at the far end). The horizontal text alignment is determined by the `label_location` property (LEFT, CENTER, RIGHT).

**Why this priority**: Labels provide identification and contextual information for sensor contacts. While bearing lines are useful without labels, labels significantly enhance the analyst's ability to correlate contacts across sensors and with other data sources.

**Independent Test**: Can be fully tested by loading a fixture with contacts that have labels configured at different positions and alignments, and verifying the label text appears at the correct location relative to the bearing line.

**Acceptance Scenarios**:

1. **Given** a contact with label="S1", show_label=true, put_label_at=END, label_location=RIGHT, **When** rendered, **Then** the text "S1" appears near the far end of the bearing line, aligned to the right.
2. **Given** a contact with label="S1", show_label=false, **When** rendered, **Then** no label text is drawn.
3. **Given** a contact with put_label_at=MIDDLE, **When** rendered, **Then** the label is positioned at the midpoint of the bearing line.
4. **Given** a contact with no label text (label is null), show_label=true, **When** rendered, **Then** no label is drawn (nothing to display).

---

### User Story 6 - Bearing line styling follows display properties (Priority: P3)

Each sensor contact's bearing line respects the `line_style` property (SOLID, DASHED, DOT, DASH_DOT) and the sensor-level `line_thickness` property. The contact-level `color` overrides the sensor-level `color` when present (color inheritance pattern). When no color is set at either level, a default color is used.

**Why this priority**: Display property fidelity ensures that styling customizations made by analysts persist and render correctly, completing the round-trip from schema through rendering.

**Independent Test**: Can be fully tested by loading fixtures with different line_style values and verifying the visual dash pattern and thickness of rendered bearing lines.

**Acceptance Scenarios**:

1. **Given** a contact with line_style=DASHED, **When** rendered, **Then** the bearing line is drawn with a dashed pattern.
2. **Given** a contact with no color but parent sensor has color="#00FF00", **When** rendered, **Then** the bearing line is drawn in green (#00FF00).
3. **Given** a contact with color="#0000FF" and parent sensor color="#00FF00", **When** rendered, **Then** the bearing line is drawn in blue (#0000FF), overriding the sensor default.
4. **Given** a sensor with line_thickness=3, **When** its contacts are rendered, **Then** bearing lines are drawn with a weight/thickness of 3.

---

### Edge Cases

- What happens when a bearing is exactly 0 or 360 degrees? Both represent north and the bearing line should point in the same direction.
- What happens when bearing wraps around 0/360 for ambiguous bearing calculations (e.g., bearing=355, ambiguous_bearing=005)? The port/starboard determination must handle wraparound correctly using modular arithmetic.
- What happens when the host track has no position data at the sensor contact's timestamp? The system should interpolate the host position from adjacent track positions to determine the sensor origin. If no track data exists at all, the contact cannot be rendered and should be silently skipped.
- What happens when all contacts in a sensor are outside the current time filter? No bearing lines are rendered for that sensor; the layer produces no visual output.
- What happens when a sensor has thousands of contacts visible simultaneously? The canvas renderer should batch drawing operations to maintain interactive frame rates. Viewport culling should skip contacts whose bearing lines fall entirely outside the visible map bounds.
- What happens when a SENSORARC spans across the 0/360 boundary (e.g., left_angle=350, right_angle=010)? The wedge should correctly wrap around north, drawing a 20-degree arc.
- How does the system handle contacts with explicit `origin` coordinates versus calculated origins? If `contact.origin` is set (not null), it is used directly as the line's starting point. Otherwise, the origin is derived from the host track position at the contact's time (with array offset adjustments handled by #119).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render a bearing line for each SensorContact where `has_bearing=true` and `visible=true`, originating from the sensor origin position and extending along the bearing direction
- **FR-002**: System MUST extend bearing lines to the contact's range value when present, or to a default extent capped at the equivalent of 5 degrees of latitude (MAXIMUM_SENSOR_BEARING_RANGE) when no range is provided
- **FR-003**: System MUST render ambiguous bearing lines when `has_ambiguous=true` and `ambiguous_bearing` is present, drawn in a programmatically darkened shade of the base color
- **FR-004**: System MUST determine port/starboard bearing assignment using the host vessel's course at the contact's timestamp: the port-side bearing uses the base color, the starboard-side bearing uses the darker shade
- **FR-005**: System MUST render sensor arc coverage shapes (SENSORARC data) as fan/wedge geometries with left/right angular bounds and inner/outer range bounds, with semi-transparent fill
- **FR-006**: System MUST time-filter all sensor rendering: only contacts whose timestamp matches the current time filter window are drawn; SENSORARC shapes only appear when currentTime is within their start/end range
- **FR-007**: System MUST support snail mode (trail) rendering where contacts within the trail window fade from full color (newest) to black (oldest) using the formula `proportion = (trailLength - age) / trailLength` and `fadedColor = Color(R * proportion, G * proportion, B * proportion)`
- **FR-008**: System MUST render contact labels when `show_label=true` and label text is non-empty, positioned along the bearing line according to `put_label_at` (START, MIDDLE, END) and aligned according to `label_location` (LEFT, CENTER, RIGHT)
- **FR-009**: System MUST apply the `line_style` property to bearing lines, mapping LineStyleEnum values to visual dash patterns: SOLID (continuous), DASHED, DOT, DASH_DOT
- **FR-010**: System MUST apply color inheritance: use contact-level color when set, fall back to sensor-level color, fall back to application default
- **FR-011**: System MUST apply sensor-level `line_thickness` to all bearing lines within that sensor
- **FR-012**: System MUST use canvas-based rendering for bearing lines and arcs to support performant rendering of large datasets (thousands of contacts)
- **FR-013**: System MUST cull contacts whose bearing lines fall entirely outside the current map viewport to avoid unnecessary rendering
- **FR-014**: System MUST integrate with the session-state store's `currentTime` and `displayMode` to determine which contacts to render and how to render them (full vs trail)
- **FR-015**: System MUST use explicit `contact.origin` coordinates when present, otherwise derive the origin from the host track's interpolated position at the contact's timestamp
- **FR-016**: System MUST handle bearing wraparound at the 0/360 boundary correctly for both primary and ambiguous bearing rendering and port/starboard determination

### Key Entities

- **SensorBearingLine**: A visual line segment from a sensor origin to a far end, representing a single bearing observation. Defined by origin position, bearing angle, range extent, color, line style, and thickness.
- **AmbiguousBearingLine**: A second bearing line for the same contact, drawn at the ambiguous bearing angle in a darker color shade. The port/starboard assignment determines which line gets the base color and which gets the darker shade.
- **SensorArcShape**: A fan/wedge polygon on the map representing sensor coverage. Defined by origin, left/right angular bounds, inner/outer range bounds, time window, fill color, and opacity.
- **SnailTrail**: A set of bearing lines for contacts within a temporal window, each faded proportionally based on age relative to the trail length. Produces a visual history of bearing observations.
- **BearingLabel**: Text placed along a bearing line at a configured position (START/MIDDLE/END) with configured alignment (LEFT/CENTER/RIGHT).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All sensor contacts with valid bearings render as visible lines on the map when the contact is within the current time window and marked visible
- **SC-002**: Ambiguous bearing lines render in a visually distinct (darker) shade from primary bearing lines, with port/starboard assignment matching the legacy algorithm for all test cases with known vessel courses
- **SC-003**: Sensor arc wedge shapes render with correct angular and radial extents, appearing and disappearing as the time slider moves through their start/end window
- **SC-004**: Snail mode fading produces a smooth visual gradient from full color (newest contact) to black (oldest contact within trail window), with contacts beyond the trail window not rendered
- **SC-005**: Labels appear at the correct position along bearing lines (START/MIDDLE/END) with correct alignment (LEFT/CENTER/RIGHT)
- **SC-006**: Bearing line styling (dash pattern, thickness, color) matches the configured display properties for each contact and sensor
- **SC-007**: Rendering 1000+ simultaneous bearing lines maintains interactive map performance (smooth pan and zoom) through canvas-based batched rendering and viewport culling
- **SC-008**: All rendering integrates with the session-state store's currentTime and displayMode, updating reactively when the time slider position changes
- **SC-009**: The rendering layer correctly follows the existing codebase patterns established by TemporalTrackLayer and PositionSymbolsLayer for component structure, time filtering, and coordinate conversion

## Assumptions

- The sensor schema overhaul (#116) is complete and SensorContact/SensorData types include all display properties (color, visible, has_bearing, has_ambiguous, line_style, label_location, put_label_at, show_label, line_thickness, origin).
- The REP sensor import (#117) is complete and tracks can contain parsed sensor data in `track.properties.sensors[]`.
- Array offset calculations (#119) are not yet available. Until #119 is implemented, sensor origins default to the host track position at the contact time (PLAIN mode behavior). When contact.origin is explicitly set, that value is used directly.
- The color darkening algorithm for ambiguous bearings produces a consistent darker shade by multiplying each RGB channel by a fixed factor (e.g., 0.7), matching the legacy Java `Color.darker()` behavior.
- Trail length for snail mode is derived from the session-state temporal configuration (same mechanism used by TemporalTrackLayer for track trail rendering).
- SENSORARC data is stored as a separate structure within the track properties (as defined by #117's import of SENSORARC format lines), not as SensorContact records.
- The existing MapView component will be extended to render sensor layers alongside existing track and annotation layers.
- The LineStyleEnum-to-dash-array mapping is defined as a code constant in this rendering layer: SOLID -> null, DASHED -> "10, 5", DOT -> "2, 5", DASH_DOT -> "10, 5, 2, 5" (as specified in #116 data-model.md).

## Dependencies

- **#116 (Sensor Schema Overhaul)**: Provides the SensorContact and SensorData types with display properties, enums (LineStyleEnum, LabelLocationEnum, LineLabelPositionEnum), and the MeasuredArrayPosition type.
- **#117 (REP Sensor Import)**: Provides parsed sensor data embedded in tracks. Without import, there is no sensor data to render.

## Out of Scope

- Array offset calculations (PLAIN/WORM/MEASURED origin computation) -- these are #119 and will plug into the rendering layer's origin resolution when implemented
- Sensor arc editing or creation through the UI
- Bearing or frequency residual analysis (#120)
- TMA segment rendering (#121)
- Interactive drag operations on sensor contacts
- Sensor data import or parsing (handled by #117)
- Sensor-aware layers panel grouping (handled by #179)
- Sensor contact selection or click interaction (deferred to future work)
- REP export of sensor data
