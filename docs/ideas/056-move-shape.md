# Move Shape Tool Spec

## Problem

Analysts need to reposition shapes (annotations, zones, areas) by translating them in a given direction and distance. There is no language-neutral tool spec for this fundamental geometric operation.

## Proposed Solution

Create a language-neutral tool specification (following #049 tool documentation model) for a shape translation tool:

- **Input**: A selected shape (polygon, circle, line, etc.)
- **Parameters**:
  - `direction` — compass bearing in degrees (default: 90, i.e. East)
  - `distance_km` — translation distance in kilometres (default: 5)
- **Operation**: Translate all vertices of the shape by the given distance along the given bearing using great-circle math
- **Output**: Mutated shape with updated coordinates, provenance recording the transformation

## Success Criteria

- Language-neutral tool spec following #049 template (9 required sections)
- Golden I/O examples with `.input.json` and `.output.json` fixtures
- Covers edge cases: shapes crossing antimeridian, polar regions, zero distance
- Parameters have documented defaults (East, 5km)

## Constraints

- Must follow tool documentation model from #049
- Great-circle translation (not planar projection)
- Must work offline (CONSTITUTION Art. I)
- Provenance must record direction and distance applied

## Out of Scope

- Interactive drag-to-move UI
- Python/TypeScript implementation (spec only)
