# Specification: Add Remaining Shape Type Importers with Storybook Verification

**Backlog Item**: 020
**Category**: Infrastructure
**Status**: specified
**Complexity**: Low

## Overview

Implement parsing for all remaining REP annotation shape types (Phase 2 and Phase 3) and create a Storybook-based verification pipeline to visually confirm correct rendering.

## Background

The REP file parser currently handles Phase 1 shapes (CIRCLE, RECT, LINE, VECTOR, TEXT, NARRATIVE). Phase 2 and Phase 3 shapes have stub implementations that return `None`. This work completes the annotation parsing capability and adds visual verification via Storybook.

### Current State

**Implemented (Phase 1):**
- NARRATIVE, NARRATIVE2 - Timestamped log entries
- CIRCLE - Circular regions (32-point polygon approximation)
- RECT - Rectangular regions
- LINE - Line segments
- TEXT - Text labels
- VECTOR - Range/bearing vectors

**Stub implementations returning None:**
- Phase 2: POLY, POLYLINE, ELLIPSE, ELLIPSE2, TIMETEXT, PERIODTEXT, WHEEL
- Phase 3: DYNAMIC_RECT, DYNAMIC_CIRCLE, DYNAMIC_POLY, SENSOR, SENSOR2, TMA_POS, TMA_RB, TRACKSPLIT

## Requirements

### R1: Phase 2 Shape Implementations

Implement builders in `services/io/src/debrief_io/handlers/annotations/builders.py` for:

| Shape | Geometry | Key Properties |
|-------|----------|----------------|
| POLY | Polygon | vertices (auto-close), label |
| POLYLINE | LineString | vertices (open), label |
| ELLIPSE | Polygon | center, semi_major, semi_minor, orientation, timestamp |
| ELLIPSE2 | Polygon | center, semi_major, semi_minor, orientation, time_start, time_end |
| TIMETEXT | Point | text, timestamp |
| PERIODTEXT | Point | text, time_start, time_end |
| WHEEL | Polygon (with hole) | center, inner_radius, outer_radius |

### R2: Phase 3 Shape Implementations

| Shape | Geometry | Key Properties |
|-------|----------|----------------|
| DYNAMIC_RECT | Polygon | group_name, vertices, timestamp (millisecond precision) |
| DYNAMIC_CIRCLE | Polygon | group_name, center, radius, timestamp |
| DYNAMIC_POLY | Polygon | group_name, vertices, timestamp |
| SENSOR | LineString | track_id, symbol, bearing, range, sensor_type |
| SENSOR2 | LineString | track_id, bearing, range, frequency, speed, depth (nullable fields) |
| TMA_POS | Polygon (ellipse) | position, orientation, semi_major, semi_minor, course, speed, depth |
| TMA_RB | LineString | ownship_position, bearing, range |
| TRACKSPLIT | null | track_id, metadata only |

### R3: LinkML Schema Extensions

Add schema definitions to `shared/schemas/src/linkml/annotations.yaml` for new shape types following the established pattern:
- `kind` discriminator field
- `style` property with appropriate styling class
- `symbol` field for original Debrief code
- Shape-specific properties (axes, radii, time ranges, etc.)

### R4: Storybook Verification Story

Create a Storybook story that:
1. Loads a pre-generated GeoJSON FeatureCollection containing all shape types
2. Renders shapes on a MapView component
3. Allows visual verification of correct parsing and rendering

**Story location**: `shared/components/src/MapView/ShapeTypes.stories.tsx`

### R5: GeoJSON Fixture Generation Pipeline

Create a mechanism to generate test GeoJSON from REP files for Storybook:

1. **Test fixture file**: `services/io/tests/fixtures/valid/all-shapes.rep`
   - Contains examples of every shape type with varied styling

2. **Generation script**: `services/io/scripts/generate-storybook-fixtures.py`
   - Runs the REP importer on test fixtures
   - Outputs GeoJSON FeatureCollection to `shared/components/src/fixtures/`

3. **Storybook fixture**: `shared/components/src/fixtures/all-shapes.geojson`
   - Static JSON file loaded by Storybook story
   - Regenerated via script when parser changes

### R6: Pnpm Script Integration

Add script to `shared/components/package.json`:
```json
{
  "scripts": {
    "generate:fixtures": "python ../services/io/scripts/generate-storybook-fixtures.py"
  }
}
```

