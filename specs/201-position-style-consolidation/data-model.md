# Phase 1 Data Model: ResolvedPositionStyle Consolidation

**Feature**: 201-position-style-consolidation
**Date**: 2026-04-18

This feature defines no new persisted entities, no JSON payload, and no STAC artefact. Its "data model" is (a) one TypeScript interface shared across the render pipeline, (b) one exported type alias derived from a schema enum, (c) one new error class, (d) one exhaustiveness helper, and (e) a narrowing tweak to two generator-output field types — all living in TypeScript code under `shared/`. This document captures their canonical shapes, their relation to schema-generated types, and the deletion list.

**Scope note (2026-04-18)**: Expanded after `/speckit.review`. Earlier versions of this file described only the `ResolvedPositionStyle` interface. The expanded entities are in the new sections below.

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

## Additional Entities (Expanded Scope)

### `InvalidPointShapeError`

**Package**: `@debrief/utils` (new, in `shared/utils/src/errors.ts` or equivalent).
**Purpose**: Typed error thrown by `resolvePositionStyle` when a runtime `override.symbol` is not in `PointShape`. Caught by `PositionSymbolsLayer` (FR-018) and surfaced via `LogService`.

```ts
export class InvalidPointShapeError extends Error {
  constructor(
    public readonly offendingValue: string,
    public readonly validShapes: readonly string[],
  ) {
    super(
      `Invalid point shape: "${offendingValue}". Must be one of: ${validShapes.join(', ')}.`,
    );
    this.name = 'InvalidPointShapeError';
  }
}
```

- `offendingValue` — the actual string received from the override.
- `validShapes` — snapshot of the valid set at the time of the throw. Useful for diagnostics when the schema evolves.

### `assertNever`

**Package**: `@debrief/utils` (may already exist — check `shared/utils/src/` first; if not, authored here).
**Purpose**: Standard TypeScript exhaustiveness helper used as the default branch in every `switch (symbol)` in the map renderer (FR-016).

```ts
export function assertNever(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}
```

Zero runtime cost in the common case (the default branch never executes if the switch is exhaustive). Turns "forgot to handle a new shape" from a silent fallthrough into a compile-time error.

### Narrowed schema-generator outputs

The following fields change from `symbol: string,` to `symbol: PointShape,` in `shared/schemas/src/generated/typescript/types.ts` via a post-process step (FR-014 / R-011):

| Type | Field | Before | After |
|------|-------|--------|-------|
| `PositionStyle` | `symbol` | `string` | `PointShape` |
| `PositionStyleOverride` | `symbol` | `string` | `PointShape` |

