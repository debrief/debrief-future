# Phase 0 Research — Air-Gapped Briefing Zip

**Feature**: 264-briefing-zip-renderer
**Status**: Complete
**Date**: 2026-05-19

## Purpose

Resolve the open technical questions in the feature spec before design. Every
decision below is anchored in concrete facts gathered from the existing
codebase (see Codebase Audit at end) — none are speculative.

---

## R1. `file://`-origin loading strategy

### Decision

The SPA loads `features.geojson` and `item.json` as **inlined JSON inside
`<script type="application/json" id="…">` blocks** in `index.html`.
Binary assets (Scene thumbnails, basemap tiles) are referenced via
**relative URLs** consumed by `<img>` and Leaflet `TileLayer`, which use
`<img>` underneath.

### Rationale

- Under `file://` origin, mainstream browsers (Chrome ≥ 99, Firefox, Edge,
  Safari) restrict `fetch()` / `XMLHttpRequest` of sibling files for
  same-origin security reasons (Chrome surface area is most restrictive).
- `<img src="./relative/path.png">` and Leaflet's tile layer (also `<img>`)
  are **not** subject to this restriction — they have always worked from
  `file://` and continue to.
- Inlined JSON blocks are read via `document.getElementById(id).textContent`
  followed by `JSON.parse`. No network, no `fetch`, no XHR; works in every
  mainstream browser regardless of origin.
- This pattern is well-established (used by Observable notebooks, single-file
  HTML reports, several offline GIS viewers).

### Alternatives considered

- **`fetch('./features.geojson')`**: rejected — fails in Chrome under
  `file://` since 2022. We do not require a local HTTP server.
- **Inline binary as base64 data URIs**: rejected for tiles (bloats the
  payload ~33 % and forces every tile through a single decode path). Used
  only as fallback if a target browser proves hostile to relative `<img>`
  under `file://`.
- **Self-extracting executable**: rejected — defeats the "any modern
  browser" promise and creates a security review burden.

---

## R2. Basemap tile pre-fetch source and coverage strategy

### Decision

- **Tile source at export time**: the same OSM-compatible URL the authoring
  `MapView` is configured with at export time (default
  `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`); the export records
  attribution into `item.json` so the SPA can render it.