## Implementation Notes

### Ellipse Generation

Use the existing `_approximate_circle()` pattern but with separate x/y radii:
```python
def _approximate_ellipse(center_lon, center_lat, semi_major_m, semi_minor_m, orientation_deg, num_points=32):
    """Generate polygon vertices approximating a rotated ellipse."""
    # Convert meters to degrees at center latitude
    # Apply rotation matrix for orientation
    # Generate points around ellipse perimeter
```

### Wheel (Annular) Generation

Generate two rings with opposite winding order:
- Outer ring: counter-clockwise (polygon exterior)
- Inner ring: clockwise (hole)

```python
def _build_wheel(parts, source_file, line_number):
    outer_ring = _approximate_circle(center, outer_radius)
    inner_ring = _approximate_circle(center, inner_radius)[::-1]  # Reverse for hole
    return {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": [outer_ring, inner_ring]
        }
    }
```

### Dynamic Shapes Grouping

Dynamic shapes (DYNAMIC_RECT, DYNAMIC_CIRCLE, DYNAMIC_POLY) with the same `group_name` represent a single feature at different times. For this phase:
- Parse each entry as separate Feature
- Include `group_name` in properties for future time-animation support

### TRACKSPLIT Handling

TRACKSPLIT has null geometry (metadata only). Return Feature with:
```python
{
    "type": "Feature",
    "geometry": None,
    "properties": {
        "kind": "TRACKSPLIT",
        "track_id": "...",
        ...
    }
}
```

## Test Plan

### Unit Tests

1. **Parser tests** for each new shape type in `services/io/tests/test_annotations/`
   - Valid input parsing
   - Property extraction (coordinates, radii, timestamps)
   - Symbology handling
   - Edge cases (minimum vertices, null fields)

2. **Schema validation tests** in `shared/schemas/tests/`
   - Generated GeoJSON validates against JSON Schema
   - Round-trip: Python → JSON → TypeScript → JSON → Python

### Integration Tests

1. **Full file parsing** with `all-shapes.rep` containing all types
2. **Storybook visual test** - shapes render correctly on map

### Visual Verification Checklist

The Storybook story should display:
- [ ] POLY - Closed polygon with fill
- [ ] POLYLINE - Open line without fill
- [ ] ELLIPSE - Rotated ellipse shape
- [ ] ELLIPSE2 - Same as ELLIPSE visually
- [ ] TIMETEXT - Point with label
- [ ] PERIODTEXT - Point with label
- [ ] WHEEL - Donut shape (ring with hole)
- [ ] DYNAMIC_* - Individual shapes (grouping in properties)
- [ ] SENSOR - Line from observer to contact
- [ ] SENSOR2 - Same as SENSOR visually
- [ ] TMA_POS - Ellipse with solution metadata
- [ ] TMA_RB - Line from ownship to target
- [ ] TRACKSPLIT - Not rendered (null geometry)

## Files to Modify/Create

### Modify
- `services/io/src/debrief_io/handlers/annotations/builders.py` - Shape builder implementations
- `shared/schemas/src/linkml/annotations.yaml` - Schema definitions
- `shared/components/package.json` - Add fixture generation script

### Create
- `services/io/tests/fixtures/valid/all-shapes.rep` - Comprehensive test file
- `services/io/scripts/generate-storybook-fixtures.py` - Fixture generator
- `shared/components/src/fixtures/all-shapes.geojson` - Generated fixture
- `shared/components/src/MapView/ShapeTypes.stories.tsx` - Verification story

## Dependencies

- Existing Phase 1 implementation patterns in `builders.py`
- `_approximate_circle()` helper for polygon generation
- MapView component and Storybook configuration
- Symbol parsing in `symbols.py` and `symbology.py`

## Out of Scope

- Time animation for dynamic shapes (future work)
- Sensor contact correlation with tracks (future work)
- TMA solution rendering with uncertainty bounds (future work)

## Acceptance Criteria

1. All Phase 2 and Phase 3 shape builders return valid GeoJSON Features (not None)
2. Generated GeoJSON validates against LinkML-generated JSON Schema
3. Storybook story renders all shape types visually
4. `pnpm run generate:fixtures` successfully creates `all-shapes.geojson`
5. All existing tests continue to pass
6. New unit tests cover each shape type
