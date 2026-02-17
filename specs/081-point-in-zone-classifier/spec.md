# Feature Specification: Point-in-Zone Classifier Tool

**Feature Branch**: `081-point-in-zone-classifier`
**Created**: 2026-02-17
**Status**: Draft
**Input**: User description: "Implement point-in-zone-classifier tool [E03] — classify and recolor reference points by buffer zone membership (requires #049, #078, #080)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Classify reference points by buffer zone (Priority: P1)

An analyst has generated a grid of reference points (#078) and buffer detection zones (#080) around a track. They invoke the point-in-zone classifier to determine which detection zone each reference point falls within. The tool examines every coordinate in the reference point MultiPoint feature, tests each against the concentric zone polygons (innermost first), and assigns the most specific zone to each point. The `pointMetadata` array on the MultiPoint feature is updated with `zone` and `color` fields, and the feature-level style is set to use per-point coloring. The analyst sees the reference points recolored on the map — purple for 75% zone, red for 50% zone, orange for 25% zone, and grey for points outside all zones.

**Why this priority**: This is the core purpose of the tool. Without classification and recoloring, the buffer zone analysis chain cannot visually communicate detection likelihood across the analysis area.

**Independent Test**: Can be verified by providing a set of reference points with known coordinates and a set of zone polygons with known boundaries, running the classifier, and checking that each point's metadata contains the correct zone assignment and color.

**Acceptance Scenarios**:

1. **Given** a MultiPoint reference feature with 12 points and a MultiPolygon zone feature with 3 concentric zones (75% at 3nm, 50% at 6nm, 25% at 12nm), **When** point-in-zone-classifier is invoked, **Then** each point's `pointMetadata` entry is updated with a `zone` field (the zone name, e.g. "75%") and a `color` field (the zone's style color), and points outside all zones have `zone: "none"` and `color: "#666666"`.
2. **Given** a point that falls inside the innermost zone (75%), **When** the classifier runs, **Then** the point is assigned zone "75%" and color "#9C27B0" (purple), not the 50% or 25% zones — the most specific (innermost) zone wins.
3. **Given** a point that falls inside the 50% zone but outside the 75% zone, **When** the classifier runs, **Then** the point is assigned zone "50%" and color "#F44336" (red).

---

### User Story 2 - Preserve existing point metadata (Priority: P2)

