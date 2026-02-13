# Research: Generate Reference Points Tool

**Feature**: 078-generate-reference-points
**Date**: 2026-02-13

## Research Questions & Findings

### RQ-1: What context type should the tool use?

**Decision**: `ContextType.NONE`

**Rationale**: The tool generates new features from scratch — it does not operate on existing selected features. The bounding box is provided as an explicit parameter, not derived from a map region selection. This aligns with the `NONE` context type, which requires no feature selection.

**Alternatives considered**:
- `ContextType.REGION` — rejected because REGION implies a map-drawn selection area, whereas this tool takes explicit coordinate bounds as a parameter.
- `ContextType.SINGLE`/`MULTI` — rejected because the tool creates features rather than transforming existing ones.

### RQ-2: Where should the Python tool file live?

**Decision**: `services/calc/debrief_calc/tools/reference/generation.py`

**Rationale**: Follows the existing category/subcategory directory structure used by styling tools (`tools/track/styling/`). The tool spec category is `reference/generation`, so the Python implementation mirrors this path. A single `generation.py` file containing the `generate_reference_points` function is sufficient.

**Alternatives considered**:
- `tools/reference_generation.py` (flat) — rejected; existing tools use nested category directories.
- `tools/point/generation.py` — rejected; the tool spec uses `reference/generation` as the category, not `point/generation`.

### RQ-3: Where should the TypeScript tool file live?

**Decision**: `apps/vscode/src/tools/reference/generation/generateReferencePoints.ts`

**Rationale**: Mirrors the Python path structure. Existing TypeScript tools are in `apps/vscode/src/tools/track/styling/`. The barrel export will be added to `apps/vscode/src/tools/reference/generation/index.ts`.

### RQ-4: What pseudo-random number generator approach?

**Decision**: Use a linear congruential generator (LCG) with explicit seed parameter for cross-language determinism.

**Rationale**: Python's `random.Random(seed)` and TypeScript/JavaScript's `Math.random()` use different PRNG algorithms (Mersenne Twister vs xorshift128+), so identical seeds produce different sequences. To satisfy SC-006 (same seed → identical output across invocations) AND cross-language parity, we implement a simple LCG with the same constants in both languages.

**LCG constants** (Numerical Recipes):
- multiplier: 1664525
- increment: 1013904223
- modulus: 2^32

This produces identical sequences in Python and TypeScript given the same seed.

**Alternatives considered**:
- Language-native random — rejected; Python and TypeScript produce different sequences for the same seed.
- External PRNG library — rejected; violates Art. IX.1 (minimal dependencies).
- Precomputed lookup table — rejected; doesn't scale to arbitrary counts.

### RQ-5: Should the tool accept input features?

**Decision**: No. The tool's `input_kinds` is empty (no selection requirements). Bounds, pattern, and dimensions are all passed as tool parameters.

**Rationale**: This tool creates features from parameters alone. It doesn't transform existing data. The MCP `selectionRequirements` annotation will be an empty array.

### RQ-6: How should feature IDs be generated?

**Decision**: Deterministic IDs based on pattern, bounds, and point index: `ref-{pattern}-{index}` (e.g., `ref-grid-0`, `ref-grid-1`, ..., `ref-scatter-19`).

**Rationale**: Deterministic IDs enable reproducible output (Art I.4). UUIDs would make scatter output with the same seed produce different IDs each time, which violates the reproducibility requirement.

### RQ-7: What result subtype should be used?

**Decision**: `reference/generated_points` (addition type)

**Rationale**: The tool creates new features (addition, not mutation). The subtype follows the naming convention: lowercase with underscores, two segments. Full result type path: `addition/reference/generated_points`.

### RQ-8: How should antimeridian-crossing bounds be handled?

**Decision**: When `west > east`, treat the effective longitude range as `west` to `east + 360`. Generated longitudes are normalised to [−180, 180] using modular arithmetic: `if lon > 180: lon -= 360`.

**Rationale**: Simple and correct for the common case. The GeoJSON spec requires longitudes in [−180, 180].

## Technology Decisions Summary

| Decision | Choice | Key Reason |
|----------|--------|------------|
| Context type | `ContextType.NONE` | No input features needed |
| Python path | `tools/reference/generation.py` | Matches tool spec category |
| TypeScript path | `tools/reference/generation/generateReferencePoints.ts` | Mirrors Python structure |
| PRNG | Cross-language LCG | Deterministic, no dependencies |
| Feature IDs | Deterministic `ref-{pattern}-{index}` | Reproducibility (Art I.4) |
| Result subtype | `reference/generated_points` | Addition type, standard naming |
| Dependencies | None (stdlib only) | Art IX.1 compliance |
