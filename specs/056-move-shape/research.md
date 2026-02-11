# Research: Move Shape Tool Spec

**Feature**: 056-move-shape | **Date**: 2026-02-10

## Research Questions

### R1: What category path should the tool spec use?

**Decision**: `shape/manipulation`

**Rationale**: Existing tool specs use `{domain}/{subcategory}` — e.g., `track/styling`, `track/analysis`, `track/measurement`. The `shape` domain is new and covers annotation geometry operations. `manipulation` groups tools that modify shape geometry (translate, rotate, scale). This leaves room for future siblings like `rotate-shape`, `scale-shape`.

**Alternatives considered**:
- `annotation/manipulation` — too broad, conflates annotation properties with geometry
- `shape/movement` — "movement" implies continuous motion; "manipulation" better captures discrete transformations
- `geometry/translation` — too generic, doesn't tie to the Debrief domain vocabulary

### R2: Which great-circle formula to specify?

**Decision**: Vincenty destination formula (spherical approximation)

**Rationale**: The spec requires great-circle math. The Vincenty direct formula computes a destination point given start, bearing, and distance on a sphere of radius R. This is the standard approach used in maritime navigation and matches the formula already documented in the feature spec.

```
lat2 = asin(sin(lat1) * cos(d/R) + cos(lat1) * sin(d/R) * cos(bearing))
lon2 = lon1 + atan2(sin(bearing) * sin(d/R) * cos(lat1), cos(d/R) - sin(lat1) * sin(lat2))
```

Where R = 6371.0 km (mean Earth radius).

**Alternatives considered**:
- Haversine distance formula — computes distance between two points, not destination; wrong direction
- Vincenty ellipsoidal formula — higher accuracy but significantly more complex; overkill for annotation repositioning at km-scale distances
- Planar projection — violates FR-002; unacceptable distortion at high latitudes

### R3: What result type path should the tool use?

**Decision**: `mutation/shape/translated`

**Rationale**: Following the ToolResponse naming convention from #041:
- Top type: `mutation` — modifying existing features (not creating new ones)
- Domain: `shape` — geometric annotation operations
- Specific type: `translated` — result of translation operation

This follows the established pattern (e.g., `mutation/track/styled`, `mutation/track/smoothed`).

**Alternatives considered**:
- `mutation/annotation/translated` — "annotation" is broader than "shape"; the tool operates on shape geometry
- `mutation/shape/moved` — "moved" is less precise than "translated" (translation is the geometric term)

### R4: How should the tool handle non-annotation features in a mixed FeatureCollection?

**Decision**: Skip non-annotation features silently, process only annotation kinds.

**Rationale**: Consistent with existing tool patterns (e.g., `set-track-color` skips non-track features). Users may pass a mixed FeatureCollection containing both tracks and annotations. The tool should process what it can and ignore the rest.

If the collection contains zero processable features after filtering, return an error with `invalid_input` category.

**Alternatives considered**:
- Error on any non-annotation feature — too strict; breaks natural workflows
- Include non-annotation features unchanged in output — pollutes the mutation response

### R5: What golden I/O examples are needed?

**Decision**: Two golden example pairs (minimum from SC-002):

1. **`move-shape.basic-polygon.{input,output}.json`** — A CircleAnnotation translated East by 5 km. Validates polygon vertex shifting and `center` property update.

2. **`move-shape.vector.{input,output}.json`** — A VectorAnnotation translated North by 10 km. Validates `origin` property update while preserving `range` and `bearing`.

**Rationale**: These two examples cover the two most complex annotation kinds (circle with `center` property, vector with `origin`/`range`/`bearing`). Simpler kinds (RECTANGLE, LINE, TEXT) are subsets of the polygon/vector logic.

### R6: How should longitude wrapping at the antimeridian be handled?

**Decision**: Normalise longitude to [-180, 180] after computing the destination point.

**Rationale**: The Vincenty formula naturally produces longitudes outside [-180, 180] when crossing the antimeridian. A simple normalisation step handles this:

```
lon = ((lon + 180) mod 360) - 180
```

This is the standard GeoJSON approach (RFC 7946 recommends [-180, 180] for most use cases).

**Alternatives considered**:
- Splitting polygons at the antimeridian — far too complex for a move operation; belongs to a rendering layer
- Using [0, 360] range — non-standard for GeoJSON

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| #049 Tool documentation model | Complete | Template at `shared/tools/TEMPLATE.md` |
| LinkML annotation schemas | Complete | `shared/schemas/src/linkml/annotations.yaml` |
| ToolResponse data model | Complete | `specs/041-document-tool-results/data-model.md` |
| FeatureKindEnum | Complete | `shared/schemas/src/linkml/common.yaml` |

## Open Questions

None — all research questions resolved.
