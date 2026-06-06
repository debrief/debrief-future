# Data Model: Storyboard live Preview button + web-shell briefing-zip export parity

**Feature**: 273 | **Date**: 2026-05-26 | **Phase**: 1 (Design)

This feature introduces **no LinkML schema changes**. The plot FeatureCollection, `StoryboardFeature`, and `SceneFeature` (LinkML-generated) are consumed unchanged. The data surfaces below are TypeScript interfaces / runtime contracts local to the renderer, the shared export package, and the panel — not persisted schema.

---

## 1. Preview launch input (renderer query contract)

The renderer's new boot path is driven entirely by URL query parameters. No new persisted entity.

| Field | Source | Type | Required | Notes |
|---|---|---|---|---|
| `features` | query param | URL string (encoded) | Yes (activates URL-boot) | Location the renderer `fetch`es for the plot FeatureCollection. VS Code → loopback `/features.geojson`; web-shell → `blob:` object URL. |
| `story` | query param | enum | No | **Existing** Playwright isolation hook — untouched, independent of `features`. |

**Behaviour**: presence of `features` ⇒ async URL-boot; absence ⇒ existing inline/dev-fixture boot.

---

## 2. `BriefingConfig` (renderer-local) — extended

Existing interface at `apps/briefing-renderer/src/types.ts`, gains one optional field.

| Field | Type | Required | Default (URL-preview synthesis) | Notes |
|---|---|---|---|---|
| `tileLayerAttribution` | string | yes | app basemap attribution | existing |
| `schemaVersion` | string | yes | active plot's storyboard schema version | existing |
| `exportedAt` | string (ISO-8601) | yes | `now()` | existing; for preview = launch time |
| `sourcePlotTitle` | string | yes | active plot title | existing |
| `storyboardName` | string | yes | active storyboard name | existing |
| `maxBundledZoom` | number | yes | high value (e.g. 19) for online tiles | existing |
| **`tileLayerUrl`** | string | **no (NEW)** | online basemap `{z}/{x}/{y}` template (preview); unset for zip | `BriefingMap` uses `tileLayerUrl ?? './tiles/{z}/{x}/{y}.png'` |

**Validation**: unchanged validator still requires the existing fields; `tileLayerUrl` is optional and, if present, MUST be a non-empty string.

---

## 3. Synthesised preview `item` (renderer, URL-boot only)

For a one-URL preview the loader synthesises the minimal STAC-like `item` the store requires (playback does not need real assets).

| Field | Type | Value |
|---|---|---|
| `type` | `'Feature'` | constant (passes existing item validator) |
| `id` | string | plot id, or `'preview'` if absent |
| `properties` | object | `{}` |
| `assets` | object | `{}` (no scene thumbnails needed for playback) |
| `links` | array | `[]` |

---

## 4. `ExportDeps` / `ExportHostDeps` (shared export package interface)

Moved unchanged from `apps/vscode/src/services/briefingZipExport/` into `@debrief/briefing-export`. The interface is the seam between the pure packing core and each host.

| Member | Signature (shape) | VS Code adapter | Web-shell adapter |
|---|---|---|---|
| `readPlot(ref)` | → `{ features: FeatureCollection; item: ItemJson }` | `vscode.workspace.fs.readFile` | in-memory `featureCollection` + `@debrief/stac-writer` reader for `item.json` |
| `readStaticBundle()` | → `Map<string, Uint8Array>` | recurse `resources/briefing-renderer-static/` | read `/briefing-renderer/` served dist |
| `readThumbnail(href)` | → `Uint8Array \| null` | `vscode.workspace.fs.readFile` | `@debrief/stac-writer` asset reader (blob) |
| `fetchTile(url)` | → `Uint8Array` | Node 20 `fetch` | browser `fetch` |
| `writeOrDeliver(bytes, name)` | → `void` | `showSaveDialog` + `workspace.fs.writeFile` | anchor + object-URL **download** |
| `ui` | `{ prompt, progress, info, error }` | VS Code window APIs | web-shell panel host |

**Pure core (no host coupling, moves into the package):** `scopeStoryboard`, `computeTileCoverage`, `injectInlineData`, `assembleZip` (JSZip), `buildItemJson`.

---

## 5. `StoryboardPanel` header — Preview control props

Added to `shared/components/src/panels/StoryboardPanel/types.ts`, following the existing optional-callback pattern.

| Prop | Type | Required | Notes |
|---|---|---|---|
| `onPreview` | `() => void` | no | When omitted, the Preview button is not rendered (idiomatic gating). |
| `canPreview` | `boolean` | no | Disables the button (with tooltip) when there is no active storyboard or it has zero scenes. Defaults to `onPreview !== undefined && hasScenes`. |

**Render rule**: Preview button appears in the header button row (sibling of Capture) iff `typeof onPreview === 'function'`; disabled when `canPreview === false`.

---

## 6. VS Code preview message contract (webview ↔ host)

| Direction | Message | Payload | Handler |
|---|---|---|---|
| webview → host | `{ type: 'preview-clicked' }` | none | `storyboardPanelView` → invoke preview command |
| host action | start/reuse loopback server, scope active storyboard features, `asExternalUri` + `openExternal` | — | new `BriefingPreviewServer` service |

---

## State / lifecycle notes

- **Preview is read-only and stateless** — no persistence, no provenance write (Article III untouched; nothing is transformed).
- **Local server lifecycle (VS Code)**: lazy-start on first preview, single shared instance, dispose on extension deactivation.
- **Blob URL lifecycle (web-shell)**: created per preview launch; revoked when the web-shell tab unloads (acceptable for a transient preview).
- **Renderer boot states** (unchanged set): `loading → ready | empty | error | halted`. URL-boot uses `loading` then `ready`/`error`; inline-boot stays synchronous.
