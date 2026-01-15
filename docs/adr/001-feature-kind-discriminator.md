# ADR-001: Feature Kind Discriminator

**Status**: Accepted
**Date**: 2026-01-15
**Deciders**: Debrief development team

## Context

Debrief stores maritime analysis data as GeoJSON Features. Different feature types (tracks, reference points, annotations, measurements) require different property schemas and different handling in tools and UI.

GeoJSON's built-in `type` field only indicates the geometry type (`Point`, `LineString`, `Polygon`), not the semantic type. A `LineString` could be:
- A vessel track
- A user-drawn annotation
- A range/bearing measurement
- A sensor coverage arc

Without a reliable discriminator, code must infer feature type by checking for the presence of type-specific fields (e.g., "does it have `track_type`? then it's a track"). This is fragile and scales poorly as feature types grow.

## Decision

Add a required `kind` field to the `properties` object of all GeoJSON Features. The field uses a controlled enum (`FeatureKindEnum`) with values that map 1:1 to property schemas.

Initial values:
- `TRACK` — Vessel track (uses `TrackProperties`)
- `POINT` — Reference location (uses `ReferenceLocationProperties`)

The `kind` field is:
- **Required** on all features
- **Constrained** to match the expected value for each property schema (e.g., `TrackProperties.kind` must equal `"TRACK"`)
- **First field** in properties by convention (for quick visual identification)

## Alternatives Considered

### A. Geometry-based inference
Infer type from geometry: `LineString` = track, `Point` = reference.

**Rejected**: Ambiguous. Multiple semantic types share geometry types. Would require secondary checks anyway.

### B. Check for type-specific fields
If `track_type` exists, it's a track. If `location_type` exists, it's a reference.

**Rejected**: Current approach. Requires checking multiple fields. Breaks if field names overlap or become optional. No single dispatch point.

### C. Hierarchical category + subtype
Two-level structure: `category: "TRACK"`, `subtype: "OWNSHIP"`.

**Rejected**: Over-engineered for current needs. The existing per-type enums (`track_type`, `location_type`) already serve as subtypes. A unified category adds complexity without clear benefit.

### D. Wrapper object instead of properties field
`{ "kind": "TRACK", "data": { ...track properties } }`

**Rejected**: Breaks GeoJSON conventions. Properties are expected at `feature.properties`, not nested. Would confuse standard GeoJSON tooling.

## Consequences

### Positive
- **Single-field dispatch**: Check `properties.kind` to determine handling
- **Schema validation**: Each `kind` maps to exactly one properties schema
- **Clear extension point**: Adding new feature types = adding enum value + schema
- **Self-documenting**: Features declare their type explicitly

### Negative
- **Required on all features**: No gradual adoption; all features must include `kind`
- **Schema coupling**: `kind` value must match the schema's `equals_string` constraint
- **Migration burden**: Existing data (if any) needs `kind` added

### Neutral
- Existing type-specific enums (`track_type`, `location_type`) remain unchanged; they serve as subtypes within each kind

## Implementation

1. Add `FeatureKindEnum` to `common.yaml` with initial values
2. Add `kind` field to each `*Properties` class with `equals_string` constraint
3. Update test fixtures
4. Regenerate all schema artifacts
5. Update parsers (e.g., REP handler) to emit `kind`

## Adding New Feature Kinds

When adding a new feature type:

1. Add value to `FeatureKindEnum` in `common.yaml`
2. Create `NewTypeProperties` class in `geojson.yaml` with `kind` constrained to new value
3. Create `NewTypeFeature` class referencing the properties
4. Add valid/invalid test fixtures
5. Regenerate artifacts
6. Update `data-model.md` with new entity documentation

## References

- GeoJSON RFC 7946: https://tools.ietf.org/html/rfc7946
- LinkML `equals_string` constraint: https://linkml.io/linkml/schemas/constraints.html
