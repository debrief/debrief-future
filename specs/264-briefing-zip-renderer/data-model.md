# Phase 1 Data Model — Air-Gapped Briefing Zip

**Feature**: 264-briefing-zip-renderer
**Status**: Complete
**Date**: 2026-05-19

## Scope

This feature **introduces no new persistent schema types**. It consumes
the existing `StoryboardFeature` and `SceneFeature` defined by
`shared/schemas/src/linkml/storyboard.yaml` (with `time_range` /
`viewport_end` extensions from #263), and reuses the existing STAC
`item.json` shape.

What this document captures is therefore not new schema, but **on-disk
artefact contracts** — the file structure of the briefing zip — plus
the **in-memory shapes** the SPA loads from those artefacts.

All artefact contracts derive from existing typed sources via
`Pick<…>` / `Omit<…>` (Constitution Article IV.5 — boundary types are
derived, not rewritten). No fields are re-listed by name.

---

## 1. Briefing Zip — on-disk layout

```text
briefing-{storyboard-name}-{YYYYMMDD-HHMMSS}.zip
└── (unzip root)
    ├── index.html                         # SPA entry; data inlined at export
    ├── assets/                            # SPA static bundle (hashed JS/CSS/fonts)
    │   ├── index-{hash}.js
    │   ├── index-{hash}.css
    │   └── …
    ├── features.geojson                   # convenience copy; primary load is inline
    ├── item.json                          # STAC item, scoped + rewritten hrefs
    ├── scene-thumbnails/
    │   ├── scene-{ULID-1}.png
    │   ├── scene-{ULID-1}-sm.png
    │   ├── scene-{ULID-2}.png
    │   └── …
    └── tiles/
        └── {z}/{x}/{y}.png                # Leaflet XYZ layout
```

### Invariants

- **All paths inside the zip are relative**. The recipient unzips into
  any directory; `index.html` resolves siblings without absolute paths
  or environment assumptions.
- **`index.html` is per-export bespoke**: it is a copy of the SPA
  template with two inlined `<script type="application/json">` blocks
  injected (see § 4). The same JSON payloads appear separately as
  `features.geojson` and `item.json` so the artefact is inspectable
  outside the browser.
- **The `assets/` directory is byte-identical across exports** — it is
  the prebuilt SPA bundle copied from
  `apps/vscode/resources/briefing-renderer-static/`. Per-export
  customisation is confined to `index.html`.

---

## 2. `features.geojson` (briefing payload)

A `FeatureCollection` scoped to one Storyboard. Schema is **exactly**
the existing plot `FeatureCollection` — no new fields, no removed
required fields.

### Contract (derived, not rewritten)

```ts
// services/briefing-zip/src/types.ts
import type {
  PlotFeatureCollection,                  // existing — from @debrief/schemas
  PlotFeature,
  StoryboardFeature,
  SceneFeature,
} from '@debrief/schemas';

// The briefing payload IS a plot FC — no field re-listing.
export type BriefingFeatureCollection = PlotFeatureCollection;

// Compile-time guard: if the source FC grows new keys, this fails
// until the briefing payload contract is consciously updated.
type _Exhaustive =
  Exclude<keyof PlotFeatureCollection,
          keyof BriefingFeatureCollection> extends never ? true : never;
```

### Scoping rules (computed at export, validated at load)

| Rule | Description |
|------|-------------|
| BR-1 | Contains exactly one `StoryboardFeature` (the exported Storyboard). |
| BR-2 | Contains every `SceneFeature` where `properties.storyboard_id` equals the exported Storyboard's `id`. |
| BR-3 | Contains every non-Storyboard / non-Scene feature whose `id` appears in any Scene's `visible_feature_ids` (computed as the union across all Scenes from BR-2). |
| BR-4 | Contains no `StoryboardFeature` other than the one exported and no `SceneFeature` whose `storyboard_id` points elsewhere. |
| BR-5 | Feature order within the collection is: the chosen `StoryboardFeature` first, then `SceneFeature` entries ordered by `(timestamp, creation_order)`, then referenced data features in their original plot order. |

### Time-range awareness (inherits from #263)

Scenes may carry `properties.time_range` and `properties.viewport_end`.
The briefing payload schema is identical to the plot payload, so these
fields round-trip without special handling.

---

## 3. `item.json` (briefing scope)

A scoped subset of the source plot's STAC item. Carries only what the
SPA needs to render plot-level chrome (title bar in Minimal mode) and
to resolve Scene-thumbnail `href`s.

### Contract (derived)

```ts
import type { StacItem } from '@debrief/schemas';

// Briefing item.json keeps a strict subset of STAC fields plus a
// scoped assets map. Derived via Pick to make the contract
// machine-checked.
export type BriefingItemJson = Pick<
  StacItem,
  'type' | 'stac_version' | 'id' | 'properties' | 'assets' | 'links'
>;
// `properties` retains: title, datetime, start_datetime, end_datetime,
// proj:* metadata. `assets` is filtered to only include Scene-thumbnail
// keys referenced by the exported Storyboard.
```

### Scoping rules

| Rule | Description |
|------|-------------|
| BI-1 | `id` matches the source plot's STAC item `id`. |
| BI-2 | `properties.title` and time-bound fields (`datetime`, `start_datetime`, `end_datetime`) are copied unmodified. |
| BI-3 | `assets` contains exactly the `thumbnail_asset_ref` keys referenced by Scenes in BR-2. All other asset entries (e.g. the source REP file, other plots) are removed. |
| BI-4 | Each retained asset's `href` is rewritten to remain valid post-unzip — for thumbnails this is unchanged (`./scene-thumbnails/scene-{ULID}.png` already relative). Non-thumbnail assets are excluded by BI-3 so don't need rewriting. |
| BI-5 | `links` is reduced to `self` only (pointing to `./item.json`); any external `parent`, `collection`, or `root` links are removed (they would dangle in the briefing context). |

---

## 4. Inlined data blocks in `index.html`

The SPA template `apps/briefing-renderer/index.html` contains placeholder
slots that the export command fills with stringified JSON:

```html
<!doctype html>
<html lang="en">
  <head>…</head>
  <body>
    <div id="briefing-root"></div>

    <!-- Filled at export time -->
    <script type="application/json" id="briefing-features-data">
      <!-- JSON.stringify(BriefingFeatureCollection) -->
    </script>
    <script type="application/json" id="briefing-item-data">
      <!-- JSON.stringify(BriefingItemJson) -->
    </script>
    <script type="application/json" id="briefing-config">
      <!-- { tileLayerAttribution: "...", schemaVersion: "..." } -->
    </script>

    <script type="module" src="/assets/index-{hash}.js"></script>
  </body>
</html>
```

### Contract

The SPA reads these on boot:

```ts
// apps/briefing-renderer/src/loaders/inlineDataLoader.ts
import type { BriefingFeatureCollection, BriefingItemJson } from './types';

export function loadInlineData(): {
  features: BriefingFeatureCollection;
  item: BriefingItemJson;
  config: BriefingConfig;
} {
  const features = JSON.parse(
    document.getElementById('briefing-features-data')!.textContent!,
  ) as BriefingFeatureCollection;
  const item = JSON.parse(
    document.getElementById('briefing-item-data')!.textContent!,
  ) as BriefingItemJson;
  const config = JSON.parse(
    document.getElementById('briefing-config')!.textContent!,
  ) as BriefingConfig;
  return { features, item, config };
}

export interface BriefingConfig {
  tileLayerAttribution: string;
  schemaVersion: string;          // matches the source plot's storyboard schema_version
  exportedAt: string;             // ISO-8601 timestamp of export
  sourcePlotTitle: string;
  storyboardName: string;
}
```

`BriefingConfig` is the only **new** type introduced by this feature.
It is local to the briefing renderer and intentionally small —
purely metadata for chrome rendering.

---

## 5. SPA in-memory state

The SPA does **not** depend on `@debrief/session-state`. It has its own
local Zustand store, deliberately scoped to one Storyboard playback.

```ts
// apps/briefing-renderer/src/store.ts
import type { SceneFeature } from '@debrief/schemas';

interface BriefingState {
  // Source data (loaded once at boot, never mutated)
  features: BriefingFeatureCollection;
  item: BriefingItemJson;
  scenes: SceneFeature[];                 // ordered by (timestamp, creation_order)

  // Playback state — owned by StoryboardPlaybackService via injected ports
  currentSceneIndex: number;
  currentTime: number;                    // epoch ms
  playState: 'playing' | 'paused' | 'idle';

  // UI state
  displayMode: 'present' | 'minimal';
  modeToggleVisible: boolean;             // momentary visibility in Present mode
}
```

### Lifecycle invariants

- The `features`, `item`, and `scenes` slices are **set once at boot** and
  never mutated. (Article III.2 — source preservation — applies even
  in-memory.)
- `currentSceneIndex`, `currentTime`, and `playState` are written by
  the `SessionStoreApi` and `PanelView` port adapters (which the
  briefing renderer supplies to the shared `StoryboardPlaybackService`)
  — the SPA never writes these directly from React event handlers.
- `displayMode` defaults to `'minimal'` on first load (FR-026).
  Toggling preserves `currentSceneIndex` / `currentTime` / `playState`
  (FR-025).

---

## 6. Tile-cache layout

`tiles/{z}/{x}/{y}.png` — standard XYZ tile layout. The SPA's Leaflet
`TileLayer` is configured with:

```ts
L.tileLayer('./tiles/{z}/{x}/{y}.png', {
  attribution: config.tileLayerAttribution,
  errorTileUrl: './tiles/placeholder.png',   // bundled at export
  noWrap: true,
  maxZoom: maxBundledZoom,                   // computed by export, written to config
});
```

`tiles/placeholder.png` is a small neutral tile shipped inside the zip;
when a tile request misses (Scene viewport extends beyond captured
coverage, FR-028), Leaflet renders the placeholder rather than triggering
a network fallback. The placeholder is **never** an external URL.

---

## 7. Boundary-type guards (Constitution Article IV.5)

This feature defines three boundary types:

1. `BriefingFeatureCollection` — derived as alias of `PlotFeatureCollection`.
2. `BriefingItemJson` — derived via `Pick<StacItem, …>`.
3. `BriefingConfig` — net-new (no source type exists for the briefing
   chrome metadata).

For 1 and 2, the exhaustiveness guard pattern from Article IV.5 applies
and is shown above. For 3, no guard is needed — there is no source type
to drift from.

---

## 8. Validation gates at the briefing boundary

When the SPA boots, the inline-data loader validates incoming JSON
against the schema before handing it to the playback service. This is
the Article II.1 boundary check that prevents a corrupted zip from
crashing the SPA mid-playback.

| Check | Failure mode → user-visible state |
|-------|-----------------------------------|
| `BriefingFeatureCollection.type === "FeatureCollection"` | Error state: "Briefing data is unreadable." |
| Exactly one `StoryboardFeature` | Error state: same as above. |
| Every `SceneFeature.properties.storyboard_id` matches the Storyboard's `id` | Error state: same as above. |
| Scenes form a non-empty list (US1 / US2) | Empty state: "This Storyboard has no Scenes to play" (FR-030). |
| `BriefingItemJson.id` and `properties.title` present | Renders without title bar; logs a console warning (still plays). |

Schema validation uses the `@debrief/schemas` JSON Schema bundle —
the same artifact used by the authoring environment.

---

## Summary

| Artefact | New schema? | Derived from |
|----------|-------------|--------------|
| `features.geojson` | No | `PlotFeatureCollection` (existing) |
| `item.json` | No (scoped subset) | `StacItem` (existing) |
| Inlined JSON blocks | No | Same payloads as above |
| `BriefingConfig` | Yes (small, SPA-local) | net-new chrome metadata |
| Zip layout | N/A (file-system contract) | — |
| SPA in-memory store | N/A | composes existing types |

**Schema work required**: none.

**Generated-type regeneration required**: none.

**Article II.1 (single source of truth) impact**: none — all consumed
types remain LinkML-rooted.
