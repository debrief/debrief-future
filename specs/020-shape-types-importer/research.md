# Research: Add Remaining Shape Type Importers

## Shape Type Specifications

Research extracted from GitHub Issue #56 and Debrief REP file format documentation.

### Phase 2 Shapes (Common)

#### POLY
- **Format**: `;POLY: SYMBOL LABEL N LAT1 LON1 LAT2 LON2 ... LATN LONN`
- **Geometry**: Polygon (auto-close by repeating first point)
- **Notes**: Minimum 3 vertices, label supports `\n` for newlines
- **Decision**: Parse vertices, auto-close, store raw label with escapes preserved

#### POLYLINE
- **Format**: `;POLYLINE: SYMBOL LABEL N LAT1 LON1 LAT2 LON2 ... LATN LONN`
- **Geometry**: LineString (open, not closed)
- **Notes**: Minimum 2 vertices, same label handling as POLY
- **Decision**: Parse as LineString, use `_build_line_style()` helper

#### ELLIPSE
- **Format**: `;ELLIPSE: SYMBOL TIMESTAMP LAT LON ORIENTATION SEMI_MAJOR SEMI_MINOR`
- **Geometry**: Polygon (32+ point approximation)
- **Notes**:
  - Orientation in degrees (0=North, clockwise)
  - Semi-axes in meters
  - Optional `LAYER=x` attribute in symbol
- **Decision**: Create `_approximate_ellipse()` helper with rotation matrix

#### ELLIPSE2
- **Format**: `;ELLIPSE2: SYMBOL START_DATE START_TIME END_DATE END_TIME LAT LON ORIENTATION SEMI_MAJOR SEMI_MINOR`
- **Geometry**: Same as ELLIPSE
- **Notes**: Time range instead of single timestamp (YYMMDD HHMMSS format)
- **Decision**: Reuse ellipse geometry, add `time_start`, `time_end` properties

#### TIMETEXT
- **Format**: `;TIMETEXT: SYMBOL TIMESTAMP LAT LON TEXT`
- **Geometry**: Point
- **Notes**: Text label at specific time, similar to TEXT but with timestamp
- **Decision**: Extend TEXT pattern with timestamp property

#### PERIODTEXT
- **Format**: `;PERIODTEXT: SYMBOL START_DATE START_TIME END_DATE END_TIME LAT LON TEXT`
- **Geometry**: Point
- **Notes**: Text label visible during time range
- **Decision**: Point with `time_start`, `time_end`, `text` properties

#### WHEEL
- **Format**: `;WHEEL: SYMBOL LAT LON INNER_RADIUS OUTER_RADIUS`
- **Geometry**: Polygon with hole (annular region)
- **Notes**: Radii in meters, forms donut shape
- **Decision**: Generate two rings with opposite winding for GeoJSON hole

### Phase 3 Shapes (Specialized)

#### DYNAMIC_RECT
- **Format**: `;DYNAMIC_RECT: SYMBOL "GROUP_NAME" TIMESTAMP LAT1 LON1 LAT2 LON2 LAT3 LON3 LAT4 LON4`
- **Geometry**: Polygon (4 vertices)
- **Notes**: Millisecond precision (HHMMSS.SSS), quoted group name
- **Decision**: Parse as individual features, include `group_name` for future animation

#### DYNAMIC_CIRCLE
- **Format**: `;DYNAMIC_CIRCLE: SYMBOL "GROUP_NAME" TIMESTAMP LAT LON RADIUS`
- **Geometry**: Polygon (circle approximation)
- **Notes**: Same timestamp precision and grouping as DYNAMIC_RECT
- **Decision**: Reuse `_approximate_circle()`, add group_name and timestamp

#### DYNAMIC_POLY
- **Format**: `;DYNAMIC_POLY: SYMBOL "GROUP_NAME" TIMESTAMP N LAT1 LON1 ... LATN LONN`
- **Geometry**: Polygon
- **Notes**: Variable vertex count, millisecond timestamps
- **Decision**: Similar to POLY but with group_name and timestamp

#### SENSOR
- **Format**: `;SENSOR: SYMBOL "TRACK_ID" LAT LON BEARING RANGE SENSOR_TYPE`
- **Geometry**: LineString (from observer to contact)
- **Notes**:
  - Bearing in degrees, range in meters
  - SENSOR_TYPE is a quoted string
  - Creates line from position + bearing/range calculation
- **Decision**: Calculate endpoint using bearing/range, return LineString

#### SENSOR2
- **Format**: `;SENSOR2: SYMBOL TRACK_ID LAT LON BEARING RANGE FREQUENCY SPEED DEPTH`
- **Geometry**: LineString
- **Notes**:
  - Unquoted track name
  - Additional fields may be NULL
  - Verify field positions in real data
- **Decision**: Parse with null handling, same geometry as SENSOR

#### TMA_POS
- **Format**: `;TMA_POS: SYMBOL TIMESTAMP LAT LON ORIENTATION SEMI_MAJOR SEMI_MINOR COURSE SPEED DEPTH`
- **Geometry**: Polygon (ellipse)
- **Notes**: Target motion analysis solution point with uncertainty ellipse
- **Decision**: Reuse `_approximate_ellipse()`, add solution properties

