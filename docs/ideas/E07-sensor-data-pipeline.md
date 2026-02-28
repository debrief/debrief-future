# Epic: Sensor Data Pipeline

Port legacy Debrief sensor capabilities to Debrief-Future in 7 phases, from schema through TMA interactive drag.

## Problem

Legacy Debrief has a mature sensor data system spanning ~10,000 lines of Java across 30+ source files. It covers passive sonar observations, bearing/frequency analysis, towed array offset calculations, bearing residual "stacked dots" views, and full Target Motion Analysis (TMA) with interactive drag refinement. Debrief-Future has partial sensor schema support (SensorContact, SensorData in LinkML) and 9 sensor tool specifications, but only 1 tool implemented (buffer-zone-generator). No sensor import, rendering, analysis, or TMA capabilities exist yet.

## Proposed Solution

A 7-phase implementation delivering sensor capabilities incrementally. Each phase produces a working end-to-end demo scenario. Sensor data is embedded under `track.properties.sensors` (not standalone features). The existing backlog item #067 (9 sensor tool implementations) is absorbed into the relevant phases of this epic.

### Architecture Decisions

- **Embedded storage**: Sensors live under `track.properties.sensors[]` in GeoJSON, matching the legacy parent-child relationship
- **Display properties in schema**: Color, visibility, line_style, label_location, show_label persist with data (round-trip through STAC/GeoJSON)
- **No REP export**: REP is import-only; STAC/GeoJSON is the canonical format
- **Schema-per-phase for TMA**: TMA schemas defined alongside TMA implementation (Phase 6), not upfront
- **Accuracy fields deferred**: bearing_accuracy and frequency_accuracy not included in initial schema (legacy parsed but never stored these)

### Phase Summary

| Phase | Title | Key Deliverables |
|-------|-------|-----------------|
| 1 | Schema Overhaul | Full SensorContact/SensorData redesign, display properties, array offset modes, measured positions, update 9 tool specs |
| 2 | REP Import | SENSOR v1, then SENSOR2, SENSOR3, SENSORARC parsers |
| 3 | Rendering | Leaflet custom layer for bearing lines, ambiguous bearings, sensor arcs, snail mode |
| 4 | Array Offsets | PLAIN, WORM, MEASURED array centre calculations |
| 5 | Residual Analysis | Doublet infrastructure, bearing + frequency residuals, custom React scatter component |
| 6 | TMA Data Model | TMA schemas, Absolute/Relative segments, solution generation from sensor cuts |
| 7 | TMA Interactive Drag | Rotate/shear/stretch drag modes, live residual feedback |

---

## Phase 1: Sensor Schema Overhaul (#116)

Redesign SensorContact and SensorData from scratch in LinkML to fully capture the legacy data model, including display properties that persist with data.

### SensorContact fields (from legacy SensorContactWrapper)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| time | datetime | yes | Observation timestamp (ISO8601) |
| bearing | float | yes | Primary bearing (0-360 degrees) |
| has_bearing | boolean | no | Bearing data presence flag (default true) |
| ambiguous_bearing | float | no | Alternative bearing for towed arrays |
| has_ambiguous | boolean | no | Ambiguous bearing active flag |
| range | float | no | Target distance (metres) |
| frequency | float | no | Received frequency (Hz) |
| has_frequency | boolean | no | Frequency data presence flag |
| label | string | no | Display label |
| comment | string | no | Operator notes |
| color | string | no | Contact color override (null = inherit from sensor) |
| visible | boolean | no | Contact visibility (default true) |
| show_label | boolean | no | Label visibility (default false) |
| line_style | LineStyleEnum | no | SOLID, DASHED, DOT, DASH_DOT |
| label_location | LabelLocationEnum | no | LEFT, CENTER, RIGHT |
| put_label_at | LineLabelPositionEnum | no | START, MIDDLE, END |
| origin | [lon, lat] | no | Explicit sensor location (overrides calculated) |

### SensorData fields (from legacy SensorWrapper)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | string | yes | Sensor identifier (e.g., "TOWED_ARRAY") |
| base_frequency | float | no | Source transmitted frequency for Doppler (Hz) |
| offset | float | no | Array offset from platform reference (metres) |
| array_centre_mode | ArrayCentreModeEnum | no | PLAIN, WORM, MEASURED |
| worm_in_hole | boolean | no | Display mode flag (default false) |
| color | string | no | Default color for all contacts |
| visible | boolean | no | Sensor visibility (default true) |
| line_thickness | integer | no | Bearing line width |
| contacts | SensorContact[] | yes | Time-ordered sensor observations |
| measured_positions | MeasuredArrayPosition[] | no | Actual array positions for MEASURED mode |