The generated file gains a generated `import type { PointShape } from '@debrief/utils';` at the top of the types section (or, if R-011's fallback triggers, `PointShape` is hand-authored in `shared/schemas/src/hand-written/` and imported from there).

### Unchanged schema content

The `PointShapeEnum` and `MarkerSymbolEnum` permissible-value lists are not changed. Per R-012 (17B), both enums continue to exist; a new schema adherence test asserts `PointShapeEnum.permissible_values == MarkerSymbolEnum.permissible_values` so that future divergence is caught at CI time.

## Relationship to Schema-Derived Types

### Upstream (consumed, not authored)

| Type | Source | Used for |
|------|--------|----------|
| `PointShapeEnum` | `@debrief/schemas` (generated from `shared/schemas/src/linkml/common.yaml` `PointShapeEnum`) | Sole source of truth for the `symbol` field's value space. Its `Object.values()` provides the runtime valid-set for FR-015. |
| `MarkerSymbolEnum` | `@debrief/schemas` | Tool-parameter enum retained per R-012. New adherence test pins its equality to `PointShapeEnum`. |
| `PositionStyle` | `@debrief/schemas` (post-processed per FR-014) | Input to the resolver (`default_position_style`). `symbol` field now narrow-typed to `PointShape`. Re-exported from `@debrief/utils`. |
| `PositionStyleOverride` | `@debrief/schemas` (post-processed per FR-014) | Input to the resolver (`position_style_overrides[i]`). `symbol` field now narrow-typed to `PointShape`. Re-exported from `@debrief/utils`. |

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
| `interface ResolvedPositionStyle { ...; symbol: 'circle' \| 'square' \| 'triangle' \| 'diamond' \| 'cross'; ...; labelText: string \| null }` | `shared/components/src/utils/time.ts:249` | **Deleted.** File adds `import type { ResolvedPositionStyle } from '@debrief/utils'`. |
| `export function resolvePositionStyle(...)` + body | `shared/components/src/utils/time.ts:268–317` | **Deleted.** Replaced by `export { resolvePositionStyle } from '@debrief/utils'` on the components barrel. |
| `export function computeAllPositionStyles(...)` + body | `shared/components/src/utils/time.ts:329–368` | **Deleted.** Replaced by `export { computeAllPositionStyles } from '@debrief/utils'` on the components barrel. |
| `export type { ResolvedPositionStyle } from './utils/time';` | `shared/components/src/index.ts:111` | Replaced with `export type { ResolvedPositionStyle, PointShape } from '@debrief/utils';` and `export { resolvePositionStyle, computeAllPositionStyles, InvalidPointShapeError } from '@debrief/utils';` |
| Field `label` (output) | `shared/utils/src/interval.ts:125, 147, 153, 161` | Renamed to `labelText`. |
| Override-null check `!== undefined` (utils semantics) | `shared/utils/src/interval.ts:137, 140, 143, 146` | Tightened to `!== undefined && !== null` (per R-007 / FR-013). |
| Assertions `result.label` | `shared/utils/tests/interval.test.ts:121, 151, 186, 202, 314` | Renamed to `result.labelText`. |
| `export type SymbolShape = 'circle' \| 'square' \| 'triangle' \| 'diamond' \| 'cross'` | `shared/components/src/MapView/PositionSymbolsLayer.tsx:18` | **Deleted.** Renderer imports `PointShape` from `@debrief/utils`. Switch default branches call `assertNever(shape)`. |
| `import type { SymbolShape } from '../PositionSymbolsLayer'` | `shared/components/src/MapView/__tests__/position-symbols.test.ts:3` | Replaced by `import type { PointShape } from '@debrief/utils'`. |
| `const VALID_SYMBOLS = [...] as const; type SymbolType = typeof VALID_SYMBOLS[number];` | `apps/vscode/src/tools/track/styling/applySymbolStyle.ts:10–11` | **Deleted.** Replaced by `import { PointShapeEnum } from '@debrief/schemas'; import type { PointShape } from '@debrief/utils'; const VALID_SYMBOLS = Object.values(PointShapeEnum);` — `VALID_SYMBOLS` remains as a `readonly string[]` for the JSON inputSchema's `enum` field, but it is now schema-derived. |

## Invariants

- **I-1**: Exactly one declaration of `interface ResolvedPositionStyle` in the repository (SC-001).
- **I-2**: The `symbol` field's type is structurally equal to `'circle' \| 'square' \| 'triangle' \| 'diamond' \| 'cross'` **today** and is structurally equal to the value-space of `PointShapeEnum` **forever** — whatever it is. (SC-002 / SC-006.)
- **I-3**: No `ResolvedPositionStyle`-typed value is read via `.label` anywhere in the repo (SC-003).
- **I-4**: Every caller that previously imported `ResolvedPositionStyle` from either `@debrief/utils` or `@debrief/components` continues to receive *the same* canonical type at the same import path (FR-010).
- **I-5**: Exactly one implementation of `resolvePositionStyle` and exactly one of `computeAllPositionStyles` in the repo (SC-007 / FR-012).
- **I-6**: `PointShapeEnum.permissible_values == MarkerSymbolEnum.permissible_values` — pinned by a schema adherence test (SC-010 / R-012).
- **I-7**: Every `switch (symbol)` in renderer code has an `assertNever` default branch (SC-008 / FR-016).
- **I-8**: `PositionStyle.symbol` and `PositionStyleOverride.symbol` in the generated TypeScript output resolve to `PointShape`, not `string` (FR-014). Contingent on R-011's mechanism being tractable.
- **I-9**: The resolver throws `InvalidPointShapeError` on invalid runtime symbol; it does not silently fall back. The map renderer catches the error and logs, not crashing the rest of the track (SC-009 / FR-015 / FR-018).