An analyst has reference points with existing metadata (index, name) from the generate-reference-points tool. When running the classifier, existing metadata fields must be preserved — only `zone` and `color` fields are added or updated. This ensures the downstream histogram tool (#082) can still access point indices and names.

**Why this priority**: Data integrity across the tool chain is essential. The classifier extends metadata without destroying it.

**Independent Test**: Can be verified by providing reference points with custom metadata fields and confirming they survive classification unchanged.

**Acceptance Scenarios**:

1. **Given** a MultiPoint feature where each `pointMetadata` entry has `index` and `name` fields, **When** the classifier runs, **Then** each entry retains its `index` and `name` fields and gains `zone` and `color` fields.
2. **Given** a MultiPoint feature that was previously classified (already has `zone` and `color` in metadata), **When** the classifier is re-invoked with different zones, **Then** the `zone` and `color` fields are updated to reflect the new zone geometry.

---

### User Story 3 - Cascade integration with E03 pipeline (Priority: P3)

As part of the E03 reactive PROV cascade, when the buffer zones change (due to track movement in step 2), the classifier automatically re-executes with the updated zones. The reclassified points feed into the histogram generator (#082). The classifier must be stateless and deterministic — given the same inputs, it always produces the same output.

**Why this priority**: Cascade integration is the ultimate goal of E03, but the tool must work correctly in isolation first. Statelessness enables safe re-execution via PROV replay.

**Independent Test**: Can be verified by invoking the classifier twice with identical inputs and confirming identical outputs, then invoking with modified zone geometry and confirming the output changes correspondingly.

**Acceptance Scenarios**:

1. **Given** the same reference points and zone feature, **When** the classifier is invoked twice, **Then** both invocations produce identical output.
2. **Given** the classifier was previously run with zones at 3/6/12nm, **When** it is re-invoked with zones at 5/10/20nm, **Then** the point classifications change to reflect the new zone boundaries.

---

### Edge Cases

- What happens when the reference feature has no coordinates (empty MultiPoint)? Return the feature unchanged with an empty pointMetadata array.
- What happens when no zone feature is provided? Return an error: "Requires at least one zone feature".
- What happens when the zone feature has no polygons in its MultiPolygon? Return an error: "Zone feature has no polygons".
- What happens when a point falls exactly on a zone boundary? The point is assigned to the zone whose polygon contains the boundary (standard point-in-polygon inclusion treats boundary points as inside).
- What happens when multiple zone features are provided? Only the first zone feature (with `kind: "ZONE"`) is used; others are ignored.
- What happens when the reference feature is not a MultiPoint? Return an error: "Reference feature must have MultiPoint geometry".
- What happens when the pointMetadata array length doesn't match the coordinates length? Return an error: "pointMetadata length must match coordinates length".
- What happens when zones overlap but are not concentric? Each point is assigned to the zone with the highest detection likelihood (smallest polygon index, since zones are ordered innermost-first).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Tool spec MUST follow the #049 tool documentation model with all 9 required sections (metadata, description, MCP, inputs, outputs, algorithm, edge cases, examples, changelog).
- **FR-002**: Tool MUST accept two input features: one MultiPoint feature with `kind: "POINT"` and `locationType: "REFERENCE"`, and one MultiPolygon feature with `kind: "ZONE"`. The tool uses `ContextType.MULTI` input context.
- **FR-003**: Tool MUST classify each coordinate in the MultiPoint geometry against the zone polygons in the MultiPolygon geometry, testing innermost (index 0) first.
- **FR-004**: Tool MUST update each `pointMetadata` entry with:
  - `zone`: The zone name (e.g., "75%", "50%", "25%") or "none" if outside all zones
  - `color`: The zone's style color (from the `zones` array) or "#666666" for points outside all zones
- **FR-005**: Tool MUST preserve all existing fields in each `pointMetadata` entry (e.g., `index`, `name`).
- **FR-006**: Tool MUST use the ray-casting algorithm (or equivalent) for point-in-polygon testing.
- **FR-007**: Tool MUST test zones in order from innermost (index 0, highest likelihood) to outermost (last index, lowest likelihood), assigning the first matching zone.
- **FR-008**: Tool MUST return a `mutation`-type ToolResponse with result subtype `reference/classified_points`, containing the modified MultiPoint feature with updated pointMetadata.
- **FR-009**: Tool MUST record provenance annotations including source feature IDs for both the reference points and the zone feature.
- **FR-010**: Tool MUST set per-point colors on the feature's `pointColors` property — an array parallel to coordinates where each entry is the assigned zone color. This enables renderers to draw each point in its classification color.
- **FR-011**: Tool MUST work entirely offline with no network dependency.
- **FR-012**: Tool MUST produce at least 2 golden I/O example files (basic classification and all-outside-zones).
- **FR-013**: Tool MUST handle the antimeridian correctly when testing point containment in zone polygons.
- **FR-014**: Tool MUST be stateless — given the same inputs it MUST produce identical output.

### Key Entities

- **Reference Point Set**: A GeoJSON MultiPoint Feature with `kind: "POINT"` and `locationType: "REFERENCE"`. Contains all reference coordinates in geometry, with a parallel `pointMetadata` array for per-point information. This is the input to be classified and the output after classification (with updated metadata).
- **Detection Zone Feature**: A GeoJSON MultiPolygon Feature with `kind: "ZONE"`. Contains concentric zone polygons ordered innermost (highest likelihood) to outermost (lowest likelihood). Each zone's metadata is in the `zones` array property (name, detection_likelihood_pct, buffer_distance_nm, style).
- **Point Metadata Entry**: An element of the `pointMetadata` array, indexed parallel to the MultiPoint coordinates. The classifier adds/updates `zone` (string) and `color` (hex string) fields while preserving existing fields (index, name, etc.).
- **Point Colors Array**: A `pointColors` property on the classified feature — an array of hex color strings parallel to coordinates, enabling per-point rendering.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tool spec file exists at `shared/tools/reference/classification/point-in-zone-classifier.1.0.md` with all 9 required sections complete.
- **SC-002**: At least 2 golden I/O example pairs exist (basic classification and all-outside-zones).
- **SC-003**: Algorithm pseudocode correctly implements point-in-polygon testing with innermost-first zone priority.
- **SC-004**: Edge cases table covers at minimum: empty points, no zones, boundary points, re-classification, mismatched metadata length.
- **SC-005**: Given the generate-reference-points grid output and buffer-zone-generator output, the classifier correctly assigns each point to the appropriate zone based on geometric containment.
- **SC-006**: All existing `pointMetadata` fields survive classification unchanged — only `zone` and `color` fields are added/updated.
- **SC-007**: The output is a valid GeoJSON MultiPoint feature conforming to the project schema.

## Deliverables

| Deliverable | Path |
|-------------|------|
| Feature spec | `specs/081-point-in-zone-classifier/spec.md` |
| Tool spec | `shared/tools/reference/classification/point-in-zone-classifier.1.0.md` |
| Golden example (basic) | `shared/tools/reference/classification/point-in-zone-classifier.basic.input.json` |
| Golden example (basic output) | `shared/tools/reference/classification/point-in-zone-classifier.basic.output.json` |
| Golden example (outside) | `shared/tools/reference/classification/point-in-zone-classifier.all-outside.input.json` |
| Golden example (outside output) | `shared/tools/reference/classification/point-in-zone-classifier.all-outside.output.json` |

## Technical Notes

### Point-in-Polygon Algorithm

The ray-casting algorithm is used for point containment testing:

```
Cast a horizontal ray from the point to the right (+longitude).
Count the number of times the ray crosses polygon edges.
If odd → point is inside. If even → point is outside.
```

This algorithm correctly handles concave polygons, which buffer zone polygons may approximate via convex hull.

### Zone Testing Order

Zones in the MultiPolygon are ordered innermost (index 0) to outermost (last index). For each point:

1. Test against zone 0 (e.g., 75%, 3nm) — if inside, assign this zone
2. If not, test against zone 1 (e.g., 50%, 6nm) — if inside, assign
3. If not, test against zone 2 (e.g., 25%, 12nm) — if inside, assign
4. If not inside any zone, assign "none"

Since zones are concentric (each larger zone fully contains all smaller zones), the first match is always the most specific.

### Color Mapping

The classifier reads colors from the zone feature's `zones` array, where each entry has a `style.fill_color` (or `style.color`) property:

| Zone | Default Color | Hex |
|------|--------------|-----|
| 75% (inner) | Purple | #9C27B0 |
| 50% (middle) | Red | #F44336 |
| 25% (outer) | Orange | #FF9800 |
| None (outside) | Grey | #666666 |

### Dependencies

- Requires #049 (tool documentation model) — **complete**
- Requires #078 (generate reference points) — **specified** — produces the MultiPoint input
- Requires #080 (buffer zone generator) — **specified** — produces the zone MultiPolygon input
- Downstream consumer: #082 (zone histogram generator) — reads classified points

## Assumptions

- The zone feature uses MultiPolygon geometry with polygons ordered innermost to outermost, as produced by the buffer-zone-generator (#080).
- The reference feature uses MultiPoint geometry with a parallel `pointMetadata` array, as produced by generate-reference-points (#078).
- Colors are taken from the `zones` array metadata on the zone feature, not from feature-level style.
- The ray-casting algorithm is sufficient for the polygon shapes produced by the buffer-zone-generator (convex hulls). For highly irregular polygons, winding number could be used instead, but this is out of scope.
- Per-point rendering is supported by the map renderer via the `pointColors` array property (an array of hex strings parallel to coordinates).
- The classifier is a pure geometric operation — it does not need access to temporal data or track properties.
