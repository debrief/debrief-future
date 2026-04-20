---
feature: 201-position-style-consolidation
task: T004
captured_at: 2026-04-19
status: PROTOTYPE_SUCCESS
---

# R-011 Prototype — Schemas-Build Post-Process Mechanism

## Goal

Find a tractable mechanism in the `shared/schemas` build pipeline to narrow
`PositionStyle.symbol` and `PositionStyleOverride.symbol` from the default
`symbol: string` (what `gen-typescript` emits for enum-ranged attributes) to
`symbol: PointShape` (the template-literal union derived from `PointShapeEnum`).

## Outcome — Tractable

The `generate.py` script (`shared/schemas/scripts/generate.py`) already runs
`gen-typescript` as a subprocess, captures `result.stdout`, and applies a
series of string-replace post-processes to patch:

- GeoJSON union geometry fallbacks (`geometry: string` → proper union types)
- Coordinate nesting per geometry type (`number[]` → `number[][]` etc.)

This is an established post-process pattern with **seven** existing replacements
in the `generate_typescript()` function. Adding one more to narrow the two
enum-ranged `symbol` attributes is a small, additive change that fits the
existing architecture.

### Mechanism chosen

Extend `generate_typescript()` in `shared/schemas/scripts/generate.py` with
two additional post-process steps (applied after gen-typescript's stdout is
captured, before the "DO NOT EDIT" header is prepended):

1. **Rewrite attribute types.** For each attribute whose LinkML `range` is
   `PointShapeEnum` in the schema (today: `PositionStyle.symbol` and
   `PositionStyleOverride.symbol`), replace `symbol: string,` → `symbol: PointShape,`
   scoped to those interface blocks using the same index-and-scope pattern
   already used for `_coordinate_type_fixes`.

2. **Inject the type import at the top of the generated file.** Inject
   `import type { PointShape } from '@debrief/utils';` immediately after the
   "DO NOT EDIT" header. This creates a schemas → utils type-only import; a
   value-level import would create a build-order cycle, but TypeScript resolves
   `import type` statements at declaration time only, and the schemas package
   is consumed by utils at runtime, not vice-versa. The type-only form is
   erased at compile time and produces no runtime dependency.

### Idempotency

Both steps are string-replace operations on text that does not mention
`PointShape` before the post-process runs, so a second invocation on the same
input produces the same output (the `symbol: string,` substring no longer
exists to match on the second pass). The idempotency requirement from T062 is
satisfied.

### Determinism

The post-process is keyed on the exact LinkML attribute names
(`PositionStyle.symbol`, `PositionStyleOverride.symbol`) — both of which are
explicit in the schema (`shared/schemas/src/linkml/styling.yaml`). The
substring pattern `symbol: string,` appears nowhere else in the generated
output (grep confirms it is 2 matches total under the target classes).

## Fallback (not needed)

The spec's fallback path was to renegotiate FR-014 if no tractable mechanism
was found. Since the mechanism is tractable, Phase 7 proceeds as planned. No
fallback is triggered.

## Evidence of viability (dry-run)

- `grep -n 'symbol: string' shared/schemas/src/generated/typescript/types.ts`
  returns exactly 2 matches, both inside the `PositionStyle` and
  `PositionStyleOverride` interface blocks (the intended narrowing targets).
- `generate.py:395-427` (the existing `_coordinate_type_fixes` post-process)
  demonstrates the index-and-scope pattern for per-interface substring
  rewrites; the new post-process uses the same template.

## Decision

Proceed with Phase 7 T062–T064 using the extended `generate_typescript()`
post-process. The narrowing will live inside
`shared/schemas/scripts/generate.py` — not a separate Node script, as
originally sketched in T062 — because the Python generate.py is the single
entry point for all schema generation and keeping the patch there keeps the
"one post-process pipeline" property.
