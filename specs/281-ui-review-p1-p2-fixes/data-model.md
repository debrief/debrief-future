# Phase 1 Data Model: UI Review Follow-up — Remaining P1 & All P2 Fixes

This feature has **no domain data model, no schema, and no persistence of
plot/STAC data**. The only "entities" are client-side UI configuration and
preference state held in component state and mirrored to `localStorage`. They are
documented here for completeness and to pin down validation / version rules.

---

## Entity: Header link appearance (P1.3)

Not a data entity — a **styling contract** expressed in CSS custom properties.

| Token | Scope | Light | Dark | HC-light | HC-dark |
|-------|-------|-------|------|----------|---------|
| `--debrief-link-fg` (new or reused) | header links | existing link blue | existing link blue | **dark blue ≥7:1 on header bg** | existing HC-dark link |
| link affordance | `.web-shell__header-link` | none/colour | none/colour | **underline + bolder weight** | **underline + bolder weight** |

**Validation rule**: HC-light link contrast ratio against its rendered header
background MUST be ≥ 7:1 (asserted by axe-core / contrast audit).

---

## Entity: Analysis-view layout configuration (P2.1 / P2.2)

Held by `PanelWorkspace` (GoldenLayout `LayoutConfig`), persisted via
`layoutPersistence` under `LAYOUT_STORAGE_KEY` with `LAYOUT_VERSION`.

| Field | Type | Rule |
|-------|------|------|
| `sidebarWidthPct` (derived) | number (GL relative width) | computed from target px / viewport width; ~280px @ ≤1366, ~360–400px @ ≥1600, interpolated; map always retains majority (`contentWidthPct > sidebarWidthPct`) |
| `LAYOUT_VERSION` | integer | bumped this feature so legacy fixed-25% layouts are discarded → responsive default applied |
| saved layout | `LayoutConfig \| null` | when present **and** version-current → used verbatim (FR-011); else `getDefaultLayout(viewportWidth)` |

**State transition (default resolution)**:
```
load → loadLayout()
  ├─ null            → getDefaultLayout(viewportWidth)
  ├─ stale version   → discard → getDefaultLayout(viewportWidth)
  └─ current version → use saved layout verbatim
Reset Layout        → getDefaultLayout(viewportWidth)  (ignores saved)
```

**ActivityPanel short-height adaptation (P2.2)** — derived UI state, not
persisted:

| Condition | Effect |
|-----------|--------|
| availableHeight < threshold (~720px-derived) AND feature selected | upper flex sections (Tools, then Layers) auto-collapsed so Properties visible |
| availableHeight ≥ ~900px | no adaptation; all sections expanded |
| user manually toggles a section | manual state wins (adaptation does not re-force) |

---

## Entity: Catalog layout / panel visibility (P2.3)

Held by `StacBrowser`, persisted via `BROWSER_LAYOUT_KEY` (`BROWSER_LAYOUT_VERSION`).

| Field | Type | Rule |
|-------|------|------|
| `hidden` panels | `Set<'timeline' \| 'map'>` | drives `buildLayoutForVisiblePanels`; persisted as part of saved GL layout |
| bottom-row visibility (first run) | boolean | default **shown** once a dataset context exists; applied when no saved layout (FR-017) |
| persisted layout | via `BROWSER_LAYOUT_KEY` | collapsed/restored state survives reload (FR-016) |

**State transition**:
```
collapse control → add panel to hidden → rebuild layout → list expands → debounced save
restore control  → remove panel from hidden → rebuild layout → row returns → debounced save
reload           → restore hidden set from saved layout
Reset Layout     → first-run default (row shown)
```

---

## Entity: Thumbnail size preference (P2.4)

Held by `StacBrowser` (`thumbnailSize` state), consumed by `ExerciseListView`.

| Field | Type | Rule |
|-------|------|------|
| `thumbnailSize` | `'small' \| 'medium' \| 'large'` | drives `THUMBNAIL_SIZE_CONFIGS[size]` (raster/spatial dims + rowHeight) |
| persistence key (new) | `localStorage` string, versioned | written on change, hydrated on mount (FR-020) |
| virtualizer measurement | side-effect | `virtualizer.measure()` called when `rowHeight` changes so list re-flows (FR-018) |

`THUMBNAIL_SIZE_CONFIGS` (existing, unchanged):

| size | rasterW×H | spatialW×H | rowHeight |
|------|-----------|------------|-----------|
| small | 60×45 | 56×56 | 80 |
| medium | 120×90 | 112×112 | 135 |
| large | 180×135 | 168×168 | 190 |

**State transition**:
```
click S/M/L → setThumbnailSize → persist → ExerciseListView re-render
            → rowHeight changes → virtualizer.measure() → rows + thumbnails resize
reload      → hydrate thumbnailSize from localStorage
```

---

## Persistence keys summary

| Key | Owner | Change in this feature |
|-----|-------|------------------------|
| `LAYOUT_STORAGE_KEY` / `LAYOUT_VERSION` | PanelWorkspace | **version bump** (discard legacy fixed split) |
| `BROWSER_LAYOUT_KEY` / `BROWSER_LAYOUT_VERSION` | StacBrowser | unchanged (verify hidden-set persists) |
| `SPLIT_STORAGE_KEY` | StacBrowser preview split | unchanged |
| thumbnail-size key (NEW) | StacBrowser | **added**, versioned |

All keys hold **UI preference state only** — no domain/plot data — consistent
with existing patterns and outside Article IV.4.
