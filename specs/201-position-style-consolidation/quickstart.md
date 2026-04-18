# Quickstart: Consume the canonical `ResolvedPositionStyle`

**Feature**: 201-position-style-consolidation
**Audience**: engineers writing or reviewing code that produces or consumes resolved position styles.

This quickstart is for **after** the refactor lands. It shows the import paths, the shape you get, and the one thing you must *not* do any more.

## Import path

```ts
// Preferred — canonical location.
import type { ResolvedPositionStyle, PointShape } from '@debrief/utils';

// Still works — components package re-exports the same type.
import type { ResolvedPositionStyle } from '@debrief/components';
```

Both imports resolve to the exact same TypeScript type. There is no second definition hiding under `shared/components/src/utils/time.ts` any more.

## The shape

```ts
interface ResolvedPositionStyle {
  showSymbol: boolean;
  symbol: PointShape;        // 'circle' | 'square' | 'triangle' | 'diamond' | 'cross'
  showLabel: boolean;
  labelText: string | null;  // renamed from `label` — see Migration below
}
```

`PointShape` is `` `${PointShapeEnum}` `` — a template-literal union derived from the schema-generated `PointShapeEnum` in `@debrief/schemas`. It updates automatically when the LinkML schema grows a new permissible shape. Do **not** hand-type a symbol union anywhere in `@debrief/utils` or `@debrief/components`.

## Produce one

```ts
import { resolvePositionStyle, computeAllPositionStyles } from '@debrief/utils';

const style = resolvePositionStyle(
  /* index */ 0,
  /* defaultStyle */ { show_symbol: true, symbol: 'circle', show_label: false },
  /* symbolIntervalPositions */ new Set<number>(),
  /* labelIntervalPositions */ new Set<number>(),
  /* override */ null,
  /* positionTime */ '2026-01-09T10:00:00Z',
);

console.log(style.showSymbol);   // boolean
console.log(style.symbol);       // PointShape (narrow union)
console.log(style.showLabel);    // boolean
console.log(style.labelText);    // string | null
```

## Consume one

```ts
function renderMarker(style: ResolvedPositionStyle): JSX.Element | null {
  if (!style.showSymbol && !style.showLabel) return null;

  // `style.symbol` is the schema-wide union; an exhaustive switch is the
  // safest pattern. If LinkML adds a new shape, tsc will warn about a missing
  // case in files that enable exhaustiveness checking.
  switch (style.symbol) {
    case 'circle':   return <Circle />;
    case 'square':   return <Square />;
    case 'triangle': return <Triangle />;
    case 'diamond':  return <Diamond />;
    case 'cross':    return <Cross />;
  }

  return style.showLabel && style.labelText
    ? <Tooltip>{style.labelText}</Tooltip>
    : null;
}
```

## Migration from the old shape

If you are porting pre-refactor code (or reviewing a stale PR), two things change:

| Before | After |
|--------|-------|
| `style.label` | `style.labelText` |
| `style.symbol: 'circle' \| 'square' \| 'triangle'` (utils side) | `style.symbol: PointShape` (5-shape union, schema-derived) |

Everything else — `showSymbol`, `showLabel`, function names, function signatures, cascade semantics — is unchanged.

### Don't do this

```ts
// Wrong: hand-typed union. This defeats the point of the refactor.
const s: ResolvedPositionStyle = {
  showSymbol: true,
  symbol: 'circle' as 'circle' | 'square' | 'triangle',
  showLabel: false,
  labelText: null,
};

// Wrong: read the old field.
console.log(s.label); // tsc error: property 'label' does not exist
```

### Do this

```ts
// Right: assign a plain string literal; PointShape accepts any schema shape.
const s: ResolvedPositionStyle = {
  showSymbol: true,
  symbol: 'diamond',   // ok — PointShape includes 'diamond'
  showLabel: true,
  labelText: 'Contact',
};

// Right: read the new field.
console.log(s.labelText);
```

## Verifying behaviour parity

No behavioural change is expected. To confirm nothing regressed on your branch:

```sh
# 1. Unit tests — resolver, five renamed assertions must pass.
uv run pytest && pnpm --filter '!@debrief/web-shell' test

# 2. Type check — catches every stale typed reader.
pnpm -r typecheck

# 3. Visual parity — render the sample catalog and spot-check markers.
pnpm --filter @debrief/web-shell dev
# open http://localhost:5173/ and confirm position symbols + labels look
# identical to main on a known plot (e.g., track-feature-platform-overrides-01.json).

# 4. Full CI gate — required before push.
task verify
```

If all four pass with no change to main, the refactor is done.

## Who consumes this type today?

- `shared/utils/src/interval.ts` — the resolver (produces).
- `shared/utils/tests/interval.test.ts` — asserts resolver output.
- `shared/components/src/utils/time.ts` — a duplicate resolver (produces). Not de-duplicated in this feature (see spec.md Out of Scope).
- `shared/components/src/MapView/PositionSymbolsLayer.tsx` — the map renderer (consumes).

That is the complete inventory as of 2026-04-18. If you add a new producer or consumer, import the type from `@debrief/utils` and never redeclare it locally.
