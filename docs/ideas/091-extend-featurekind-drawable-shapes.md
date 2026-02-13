# [E05] Add POLY FeatureKind for arbitrary polygons

## Epic
Part of **E05: Shape Drawing Tools**

## Problem
Drawing tools need to create point, rectangle, polygon, and polyline shapes. Three of four are already covered by existing FeatureKindEnum values (POINT, RECTANGLE, LINE). However, there is no kind for an arbitrary user-defined polygon — CIRCLE and RECTANGLE are specific polygon subtypes but don't cover a freeform polygon.

User-drawn shapes are identical to file-imported shapes — the only difference is provenance, not kind. No special "drawable" kinds are needed.

## Proposed Solution
- Add POLY kind to FeatureKindEnum in `shared/schemas/src/linkml/common.yaml` (already planned in Phase 2 shape types, spec 020)
- Add PolyAnnotationProperties class in `annotations.yaml`
- Regenerate Pydantic, JSON Schema, and TypeScript types
- Add valid/invalid fixture files for POLY
- Run schema adherence tests
- Confirm LINE kind works for polylines (multi-vertex LineString) — no new kind needed

### Kind mapping for drawing tools
| Drawing tool | FeatureKind | Geometry | Already exists? |
|-------------|-------------|----------|-----------------|
| Point | POINT | Point | Yes |
| Rectangle | RECTANGLE | Polygon | Yes |
| Polygon | **POLY** | Polygon | **No — add this** |
| Polyline | LINE | LineString | Yes |

## Success Criteria
- POLY exists in FeatureKindEnum
- Generated Pydantic/TypeScript types include POLY
- Valid fixture JSON files pass schema validation
- All existing schema tests still pass
- LINE kind confirmed to support multi-vertex LineString (polyline use case)

## Dependencies
None

## Complexity
Low
