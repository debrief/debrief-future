# Schema Change Contract: Compound Track Model

**Feature**: 062-missing-feature-kind-enum-values
**Date**: 2026-02-08

## Changes to `common.yaml`

### New Enum: SegmentTypeEnum

```yaml
SegmentTypeEnum:
  description: Discriminator for track segment types within compound tracks
  permissible_values:
    TRACK:
      description: Plain recorded track segment
    ABSOLUTE_TMA:
      description: Target Motion Analysis leg with absolute geographic coordinates
    RELATIVE_TMA:
      description: Target Motion Analysis leg relative to ownship position
    DYNAMIC_INFILL:
      description: Interpolated segment between TMA legs
```

## Changes to `geojson.yaml`

### New Class: GeoJSONMultiLineString

```yaml
GeoJSONMultiLineString:
  description: GeoJSON MultiLineString geometry for compound tracks
  attributes:
    type:
      range: string
      required: true
      equals_string: "MultiLineString"
    coordinates:
      description: Array of LineString coordinate arrays
      range: float
      multivalued: true
      required: true
```

### New Class: SegmentMetadata

Per-segment metadata for compound tracks. Full field listing in data-model.md.

### New Class: SensorData

Named sensor with contacts array. Full field listing in data-model.md.

### New Class: SensorContact

Single sensor measurement record. Full field listing in data-model.md.

### New Class: TUAData

Named TUA solution collection. Full field listing in data-model.md.

### New Class: TUASolution

Single TUA estimate. Full field listing in data-model.md.

### Modified Class: TrackFeature

```yaml
# geometry field changes from:
geometry:
  range: GeoJSONLineString
  required: true

# to:
geometry:
  description: Track path as LineString (simple) or MultiLineString (compound)
  required: true
  any_of:
    - range: GeoJSONLineString
    - range: GeoJSONMultiLineString
```

### Modified Class: TrackProperties

Three new optional fields added:

```yaml
# New fields on TrackProperties:
segments:
  description: >-
    Per-segment metadata for compound tracks. When present, geometry MUST
    be MultiLineString and segments[i] describes coordinates[i]. When
    absent, geometry is LineString and the flat positions array is used.
  range: SegmentMetadata
  multivalued: true
  inlined_as_list: true

sensors:
  description: >-
    Embedded sensor data associated with this track. Each sensor contains
    named metadata and an array of contact measurements. Sensors have no
    independent geometry.
  range: SensorData
  multivalued: true
  inlined_as_list: true

tuas:
  description: >-
    Embedded Target Uncertainty Area data associated with this track.
    Each TUA entry is a named collection of time-indexed solutions.
    TUAs have no independent geometry.
  range: TUAData
  multivalued: true
  inlined_as_list: true
```

## Backward Compatibility

| Aspect | Impact |
|--------|--------|
| Existing TrackFeature (LineString) | No change — still valid. All new fields are optional. |
| Existing golden fixtures | No change required — all pass without modification. |
| Existing Pydantic usage | No change — new fields are `Optional` with default `None`. |
| Existing TypeScript types | Additive — new optional fields appear in generated types. |
| FeatureKindEnum | Unchanged — no new values added. |

## Generated Output Changes

After `make generate`:

| File | Change |
|------|--------|
| `python/debrief_schemas/__init__.py` | New classes: GeoJSONMultiLineString, SegmentMetadata, SensorData, SensorContact, TUAData, TUASolution. Modified: TrackFeature (geometry union), TrackProperties (new fields). New enum: SegmentTypeEnum. |
| `json-schema/TrackFeature.schema.json` | Updated with anyOf geometry, new property definitions |
| `json-schema/debrief.schema.json` | Full schema updated with all new definitions |
| `typescript/types.ts` | New interfaces + updated TrackFeature/TrackProperties |
