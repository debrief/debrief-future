# Contract: `SceneRectangleLayer` React component

**Feature**: 217-storyboarding-playback
**File**: `shared/components/src/MapView/SceneRectangleLayer.tsx`
**Status**: Language-neutral contract. Drives implementation + test
names in `shared/components/src/MapView/__tests__/SceneRectangleLayer.test.tsx`.

A presentational React-Leaflet component that renders the active
Storyboard's Scene viewport Polygons as faint rectangles on the map.
Zero VS Code imports; works unchanged in Storybook, web-shell, and
the VS Code webview host.

---

## 1. Public props

```ts
export interface SceneRectangleLayerProps {
  /**
   * Scene Features to render. The caller (the playback service, via
   * MapPanel's `setSceneRectangles`) is responsible for pre-filtering
   * to the active Storyboard's Scenes. Empty array renders nothing.
   */
  readonly scenes: ReadonlyArray<SceneFeature>;

  /**
   * Scopes rendering. If `null`, the layer renders nothing even if
   * `scenes` is non-empty (defence-in-depth against render drift
   * during dropdown transitions).
   */
  readonly activeStoryboardId: string | null;

  /** The Scene whose rectangle should draw with the "current" visual
   *  treatment (slightly bolder outline). `null` when the Storyboard
   *  is empty. */
  readonly currentSceneId: string | null;

  /** Fires on rectangle click. */
  onSceneRectangleClick(sceneId: string): void;
}
```

---

## 2. Rendering rules (FR-PLAY-015 / FR-PLAY-016 / FR-PLAY-018)

### 2.1 Gating

Renders nothing if any of:
- `activeStoryboardId === null`
- `scenes.length === 0`

### 2.2 Per-Scene rendering

For each `scene` in `scenes`, render a `<Polygon>` with:

```ts
<Polygon
  key={scene.properties.id}
  positions={geoJsonPolygonToLeafletCoords(scene.geometry.coordinates)}
  pathOptions={{
    color: tokens.sceneRectangleStroke,       // ThemeProvider token
    fillColor: tokens.sceneRectangleFill,
    fillOpacity: computeFillOpacity(scene, overlapRank, isCurrent),
    weight: isCurrent ? 2 : 1,
    opacity: isCurrent ? 0.9 : 0.5,
    className: `debrief-scene-rect ${isCurrent ? 'debrief-scene-rect--current' : ''}`,
  }}
  eventHandlers={{
    click: (event) => {
      L.DomEvent.stopPropagation(event);
      onSceneRectangleClick(scene.properties.id);
    },
  }}
/>
```

**Geometry source**: `scene.geometry.coordinates` is the GeoJSON
`Polygon` coordinates (outer ring + optional holes; in practice a
single 4-corner outer ring with the closing point, written by
#215's `viewportToPolygon` at capture time). **Not**
`scene.properties.viewport.corners` — the `Viewport` interface in
`@debrief/schemas` is `{center: [lon, lat], zoom: number, bearing: number}`
only (Fix D).

- `isCurrent = scene.properties.id === currentSceneId`
- `overlapRank` is the 0-based index of this Scene among overlapping
  rectangles at approximately the same centroid (stable sort by
  `timestamp`). See §3.

### 2.3 Opacity variation for overlap (FR-PLAY-018)

```ts
function computeFillOpacity(
  scene: SceneFeature,
  overlapRank: number,
  isCurrent: boolean,
): number {
  const base = isCurrent ? 0.28 : 0.18;
  const step = 0.04;
  return Math.max(0.10, base - step * overlapRank);
}
```

Overlap detection is approximate: two rectangles overlap if their
viewport centres are within 10% of the smaller viewport's diagonal.
Cheap O(n²) scan — fine for ≤ 50 Scenes per Storyboard.

### 2.4 Topmost-click behaviour

Rectangles are rendered in ascending `timestamp` order; Leaflet's
default z-order puts later-rendered polygons on top. The stopPropagation
call ensures only the topmost (most recent) rectangle fires
`onSceneRectangleClick`.

### 2.5 Antimeridian handling (R5)

`viewportToLeafletCoords` passes the Polygon's corners through
unchanged — Leaflet renders a visible best-effort polygon that wraps
around the back of the globe in the default EPSG:3857 projection. No
splitting into two polygons (R5).

---

## 3. Helper: `geoJsonPolygonToLeafletCoords`

```ts
function geoJsonPolygonToLeafletCoords(
  coordinates: GeoJSON.Polygon['coordinates'],
): LatLngTuple[] {
  // GeoJSON.Polygon.coordinates: [[[lon, lat], ...]] — outer ring + optional holes.
  // We only use the outer ring; storyboard viewports are always simple rectangles.
  // The outer ring's first and last points are identical (GeoJSON closing rule) —
  // Leaflet handles the duplicate gracefully, so no trim needed.
  return coordinates[0].map(([lon, lat]) => [lat, lon] as LatLngTuple);
}
```

---

## 4. Theme tokens

Added to `shared/components/src/ThemeProvider/tokens.ts`:

```ts
export interface ThemeTokens extends ExistingThemeTokens {
  readonly sceneRectangleStroke: string;
  readonly sceneRectangleFill: string;
}
```

- **Light theme**: `stroke = #3b82f6` (blue-500), `fill = #93c5fd` (blue-300)
- **Dark theme**: `stroke = #60a5fa` (blue-400), `fill = #1e40af` (blue-800)
- **VS Code theme**: `stroke = var(--vscode-focusBorder)`, `fill = var(--vscode-selection-background)`

---

## 5. Test contract

| Test | Asserts |
|---|---|
| `renders nothing when activeStoryboardId is null` | 0 Polygons; no click listeners attached |
| `renders nothing when scenes is empty` | 0 Polygons |
| `renders one Polygon per Scene` | exact count match |
| `rectangles for non-active Storyboards never appear` | fixture with two Storyboards' Scenes merged into `scenes`; only the active-storyboard Scenes render (enforced by caller's filter; the layer trusts its prop but the test doubles as a contract smoke test) |
| `current Scene rectangle has bolder stroke + className` | inspect path options |
| `overlapping rectangles remain individually visible with opacity variation` | 3 Scenes at same centroid; 3 distinct fillOpacity values; all ≥ 0.10 |
| `click on rectangle fires onSceneRectangleClick with correct sceneId` | click event simulation |
| `topmost rectangle wins on overlapping click` | fires only for the most recent Scene at the click point |
| `antimeridian-crossing viewport renders as single best-effort polygon` | fixture with corners `[[170, 10], [-170, 10], [-170, 0], [170, 0]]`; exactly one L.Polygon rendered |
| `no memory leaks — re-render with fewer Scenes cleans up stale polygons` | 3 → 1 Scenes; inspect layer children count |

---

## 6. Non-API guarantees

- **No VS Code imports.** The file imports only from `react`,
  `react-leaflet`, `leaflet`, `@debrief/schemas`, and sibling
  `shared/components/` modules.
- **No side effects.** Pure render; event wiring cleaned up on
  unmount via react-leaflet's built-in lifecycle.
- **Strict types.** `any` / `unknown` prohibited on the public props.
- **Theme-aware.** Colours route through `ThemeProvider` tokens — no
  hardcoded hex in the component body.
