# Quickstart: [E05] Add POLY FeatureKind for Arbitrary Polygons

## What This Feature Does

Adds `POLY` to the FeatureKindEnum in the LinkML schema, along with PolyAnnotationProperties and PolyAnnotation classes. This enables arbitrary user-defined polygons (e.g., patrol zones, exclusion areas) to pass schema validation, aligning the schema with the IO service's existing `build_polygon()` output.

## Files to Change

### Schema (LinkML source)
1. `shared/schemas/src/linkml/common.yaml` — Add `POLY` to FeatureKindEnum
2. `shared/schemas/src/linkml/annotations.yaml` — Add PolyAnnotationProperties + PolyAnnotation classes

### Fixtures
3. `shared/schemas/src/fixtures/valid/poly-annotation-valid-01.json` — Simple polygon (4 vertices)
4. `shared/schemas/src/fixtures/valid/poly-annotation-valid-02.json` — Complex polygon (8+ vertices)
5. `shared/schemas/src/fixtures/invalid/poly-annotation-invalid-kind.json` — Wrong kind value
6. `shared/schemas/src/fixtures/invalid/poly-annotation-missing-style.json` — Missing style
7. `shared/schemas/src/fixtures/valid/line-annotation-valid-02.json` — Multi-vertex LINE (5 points, confirms polyline)

### Tests
8. `shared/schemas/tests/test_golden.py` — Add ENTITY_MAP entry + import for PolyAnnotation

### Generated (auto-generated, not hand-edited)
9. `shared/schemas/src/generated/python/debrief_schemas/__init__.py` — Regenerated
10. `shared/schemas/src/generated/json-schema/PolyAnnotation.schema.json` — New
11. `shared/schemas/src/generated/typescript/types.ts` — Regenerated

## Build & Test

```bash
cd shared/schemas
make generate   # Regenerate Pydantic, JSON Schema, TypeScript
make test        # Run all tests (pytest + tsc)
```

## Verify

```bash
# Check POLY is in generated enum
grep -n "POLY" src/generated/python/debrief_schemas/__init__.py
grep -n "POLY" src/generated/typescript/types.ts

# Run golden fixture tests specifically
uv run pytest tests/test_golden.py -v -k "poly"
```
