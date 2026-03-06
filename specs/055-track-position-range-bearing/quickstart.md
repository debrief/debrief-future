# Quickstart: Track-Position to Track Range/Bearing Tool Spec

**Feature**: 055-track-position-range-bearing | **Date**: 2026-02-17

## What This Feature Produces

This feature creates a **tool specification** (not code). The deliverables are:

1. A markdown tool spec at `shared/tools/track/measurement/position-range-bearing.1.0.md`
2. Golden I/O example JSON files in the same directory

## Directory Layout

```
shared/tools/track/measurement/
├── position-range-bearing.1.0.md                        # The tool specification
├── position-range-bearing.basic.input.json              # Golden input: basic temporal match
├── position-range-bearing.basic.output.json             # Golden output: range + bearing result
├── position-range-bearing.single-position.input.json    # Golden input: single-position track
└── position-range-bearing.single-position.output.json   # Golden output: forced match
```

## Template to Follow

The spec follows `shared/tools/TEMPLATE.md` with these 9 required sections:

1. **Metadata** (YAML front matter): `name: position-range-bearing`, `version: 1.0`, `category: track/measurement`, `status: draft`
2. **MCP**: LLM description, when to use, parameters, returns
3. **Inputs**: Schema reference to FeatureCollection with 2 tracks + selected_position_index
4. **Outputs**: ToolResponse with `artifact/measurement/position_range_bearing` result type
5. **Algorithm**: Pseudocode for temporal matching + Haversine distance + initial bearing
6. **Edge Cases**: Table covering empty track, single-position track, identical coordinates, equidistant timestamps, invalid index
7. **Examples**: Inline examples + references to golden fixture files
8. **Changelog**: Version 1.0 initial release
9. **References**: Links to range-calc, bearing-calc, range_bearing.py, #053 nested child selection

## Key Algorithm

The core operation has two steps:

### Step 1: Temporal Matching (Snap-to-Nearest)

```
selected_time = features[0].properties.times[selected_position_index]

best_index = 0
best_delta = |features[1].properties.times[0] - selected_time|

For i = 1 to length(features[1].properties.times) - 1:
    delta = |features[1].properties.times[i] - selected_time|
    If delta < best_delta:
        best_index = i
        best_delta = delta
    // On tie (delta == best_delta), keep earlier index (lower i)

matched_coordinates = features[1].geometry.coordinates[best_index]
matched_time = features[1].properties.times[best_index]
```

### Step 2: Range and Bearing Calculation

```
# Haversine distance (returns nautical miles)
lon1, lat1 = selected_coordinates
lon2, lat2 = matched_coordinates

lat1_rad, lat2_rad = lat1 * π/180, lat2 * π/180
dlat = (lat2 - lat1) * π/180
dlon = (lon2 - lon1) * π/180

a = sin(dlat/2)² + cos(lat1_rad) * cos(lat2_rad) * sin(dlon/2)²
c = 2 * asin(√a)
range_nm = c * 3440.065  (Earth radius in nm)

# Initial bearing (forward azimuth)
x = sin(dlon_rad) * cos(lat2_rad)
y = cos(lat1_rad) * sin(lat2_rad) - sin(lat1_rad) * cos(lat2_rad) * cos(dlon_rad)
bearing = atan2(x, y)
bearing_deg = (bearing * 180/π + 360) mod 360
```

## Verification

After creating the spec, verify:

- [ ] All 9 sections present and non-empty
- [ ] Golden input JSON is valid GeoJSON FeatureCollection with 2 track features
- [ ] Golden output JSON is valid ToolResponse format with `artifact/measurement/position_range_bearing` result type
- [ ] Algorithm pseudocode covers temporal matching + range + bearing
- [ ] Edge cases table has 5+ entries
- [ ] Provenance label includes range value, bearing value, and source/matched position identifiers
- [ ] Result type is `artifact/measurement/position_range_bearing`
- [ ] Snap-to-nearest semantics documented (no interpolation)
- [ ] Tiebreaker rule for equidistant timestamps is specified (earlier index wins)