### MeasuredArrayPosition (new)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| time | datetime | yes | Position timestamp |
| latitude | float | yes | Array centre latitude |
| longitude | float | yes | Array centre longitude |

### New Enums

- **ArrayCentreModeEnum**: PLAIN, WORM, MEASURED
- **LineStyleEnum**: SOLID, DASHED, DOT, DASH_DOT
- **LabelLocationEnum**: LEFT, CENTER, RIGHT
- **LineLabelPositionEnum**: START, MIDDLE, END

### Additional deliverables

- Update all 9 existing sensor tool spec fixtures to match new schema
- Generate Pydantic, JSON Schema, TypeScript types
- Golden fixtures (valid + invalid) for new schema
- Round-trip tests (Python -> JSON -> TypeScript -> JSON -> Python)

### Demo

Load a fixture file containing a track with embedded sensor data -> validate with Pydantic -> serialize to JSON -> deserialize in TypeScript -> verify all fields preserved.

---

## Phase 2: REP Sensor Import (#117)

Parse legacy REP sensor format lines and populate the new sensor schema. Start with SENSOR v1 (simplest), then layer on SENSOR2, SENSOR3, and SENSORARC.

### REP Format Support

| Format | Prefix | Key Fields | Priority |
|--------|--------|------------|----------|
| SENSOR v1 | `;SENSOR:` | timestamp, track, symbology, location, bearing, range, sensor name, label | First |
| SENSOR2 | `;SENSOR2:` | + ambiguous bearing, frequency | Second |
| SENSOR3 | `;SENSOR3:` | + bearing accuracy, frequency accuracy (parsed, not stored) | Third |
| SENSORARC | `;SENSORARC` | start/end time, track, left/right angles, inner/outer range | Fourth |

### Key behaviours

- Sensor contacts merge into existing sensor with same name on same track (matching legacy TrackWrapper.add())
- Symbology codes map to colors (@ = White, A = Blue, B = Green, C = Red, etc.)
- NULL/NAN bearing values create contacts with has_bearing = false
- Location can be explicit (DMS lat/lon) or NULL (derived from host track)
- SENSORARC creates a DynamicTrackCoverage annotation, not a SensorContact

### Integration with debrief-io

Extend the existing REP parser in `services/io/` to handle `;SENSOR:`, `;SENSOR2:`, `;SENSOR3:`, and `;SENSORARC` lines. Parsed sensors embedded into the parent TrackFeature's properties.sensors array.

### Demo

Load a REP file containing SENSOR/SENSOR2 lines -> see sensor contacts attached to tracks in STAC -> verify in web-shell (data view, not rendering yet).

---

## Phase 3: Sensor Rendering (#118)

Render sensor data on the Leaflet map using a custom Canvas/SVG layer.

### Bearing line rendering

- Draw line from sensor origin to far end (range extent or viewport clip)
- Without range: extend to twice viewport dimension (capped at 5 degrees, matching legacy MAXIMUM_SENSOR_BEARING_RANGE)
- Ambiguous bearing drawn in darker shade of base color
- Port/starboard determination from host vessel course at contact time
- Configurable transparency (alpha channel)

### Sensor arc rendering

- Fan/wedge shape from sensor origin with left/right angular bounds and inner/outer range bounds
- Semi-transparent fill with styled outline

### Snail mode (time-trail)

- Contacts within trail window fade from full color (newest) to black (oldest)
- `proportion = (trailLength - age) / trailLength`
- `fadedColor = Color(R * proportion, G * proportion, B * proportion)`

### Label rendering

- Label text from contact.label
- Position on bearing line: START (origin), MIDDLE (midpoint), END (far end)
- Text alignment: LEFT, CENTER, RIGHT

### Performance considerations

- Canvas renderer for large contact datasets (thousands of bearing lines)
- Visibility culling: skip contacts outside current viewport
- Time filtering: only render contacts visible at current time slider position

### Demo

Load REP file with sensor data -> render bearing lines on map -> toggle ambiguous bearings -> demonstrate snail mode time trail -> show sensor arc coverage fan.

---

## Phase 4: Array Offset Calculations (#119)

Implement the three array centre modes that determine where bearing lines originate.

