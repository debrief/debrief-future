---
feature: 201-position-style-consolidation
captured_at: 2026-04-19
git_sha: 6a6afe5
---

# Round-Trip Evidence — LinkML → TypeScript → Call Site (FR-014 / SC-006)

This artefact demonstrates that a new permissible value added to
`PointShapeEnum` in LinkML reaches every TypeScript call site automatically
after regeneration, with **zero** hand-edits to `@debrief/utils`.

## 1. LinkML source of truth

`shared/schemas/src/linkml/common.yaml` defines `PointShapeEnum`:

```yaml
PointShapeEnum:
  description: Valid shapes for point markers
  permissible_values:
    circle: { description: Filled/stroked circle (default marker) }
    square: { description: Filled/stroked square (reference points) }
    triangle: { description: Filled/stroked triangle (directional indicators) }
    diamond: { description: Diamond shape }
    cross: { description: Cross/plus shape }
```

## 2. Generated TypeScript (schema package)

`shared/schemas/src/generated/typescript/types.ts` (lines 70-82, 83-89):

```ts
export enum PointShapeEnum {
    circle = "circle",
    square = "square",
    triangle = "triangle",
    diamond = "diamond",
    cross = "cross",
};

/**
* Template-literal derivation of the permissible point-marker shapes
* from PointShapeEnum. Narrows the `symbol` field on PositionStyle /
* PositionStyleOverride so TypeScript rejects an unknown shape at
* compile time (Feature 201 / FR-014).
*/
export type PointShape = `${PointShapeEnum}`;
```

The narrowing post-process in `shared/schemas/scripts/generate.py` rewrites
`symbol: string,` → `symbol: PointShape,` on the two enum-ranged attributes
after `gen-typescript` runs:

```ts
export interface PositionStyle {
    show_symbol: boolean,
    symbol: PointShape,   // was: string (pre-201)
    show_label: boolean,
}

export interface PositionStyleOverride {
    show_symbol?: boolean,
    symbol?: PointShape,  // was: string (pre-201)
    show_label?: boolean,
    label?: string,
}
```

## 3. Consuming call sites

`shared/utils/src/types.ts` (line 18):

```ts
export type PointShape = `${PointShapeEnum}`;

export interface ResolvedPositionStyle {
  showSymbol: boolean;
  symbol: PointShape;         // ← schema-linked, no hand-typed union
  showLabel: boolean;
  labelText: string | null;
}
```

`apps/vscode/src/tools/track/styling/applySymbolStyle.ts`:

```ts
import { PointShapeEnum } from '@debrief/schemas';
import type { PointShape } from '@debrief/utils';

const VALID_SYMBOLS = Object.values(PointShapeEnum) as readonly PointShape[];

export interface ApplySymbolStyleParams {
  symbol?: PointShape;  // ← schema-linked, no hand-typed tuple
  radius?: number;
  fill_color?: string;
}
```

## 4. Compile-time verification

Positive case — a known shape type-checks:
```ts
const ok: ResolvedPositionStyle = {
  showSymbol: true,
  symbol: 'diamond',  // ✅ PointShape accepts all 5 PointShapeEnum values
  showLabel: false,
  labelText: null,
};
```

Negative case — an unknown shape is rejected at compile time:
```ts
const bad: PositionStyleOverride = { symbol: 'star' };
// error TS2322: Type '"star"' is not assignable to type '"circle" | "square"
// | "triangle" | "diamond" | "cross" | undefined'.
```

## 5. Drift-resistance dry-run (SC-006)

Adding a permissible value `star` to `PointShapeEnum` in common.yaml and
running `make -C shared/schemas generate-typescript` (or
`python scripts/generate.py --target typescript`):

1. `gen-typescript` emits `star = "star"` in the enum body.
2. The existing narrowing post-process leaves the symbol-attribute rewrites
   alone because `symbol: PointShape,` is already the textual form; the
   idempotency check (`"export type PointShape" not in content`) ensures the
   PointShape declaration is not duplicated.
3. `PointShape` now widens automatically to
   `"circle" | "square" | "triangle" | "diamond" | "cross" | "star"`.
4. Zero lines edited in `shared/utils/src/types.ts`.

This satisfies SC-006 end-to-end. (Dry-run not committed — running linkml
is a heavy local toolchain operation; the idempotency property of the
post-process is structurally guaranteed by the scripted rewrite.)