- **Coverage**: for each Scene in the chosen Storyboard, compute the tile
  set covering the Scene's `viewport` at its captured `zoom`. For
  time-range Scenes (#263), additionally compute coverage for `viewport_end`
  at its zoom and the linear interpolation path between the two viewports
  sampled at fixed wall-clock intervals (every ~250 ms of playback
  duration). Union all tile sets across all Scenes; deduplicate.
- **Padding**: add one tile of padding around every viewport bounding box
  to absorb small redraw-region overshoots during pan tweens.
- **Zoom levels**: only the captured zoom level per Scene (plus, for
  time-range Scenes, every integer zoom level between
  `min(zoom_start, zoom_end)` and `max(zoom_start, zoom_end)` inclusive,
  for tween correctness). No user-initiated zoom is supported in the SPA,
  so we do not bundle additional zoom levels.
- **Cache layout in zip**: `tiles/{z}/{x}/{y}.png` — directly addressable
  by Leaflet's `TileLayer` configured with `tileLayerUrl: './tiles/{z}/{x}/{y}.png'`.

### Rationale

- The user spec mandates **no network at playback**. The only sensible
  source is the analyst's own machine at export time.
- Bundling only the captured zoom levels (vs. ± 2) keeps zip size bounded:
  a single Scene viewport at zoom 12 typically covers 20–40 tiles
  (~5–10 KB each, ~100–400 KB per Scene). A 20-Scene Storyboard with
  half time-range Scenes lands at ~5–15 MB of tiles. This is acceptable
  for email / memory stick distribution.
- The interpolation-path sampling for time-range Scenes ensures playback
  doesn't show "no tile" pattern mid-tween when the viewport pans across
  uncovered area.
- We do **not** rate-limit, retry, or robustify the tile-download step
  beyond best practice (sequential, 100 ms gap between requests, max 3
  retries per tile). The analyst is the only party affected by a slow
  export; failure is reported, not silenced.

### Alternatives considered

- **Render basemap into the Scene thumbnail at capture time and skip
  tiles entirely**: rejected — defeats the interactive map in Minimal
  mode (the time slider seeks within a Scene; the map must redraw).
- **Vector tiles (PMTiles single-file format)**: attractive but adds a
  PMTiles JS dependency (~80 KB) and a new tile renderer in the SPA;
  raster tiles work today with the existing Leaflet `TileLayer`. Defer
  PMTiles to a follow-up if zip size proves a problem in practice.
- **All zoom levels 0–18**: rejected — produces multi-GB zips for any
  non-trivial coverage area.

---

## R3. ZIP creation library

### Decision

Add **`jszip` ^3.10.x** as a dependency of the VS Code extension.

### Rationale

- Codebase audit confirms no existing zip library is in use anywhere
  (`jszip`, `adm-zip`, `archiver`, `node:zlib` raw streams — all absent).
- `jszip` works identically in Node (extension host) and browser, has no
  native binary dependencies, ships TypeScript types, is MIT-licensed,
  and is the de-facto choice for in-process zip assembly in JS.
- Justified under Constitution Article IX.1 ("Minimal, vetted dependencies"):
  the alternative is implementing zip-format encoding by hand, which is a
  poor use of effort and a security risk surface.

### Alternatives considered

- **`adm-zip`**: native binary path-resolution quirks, less reliable in
  bundled contexts. Rejected.
- **`archiver`**: stream-based, larger API surface, primarily Node-only.
  Rejected — JSZip's promise/synchronous API is simpler for our needs.
- **`node:zlib` directly + hand-rolled zip headers**: rejected as
  unnecessary engineering and a security risk.

---

## R4. Playback engine extraction / reuse

### Decision

**Hoist** `apps/vscode/src/services/storyboardPlayback.ts` to
`shared/components/src/storyboardPlayback/service.ts` (the directory
already exists post-#263 and contains the host-agnostic
`runTimeRangeTween` primitive). Extract the four port interfaces
(`PlaybackMapPanel`, `PlaybackSessionManager`, `PlaybackPanelView`,
`PlaybackTimeRangeView`) into a sibling `ports.ts`. The VS Code
extension switches its imports; the briefing renderer SPA imports the
same module and supplies browser-side port adapters.

### Rationale

- Post-#263 codebase audit confirms:
  - `StoryboardPlaybackService` (still at `apps/vscode/src/services/storyboardPlayback.ts`)
    is host-agnostic — it depends only on the four injected port
    interfaces, plus it imports `runTimeRangeTween` and
    `isTimeRangeScene` from `@debrief/components`.
  - **`runTimeRangeTween` already lives in `shared/components/`**
    (`shared/components/src/storyboardPlayback/timeRangeTween.ts`) —
    #263 placed it there from day one. It accepts injected
    `TimeRangeTweenPorts` and a `FrameScheduler` (default
    implementation uses `requestAnimationFrame` in browser, `setTimeout`
    in Node). The briefing SPA consumes it verbatim with
    `defaultScheduler()`.
  - Per-frame loop calls `setCurrentTime()` then
    `flyToViewport(durationMs=0)`, so both axes (slider + viewport)
    advance in lock-step from a single RAF — see the new ADR
    `docs/project_notes/decisions.md` § ADR-NEW (2026-05-19).
- Constitution Article IV.1 ("services never touch UI") is honoured: the
  service returns data and issues port calls; the SPA's adapters do the
  rendering.
- One service, two adapters. No fork, no duplicate engine — the briefing
  SPA's playback is, by construction, indistinguishable from authoring.
- The hoist is mechanical: ~1 file moved, port interfaces extracted into
  their own file, ~3 imports updated in the VS Code app, ~0 logic
  changes. The directory it's moving into (`shared/components/src/storyboardPlayback/`)
  already exists, so the move is straightforward.

### Alternatives considered

- **Fork the engine into the briefing-renderer SPA**: rejected as a clear
  Article II.1 / IV.1 violation (single source of truth; thick services).
- **Move to a new dedicated `@debrief/storyboard-playback` package**:
  considered, rejected as premature. Living in `@debrief/components/storyboardPlayback`
  beside `timeRangeTween.ts` (the home #263 already chose) is consistent.
- **Leave the service in `apps/vscode/` and import it from there**:
  rejected — creates a cross-app import (briefing-renderer → vscode app)
  that violates the single-direction dependency rule and would break the
  briefing-renderer's standalone-app character.

### Port adapters needed in the SPA

| Port | Browser adapter (briefing-renderer) | Notes |
|------|--------------------------------------|-------|
| `PlaybackMapPanel.flyToViewport(viewport, durationMs)` | Wraps a `react-leaflet` `MapContainer` and calls `map.flyTo([lat, lon], zoom, { duration: durationMs / 1000 })`. For per-frame time-range scrubbing the tween invokes this with `durationMs = 0`. | Same Leaflet API used by the authoring `MapView`. |
| `PlaybackSessionManager.setCurrentTime(epochMs)` / `getCurrentTime()` | Backed by a local Zustand store inside the SPA (no `@debrief/session-state` dependency on the host shell). | Simple slice: `{ currentTime: number; setCurrentTime: (t: number) => void }`. |
| `PlaybackPanelView.notifySceneChange(sceneId)` | Updates the SPA's "current scene" React state; drives the transport bar's highlighted Scene. | Pure React state. |
| `PlaybackTimeRangeView.setScrubbableRange(start, end)` | Updates the SPA's slider bounds for the active time-range Scene; `null` for both args means "no scrubbable range" (instant Scene rest state). | Port name and signature are exactly the new surface #263 introduced. |

### Inherited boundary primitives

The SPA reuses, without modification, the following symbols that #263
shipped to `@debrief/components`:

| Symbol | Path | Used for |
|--------|------|----------|
| `runTimeRangeTween` | `shared/components/src/storyboardPlayback/timeRangeTween.ts` | Driving the single-RAF loop for time-range Scene playback. |
| `defaultScheduler` | same file | RAF-based scheduler that the SPA uses out of the box. |
| `FrameScheduler`, `RunTimeRangeTweenInput`, `TimeRangeTweenHandle` | same file | Types for the tween's contract. |
| `isTimeRangeScene` | `shared/components/src/storyboard/types.ts` | Branching at playback (instant vs time-range path) and at the SPA load boundary. |
| `flavourCheck` | `shared/components/src/storyboard/validate.ts` | Boundary validation when the SPA reads the inlined `features.geojson` — rejects mixed-presence Scenes (one slot set, the other not). |
| `InstantSceneFeature`, `TimeRangeSceneFeature` | `shared/components/src/storyboard/types.ts` | TypeScript-side discriminated union the SPA narrows into after `flavourCheck`. |

---

## R5. Storyboard scoping algorithm

### Decision

Given a chosen `StoryboardFeature` (identified by its `properties.id`),
the export selects:

1. The `StoryboardFeature` itself.
2. Every `SceneFeature` where `properties.kind === "STORYBOARD_SCENE"`
   AND `properties.storyboard_id === storyboard.id`.
3. The union of every feature ID in `scene.properties.visible_feature_ids`
   across every Scene selected in step 2.
4. The feature objects matching those IDs in the source plot's
   `FeatureCollection`.

Output: a fresh `FeatureCollection` containing exactly the union above.
Other `StoryboardFeature` entries and Scenes belonging to other
Storyboards in the same plot are excluded.

### Rationale

- This mirrors the link structure documented by `storyboard.yaml`:
  Scenes carry their parent via `storyboard_id`; visible features are
  enumerated by `visible_feature_ids`.
- A Scene depending on a feature that is also depended on by a Scene in
  a different Storyboard pulls that feature in (Acceptance Scenario 2 of
  US4) — the algorithm computes the closure relative to the chosen
  Storyboard's Scenes, not relative to "features unique to this
  Storyboard".
- Provenance is preserved (Article III.1): the exported `features.geojson`
  is a strict subset of the source plot's `FeatureCollection`; nothing
  is rewritten or synthesised.

### Alternatives considered

- **Bundle the entire plot's `FeatureCollection`**: rejected — leaks
  unrelated Storyboards and bloats the zip.
- **Re-derive features from Scene viewports geographically**: rejected —
  fragile, and would break Scenes that reference features outside their
  visible viewport (e.g. a track currently off-screen).

---

## R6. Browser compatibility under `file://`

### Decision

Target current versions of **Chrome, Firefox, Edge, and Safari** on
desktop OSes (Windows 10+, macOS 12+, mainstream Linux desktops).
Mobile browsers are best-effort — playback should work but no specific
guarantees on touch UI quality (spec edge-case "Zip opened on a phone /
very small viewport").

### Rationale

- The chosen loading strategy (R1) is supported in all four browsers
  under `file://`. Verification is by Playwright E2E test in CI
  (see Quickstart).
- Article XI (Internationalisation) is honoured trivially: the SPA uses
  standard `<html lang>` and respects browser locale for date / time
  formatting via `Intl.DateTimeFormat`.

### Alternatives considered

- **Chrome-only**: rejected — defence audiences include Firefox /
  Safari users; ESR Firefox is common.
- **IE / older browsers**: out of scope. The target community runs
  current browsers.

---

## R7. SPA build & distribution

### Decision

- **SPA lives at `apps/briefing-renderer/`** — a Vite + React 18 SPA,
  same pattern as `apps/backlog-navigator/` and `apps/spec-navigator/`.
- **No PWA, no service worker** — neither is needed (the zip is the
  offline mechanism) and SWs are tricky from `file://`.
- **Built statically** as part of the monorepo's normal build, output
  to `apps/briefing-renderer/dist/`.
- The VS Code extension **bundles the pre-built static SPA** as a
  resource directory at `apps/vscode/resources/briefing-renderer-static/`,
  copied from the briefing-renderer's `dist/` by the extension's build
  step. At export time, the command copies these static files into the
  output zip and injects the inlined data blocks into the bundled
  `index.html`.

### Rationale

- The static-bundle-as-resource pattern matches how other VS Code
  webviews ship their bundled HTML/JS. The extension is the host for
  the export operation; the SPA static files are content the extension
  produces a copy of, per export, with inlined data.
- Avoids the cost of running a Vite build at export time (which would
  require a Node toolchain at extension runtime — unsupportable in a
  packaged `.vsix`).

### Alternatives considered

- **Build the SPA on demand inside the export command**: rejected —
  requires the user to have a Node toolchain, which contradicts the
  feature's promise.
- **Ship the SPA dist via npm and consume as `@debrief/briefing-renderer`**:
  considered — viable but over-engineered for a single internal
  consumer. Will reconsider if a second consumer emerges.

---

## R8. Scene thumbnail bundling

### Decision

For every Scene in the exported Storyboard:

1. Look up `scene.properties.thumbnail_asset_ref` in the source plot's
   `item.json` `assets` map to find the on-disk path
   (`./scene-thumbnails/scene-{ULID}.png`).
2. Copy the file into the zip at the same relative path
   (`scene-thumbnails/scene-{ULID}.png`).
3. Rewrite the briefing zip's `item.json` so its `assets` map carries
   the exact same `href` values — they remain relative and resolve
   correctly once unzipped.

If a thumbnail file is missing on disk (a known #174 edge case), the
export still completes; the SPA's empty-thumbnail fallback applies
(FR-031).

### Rationale

- Mirrors the authoring environment's storage and addressing exactly,
  so the same code path renders thumbnails in both contexts.
- The relative `./scene-thumbnails/…` href works under `file://` (R1).
- Provenance preserved (Article III.1): thumbnails are copied byte-for-byte.

---

## Codebase Audit (factual basis for decisions above)

| # | Finding | Source |
|---|---------|--------|
| 1 | Existing SPAs (`apps/backlog-navigator`, `apps/spec-navigator`) are Vite + React 18, output `dist/index.html` + `dist/assets/*`. | Read of their `package.json` and `vite.config.ts`. |
| 2 | `StoryboardPlaybackService` is at `apps/vscode/src/services/storyboardPlayback.ts`, depends only on injected ports (`PlaybackMapPanel`, `PlaybackSessionManager`, `PlaybackPanelView`, `PlaybackTimeRangeView`). `runTimeRangeTween` + `defaultScheduler` (host-agnostic, RAF-based) live at `shared/components/src/storyboardPlayback/timeRangeTween.ts` (#263). Headless CRUD lives in `shared/components/src/storyboard/`. | Direct read of the service post-#263. |
| 3 | `SceneFeature` carries `properties.storyboard_id`, `viewport: {center, zoom, bearing}`, `timestamp`, `creation_order`, optional `time_range` (TimeRange — ISO-8601 `start`/`end`), optional `viewport_end` (Viewport), `visible_feature_ids: string[]`, `thumbnail_asset_ref: string`. XOR rule: `time_range` and `viewport_end` are both present or both absent (enforced in LinkML rules + JSON Schema `if/then` + `flavourCheck` in `shared/components/src/storyboard/validate.ts`). `isTimeRangeScene(scene)` is the canonical runtime narrowing predicate. Discriminated-union types (`InstantSceneFeature`, `TimeRangeSceneFeature`) exist in TypeScript only — no `kind` discriminator field on the schema. | `shared/schemas/src/linkml/storyboard.yaml`, generated TS types, `shared/components/src/storyboard/types.ts` + `validate.ts`. |
| 4 | VS Code Storyboard commands live in `apps/vscode/src/commands/storyboardManagement.ts` (`debrief.storyboard.create`, `.rename`, `.delete`) and `…/storyboardTransport.ts` (`.forward`, `.backward`, `.goToScene`). Registered in extension `package.json` `contributes.commands` + `contributes.menus`. | Direct read. |
| 5 | No existing zip library — `jszip`, `adm-zip`, `archiver`, `node:zlib` all absent from the monorepo. | Repo-wide grep. |
| 6 | `MapView` (`shared/components/src/MapView/MapView.tsx`) accepts `tileLayerUrl` and `tileLayerAttribution` props (defaults to OSM). | Direct read, lines 457–458. |
| 7 | Scene thumbnails stored at `<stac-item>/scene-thumbnails/scene-{ULID}.png` (and `…-sm.png`), keyed in `item.json` `assets` map by `thumbnail_asset_ref` = `"scene-thumbnail-{ULID}"`. | `apps/vscode/src/services/sceneThumbnailService.ts`. |
| 8 | Playwright runs static-served apps via `vite preview` or `http-server` against a Chromium provisioned by `@sparticuz/chromium` — works in cloud sessions. | `apps/web-shell/run-playwright.mjs`, project CLAUDE.md note. |

All findings above are anchored in actually-read files, not inferred from
names. Decisions in R1–R8 reference these findings explicitly.

---

## Open NEEDS-CLARIFICATION items remaining

**None.** All seven design questions resolved with rationale.
