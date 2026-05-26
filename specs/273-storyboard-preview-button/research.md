# Research: Storyboard live Preview button + web-shell briefing-zip export parity

**Feature**: 273 | **Date**: 2026-05-26 | **Phase**: 0 (Outline & Research)

This document resolves the open technical questions behind the spec. It is grounded in a full read of the briefing-renderer, the existing VS Code briefing-zip export, the shared `StoryboardPanel`, and the two host wirings.

---

## Decision 1 — Renderer gains an additive, async "URL boot" path (inline boot untouched)

**Decision**: Add a second boot path to `apps/briefing-renderer/` that activates only when the launch URL carries a `?features=<url>` query parameter. It fetches that URL, validates the payload with the **existing** validators, synthesises a minimal `item` and `config`, and seeds the **existing** store via the unchanged `store.seed()`. When `?features` is absent, the renderer behaves exactly as today (inline `<script type="application/json">` slots → dev-fixture fallback).

**Rationale**:
- The renderer today is 100% inline (`src/boot.ts` → `loadInlineData()` reads three required slots: `#briefing-features-data`, `#briefing-item-data`, `#briefing-config`; `inlineDataLoader.ts` validates; `store.ts:seed()` accepts `{features, item, scenes, config}`). There is **no fetch path anywhere** today.
- The inline path is **synchronous** (`App.tsx` seeds in a `useState` lazy initialiser, before first paint, to avoid a fly-to flash). A network fetch is inherently async, so the URL path **cannot** seed synchronously — it must run through the normal `bootState: 'loading' → 'ready'/'error'` lifecycle. This is a clean reason to keep the two paths separate rather than merging them.
- Reusing the existing validators (`validateFeatureCollection`, the one-Storyboard scoping rule, scene ordering by `(timestamp, creation_order)`, item/config shape) means the URL path enforces identical invariants without duplicating logic.