#### TMA_RB
- **Format**: `;TMA_RB: SYMBOL TIMESTAMP OWNSHIP_LAT OWNSHIP_LON BEARING RANGE`
- **Geometry**: LineString
- **Notes**: Range/bearing fix from ownship to calculated target position
- **Decision**: Calculate endpoint, return LineString with bearing/range properties

#### TRACKSPLIT
- **Format**: `;TRACKSPLIT TRACK_ID TIMESTAMP`
- **Geometry**: null
- **Notes**:
  - No colon after keyword (unique among annotations)
  - Metadata-only marker for track separation
- **Decision**: Return Feature with null geometry, track_id in properties

## Technical Decisions

### Ellipse Approximation Algorithm

**Decision**: Parametric ellipse with rotation matrix

**Rationale**: Need to handle arbitrary orientation (0-360°) and semi-axes in meters

**Algorithm**:
```python
def _approximate_ellipse(center_lon, center_lat, semi_major_m, semi_minor_m, orientation_deg, num_points=32):
    # 1. Convert meters to degrees at center latitude
    meters_per_degree_lat = 111320
    meters_per_degree_lon = 111320 * cos(radians(center_lat))

    # 2. Generate base ellipse points (not rotated)
    for i in range(num_points + 1):
        angle = 2 * pi * i / num_points
        x = semi_major_m * cos(angle) / meters_per_degree_lon
        y = semi_minor_m * sin(angle) / meters_per_degree_lat

        # 3. Apply rotation matrix
        rot_rad = radians(orientation_deg)
        x_rot = x * cos(rot_rad) - y * sin(rot_rad)
        y_rot = x * sin(rot_rad) + y * cos(rot_rad)

        # 4. Translate to center
        lon = center_lon + x_rot
        lat = center_lat + y_rot
```

**Alternatives considered**:
- Shapely buffer + affine transform: Would add dependency, overkill for simple approximation
- Pre-computed lookup table: Less flexible, minor performance gain not needed

### Wheel (Annular) Polygon

**Decision**: GeoJSON Polygon with two rings, opposite winding

**Rationale**: GeoJSON spec requires exterior ring counter-clockwise, holes clockwise

**Implementation**:
```python
outer_ring = _approximate_circle(center, outer_radius)  # CCW
inner_ring = _approximate_circle(center, inner_radius)[::-1]  # Reversed for CW
coordinates = [outer_ring, inner_ring]
```

### Dynamic Shape Grouping

**Decision**: Parse as individual features, store group_name in properties

**Rationale**:
- Simplifies parser (each line → one feature)
- Enables future time-animation without re-parsing
- Allows filtering/grouping in downstream consumers

**Alternative rejected**: Merge same-name shapes into MultiPolygon
- Rejected because: Loses temporal information, complicates parser state management

### Timestamp Precision for Dynamic Shapes

**Decision**: Store milliseconds as decimal seconds in ISO 8601 format

**Rationale**: HHMMSS.SSS format needs millisecond precision, ISO 8601 supports fractional seconds

**Example**: `091523.456` → `2024-01-15T09:15:23.456Z`

### Storybook Fixture Pipeline

**Decision**: Python script generates static JSON, checked into repo

**Rationale**:
- Works offline (no Python runtime needed for Storybook)
- Version controlled (visible changes to fixture)
- Fast Storybook startup (no generation step)

**Alternative rejected**: Generate at Storybook build time
- Rejected because: Requires Python in Node build environment, complicates CI

### Schema Extension Pattern

**Decision**: Follow existing annotation schema pattern with discriminator

**Example for EllipseAnnotation**:
```yaml
EllipseAnnotation:
  is_a: GeoJSONFeature
  description: Ellipse shape annotation
  attributes:
    kind:
      equals_string: ELLIPSE
    center:
      range: Position
    semi_major:
      range: float
    semi_minor:
      range: float
    orientation:
      range: float
    timestamp:
      range: datetime
    style:
      range: PolygonProperties
```

## Open Questions (Resolved)

### Q1: SENSOR2 field positions
**Resolution**: Based on format documentation, fields are: SYMBOL TRACK_ID LAT LON BEARING RANGE FREQUENCY SPEED DEPTH. NULL handling required for optional fields.

### Q2: TRACKSPLIT colon handling
**Resolution**: Parser already handles prefix extraction; `_extract_content_after_prefix()` handles both colon and space-only cases.

### Q3: Ellipse orientation convention
**Resolution**: 0° = North, clockwise positive. Standard nautical/maritime convention.

## Dependencies Verified

| Dependency | Version | Purpose | Verified |
|------------|---------|---------|----------|
| debrief-io | workspace | Shape builders | ✓ Patterns in builders.py |
| debrief-schemas | workspace | LinkML definitions | ✓ annotations.yaml exists |
| react-leaflet | v5+ | Map rendering | ✓ MapView.tsx uses GeoJSON component |
| Storybook | 8.x | Visual testing | ✓ .storybook/main.ts configured |
