# Before / After — `fitToSelection()` rewrite (T020)

**Feature**: 200-bounds-consolidation
**Covers**: FR-008, US4 AS-1 through AS-6, contracts C9 + C10 + C11.
**Date**: 2026-04-20
**Git SHA**: `b3d1d99`

---

## Before — 35-line inline loop, Point + LineString only

```ts
public fitToSelection(): void {
  // Get selected IDs from session state
  const selectedIds = this.activeSession
    ? new Set(this.activeSession.getState().selection.featureIds)
    : new Set<string>();

  if (selectedIds.size === 0) {
    return;
  }

  const selectedFeatures = this.currentFeatures.filter(
    (f: DebriefFeature) => selectedIds.has(String(f.id))
  );
  if (selectedFeatures.length === 0) {
    return;
  }

  // Calculate bounds from selected features
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const feature of selectedFeatures) {
    const geom = feature.geometry as { type: string; coordinates: unknown };
    const coords = geom.coordinates;
    if (geom.type === 'LineString') {
      for (const coord of coords as number[][]) {
        const lng = coord[0];
        const lat = coord[1];
        if (typeof lng === 'number' && typeof lat === 'number') {
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
        }
      }
    } else if (geom.type === 'Point') {
      const coord = coords as number[];
      if (coord.length >= 2) {
        minLat = Math.min(minLat, coord[1]!);
        maxLat = Math.max(maxLat, coord[1]!);
        minLng = Math.min(minLng, coord[0]!);
        maxLng = Math.max(maxLng, coord[0]!);
      }
    }
  }

  if (minLat !== Infinity) {
    this.fitBounds([
      [minLat, minLng],
      [maxLat, maxLng],
    ]);
  }
}
```

**Problems with the pre-change code:**

- **Silent miss** — the `if / else if` only honours `Point` and
  `LineString`. Selecting a `Polygon`, `MultiPolygon`, `MultiPoint`, or
  `MultiLineString` contributes nothing to the bounds; if the entire
  selection is one of those types, the `minLat !== Infinity` guard
  fires and the viewport does not change. The user sees "zoom to
  selection does nothing" with no error. (**US4's motivating bug.**)
- **Double-cast pattern** — `feature.geometry as { type: string; coordinates: unknown }` on line 437 launders the LinkML-typed
  `DebriefFeature.geometry` into a freeform shape, and then `coords as number[][]` / `coords as number[]` re-cast the untyped `unknown`.
  Article XV tripwire.
- **Latent fourth copy** of "compute bounds from features" logic — the
  same job `shared/utils/src/bounds.ts`, `apps/vscode/src/utils/bounds.ts`
  (pre-delete), and `shared/components/src/utils/bounds.ts` already do.

## After — 3-line delegation to the consolidated utility

```ts
public fitToSelection(): void {
  // Get selected IDs from session state
  const selectedIds = this.activeSession
    ? new Set(this.activeSession.getState().selection.featureIds)
    : new Set<string>();

  if (selectedIds.size === 0) {
    return;
  }

  const selectedFeatures = this.currentFeatures.filter(
    (f: DebriefFeature) => selectedIds.has(String(f.id))
  );
  if (selectedFeatures.length === 0) {
    return;
  }

  const bounds = calculateBounds(selectedFeatures);
  if (bounds === null) {
    return;
  }
  this.fitBounds(boundsToLeaflet(bounds));
}
```

**What the rewrite delivers:**

- Every geometry type the consolidated utility supports now contributes
  to the selection viewport — the silent miss is gone.
- No casts at the call site. `DebriefFeature[]` flows into the widened
  `calculateBounds` parameter via structural subtyping.
- One-line delegation — the method's job is now "resolve the selected
  feature subset and defer to the utility", not "re-implement bounds
  logic in situ".

## Diff stats

| | Before | After | Delta |
|-|--------|-------|-------|
| Lines in `fitToSelection()` body | 55 | 22 | **−33 lines** |
| Per-geometry-type branches | 2 (Point, LineString) | 0 (delegated) | — |
| `as`-casts inside the method | 3 | 0 | **−3** |
| Geometry types honoured | 2 | 6 | **+4** |

## Behavioural matrix — what changes, what doesn't

| Selection | Pre-change viewport | Post-change viewport |
|-----------|---------------------|----------------------|
| empty | unchanged (early-return) | unchanged (early-return — preserved) |
| Points only | tight bounds of points | tight bounds of points (identical) |
| LineStrings only | tight bounds of vertices | tight bounds of vertices (identical) |
| Point + LineString mix | union of both | union of both (identical) |
| **Polygon** | **no zoom (silent miss)** | **tight bounds of outer ring** |
| **MultiPolygon** | **no zoom (silent miss)** | **tight bounds of all polygons** |
| **MultiPoint** | **no zoom (silent miss)** | **tight bounds of all sub-points** |
| **MultiLineString** | **no zoom (silent miss)** | **tight bounds of all sub-lines** |
| only null-geometry features | no zoom (inline min/maxes stayed at Infinity) | unchanged (early-return on `bounds === null`) |

---

*(FR-008, FR-009, US4 AS-1 through AS-6; C9, C10, C11.)*