### PLAIN mode

Simple backtrack along vessel's current heading:
- `arrayCentre = vesselPosition - (offset * headingVector)`
- Uses vessel's course at the contact timestamp

### WORM mode ("worm in hole")

Array centre follows vessel's historical track path:
- Walk backwards along track geometry by `offset` metres of track distance
- Array centre is the point on the track that is `offset` metres of track-path behind the vessel's current position
- Accurately models towed array following the vessel's turns

### MEASURED mode

Uses actual position data from `measured_positions` time-series:
- Interpolate latitude/longitude at contact timestamp
- Fall back to PLAIN mode if no measured data covers the contact time

### Impact on rendering

- `SensorContact.getCalculatedOrigin()` uses array offset mode from parent SensorData
- When offset or mode changes, all contact origins must be invalidated and recalculated
- Bearing line origin shifts based on calculated array centre

### Absorbs from #067

- Sensor tools that depend on array position (generate-sensor-range-plot, insert-sensor-arc) become fully functional

### Demo

Load track with towed array sensor -> switch between PLAIN/WORM/MEASURED modes -> observe bearing line origins shift on the map -> verify array centre calculation accuracy against known test cases.

---

## Phase 5: Bearing & Frequency Residual Analysis (#120)

Implement the Doublet observation-hypothesis pairing system and residual visualisation.

### Doublet infrastructure

A Doublet pairs a sensor contact with a target hypothesis:

| Field | Type | Description |
|-------|------|-------------|
| sensor_contact | SensorContact | Raw observation |
| target_fix | TimestampedPosition | Target hypothesised position (interpolated) |
| host_fix | TimestampedPosition | Observing platform position (interpolated) |
| target_segment | TrackSegment | Parent segment containing target |

### Bearing residual calculation

For each Doublet:
1. **Measured bearing** = sensor_contact.bearing
2. **Calculated bearing** = geometric bearing from sensor origin to target position
3. **Bearing error** = measured - calculated, wrapped to +/-180 degrees

Ambiguous bearing produces second residual series.

### Frequency residual calculation (Doppler)

For each Doublet:
1. **Measured frequency** = sensor_contact.frequency
2. **Corrected frequency** = remove observer's Doppler shift (bearing, host course/speed)
3. **Predicted frequency** = add target's Doppler shift (base frequency, target course/speed, speed of sound)
4. **Frequency error** = corrected - predicted

### Stacked dots visualisation

Custom React scatter plot component (not Vega-Lite):
- X-axis: time
- Y-axis: residual error (degrees for bearing, Hz for frequency)
- Dots colored per sensor
- Ownship course shown as context line
- Ownship leg zones highlighted as colored bands
- Ambiguous bearing residuals shown as second series

### Absorbs from #067

- doppler-curve tool
- inflection-point-detector tool
- resolve-ambiguity, ambiguity-resolver, delete-ambiguous-bearings tools
- generate-sensor-range-plot tool
- merge-contacts tool
- generate-new-sensor-contact, insert-sensor-arc tools

### Demo

Load track with sensor data + target hypothesis track -> view bearing residual stacked dots -> observe residuals near zero for good hypothesis -> switch to frequency residuals -> identify Doppler shift patterns.

---

## Phase 6: TMA Data Model & Solution Generation (#121)

Define TMA schemas and implement solution generation from sensor cuts.

### TMA schemas (defined in this phase)

#### CoreTMASegment (abstract)

| Field | Type | Description |
|-------|------|-------------|
| course | float | Constant target course (degrees) |
| speed | float | Constant target speed (knots) |
| start_time | datetime | Segment start |
| end_time | datetime | Segment end |

#### AbsoluteTMASegment (extends CoreTMASegment)

| Field | Type | Description |
|-------|------|-------------|
| origin | [lon, lat] | Fixed geographic starting point |

Dead-reckons fix positions: `position(t) = origin + (speed * elapsed_time) along course`

#### RelativeTMASegment (extends CoreTMASegment)

| Field | Type | Description |
|-------|------|-------------|
| reference_track_name | string | Ownship track identifier |
| reference_sensor_name | string | Optional: sensor for offset calculation |
| offset_bearing | float | Initial bearing from ownship to target |
| offset_range | float | Initial range from ownship to target |

Position relative to ownship: `target(t) = ownship(t) + offset + (speed * course * elapsed)`

#### TMAContact (individual solution estimate)

