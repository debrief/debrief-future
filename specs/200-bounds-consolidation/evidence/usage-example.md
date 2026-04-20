# Usage example — consolidated bounds utility (T019)

**Feature**: 200-bounds-consolidation
**Covers**: the public surface of `@debrief/utils`'s bounds helpers and the two
in-tree call sites in `mapPanel.ts`.
**Date**: 2026-04-20
**Git SHA**: `b3d1d99`

---

## Single import for every caller

After consolidation, every in-tree consumer imports from the package root:

```ts
import {
  calculateBounds,
  mergeBounds,
  boundsToLeaflet,
} from '@debrief/utils';
```

`isValidBounds` is also available from the same entry point; it is not
currently consumed from `apps/vscode` but remains part of the public
surface for other callers.

## Call site 1 — plot-open path (`mapPanel.ts:1250`)

```ts
// parseResult.features: SafeFeature[] — a shape the VS Code import
// pipeline produces. Before consolidation, this consumer had its own
// local copy of calculateBounds because the shared version's input type
// was incompatible. Post-consolidation, the widened parameter accepts
// SafeFeature[] via structural subtyping — no cast at the call site.
const newBounds = calculateBounds(parseResult.features);
const mergedBounds = mergeBounds(currentPlot.bbox, newBounds);
```

**Expected output shape**: `Bounds | null`, where `Bounds = [minLon,
minLat, maxLon, maxLat]`. Concrete example — for a single Point feature
at `(10, 20)`:

```
calculateBounds([{ type: 'Feature', geometry: { type: 'Point', coordinates: [10, 20] }, properties: null }])
  → [10, 20, 10, 20]
```

If `parseResult.features` contains a feature with `geometry: null`, that
feature is skipped silently — no throw. The behaviour the VS Code copy
used to carry is now canonical (per FR-002).

## Call site 2 — selection-zoom path (`mapPanel.ts::fitToSelection`)

```ts
// selectedFeatures: DebriefFeature[] — the post-selection subset of the
// currently-loaded plot. Before consolidation, fitToSelection contained
// a ~35-line inline bounds loop that only honoured Point + LineString
// (silently skipping Polygon / MultiPolygon / Multi*). Post-consolidation,
// the call is a single delegation to the consolidated utility.
const bounds = calculateBounds(selectedFeatures);
if (bounds === null) {
  return;
}
this.fitBounds(boundsToLeaflet(bounds));
```

**Expected output shape**:

- `calculateBounds(selectedFeatures): Bounds | null` — as above.
- `boundsToLeaflet(bounds): [[number, number], [number, number]]` —
  `[[minLat, minLon], [maxLat, maxLon]]`, the order Leaflet's
  `fitBounds` expects. Concrete example — for `Bounds = [-10, -20, 30, 40]`:

  ```
  boundsToLeaflet([-10, -20, 30, 40])
    → [[-20, -10], [40, 30]]
  ```

## Before/after at a glance

See `before-after-fittoselection.md` for the full diff; the summary is:

| | Before | After |
|-|--------|-------|
| Plot-open (line 1250) | `import ... from '../utils/bounds'` (local copy) | `import ... from '@debrief/utils'` (canonical) |
| fitToSelection | 35-line inline loop, Point+LineString only | 3-line utility call, every geometry type |

## Zero-cast guarantee

`calculateBounds` accepts every in-tree feature array without an
`as`-cast at the call site:

- `GeoJSONFeature[]` (from `@debrief/utils`).
- `SafeFeature[]` (re-exported as `GeoJSONFeature` in
  `apps/vscode/src/types/import.ts` — used on the plot-open path).
- `DebriefFeature[]` (from `@debrief/components` / `@debrief/schemas` —
  used on the selection-zoom path).

The widening is a structural-minimum helper type private to
`shared/utils/src/bounds.ts`; no new public type was introduced.

---

*(FR-005, FR-006, FR-008; US1, US3, US4.)*
