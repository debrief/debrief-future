# Research: Point-in-Zone Classifier Tool

**Feature**: 081-point-in-zone-classifier
**Date**: 2026-02-17

## Research Questions

### RQ-1: Point-in-Polygon Algorithm Choice

**Decision**: Ray-casting algorithm (even-odd rule)

**Rationale**: The ray-casting algorithm is simple, well-understood, and language-neutral. It works correctly for both convex and concave polygons and has O(n) complexity per point where n is the number of polygon edges. Buffer zone polygons from the buffer-zone-generator are convex hulls, so even simpler algorithms would work, but ray-casting handles all polygon shapes.

**Alternatives considered**:
- **Winding number algorithm**: More robust for self-intersecting polygons, but unnecessary — buffer zones are convex hulls that never self-intersect. Also more complex to implement.
- **Shapely/turf.js library**: Would add external dependencies. Constitution Article IX requires minimal dependencies, and Article I requires offline operation. Pure implementation avoids both concerns.
- **Bounding box pre-filter**: Could optimise by checking bbox before full point-in-polygon. Not worth the complexity for the expected point counts (< 10,000).

### RQ-2: Input Context Type

**Decision**: `ContextType.MULTI` with `input_kinds: ["POINT", "ZONE"]`

**Rationale**: The tool needs exactly two features — one reference point set and one zone set. The MULTI context type allows multiple features. Validation within the tool ensures exactly one POINT/REFERENCE and one ZONE feature.

**Alternatives considered**:
- **Two separate tool calls**: Would require the user to pass features separately. More complex UX and breaks the natural "select both and classify" pattern.
- **ContextType.SINGLE**: Too restrictive — only allows one feature.

### RQ-3: Output Result Type

**Decision**: `mutation/reference/classified_points`

**Rationale**: The classifier modifies the existing reference point feature by adding zone/color metadata. This is a mutation (modifying an existing feature), not an addition (creating new features). The `reference/classified_points` subtype follows the naming convention (lowercase, underscores, two segments).

**Alternatives considered**:
- `addition/reference/classified_points`: Incorrect — we're modifying, not adding.
- `mutation/reference/recolored`: Too vague — "classified" better describes the semantic operation.

### RQ-4: Per-Point Color Representation

**Decision**: `pointColors` array property on the feature, parallel to coordinates.

**Rationale**: A simple array of hex color strings indexed parallel to the MultiPoint coordinates. This is the simplest possible structure for renderers to consume — just `pointColors[i]` for the i-th coordinate. It mirrors the `pointMetadata` parallel array pattern already established by generate-reference-points.

**Alternatives considered**:
- **Feature-level style with color map**: Would require the renderer to look up zones and resolve colors. More complex.
- **Separate colored Point features**: Would break the single-MultiPoint-feature convention and create thousands of features.
- **CSS class-based approach**: Not applicable to GeoJSON/Leaflet rendering.

### RQ-5: Zone Color Source

**Decision**: Read from `zone_feature.properties.zones[i].style.fill_color` (falling back to `.style.color`).

**Rationale**: The buffer-zone-generator stores per-zone styling in the `zones` array metadata. Using the source feature's own colors ensures visual consistency — if zones are regenerated with different colors, the classifier automatically picks up the changes.

**Alternatives considered**:
- **Hardcoded color map**: Fragile — would break if zone colors change.
- **Separate color configuration parameter**: Over-engineering for a tool that should "just work" with its upstream input.

### RQ-6: Antimeridian Handling

**Decision**: Standard ray-casting works for typical analysis areas. Antimeridian-aware wrapping is documented as an edge case but not special-cased in the algorithm.

**Rationale**: Buffer zones are generated from tracks that are typically in a contiguous geographic area. The ray-casting algorithm works correctly as long as the polygon and points are in the same coordinate space. The buffer-zone-generator already handles antimeridian wrapping in its output polygons.

**Alternatives considered**:
- **Shift-and-test approach**: Shift all coordinates to avoid the antimeridian, then shift back. This adds complexity for a scenario that is unlikely in buffer zone analysis.

### RQ-7: No External Dependencies

**Decision**: Pure Python (stdlib math) and pure TypeScript implementations. No shapely, turf.js, or other geometry libraries.

**Rationale**: Constitution Article IX (minimal dependencies) and Article I (offline by default). The ray-casting algorithm is trivial to implement in both languages with no dependencies.

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Algorithm | Ray-casting | Simple, O(n), correct for convex/concave |
| Python deps | stdlib only (math, copy, uuid) | Constitution IX |
| TS deps | none beyond project types | Constitution IX |
| Context type | MULTI | Two features needed |
| Result type | mutation | Modifying existing feature |
| Color source | zones[].style.fill_color | Consistency with upstream |
| Per-point colors | pointColors array | Parallel to coordinates |