**Mechanics**:
- `App.tsx` reads `?features=` alongside the existing `?story=` test hook (no conflict).
- A new `src/loaders/urlDataLoader.ts`: `fetch(url)` → parse → run the same validators → return the same `InlineData` shape (or throw `InlineDataLoadError`).
- `boot.ts` gains one branch: if a `features` URL is present, enter `loading` and kick off the async load+seed; otherwise the existing sync inline path runs unchanged.
- The renderer needs `item` and `config` in addition to `features`. For a one-URL preview (per the spec's chosen data path) the loader **synthesises** them:
  - `item`: a minimal STAC-like `{type:'Feature', id: <plot id or 'preview'>, properties:{}, assets:{}, links:[]}` — enough to pass the existing item validator. Scene thumbnails are not needed for playback (playback flies to viewports; thumbnails are an authoring-panel concern).
  - `config`: defaults with an **online** `tileLayerUrl` (see Decision 2) plus a high `maxBundledZoom`, `tileLayerAttribution`, and `exportedAt = now`.

**Alternatives considered**:
- *Merge into one loader with a runtime branch* — rejected: pollutes the proven sync inline path with async concerns and risks the air-gapped guarantee.
- *Serve all three (features+item+config) as separate URLs* — rejected: contradicts the user's "one features URL" intent and adds host plumbing for data the loader can synthesise.

---

## Decision 2 — Add optional `tileLayerUrl` to the renderer-local `BriefingConfig`

**Decision**: Extend `BriefingConfig` (a **renderer-local TypeScript interface** at `apps/briefing-renderer/src/types.ts`, *not* a LinkML schema type) with an optional `tileLayerUrl?: string`. `BriefingMap` uses `config.tileLayerUrl ?? './tiles/{z}/{x}/{y}.png'`. The inline/zip path leaves it unset (keeps bundled local tiles); the URL-preview path sets it to the same online basemap the main app uses.

**Rationale**:
- The current `BriefingMap` `<TileLayer url="./tiles/{z}/{x}/{y}.png">` is hard-coded for the air-gapped zip. Live preview has no bundled tiles, so it needs an online source.
- Because `BriefingConfig` is renderer-local, this is **not** a schema change (no LinkML bump, no Article II adherence work). The LinkML types (`StoryboardFeature`, `SceneFeature`, the plot FeatureCollection) are untouched.
- `TileLayer` already has `errorTileUrl` → offline VS Code preview degrades gracefully to the placeholder tile rather than erroring.

**Alternatives considered**:
- *Proxy tiles through the VS Code local server for offline preview* — deferred; out of scope. The spec accepts that basemap availability follows normal map behaviour.

---

## Decision 3 — Extract the pure briefing-zip core into a shared package; add a web-shell host adapter

**Decision**: Move the existing **pure** export functions out of `apps/vscode/src/services/briefingZipExport/` into a new shared workspace package **`@debrief/briefing-export`** (`shared/briefing-export/`). It exposes the orchestrator plus the `ExportDeps`/`ExportHostDeps` interface. VS Code keeps its existing host adapter (now importing from the package); web-shell adds a new browser host adapter.

**Rationale**:
- The export is **already** split into pure core (`scopeStoryboard`, `computeTileCoverage`, `injectInlineData`, `assembleZip`, `buildItemJson`) + injected host deps (`readPlot`, `readStaticBundle`, `readThumbnail`, `fetchTile`, `writeFile`, UI callbacks). The pure core has **zero Node `fs`/`path`/`os` coupling**.
- **JSZip 3.10.1** (the zip lib) is browser-safe and already present in the repo (vscode dep + briefing-renderer devDep) → **no new external dependency** (Article IX clean).
- A shared package is the constitutionally-preferred way to share across apps (avoids the cross-app deep imports that E12 exists to eliminate) and satisfies FR-016 ("shared, not re-implemented").
- Web-shell host adapter:
  - `readPlot`: scope from the in-memory `featureCollection` (already in web-shell React state) + read `item.json` through the **`@debrief/stac-writer` reader abstraction** (Article IV.4 — no raw IndexedDB).
  - `readThumbnail`: read scene-thumbnail blob assets via the same stac-writer abstraction.
  - `readStaticBundle`: read the briefing-renderer dist bundled into web-shell's served tree (Decision 5).
  - `fetchTile`: browser `fetch` (the dep is already abstracted as `fetcher(url): Promise<Uint8Array>`).
  - `writeFile` → instead, trigger a **browser download** of the generated `Uint8Array` (anchor + object URL).
  - UI callbacks → web-shell's panel-host prompts/toasts.

**Alternatives considered**:
- *Web-shell deep-imports from `apps/vscode`* — rejected: violates app boundaries / E12 direction.
- *Duplicate the packing logic in web-shell* — rejected: FR-016 forbids drift.

---

## Decision 4 — VS Code serves the preview via an ephemeral localhost HTTP server

**Decision**: A new VS Code host service starts an ephemeral `node:http` server (loopback, OS-assigned port) on first Preview. It serves the bundled renderer (`apps/vscode/resources/briefing-renderer-static/`) at `/` and the active storyboard's scoped features at `/features.geojson`. The extension opens the system browser via `vscode.env.openExternal(await vscode.env.asExternalUri(Uri.parse('http://127.0.0.1:<port>/?features=/features.geojson')))`. The server is reused across previews and disposed on extension deactivation.

**Rationale**:
- An external browser tab (the spec's chosen surface) **cannot** read `webview-resource:` URIs, so a reachable URL is required.
- The renderer dist is **already** synced into `resources/briefing-renderer-static/` for the existing zip export (`sync-briefing-renderer` script) — it can be served as-is.
- `asExternalUri` makes the loopback URL correct in Remote/Codespaces tunnels; `openExternal` then launches the system browser. Fully **offline** (loopback only).
- This is a **new pattern** for the extension (no existing local server). It is read-only serving, not persistence and not a Python service, so it does not cross an Article IV boundary — but it is novel enough to warrant an ADR (Article VIII.3).

**Alternatives considered**:
- *Open in a VS Code webview instead of an external tab* — rejected: the user explicitly chose a new browser tab; webview also can't host the renderer offline without similar plumbing.
- *Write a temp HTML with inlined data and `openExternal` a `file://`* — rejected: that is the zip path in disguise (packing step), contradicting the "live URL, no zip" requirement, and `file://` fetch/relative-asset behaviour is brittle across browsers.

---

## Decision 5 — Web-shell hands off features via a same-origin blob URL; renderer served same-origin

**Decision**: Web-shell builds a `Blob` from the active storyboard's scoped features, creates an object URL, and opens the **same-origin** briefing-renderer at `<renderer base>/?features=<encodeURIComponent(blobUrl)>` in a new tab (keeping the web-shell tab alive). The renderer build is placed under web-shell's served tree at `/briefing-renderer/` (mirroring the GitHub Pages sibling-path layout) so the path resolves identically in dev, preview, and production.

**Rationale**:
- On GitHub Pages, web-shell (`/debrief-future/web-shell/`) and briefing-renderer (`/debrief-future/briefing-renderer/`) are the **same origin** (`debrief.github.io`). A blob URL created in web-shell is resolvable by `fetch()` from a same-origin tab while the creating document is alive — the standard "open generated content in a new tab" technique.
- A blob URL needs **no server**, so the exact same mechanism works in dev, `vite preview`, and the static Pages build — one code path, no environment branching.
- The renderer's URL-boot path (Decision 1) is **host-agnostic**: it just `fetch`es the `?features` URL. VS Code supplies a localhost URL; web-shell supplies a blob URL. The renderer doesn't care which.

**Why not the alternatives**:
- *Renderer reads web-shell's IndexedDB by `?plotId`* — rejected: couples the standalone renderer to web-shell's IDB schema and bypasses the stac-writer abstraction (Article IV.4). Blob URL keeps the renderer ignorant of web-shell internals.
- *Vite middleware route serving features* — rejected: works in dev/preview only; disappears on static Pages. Blob URL is uniform.
- *`postMessage`/`BroadcastChannel` handoff* — rejected: adds a third renderer boot sub-path and ready-handshake complexity for no benefit over a blob URL.
- *localStorage handoff* — rejected: ~5 MB cap can be exceeded by large plots; blobs have no such limit.

**Dev/build note**: add a small step (Vite static-copy or a dev-server static mount) that exposes `apps/briefing-renderer/dist` under web-shell's `/briefing-renderer/` in dev and `vite preview`, mirroring what the GitHub Pages workflow already produces and what VS Code already does with `resources/briefing-renderer-static/`.

---

## Decision 6 — Preview targets the currently-persisted active storyboard; handle unsaved edits

**Decision**: Preview serves the **currently-persisted** plot features for the **active** storyboard (the one selected in the panel). If the host detects unsaved captures/edits, it persists them (or prompts to save) before launching, so the preview never silently shows stale data (spec A-2; Article I.3 no silent failures).

**Rationale**: Both hosts already read "current features" for scene operations (VS Code `mapPanel.getCurrentFeatures()`; web-shell the `featureCollection` React state). Scoping reuses the export's `scopeStoryboard`. The save-vs-prompt nicety is a small UX choice left to implementation, bounded by the no-stale-data rule.

---

## Resolved unknowns summary

| Unknown | Resolution |
|---|---|
| How renderer loads from a URL without breaking offline | New async `?features` boot path; inline path untouched (Decision 1) |
| Where the live basemap comes from | Optional `tileLayerUrl` in renderer-local `BriefingConfig`; offline degrades to placeholder (Decision 2) |
| How to share export logic across hosts | Extract pure core to `@debrief/briefing-export`; per-host `ExportDeps` adapters; JSZip already present (Decision 3) |
| How VS Code reaches an external tab offline | Ephemeral loopback HTTP server + `asExternalUri`/`openExternal` (Decision 4) |
| How web-shell hands off features same-origin, no server | Blob object URL `?features=`; renderer served same-origin under `/briefing-renderer/` (Decision 5) |
| New external dependencies | **None** — `node:http`, `fetch`, `Blob` are platform-native; JSZip already pinned |
| Schema impact | **None** — `BriefingConfig` is renderer-local; LinkML types untouched |
| New ADRs | Local-server preview pattern + renderer dual-boot-path (Article VIII.3) |
