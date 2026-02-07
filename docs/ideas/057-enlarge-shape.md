# Enlarge Shape Tool Spec

## Problem

Analysts need to scale shapes up or down relative to an origin point. There is no language-neutral tool spec for this geometric scaling operation.

## Proposed Solution

Create a language-neutral tool specification (following #049 tool documentation model) for a shape scaling tool:

- **Input**: A selected shape (polygon, circle, line, etc.)
- **Parameters**:
  - `origin` — scale origin point (default: geometric centroid of the shape)
  - `scale_factor` — multiplicative scale factor (default: 3.0)
- **Operation**: Scale all vertices relative to the origin by the given factor. Factor > 1 enlarges, < 1 shrinks.
- **Output**: Mutated shape with updated coordinates, provenance recording the transformation

## Success Criteria

- Language-neutral tool spec following #049 template (9 required sections)
- Golden I/O examples with `.input.json` and `.output.json` fixtures
- Covers edge cases: scale factor of 1 (no-op), very large scale factors, shapes near poles
- Parameters have documented defaults (geometric centroid, 3x)

## Constraints

- Must follow tool documentation model from #049
- Scaling in geographic coordinates (lat/lon), not projected
- Must work offline (CONSTITUTION Art. I)
- Provenance must record origin and scale factor

## Out of Scope

- Non-uniform scaling (different X/Y factors)
- Python/TypeScript implementation (spec only)