| Field | Type | Description |
|-------|------|-------------|
| time | datetime | Solution timestamp |
| bearing | float | Bearing to target |
| range | float | Range to target |
| course | float | Target course estimate |
| speed | float | Target speed estimate |
| depth | float | Target depth estimate |
| ellipse_orientation | float | Uncertainty ellipse orientation |
| ellipse_semi_major | float | Semi-major axis (metres) |
| ellipse_semi_minor | float | Semi-minor axis (metres) |

### Solution generation from sensor cuts

Primary TMA workflow:
1. Select sensor contacts (time range or individual)
2. Provide initial range, bearing, course, speed estimates
3. Create RelativeTMASegment from the sensor contacts
4. Generate fix positions at each contact timestamp by dead-reckoning
5. Create new track with the TMA segment

### Integration with residuals

TMA segments serve as target hypothesis for Doublet pairing in Phase 5's residual views. After generating a TMA solution, the analyst views bearing/frequency residuals to assess quality.

### Demo

Load ownship track with sensor data -> select sensor contacts -> generate TMA solution with initial estimates -> view TMA track on map -> observe bearing residuals for the solution.

---

## Phase 7: TMA Interactive Drag (#122)

Add interactive drag operations for refining TMA segments on the map.

### Drag modes

| Mode | Effect | Visual Feedback |
|------|--------|----------------|
| Translate | Move segment position | Segment follows cursor |
| Rotate | Change target course | Segment pivots around endpoint, "[newCourse deg]" |
| Stretch | Change target speed | Segment extends/contracts, "[newSpeed kts]" |
| Shear (default) | Change both course + speed | "[speed kts newCourse deg]" |

### Implementation

- Drag operations on Leaflet map via mouse/touch handlers
- Real-time recalculation of TMA segment positions during drag
- Live text overlay showing current course/speed values
- Undo support for all drag operations

### Live residual feedback

- During drag, bearing residual view updates in real-time
- Analyst can observe residuals approaching zero as solution improves
- Frequency residuals also update (Doppler predictions change with course/speed)

### Demo

Generate TMA solution -> select Shear drag mode -> drag TMA segment to refine -> observe bearing residuals converging to zero in real-time -> release to commit refined solution.

---

## Success Criteria

- [ ] Sensor schema fully captures legacy data model (Phase 1)
- [ ] All 4 REP sensor formats parsed correctly (Phase 2)
- [ ] Bearing lines render on Leaflet map with correct geometry (Phase 3)
- [ ] All 3 array offset modes produce correct origins (Phase 4)
- [ ] Bearing and frequency residuals calculated correctly (Phase 5)
- [ ] TMA solutions generated from sensor cuts (Phase 6)
- [ ] Interactive TMA drag refines solutions in real-time (Phase 7)
- [ ] Each phase has a working demo scenario
- [ ] All 9 sensor tools from #067 absorbed and implemented

## Constraints

- Sensors embedded in track.properties.sensors only (no standalone SENSOR FeatureKind)
- REP import only (no REP export)
- Accuracy fields (bearing_accuracy, frequency_accuracy) deferred
- All phases must work offline (Constitution Art. I)
- Schema changes require adherence tests (Constitution Art. II)
- All operations logged with provenance (Constitution Art. III)

## Out of Scope

- Multi-static sonar (active sonar two-way propagation)
- Real sensor detection models (stub model remains)
- Flat file / SAM format export
- Griddable bulk editing of contacts
- REP sensor export

## Cross-Epic Dependencies

- **E01 #062** (complete): Compound track model with embedded sensors — provides the TrackFeature structure
- **E01 #064**: Phase 1 measurement tools — building blocks used by sensor analysis tools
- **E01 #067**: Absorbed into this epic (9 sensor tools distributed across phases)
- **E02**: PROV logging — sensor operations should record provenance

## Epic Breakdown

| Item | Title | Dependencies | Complexity |
|------|-------|-------------|------------|
| #116 | Sensor schema overhaul | #062 (complete) | High |
| #117 | REP sensor import (v1/v2/v3/arc) | #116 | Medium |
| #118 | Sensor rendering (bearing lines, arcs, snail mode) | #116, #117 | High |
| #119 | Array offset calculations (PLAIN/WORM/MEASURED) | #116 | Medium |
| #120 | Bearing & frequency residual analysis | #116, #119 | High |
| #121 | TMA data model & solution generation | #116, #120 | High |
| #122 | TMA interactive drag | #121, #120 | High |
