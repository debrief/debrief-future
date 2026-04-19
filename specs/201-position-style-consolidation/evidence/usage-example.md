---
feature: 201-position-style-consolidation
captured_at: 2026-04-19
git_sha: 6a6afe5
---

# Usage Example — the new position-style public surface

## Canonical imports

```ts
import {
  // Types
  type PointShape,
  type ResolvedPositionStyle,
  type PositionStyle,
  type PositionStyleOverride,
  // Functions
  resolvePositionStyle,
  computeAllPositionStyles,
  // Runtime helpers
  assertNever,
  InvalidPointShapeError,
} from '@debrief/utils';
```

Components can re-import any of these symbols from `@debrief/components`
without change; the barrel re-exports from `@debrief/utils`.

## Reading a ResolvedPositionStyle exhaustively

`PointShape` is a finite union derived from `PointShapeEnum`. Use
`assertNever` as the default branch of every `switch (symbol)` so that
adding a new shape in LinkML breaks the build until the renderer is
updated:

```ts
function chooseMarker(style: ResolvedPositionStyle): string {
  switch (style.symbol) {
    case 'circle':
      return 'CircleMarker';
    case 'square':
    case 'triangle':
    case 'diamond':
    case 'cross':
      return 'SVG Marker';
    default:
      return assertNever(style.symbol);
  }
}
```

## Handling InvalidPointShapeError at the renderer boundary

If a JSON payload carries `symbol: "star"`, the resolver throws
`InvalidPointShapeError`. Catch it at the renderer and log via the
project's error surface rather than letting the exception crash the
whole track:

```ts
import { useMemo } from 'react';
import { computeAllPositionStyles, InvalidPointShapeError } from '@debrief/utils';

const resolvedStyles = useMemo(() => {
  try {
    return computeAllPositionStyles(positions, defaultStyle, symbolInterval, labelInterval, overrides);
  } catch (err) {
    if (err instanceof InvalidPointShapeError) {
      console.error(
        `[PositionSymbolsLayer] invalid override symbol ${JSON.stringify(err.offendingValue)} — ` +
        `expected one of ${err.validShapes.join(', ')}`
      );
      return [];  // Polyline still renders; symbols/labels skipped for safety.
    }
    throw err;
  }
}, [positions, defaultStyle, symbolInterval, labelInterval, overrides]);
```

## Applying the resolver to a full track

```ts
import type { TrackFeature } from '@debrief/schemas';
import { computeAllPositionStyles } from '@debrief/utils';

function renderTrack(feature: TrackFeature) {
  const resolved = computeAllPositionStyles(
    feature.properties.positions,
    feature.properties.default_position_style,
    feature.properties.symbol_interval,
    feature.properties.label_interval,
    feature.properties.position_style_overrides
  );

  // resolved[i] is the rendering-ready style for position[i]
  for (const style of resolved) {
    if (style.showLabel && style.labelText) {
      // style.labelText is never undefined: it's either a custom string,
      // the formatted timestamp fallback, or null when showLabel is false.
    }
  }
}
```

## Override null semantics (FR-013)

`null` on any override field means "no override — use the cascaded default":

```ts
// Track's default symbol is 'diamond'. An override with symbol: null does
// NOT unset the symbol — it preserves the default.
const override: PositionStyleOverride = { symbol: null };
const resolved = resolvePositionStyle(0, {
  show_symbol: true, symbol: 'diamond', show_label: false,
}, new Set(), new Set(), override, '2026-04-19T12:00:00Z');

resolved.symbol;  // 'diamond' — from the default
```

This matches the LinkML attribute description "null = use default/interval"
and is pinned by the FR-013 test in
`shared/utils/tests/interval.test.ts`.
