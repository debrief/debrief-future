# Quickstart: Consume the canonical `ResolvedPositionStyle`

**Feature**: 201-position-style-consolidation
**Audience**: engineers writing or reviewing code that produces or consumes resolved position styles.

This quickstart is for **after** the refactor lands. It shows the import paths, the shape you get, and the one thing you must *not* do any more.

## Import path

```ts
// Preferred — canonical location.
import type { ResolvedPositionStyle, PointShape } from '@debrief/utils';
import { resolvePositionStyle, computeAllPositionStyles, InvalidPointShapeError, assertNever } from '@debrief/utils';

// Still works — components package re-exports everything above unchanged.
import type { ResolvedPositionStyle, PointShape } from '@debrief/components';
import { resolvePositionStyle, computeAllPositionStyles, InvalidPointShapeError } from '@debrief/components';
```

Both import paths resolve to the exact same TypeScript types and functions. There is no second definition hiding under `shared/components/src/utils/time.ts` any more — the interface, the resolver functions, and the `SymbolShape` alias all got collapsed into `@debrief/utils` by feature #201.

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
import { assertNever } from '@debrief/utils';

function renderMarker(style: ResolvedPositionStyle): JSX.Element | null {
  if (!style.showSymbol && !style.showLabel) return null;

  // `style.symbol` is the schema-wide PointShape union. The default branch
  // calls `assertNever(shape)` so that adding a new shape to the LinkML
  // schema causes tsc to fail until every renderer handles it.
  switch (style.symbol) {
    case 'circle':   return <Circle />;
    case 'square':   return <Square />;
    case 'triangle': return <Triangle />;
    case 'diamond':  return <Diamond />;
    case 'cross':    return <Cross />;
    default:         return assertNever(style.symbol);
  }

  return style.showLabel && style.labelText
    ? <Tooltip>{style.labelText}</Tooltip>
    : null;
}
```

## Handle the invalid-shape error

```ts
import { InvalidPointShapeError, computeAllPositionStyles } from '@debrief/utils';
import { logService } from 'apps/vscode/.../logService'; // your LogService

let styles;
try {
  styles = computeAllPositionStyles(positions, defaultStyle, ...);
} catch (err) {
  if (err instanceof InvalidPointShapeError) {
    logService.warn(
      `Track "${trackId}" has an invalid override symbol: ${err.offendingValue}. ` +
      `Valid shapes: ${err.validShapes.join(', ')}.`
    );
    // Render without overrides, or render a "broken override" indicator —
    // project UX choice; FR-018 requires the error is logged and not silently
    // swallowed, but leaves the per-position presentation to the caller.
    styles = computeAllPositionStyles(positions, defaultStyle, ..., /* overrides */ null);
  } else {
    throw err;
  }
}
```

The resolver is the only component that throws `InvalidPointShapeError`; renderers never produce one and should not synthesise one.

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

After feature #201 (expanded scope):

- `shared/utils/src/interval.ts` — the **sole** resolver (produces). The components-side duplicate has been deleted.
- `shared/utils/tests/interval.test.ts` — asserts resolver output (including the new null-override semantics and invalid-symbol throw).
- `shared/components/src/MapView/PositionSymbolsLayer.tsx` — the map renderer (consumes). Uses `PointShape` (no longer has a local `SymbolShape` alias) and calls `assertNever` in switch default branches.
- `apps/vscode/src/tools/track/styling/applySymbolStyle.ts` — the MCP tool (consumes via `PointShape` for TS typing; via `Object.values(PointShapeEnum)` for the runtime inputSchema enum).

If you add a new producer or consumer, import the types from `@debrief/utils` (or `@debrief/components`) and never redeclare them locally. Never hand-type a string-literal union of shape names — the whole point of #201 is to end that pattern.
