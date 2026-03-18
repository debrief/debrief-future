# buffer-zone-generator v1.0

## 1. Metadata

| Field | Value |
|-------|-------|
| Name | buffer-zone-generator |
| Version | 1.0.0 |
| Category | sensor/detection |
| Status | active |
| Context Type | SINGLE |
| Input Kinds | TRACK |
| Output Kind | addition/feature |
| Language | Python 3.11+ |
| Dependencies | stdlib math only |

## 2. MCP

```yaml
name: buffer-zone-generator
description: >
  Generate detection likelihood buffer zones around a track using a sensor model.
  Returns a single MultiPolygon feature with 3 concentric zones at increasing
  distances, styled purple/red/orange. Default zones are at 3nm (75%), 6nm (50%),
  and 12nm (25%). Distances can be overridden via parameters.
```

## 3. Inputs

### Selection Context

- **Type**: `SINGLE` — exactly one feature required in context
- **Feature Kind**: `TRACK` with LineString geometry
- **Coordinates**: `[longitude, latitude, altitude, timestamp_ms]` tuples

### Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| interval | enum | No | large | Zone spacing preset: small (1/2/4 nm), medium (2/4/8 nm), large (3/6/12 nm) |
| distance_1_nm | number | No | (from interval/sensor model) | Innermost buffer distance in nautical miles (overrides interval) |
| distance_2_nm | number | No | (from interval/sensor model) | Middle buffer distance in nautical miles (overrides interval) |
| distance_3_nm | number | No | (from interval/sensor model) | Outermost buffer distance in nautical miles (overrides interval) |

### Interval Presets

| Interval | distance_1 | distance_2 | distance_3 |
|----------|-----------|-----------|-----------|
| small    | 1 nm      | 2 nm      | 4 nm      |
| medium   | 2 nm      | 4 nm      | 8 nm      |
| large    | 3 nm      | 6 nm      | 12 nm     |

### Constraints

- At least one feature with `properties.kind == "TRACK"` must be present
- Track must have at least 1 coordinate position
- All distances must be > 0
- Non-track features are silently skipped

## 4. Outputs

### Result Type

`addition/feature` — new features added to the plot.

### Output Feature

A single GeoJSON Feature with `MultiPolygon` geometry containing 3 concentric zone polygons
(ordered innermost to outermost). This enables downstream tools to treat the zones as one entity.

| Property | Type | Description |
|----------|------|-------------|
| kind | "ZONE" | Feature kind identifier |
| name | string | Composite label (e.g., "Detection Zones (75%, 50%, 25%)") |
| zones | array | Per-ring metadata (see below) |
| debrief:resultType | string | "addition/feature" |
| debrief:sourceFeatures | string[] | Source track feature IDs |
| debrief:label | string | Human-readable provenance label |

Each entry in the `zones` array:

| Field | Type | Description |
|-------|------|-------------|
| name | string | Zone label (e.g., "75%") |
| detection_likelihood_pct | int | Detection probability (1-100) |
| buffer_distance_nm | float | Distance from track in nm |
| style | object | Per-ring display style (color, fill_color, fill_opacity, weight, dash_array) |

Default zone styles (by index):
- **Inner (0)**: purple `#9C27B0`, fill opacity 0.25
- **Middle (1)**: red `#F44336`, fill opacity 0.18
- **Outer (2)**: orange `#FF9800`, fill opacity 0.12

### Geometry

- Type: `MultiPolygon`
- 3 sub-polygons, each with a single exterior ring (no holes)
- Rings are closed (first coordinate == last coordinate)
- Coordinates: `[longitude, latitude]` pairs

## 5. Algorithm

