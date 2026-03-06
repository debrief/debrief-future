# Quickstart: Enlarge Shape Tool Spec

**Feature**: 057-enlarge-shape | **Date**: 2026-02-13

## What This Feature Delivers

A language-neutral tool specification file (`enlarge-shape.1.0.md`) and golden I/O example files, placed in `shared/tools/shape/manipulation/`. No executable code.

## How to Implement

### Step 1: Author the Tool Spec

Create `shared/tools/shape/manipulation/enlarge-shape.1.0.md` following the 9-section template from `shared/tools/TEMPLATE.md`. Use `move-shape.1.0.md` in the same directory as the primary reference.

**Sections to fill**:
1. **Metadata** — YAML frontmatter: `name: enlarge-shape`, `version: 1.0`, `category: shape/manipulation`, `status: draft`
2. **MCP** — LLM-optimized description, parameters, returns
3. **Inputs** — Schema reference to `annotations.yaml`, constraints, defaults (`scale_factor: 3.0` with preset choices `[0.25, 0.5, 1.5, 2.0, 3.0, 5.0]`, `origin: centroid`)
4. **Outputs** — ToolResponse with `mutation/shape/scaled` result type
5. **Algorithm** — Pseudocode for centroid computation, coordinate scaling, kind-specific handling
6. **Edge Cases** — Table covering 10+ scenarios (see spec.md and research.md)
7. **Examples** — Inline basic example + references to golden files
8. **Changelog** — `1.0 (2026-02-13): Initial release`
9. **References** — Links to move-shape, annotations.yaml, TEMPLATE.md

### Step 2: Compute Golden Example Values

For each golden example, manually compute the expected output coordinates:

**Scaling formula** (per vertex):
```
new_lon = origin_lon + (vertex_lon - origin_lon) * scale_factor
new_lat = origin_lat + (vertex_lat - origin_lat) * scale_factor
```

Where `origin` defaults to the arithmetic mean of all vertices (excluding the closing vertex for closed polygons).

### Step 3: Create Golden I/O Files

Create 3 pairs in `shared/tools/shape/manipulation/`:

| Example | Input | Output | Validates |
|---------|-------|--------|-----------|
| basic-polygon | Rectangle, factor 3.0, default centroid | Scaled rectangle, provenance | Core scaling from centroid |
| custom-origin | Polygon, factor 2.0, explicit origin | Scaled polygon, origin vertex fixed | Custom origin support |
| noop | Circle, factor 1.0 | Unchanged circle, provenance | Identity transformation |

### Step 4: Validate

1. Verify JSON is well-formed (parse all `.input.json` and `.output.json` files)
2. Verify output coordinates match hand-computed values within floating-point tolerance (1e-10)
3. Verify all 9 spec sections are present and non-empty
4. Verify provenance annotations include `debrief:resultType`, `debrief:sourceFeatures`, `debrief:label`

## Key Decisions (from research.md)

- **Linear interpolation** of lat/lon (not Vincenty) — adequate for local-scale annotation shapes
- **Arithmetic mean centroid** (not area centroid) — simpler, consistent across geometry types
- **Scale factor 0 allowed** — collapses to origin, returns degenerate geometry with provenance
- **Result type**: `mutation/shape/scaled`
- **Vector handling**: Scale geometry + origin, preserve range + bearing
- **Scale factor presets**: `[0.25, 0.5, 1.5, 2.0, 3.0, 5.0]` — preset choices for frontend context menus (matches move-shape `distance_km` pattern); any non-negative value still accepted
