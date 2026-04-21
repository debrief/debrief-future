# Contract: `MapView.flyTo` + scene-click events

**Feature**: 217-storyboarding-playback
**Files**:
- `shared/components/src/MapView/MapView.tsx` (extend)
- `apps/vscode/src/webview/mapPanel.ts` (extend — public surface below)
- `apps/vscode/src/webview/web/mapView.tsx` (internal wiring — not a public contract)

**Status**: Language-neutral contract for the two new `MapView`
capabilities that #217 needs: programmatic animated navigation and
a Scene-rectangle click surface.

---

## 1. New `MapView` props

```ts
export interface MapViewProps extends ExistingMapViewProps {
  // ── NEW for #217 ─────────────────────────────────────────────────

  /**
   * Animated viewport target. When set, the MapView animates to this
   * viewport's centre + zoom via Leaflet `L.Map.flyTo`. `null` means
   * "no pending animation" (the typical idle state).
   *
   * Each time this prop transitions to a new non-null value (or the
   * same value with a different `token`), the MapView kicks off a new
   * animation. The caller is responsible for generating a fresh token
   * per transition (typically the `transitionId` from the playback
   * service).
   */
  readonly flyToTarget?: FlyToTarget | null;

  /**
   * The Scene Features to render as faint rectangles on the map.
   * Rendering rules defined in `contracts/scene-rectangle-layer.md`.
   */
  readonly sceneRectangles?: SceneRectangleLayerProps;

  /** Fires when a Scene rectangle is clicked. The rectangle layer owns
   *  click forwarding; MapView just re-exports the handler for convenience. */
  onSceneRectangleClick?(sceneId: string): void;
}

export interface FlyToTarget {
  /** Monotonically-increasing identifier — each new transition gets a
   *  new token; repeated values are idempotent. */
  readonly token: number;

  /** Centre + zoom. Typically resolved from a Scene's `viewport`. */
  readonly center: readonly [number, number];  // [lat, lon]
  readonly zoom: number;

  /** Animation duration in ms. `0` means "jump without animation". */
  readonly durationMs: number;
}
```

### Animation implementation

```ts
// Inside MapController (existing child of MapView):
useEffect(() => {
  if (!flyToTarget) return;
  if (flyToTarget.durationMs === 0) {
    map.setView(flyToTarget.center, flyToTarget.zoom, { animate: false });
    onFlyToComplete?.(flyToTarget.token);
    return;
  }
  map.flyTo(flyToTarget.center, flyToTarget.zoom, {
    duration: flyToTarget.durationMs / 1000,
    easeLinearity: 0.25,   // matches Leaflet's documented ease-in-out curve
  });
  const handler = () => {
    map.off('moveend', handler);
    onFlyToComplete?.(flyToTarget.token);
  };
  map.on('moveend', handler);
  return () => { map.off('moveend', handler); };
}, [flyToTarget?.token]);
```

Cancellation:

- If a new `flyToTarget.token` arrives while a flight is in progress,
  the effect cleanup's `map.off` releases the previous handler; the
  new `map.flyTo` call aborts the previous animation (Leaflet's
  documented behaviour — new movement commands cancel the in-flight
  one).
- If the token is cleared to `null`, the effect cleanup detaches the
  listener; no `map.stop()` is issued — the animation completes or
  is superseded by the next user interaction.

---

## 2. `MapPanel` public surface (extension side)

`MapPanel` is the VS Code extension wrapper around the webview. The
`StoryboardPlaybackService` talks to the map exclusively through this
surface — never touches Leaflet directly from the extension host.

