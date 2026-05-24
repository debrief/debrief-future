# Usage example — briefing renderer (Milestone A)

This is the partial usage example captured during `/speckit.implement 264`
at the Milestone A (plumbing in place) checkpoint. The full
analyst-side + recipient-side demonstration ships with Milestone B
(after T-HOIST + Phase 3 + Phase 4 land).

## What works today

### 1 · Developer flow — local SPA dev server

```sh
cd apps/briefing-renderer
pnpm install                  # picks up the new workspace
pnpm --filter @debrief/components build   # one-time, makes the bundled types available
pnpm --filter @debrief/session-state build
pnpm dev                       # vite at http://localhost:5174
```

The dev server boots with the synthetic dev fixture from
`apps/briefing-renderer/src/fixtures/dev-fixture.ts`: a single
Storyboard with four instant Scenes scattered across the North
Atlantic. The Minimal chrome surface renders end-to-end: title bar,
transport bar (▶ ❚❚ ◀ ▶ ↻), time slider, and the **Enter Present (P)**
button. Clicking Next or Prev advances the Scene index and the map
flies to the new viewport (per-Scene Leaflet `flyTo`).

Press `P` to toggle into Present mode. All chrome hides. Move the
mouse to the top-right corner — the **Exit Present (P)** button
appears for 3 seconds. Press `P` again or click the button to
return to Minimal.

> **Not yet wired:** the time slider has zero range because no
> time-range Scene is active in the fixture. Once T-HOIST lands and
> the playback driver wires `runTimeRangeTween`, the slider will
> scrub in lock-step with the viewport during time-range Scenes
> (#263 contract).

### 2 · Building the SPA — bundle inspection

```sh
cd apps/briefing-renderer
pnpm build
```

Output: `dist/index.html` (~1.2 KB) + `dist/assets/index-*.js`
(~310 KB JS, ~96 KB gzipped) + `dist/assets/index-*.css` (~11 KB).
**Zero external network references in the bundle** — Leaflet CSS
is vendored via the JS import pipeline (not loaded from a CDN).
The `fetch(` call present in the bundle is Vite's module-preload
polyfill, which is dead code in the briefing renderer because the
built HTML emits no `<link rel="modulepreload">` tags.

### 3 · VS Code extension — `jszip` available for the export command

```sh
grep '"jszip"' apps/vscode/package.json
# "jszip": "^3.10.1",
```

The dependency is installed and ready for the export command's zip
assembly step (T024 — `zipAssembler`). No command surface yet — that
ships with Phase 3.

## What's deferred to Milestone B

### Analyst flow (Phase 3)

> Not yet implemented — described here as the target user surface.

The analyst opens a plot in VS Code that contains one or more
Storyboards. Each Storyboard has an overflow menu in the Storyboard
panel; the new command **Export Storyboard as briefing zip…** sits
alongside Rename / Delete / Edit-description. Invoking it:

1. Prompts for a destination path
   (default: `briefing-{slug(name)}-{YYYYMMDD-HHMMSS}.zip`).
2. Scopes the plot to that Storyboard's Scenes + referenced features.
3. Fetches missing basemap tiles (per-Scene coverage + interpolation
   path for time-range Scenes).
4. Bundles the SPA + scoped FeatureCollection + scoped item.json +
   Scene thumbnails + tiles into a single `.zip` via JSZip.
5. Writes the zip atomically to the chosen destination.

### Recipient flow (Phase 4-7)

> Not yet implemented — described here as the target user surface.

The recipient receives the zip on a memory stick, unzips it into any
directory (paths with spaces / non-ASCII characters work), and
double-clicks `index.html`. Chrome or Edge opens; the SPA loads from
`file://` with **zero external network requests**:

- All HTML / JS / CSS / fonts / icons from `./assets/`.
- The FeatureCollection, item.json, and config from inlined
  `<script type="application/json">` blocks injected by the export
  command at zip-assembly time.
- Scene thumbnails from `./scene-thumbnails/`.
- Basemap tiles from `./tiles/{z}/{x}/{y}.png`; missing tiles fall
  back to the bundled `./tiles/placeholder.png` (FR-028).

If opened in Firefox / Safari / a mobile browser, the
boot-time browser probe surfaces a banner directing the user to
Chrome or Edge — the SPA still attempts to render.

In Minimal mode the recipient can play / pause / seek / step
through the Storyboard. In Present mode all chrome hides; the user
can flip back via `P` or by hovering the top-right corner.

## Reference

- Spec: `specs/264-briefing-zip-renderer/spec.md`
- Plan: `specs/264-briefing-zip-renderer/plan.md`
- Tasks: `specs/264-briefing-zip-renderer/tasks.md` (see "Implementation status" block at the top)
- Data model: `specs/264-briefing-zip-renderer/data-model.md`
- Export contract: `specs/264-briefing-zip-renderer/contracts/export-command.md`
- SPA contract: `specs/264-briefing-zip-renderer/contracts/spa-loading.md`
