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

### NEW slot

| Slot | Type | Required | Default | Notes |
|---|---|---|---|---|
| `display_mode` | `DisplayModeEnum` (`full` \| `trail`) | **false** | _none_ | Reuses enum from `session-state.yaml`. Writers MUST populate; readers MUST tolerate absence (FR-003). |

### LinkML excerpt (intended)

```yaml
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
```

### Validation rules

- **Enum membership**: `display_mode ∈ {full, trail}` when present (FR-001).
- **Absence**: a missing `display_mode` is valid and does not raise (FR-003).
- **Capture invariant** (enforced by callers, not the schema): `display_mode == session.getState().displayMode` at the moment the scene is created.

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

### Flattening rule (new)

```
For each top-level feature f:
  if f.properties.kind === 'STORYBOARD':
    emit DisplayItem{ type: 'storyboard', id: f.id, depth: 0,
                       isExpandable: true, parentId: null,
                       feature: f, label: f.properties.name }
    if expanded:
      for each top-level feature s where
        s.properties.kind === 'STORYBOARD_SCENE'
        AND s.properties.storyboard_id === f.properties.id:
        emit DisplayItem{ type: 'feature', id: s.id, depth: 1,
                           isExpandable: false, parentId: f.id,
                           feature: s, label: s.properties.title }
  else if f.properties.kind === 'STORYBOARD_SCENE':
    skip (consumed by the storyboard branch above)
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

- **Capture-time**: polygon corners are derived from `map.getBounds()` at the moment of capture. Coordinate order: `[SW, NW, NE, SE, SW]` (closed ring; outer ring only, no holes).
- **Render-time fallback**: if the stored polygon matches the legacy-placeholder heuristic (C-6 in research.md — both bbox dimensions <0.005° and centre within 0.001° of `viewport.center`), the layer recomputes corners on-the-fly from `(viewport, map.getSize())`. The on-disk value is **not** rewritten.
- **Validity**: every polygon MUST be a valid closed GeoJSON `Polygon` with non-degenerate area at all supported zoom levels (FR-005).

### Legacy detection (pseudocode, render-side only)

```ts
function isLegacyPlaceholder(polygon: GeoJSONPolygon, viewport: Viewport): boolean {
  const bbox = computeBbox(polygon);                       // [minLon, minLat, maxLon, maxLat]
  const widthDeg  = bbox[2] - bbox[0];
  const heightDeg = bbox[3] - bbox[1];
  if (widthDeg >= 0.005 || heightDeg >= 0.005) return false;

  const cx = (bbox[0] + bbox[2]) / 2;
  const cy = (bbox[1] + bbox[3]) / 2;
  const dx = Math.abs(cx - viewport.center[0]);
  const dy = Math.abs(cy - viewport.center[1]);
  return dx < 0.001 && dy < 0.001;
}
```

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

No new arrows — every consumer relationship is pre-existing. The feature adds payload (one slot + one tree row type) without rewiring the graph.
