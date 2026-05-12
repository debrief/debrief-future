# Data Model — Storyboard Scene Playback Fidelity & UI Polish

**Feature**: 258 | **Phase**: 1 | **Date**: 2026-05-12

Schema-level entities touched (one slot added; one tree-row type added). Everything else is consumed unchanged.

---

## 1. `SceneProperties` (extended)

**Source of truth**: `shared/schemas/src/linkml/storyboard.yaml`

### Existing slots (unchanged)

| Slot | Type | Required | Notes |
|---|---|---|---|
| `kind` | `FeatureKindEnum` (pinned `STORYBOARD_SCENE`) | ✓ | Discriminator |
| `id` | string (ULID) | ✓ | Immutable |
| `storyboard_id` | string (ULID) | ✓ | FK → `StoryboardProperties.id` |
| `title` | string | ✓ | DTG-derived default |
| `description` | string | – | Markdown |
| `viewport` | `Viewport` | ✓ | Centre + zoom |
| `timestamp` | datetime | ✓ | Drives ordering |
| `time_range` | string | – | Reserved v2 |
| `visible_feature_ids` | string[] | ✓ | Canonicalised |
| `feature_set_hash` | string (SHA-256) | ✓ | Of `visible_feature_ids` |
| `thumbnail_asset_ref` | string | ✓ | STAC asset key |
| `transition_duration_ms` | integer ≥0 | ✓ | Default 500 |

### NEW slots

