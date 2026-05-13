# Usage Example: Storyboard Scene Playback Fidelity

A concrete walkthrough that exercises all four user stories together — the
acceptance scenario behind SC-006 ("all four behaviours land together").

## Scenario

An author is composing a brief that depicts the "minute before contact" by
freezing the playback view at the close-range frame and locking in **Trail
mode** so the audience sees only the recent tail of each platform — not the
full track history that would clutter the close-up.

## Step 1 — Capture Scene 1 in Trail mode at close range

1. Open a sample plot with one or more tracks loaded.
2. Use the time-controller chip to switch to **Trail mode**.
3. Pan and zoom the map onto the contact area (e.g. a regional frame around
   the engagement geometry).
4. Click **Capture Scene** on the StoryboardPanel toolbar.

**What happens internally** (`apps/vscode/src/commands/captureScene.ts`):

```ts
// Step 5 — read session state
const viewport = state.viewport;                  // 4-corner ViewportPolygon
// ...
// Step 9 — derive bounds + capture display_mode
const bounds = sceneBoundsFromViewport(viewport); // SceneBounds POJO
const sceneInput: CreateSceneInput = {
  storyboardId: activeStoryboardId,
  viewport: { center, zoom, bearing: 0 },
  bounds,                                          // ← Spec #258 / FR-004
  polygonSource: bounds !== undefined ? 'bounds' : 'placeholder',
  displayMode: state.displayMode,                  // ← Spec #258 / FR-001
  timestamp: timestampIso,
  // ... other fields ...
};
const { scene } = await createScene(plot, sceneInput);
```

**Stored scene properties** (excerpt):

```json
{
  "kind": "STORYBOARD_SCENE",
  "viewport": { "center": [-1.25, 50.75], "zoom": 11, "bearing": 0 },
  "display_mode": "trail",
  "_polygon_source": "bounds",
  ...
}
```

**Visual confirmation** — the scene's rectangle on the map is drawn at the
exact captured viewport edges (not the pre-#258 ~100 m placeholder square).

## Step 2 — Capture Scene 2 in Full mode at regional scale

5. Switch the time-controller back to **Full mode**.
6. Zoom out to a regional frame.
7. Click **Capture Scene** again.

The second scene records `display_mode: 'full'` and `_polygon_source: 'bounds'`.
Its on-map rectangle is visibly larger than Scene 1's because the captured
zoom is lower.

## Step 3 — FeatureList shows both scenes under their Storyboard parent

The Layers panel now renders:

```
▼ My Scenario (2)              ← storyboard parent, with (N) badge
    HMS Example
    Contact Alpha
    [Scene 1 — DTG label]      ← indented under parent
    [Scene 2 — DTG label]
```

Collapsing the parent hides both children; the parent row's chevron still
visually indicates "this is a parent". If a child is the active scene,
`hasChildSelected` lights up an indicator on the parent (FR-012).

An empty storyboard renders as `My Scenario (0)` with a **disabled** chevron
so the author can still see the storyboard exists (FR-013).

## Step 4 — Click Scene 1 in the panel → Trail mode restored

8. Switch the map to a different area (or change zoom).
9. Click Scene 1 in either the StoryboardPanel or the FeatureList row.

**What happens internally — VS Code** (`storyboardPlayback.executeTransition`,
`apps/vscode/src/services/storyboardPlayback.ts`):

```ts
const token = this.mapPanel.flyToViewport(viewport, durationMs);
// ...
// Spec #258 / FR-002 — restore display_mode after flyTo
const capturedDisplayMode = targetScene.properties.display_mode;
if (session && capturedDisplayMode !== undefined && capturedDisplayMode !== null) {
  session.getState().setDisplayMode(capturedDisplayMode);
}
```

**What happens internally — web-shell** (`StoryboardPanelMount.handleSceneRowClick`):

```ts
const handleSceneRowClick = useCallback(
  (sceneId: string) => {
    for (const f of featureCollection.features) {
      const sceneTest = f as unknown as Parameters<typeof isSceneFeature>[0];
      if (!isSceneFeature(sceneTest)) continue;
      if (sceneTest.properties.id !== sceneId) continue;
      const mode = sceneTest.properties.display_mode;
      if (mode === 'full' || mode === 'trail') {
        sessionStore.getState().setDisplayMode(mode);
      }
      return;
    }
  },
  [featureCollection, sessionStore],
);
```

**Visual confirmation**:

- The map flies to Scene 1's captured viewport.
- The time-controller chip swings back to **Trail mode**.
- Scene 1's rectangle gains the same drop-shadow + pulse halo that selected
  tracks use elsewhere in the app (`debrief-map-feature--selected`).
- Scene 2's rectangle remains neutral.
- In the FeatureList, the Scene 1 row is highlighted; its storyboard parent
  inherits the active indicator if collapsed.

## Step 5 — Legacy scene compatibility

Open a pre-#258 storyboard (no `display_mode`, no `_polygon_source`).

- The scenes still load (FR-003 — no error).
- Their rectangles render at the **real captured viewport size** —
  `SceneRectangleLayer.pickPolygonForRender` detects the absent provenance
  and recomputes from `(viewport, map.getSize())`. The on-disk geometry is
  NEVER rewritten — Article III.2 source preservation.
- Clicking a legacy scene flies the map to the viewport but **does not**
  touch the time-controller mode (FR-003).

## Expected behaviour summary

| Story | Acceptance | How it's tested |
|---|---|---|
| US1 | display_mode captured + restored | `crud.258.test.ts` + Python round-trip + manual walkthrough above |
| US2 | bounds-derived polygon, recompute for legacy | `crud.258.test.ts` + `SceneRectangleLayer.test.tsx` |
| US3 | active-scene halo via existing CSS class | `SceneRectangleLayer.test.tsx` |
| US4 | storyboard grouping with `(N)` badge | `flattenFeatures.test.ts` |
| SC-006 | all four together, no partial-merge state | This walkthrough |