```
FUNCTION buffer_zone_generator(context, params, sensor_model=StubSensorModel):
  1. FIND first feature with kind="TRACK" in context.features
     - If none found, RAISE "No track features found in input"

  2. EXTRACT track coordinates from geometry.coordinates
     - If empty, RAISE "Track has no coordinates"

  3. GET zone definitions from sensor_model.get_detection_zones(track)
     - Default stub returns: [{3nm, 75%, "75%"}, {6nm, 50%, "50%"}, {12nm, 25%, "25%"}]

  3b. IF interval parameter is set:
     a. LOOKUP distances from INTERVAL_PRESETS[interval]
     b. REPLACE zone distances with preset values (preserve likelihood/name)

  4. IF any distance_*_nm parameter is set (overrides interval):
     a. Override corresponding zone distance (fallback to sensor model default)
     b. VALIDATE all distances > 0, else RAISE "All buffer distances must be positive"
     c. SORT distances ascending
     d. Pair highest likelihood with smallest distance

  5. FOR each zone definition (ordered by ascending distance):
     a. CALL generate_buffer_polygon(track_coords, zone.distance_nm)
     b. ADD polygon ring to MultiPolygon coordinates
     c. BUILD zone metadata entry with per-ring style

  6. BUILD single GeoJSON Feature with MultiPolygon geometry
     a. ATTACH zone metadata array and provenance annotations

  7. RETURN list containing the single MultiPolygon feature

FUNCTION generate_buffer_polygon(track_coords, distance_nm):
  1. CONVERT distance: distance_km = distance_nm × 1.852

  2. CHECK antimeridian: if longitude range > 180°, use shifted coordinates

  3. FOR each track coordinate [lon, lat, ...]:
     FOR bearing IN [0°, 10°, 20°, ..., 350°]:
       COMPUTE offset point using Vincenty destination formula
       ADD to point cloud

  4. COMPUTE convex hull of point cloud (Andrew's monotone chain)

  5. CLOSE the ring (append first point)

  6. RETURN polygon ring as [[lon, lat], ...]

FUNCTION translate_point(lat_deg, lon_deg, bearing_deg, distance_km):
  # Vincenty destination formula (spherical approximation)
  lat1 = radians(lat_deg)
  lon1 = radians(lon_deg)
  brng = radians(bearing_deg)
  d = distance_km / 6371.0  # Earth radius in km

  lat2 = asin(sin(lat1)×cos(d) + cos(lat1)×sin(d)×cos(brng))
  lon2 = lon1 + atan2(sin(brng)×sin(d)×cos(lat1),
                       cos(d) - sin(lat1)×sin(lat2))

  RETURN (degrees(lat2), normalise_lon(degrees(lon2)))
```

## 6. Edge Cases

| Case | Behaviour |
|------|-----------|
| Empty feature list | Raise ValueError: "No track features found in input" |
| No TRACK features | Raise ValueError: "No track features found in input" |
| Mixed features (TRACK + others) | Skip non-TRACK, process first TRACK |
| Single-point track | Generate circular zones (36-vertex polygon per zone) |
| Two-point track (segment) | Generate elongated zones around the segment |
| Track crossing antimeridian | Shift longitudes to [0, 360] during computation, normalise back to [-180, 180] |
| Very close positions (sub-metre) | Valid zones generated; offset points dominate hull |
| Distance = 0 | Raise ValueError: "All buffer distances must be positive" |
| Distance < 0 | Raise ValueError: "All buffer distances must be positive" |
| Non-ascending custom distances | Automatically sorted ascending |

## 7. Examples

### Golden Example: Basic Track

**Input**: `buffer-zone-generator.basic-track.input.json`
**Output**: `buffer-zone-generator.basic-track.output.json`

A 3-position track in the English Channel. Default distances (3nm, 6nm, 12nm) produce three concentric polygons.

### Inline Example

```python
from debrief_calc.models import ContextType, SelectionContext
from debrief_calc.tools.sensor.detection.buffer_zone_generator import buffer_zone_generator

track = {
    "type": "Feature",
    "id": "track-001",
    "geometry": {
        "type": "LineString",
        "coordinates": [[-4.5, 50.2, 0, 0], [-4.3, 50.25, 0, 3600000]],
    },
    "properties": {"kind": "TRACK", "name": "HMS Example"},
}

context = SelectionContext(type=ContextType.SINGLE, features=[track])
result = buffer_zone_generator(context, {})
# result: [single MultiPolygon Feature with 3 concentric zones at 3nm, 6nm, 12nm]
```

## 8. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.1.0 | 2026-03-06 | Add `interval` parameter (small/medium/large zone spacing presets) |
| 1.0.0 | 2026-02-12 | Initial release — stub sensor model, Vincenty offsetting, convex hull |

## 9. References

- **move-shape** (`tools/shape/manipulation/move_shape.py`) — translate_point formula source
- **#049 Tool Documentation Model** — 9-section format specification
- **#079 Move Track** — upstream tool in E03 cascade
- **#081 Point-in-Zone Classifier** — downstream consumer of zone features
- **Vincenty destination formula** — standard geodetic calculation for point displacement
- **Andrew's monotone chain** — O(n log n) convex hull algorithm