```ts
export class MapPanel {
  // ── Existing public surface (unchanged) ───────────────────────────
  public getCurrentFeatures(): DebriefFeature[];
  public setFeatures(features: DebriefFeature[]): void;
  public getCurrentPlot(): Plot | null;
  public requestThumbnailCapture(): Promise<ThumbnailPair | null>;

  // ── NEW for #217 ─────────────────────────────────────────────────

  /** Kick off an animated flyTo. Generates a fresh token internally
   *  and returns it; the caller uses it to correlate completion.
   *  If `durationMs === 0` the map jumps without animation (setView
   *  with animate:false) and `onFlyToComplete` fires synchronously
   *  with the returned token. */
  public flyToViewport(
    viewport: Viewport,
    durationMs: number,
  ): number;

  /** Push the active Storyboard's Scene rectangles to the webview.
   *  Passing `null` clears the overlay. The webview-side
   *  SceneRectangleLayer reads `scene.geometry.coordinates` (the
   *  GeoJSON Polygon) for each rectangle — NOT
   *  `scene.properties.viewport.corners` (Fix D). */
  public setSceneRectangles(
    scenes: ReadonlyArray<SceneFeature> | null,
    activeStoryboardId: string | null,
    currentSceneId: string | null,
  ): void;

  /** Event: fires when the user clicks a Scene rectangle on the map. */
  public readonly onSceneRectangleClick: vscode.Event<string>;

  /** Event: fires when an in-flight flyTo animation completes.
   *  Emits the token that was returned from `flyToViewport`.
   *  The playback service ALSO listens for webview visibility and
   *  a durationMs+250ms safety timer (R8) — `onFlyToComplete` is
   *  one of three independent clear triggers, not the sole path. */
  public readonly onFlyToComplete: vscode.Event<number>;

  /** NEW (arch-fix 2). Event: fires whenever `setFeatures` is called.
   *  Emits the new `DebriefFeature[]`. The StoryboardPlaybackService
   *  subscribes to drive its `onPlotFeaturesChanged(documentUri)`
   *  lifecycle — recomputes sceneOrder + falls back via
   *  `getMostRecentlyModifiedStoryboard` if the active Storyboard was
   *  externally deleted. Follows the existing logPanelView
   *  `_onFeaturesChanged` pattern (apps/vscode/src/views/logPanelView.ts:123). */
  public readonly onFeaturesChanged: vscode.Event<DebriefFeature[]>;
}
```

---

## 3. Extension → MapPanel webview messages

Added to the existing `MapPanelMessage` discriminated union (file
`apps/vscode/src/webview/messages.ts`):

```ts
export type MapPanelMessage =
  | ExistingMapPanelMessages
  | { type: 'flyTo';
      token: number;
      center: readonly [number, number];
      zoom: number;
      durationMs: number; }
  | { type: 'setSceneRectangles';
      scenes: ReadonlyArray<{ sceneId: string; viewport: Viewport; timestamp: string }>;
      activeStoryboardId: string | null;
      currentSceneId: string | null; };
```

## 4. MapPanel webview → extension messages

```ts
export type MapPanelToExtensionMessage =
  | ExistingInboundMessages
  | { type: 'flyToComplete'; token: number }
  | { type: 'sceneRectangleClicked'; sceneId: string };
```

---

## 5. Integration with main GeoJSON layer

`MapView`'s existing GeoJSON rendering layer filters out Storyboard
Features (never rendered) and Scene Features (rendered separately by
`SceneRectangleLayer` only when they belong to the active Storyboard).
The filter is prop-controlled:

```ts
function shouldRenderInBaseLayer(feature: GeoJSON.Feature): boolean {
  const kind = feature.properties?.kind;
  return kind !== 'STORYBOARD' && kind !== 'STORYBOARD_SCENE';
}
```

This keeps the base layer unaware of storyboard entities and
guarantees FR-PLAY-015 (parent Storyboard Feature never renders).

---

## 6. Test contract

| Test | Asserts |
|---|---|
| `flyTo with durationMs > 0 triggers L.Map.flyTo` | spies on `L.Map.flyTo`; verifies args |
| `flyTo with durationMs === 0 triggers setView with animate:false` | spies on `L.Map.setView`; verifies options |
| `new token during in-flight flyTo supersedes the previous flight` | two sequential tokens; only the second `flyTo` completes |
| `onFlyToComplete fires with the correct token on moveend` | event spy; assert token value |
| `onSceneRectangleClick fires with the clicked sceneId` | simulates click on rectangle; event spy |
| `base GeoJSON layer filters out STORYBOARD and STORYBOARD_SCENE` | fixture plot with one of each; assert only non-storyboard Features rendered |
| `setSceneRectangles(null) clears the overlay` | render then clear; assert 0 polygons in layer |
| `onFeaturesChanged fires on every setFeatures call` | call setFeatures twice; event spy fires twice with the corresponding arrays (arch-fix 2) |