| Slot | Type | Required | Default | Notes |
|---|---|---|---|---|
| `display_mode` | `DisplayModeEnum` (`full` \| `trail`) | **false** | _none_ | Reuses enum from `session-state.yaml`. Writers MUST populate; readers MUST tolerate absence (FR-003). |
| `_polygon_source` | `PolygonSourceEnum` (`bounds` \| `placeholder` \| `manual`) | **false** | _none_ | Provenance of `scene.geometry`. `'bounds'` = computed from real map bounds at capture (post-#258 norm). Absent / `'placeholder'` = legacy pre-#258. `'manual'` reserved for future user-drawn rectangles. Render-side recomputes the polygon when value ≠ `'bounds'`. |

### LinkML excerpt (intended)

```yaml
enums:
  # ... existing enums unchanged ...
  PolygonSourceEnum:
    description: Provenance of a Scene's stored polygon geometry.
    permissible_values:
      bounds:
        description: Polygon computed from real Leaflet map bounds at capture time.
      placeholder:
        description: Pre-#258 ~100m placeholder square. Rendered by recomputation.
      manual:
        description: Reserved for future user-drawn rectangles.

classes:
  SceneProperties:
    is_a: BaseFeatureProperties
    description: >-
      Properties class for a Scene child Feature. ...
    attributes:
      # ... existing slots unchanged ...
      display_mode:
        description: >-
          Time-controller display mode at capture time (full = entire track
          history; trail = only the tail behind each platform). Reuses
          DisplayModeEnum from session-state.yaml. Optional for legacy
          compatibility; the reader leaves the time controller untouched
          when this slot is absent.
        range: DisplayModeEnum
        required: false
      _polygon_source:
        description: >-
          Provenance of the scene's stored polygon geometry. Render-side
          consumers recompute the polygon from (viewport, map dimensions)
          when this value is anything other than 'bounds' (including when
          the slot is absent, for legacy scenes). The stored geometry is
          NEVER rewritten on read (Article III.2 source preservation).
        range: PolygonSourceEnum
        required: false
```

### Validation rules

- **`display_mode` enum membership**: `display_mode ∈ {full, trail}` when present (FR-001).
- **`display_mode` absence**: a missing `display_mode` is valid and does not raise (FR-003).
- **`display_mode` capture invariant** (enforced by callers, not the schema): `display_mode == session.getState().displayMode` at the moment the scene is created.
- **`_polygon_source` enum membership**: `_polygon_source ∈ {bounds, placeholder, manual}` when present.
- **`_polygon_source` capture invariant**: a scene created by `bboxToPolygon(map.getBounds(), 'bounds')` MUST have `_polygon_source: 'bounds'`. The two are populated together — they cannot disagree.
- **`_polygon_source` render contract**: render-side consumers MUST recompute the polygon when `_polygon_source` is absent or ≠ `'bounds'`. They MUST NOT rewrite the stored value (Article III.2).

### State transitions (playback)

```
   ┌─────────────────┐    setCurrentSceneId(s)    ┌───────────────────────┐
   │ scene inactive  │ ─────────────────────────▶ │ scene active          │
   │ (no halo)       │                             │ (halo applied)        │
   │                 │ ◀───────────────────────── │ flyToViewport done    │
   └─────────────────┘                             │ setDisplayMode(d?)    │
                                                   └───────────────────────┘
```

`setDisplayMode` only fires when `display_mode` is present in the scene's properties.

---

## 2. `DisplayModeEnum` (read-only, referenced)

**Source of truth**: `shared/schemas/src/linkml/session-state.yaml:37-46`

```yaml
DisplayModeEnum:
  permissible_values:
    full:
      description: Show entire track history
    trail:
      description: Show only a tail behind each platform
```

Not modified by this feature. Referenced by `SceneProperties.display_mode` (see C-2 in research.md).

---

## 3. `FeatureList` `DisplayItem` (extended)

**Source of truth**: `shared/components/src/FeatureList/flattenFeatures.ts`

### Existing `DisplayItemType` (unchanged)

```ts
export type DisplayItemType =
  | 'feature'    // top-level (Track, Point, etc.)
  | 'position'   // child of Track
  | 'point'      // child of MultiPoint
  | 'polygon'    // child of MultiPolygon
  | 'segment'    // child of Track (segment metadata)
  | 'group'      // generic grouping (existing)
  | 'sensor'     // child sensor feature
  | 'contact';   // child contact feature
```

### NEW value

```ts
export type DisplayItemType =
  | 'feature'
  | 'storyboard'   // ← NEW: collapsible parent row for a STORYBOARD feature
  | 'position'
  | 'point'
  | 'polygon'
  | 'segment'
  | 'group'
  | 'sensor'
  | 'contact';
```

A row of type `'storyboard'` is generated when a top-level feature has `kind === 'STORYBOARD'`. Its children are the Scene features (top-level `kind === 'STORYBOARD_SCENE'` features) whose `storyboard_id === parent.id`. Scene rows use type `'feature'` (they are themselves features) but with `parentId === storyboard.id` and `depth === 1`.

Storyboard rows additionally carry a `childCount: number` field (added to the existing `DisplayItem` interface as `childCount?: number`) populated with the number of matching scene features. The count is rendered as a badge after the storyboard name (e.g. `My Scenario (5)`) regardless of expand/collapse state — empty storyboards display `(0)`. The count is recomputed on each `flattenFeatures` call (O(features); negligible at typical scale).

### Flattening rule (new)

```
For each top-level feature f:
  if f.properties.kind === 'STORYBOARD':
    children = features where kind === 'STORYBOARD_SCENE' AND storyboard_id === f.properties.id
    emit DisplayItem{ type: 'storyboard', id: f.id, depth: 0,
                       isExpandable: children.length > 0,         // disabled chevron when empty
                       parentId: null, feature: f,
                       label: f.properties.name,
                       childCount: children.length }              // NEW — drives `(N)` badge
    if expanded AND children.length > 0:
      for each s in children (sorted by timestamp ascending):
        emit DisplayItem{ type: 'feature', id: s.id, depth: 1,
                           isExpandable: false, parentId: f.id,
                           feature: s, label: s.properties.title }
  else if f.properties.kind === 'STORYBOARD_SCENE':
    if a matching STORYBOARD parent exists in this feature list:
      skip (consumed by the storyboard branch above)
    else:
      // Orphan scene fallback (FR-014 edge case): emit as top-level with a
      // logged warning. Discoverable, not silent (Article I.3).
      emit DisplayItem{ type: 'feature', id: s.id, depth: 0, ... }
      console.warn('Scene with orphan storyboard_id', s.id, s.properties.storyboard_id)
  else:
    [unchanged existing behaviour]
```

### Edge cases (covered by tests)

- **Storyboard with zero scenes**: emit only the parent row; `isExpandable: false`, chevron rendered disabled (FR-013).
- **Orphan scene** (`storyboard_id` points at a non-existent storyboard): emit the scene as a top-level feature row to preserve discoverability; log a warning (Article I.3 — no silent failure).
- **Multiple storyboards**: each storyboard's scenes are routed under its own parent; scenes never appear under the wrong parent (FR-010, FR-014).
- **Active scene inside a collapsed parent**: the parent row gets `hasChildSelected === true` (existing helper); the FeatureRow component already applies the active-state styling when this flag is true (FR-012).

---

## 4. Scene polygon (geometry payload)

**Source of truth**: GeoJSON `Polygon` on each scene feature; rendered by `SceneRectangleLayer`.

### Invariants

- **Capture-time**: polygon corners are derived from `map.getBounds()` at the moment of capture by `bboxToPolygon(bounds, 'bounds')`. Coordinate order: `[SW, NW, NE, SE, SW]` (closed ring; outer ring only, no holes). The scene's `_polygon_source` slot is set to `'bounds'` in the same operation.
- **Render-time recompute**: `SceneRectangleLayer` checks `_polygon_source`. If `'bounds'`, render `scene.geometry` as-is (the fast path). If absent or any other value, recompute corners from `(viewport, map.getSize())` using `containerPointToLatLng({x:0,y:0})` and `containerPointToLatLng(map.getSize())`. Memoised by `(scene.id, mapZoom)` so a stable pan/zoom doesn't trigger repeated recomputes.
- **Source preservation**: the on-disk geometry is NEVER rewritten on read. The recomputed polygon is transient — only what's drawn this frame.
- **Validity**: every polygon (stored or recomputed) MUST be a valid closed GeoJSON `Polygon` with non-degenerate area at all supported zoom levels (FR-005).

### Metadata-driven render decision (pseudocode, render-side)

```ts
function pickPolygonForRender(
  scene: SceneFeature,
  map: LeafletMap,
): GeoJSONPolygon {
  if (scene.properties._polygon_source === 'bounds') {
    return scene.geometry as GeoJSONPolygon;        // trust capture-time value
  }
  // Legacy ('placeholder', 'manual', or absent) — recompute from viewport.
  return recomputeFromViewport(scene.properties.viewport, map.getSize(), map);
}

// Memoised in SceneRectangleLayer via useMemo keyed on (scene.id, map.getZoom()).
```

No geometric heuristic is used at any point. The decision is explicit and audit-trail-friendly (Article III.1).

---

## 5. CSS class application (active-scene halo)

**Source of truth**: `shared/components/src/MapView/SceneRectangleLayer.tsx` + `MapView.css`

Existing class structure per scene rectangle:

```
<Polygon className="debrief-scene-rect[ debrief-scene-rect--current]" .../>
```

NEW: append `debrief-map-feature--selected` to the active scene's rectangle:

```
<Polygon className="debrief-scene-rect debrief-scene-rect--current debrief-map-feature--selected" .../>
```

This re-uses the existing halo (drop-shadow + pulse animation) defined in `MapView.css` for selected tracks. No new CSS rules are introduced (C-4 in research.md).

---

## 6. Cross-entity dependencies

```
LinkML storyboard.yaml
    ▲ generates
    │
Pydantic + TS types  ──▶  @debrief/schemas
                              ▲
                              │ imports
            ┌─────────────────┴─────────────────┐
            │                                   │
    shared/components/src/storyboard/      shared/components/src/FeatureList/
        ├─ crud.ts (createScene, viewportToPolygon)   └─ flattenFeatures.ts
        └─ MapView/SceneRectangleLayer.tsx                  (storyboard grouping)
            │                                   │
            └───────────── consumed by ─────────┘
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
    apps/vscode/                          apps/web-shell/
        ├─ commands/captureScene.ts          ├─ commands/captureSceneWeb.ts
        └─ services/storyboardPlayback.ts    └─ (web playback service)
                              │
                              ▼
                @debrief/session-state (Zustand)
                  temporal.ts: displayMode, setDisplayMode
```

One new arrow added by this feature: `StoryboardPanel` now emits an `onSceneActivated(scene)` callback that each host (VS Code and web-shell) wires to its own session.setDisplayMode call. This honours Article IV.1 (shared panel signals; host applies) and resolves the original plan's vague "(web playback service)" handwave.

```
                                    StoryboardPanel
                                        │
                                        │ onSceneActivated(scene)
                                        │ (NEW callback — both hosts subscribe)
                ┌───────────────────────┼───────────────────────┐
                ▼                       │                       ▼
   apps/vscode (storyboardPlayback     │           apps/web-shell (App.tsx
     wires callback)                   │              temporal handler wires callback)
                │                       │                       │
                └───────────────────────┴───────────────────────┘
                                        │
                                        ▼
                          session.setDisplayMode(scene.properties.display_mode)
                          (skipped when display_mode is absent — FR-003)
```

Payload additions: one new SceneProperties slot (`display_mode`), one new SceneProperties provenance slot (`_polygon_source`), one new DisplayItemType (`'storyboard'`), one new DisplayItem field (`childCount`).
