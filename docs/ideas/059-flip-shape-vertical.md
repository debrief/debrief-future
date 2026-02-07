# Flip Shape Vertical Tool Spec

## Problem

Analysts need to mirror shapes vertically (reflect across a horizontal axis through the shape's centroid). There is no language-neutral tool spec for this geometric reflection.

## Proposed Solution

Create a language-neutral tool specification (following #049 tool documentation model) for a vertical shape flip:

- **Input**: A selected shape (polygon, circle, line, etc.)
- **Operation**: Reflect all vertices across the horizontal (E-W) axis passing through the shape's geometric centroid. Effectively negates the latitude offset of each vertex from the centroid.
- **Output**: Mutated shape with updated coordinates, provenance recording the transformation

## Success Criteria

- Language-neutral tool spec following #049 template (9 required sections)
- Golden I/O examples with `.input.json` and `.output.json` fixtures
- Covers edge cases: shapes crossing equator, symmetric shapes, single-point shapes
- Double-flip returns original coordinates (involution property)

## Constraints

- Must follow tool documentation model from #049
- Reflection axis is always the horizontal (E-W) axis through centroid
- Must work offline (CONSTITUTION Art. I)

## Out of Scope

- Arbitrary axis reflection
- Python/TypeScript implementation (spec only)
