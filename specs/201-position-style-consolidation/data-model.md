# Phase 1 Data Model: ResolvedPositionStyle Consolidation

**Feature**: 201-position-style-consolidation
**Date**: 2026-04-18

This feature defines no new persisted entities, no schema-level types, no JSON payload, and no STAC artefact. Its sole "data model" is one TypeScript interface shared across the render pipeline. This document captures its canonical shape, its relation to schema-generated types, and the deletion list.

## Canonical Entity

### `ResolvedPositionStyle`

**Package**: `@debrief/utils` (canonical source in `shared/utils/src/types.ts`).
**Purpose**: The rendering-ready style for a single position on a track, computed from the cascade `default_position_style → interval rules → per-position override`.
**Lifetime**: Transient, computed on demand by `resolvePositionStyle` / `computeAllPositionStyles`. Never serialised, never stored.

| Field | Type | Nullability | Semantics |
|-------|------|-------------|-----------|
| `showSymbol` | `boolean` | non-null | Whether the renderer should draw a marker at this position. |
| `symbol` | `PointShape` (derived: `` `${PointShapeEnum}` ``) | non-null | Which shape to draw. Value space is the union of LinkML `PointShapeEnum` permissible values: `'circle' \| 'square' \| 'triangle' \| 'diamond' \| 'cross'`. Updates automatically when the schema enum changes. |
| `showLabel` | `boolean` | non-null | Whether the renderer should draw a text label at this position. |
| `labelText` | `string \| null` | nullable | The text to draw. `null` when `showLabel` is `false` or when no text was supplied; the resolver fills this with a formatted timestamp when `showLabel` is `true` but no custom text was provided by the override. |

### Supporting type export

```ts
export type PointShape = `${PointShapeEnum}`;
```

Published from `@debrief/utils` alongside `ResolvedPositionStyle` for consumers that want to name the symbol type explicitly (e.g., renderer prop types). Not strictly required for FR satisfaction but improves ergonomics and is drop-in for the existing hand-typed `SymbolShape` alias in `PositionSymbolsLayer.tsx` (optional follow-up, not in scope here).

## Relationship to Schema-Derived Types

### Upstream (consumed, not authored)

| Type | Source | Used for |
|------|--------|----------|
| `PointShapeEnum` | `@debrief/schemas` (generated from `shared/schemas/src/linkml/common.yaml` `PointShapeEnum`) | Sole source of truth for the `symbol` field's value space. |
| `PositionStyle` | `@debrief/schemas` | Input to the resolver (`default_position_style`). Re-exported from `@debrief/utils` for downstream convenience. |
| `PositionStyleOverride` | `@debrief/schemas` | Input to the resolver (`position_style_overrides[i]`). Re-exported from `@debrief/utils` for downstream convenience. |

### Downstream (re-exported)

| From | Exports | Notes |
|------|---------|-------|
| `@debrief/utils` | `ResolvedPositionStyle`, `PointShape` (new), plus the re-exported `PositionStyle` / `PositionStyleOverride` | Canonical location for the resolved type. |
| `@debrief/components` | `ResolvedPositionStyle` (re-exported unchanged) | `shared/components/src/index.ts:111` now re-exports from `@debrief/utils` rather than from `./utils/time`. Public name preserved (FR-010). |

## State / Transitions

Not a stateful entity. The resolver is a pure function from `(defaultStyle, intervalRules, override, positionTime)` to `ResolvedPositionStyle`. Cascade order (unchanged from current behaviour):

1. Start with `defaultStyle`.
2. If the position's index is in the symbol-interval set, set `showSymbol = true`.
3. If the position's index is in the label-interval set, set `showLabel = true`.
4. If an override is present, apply its non-null fields in field order (`show_symbol`, `symbol`, `show_label`, `label`) as per existing `resolvePositionStyle`.
5. If `showLabel` is true and `labelText` is still `null`, fill `labelText` with a formatted timestamp via `formatTimestampForLabel(positionTime)`.

(Step 4 reads from the schema-typed override's `label` field — this is the *input* `PositionStyleOverride.label` attribute, which stays `label` because it is defined in LinkML. The *output* `ResolvedPositionStyle.labelText` is the only name that changes.)

## Validation Rules

TypeScript does the heavy lifting:

| Rule | Enforced by |
|------|------------|
| `symbol` must be one of the schema's permissible shapes. | `PointShape` derivation from `PointShapeEnum`. `tsc` rejects invalid literals. |
| `showSymbol` / `showLabel` are booleans. | Interface shape. |
| `labelText` must be `string \| null`. | Interface shape. Resolver is the sole producer; never emits `undefined`. |
| No field named `label` exists on `ResolvedPositionStyle`. | Interface shape. Any stale consumer fails `tsc`. |

No runtime validation is added. There is no external boundary at which a `ResolvedPositionStyle` is deserialised, so schema/json-schema validation is not applicable.

## Deletion List (what disappears in this refactor)

| Artefact | Location | Replaced by |
|----------|----------|-------------|
| `interface ResolvedPositionStyle { ...; symbol: 'circle' \| 'square' \| 'triangle'; ...; label: string \| null }` | `shared/utils/src/types.ts:68` (old shape) | **Modified in place** → new canonical shape with `labelText` and `PointShape`. |
| `interface ResolvedPositionStyle { ...; symbol: 'circle' \| 'square' \| 'triangle' \| 'diamond' \| 'cross'; ...; labelText: string \| null }` | `shared/components/src/utils/time.ts:249` | **Deleted.** File adds `import type { ResolvedPositionStyle } from '@debrief/utils'` (or, if the type is only needed in return annotations, `import type { ResolvedPositionStyle } from '@debrief/utils'`). |
| `export type { ResolvedPositionStyle } from './utils/time';` | `shared/components/src/index.ts:111` | Replaced with `export type { ResolvedPositionStyle } from '@debrief/utils';` |
| Field `label` (output) | `shared/utils/src/interval.ts:125, 147, 153, 161` | Renamed to `labelText`. |
| Assertions `result.label` | `shared/utils/tests/interval.test.ts:121, 151, 186, 202, 314` | Renamed to `result.labelText`. |

## Invariants

- **I-1**: Exactly one declaration of `interface ResolvedPositionStyle` in the repository (SC-001).
- **I-2**: The `symbol` field's type is structurally equal to `'circle' \| 'square' \| 'triangle' \| 'diamond' \| 'cross'` **today** and is structurally equal to the value-space of `PointShapeEnum` **forever** — whatever it is. (SC-002 / SC-006.)
- **I-3**: No `ResolvedPositionStyle`-typed value is read via `.label` anywhere in the repo (SC-003).
- **I-4**: Every caller that previously imported `ResolvedPositionStyle` from either `@debrief/utils` or `@debrief/components` continues to receive *the same* canonical type at the same import path (FR-010).
