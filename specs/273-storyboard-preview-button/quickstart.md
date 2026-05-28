# Quickstart: Storyboard live Preview + web-shell briefing-zip export

**Feature**: 273

## What you get

- A **Preview** button in the storyboard panel header (VS Code + web-shell). Click it → the briefing renderer opens in a new browser tab and plays back the active storyboard, loaded live from a features URL (no zip step).
- **Export as briefing zip** now available in web-shell too (browser download), sharing the packing core with VS Code.

## Verify in web-shell (primary E2E surface)

```sh
# Cloud (Claude Code) — bundled Chromium via @sparticuz/chromium
cd apps/web-shell && node run-playwright.mjs storyboard-preview

# Local
pnpm --filter @debrief/web-shell test storyboard-preview
```

Expected: load a plot with a storyboard → click **Preview** → new tab opens the renderer at `/briefing-renderer/?features=blob:…` → scenes play back (viewports, time-range motion, basemap). Then invoke **Export as briefing zip** → a `.zip` downloads → opening it offline plays back equivalently.

## Verify the renderer boot paths

```sh
cd apps/briefing-renderer && pnpm test        # unit: inline-boot (unchanged) + new url-boot loader
```

Expected: existing `boot.test.ts` green (inline path, dev-fixture fallback, error); new tests cover `?features` fetch → validate → seed → `ready`, plus error/empty states and the offline "no network for storyboard data" guarantee.

## Verify in VS Code

1. Open a plot with a storyboard in the extension (or code-server preview).
2. Storyboard panel → **Preview** → system browser opens `http://127.0.0.1:<port>/?features=/features.geojson` and plays back. Works offline (basemap tiles degrade to placeholder when offline).

## Run the full gate before pushing

```sh
task verify   # lint + typecheck + test (Python + TS)
# then Playwright E2E:
cd apps/web-shell && node run-playwright.mjs storyboard-preview && cd ../..
```

## Key files (where the work lands)

- `apps/briefing-renderer/src/{App.tsx,boot.ts,types.ts}` + new `src/loaders/urlDataLoader.ts`, `components/BriefingMap` (tileLayerUrl).
- `shared/briefing-export/` — NEW package (pure core moved from `apps/vscode/src/services/briefingZipExport/`).
- `shared/components/src/panels/StoryboardPanel/{StoryboardHeader.tsx,StoryboardPanel.tsx,types.ts}` — Preview control.
- `apps/vscode/src/` — preview command + new loopback `BriefingPreviewServer`; export command re-pointed at the shared package.
- `apps/web-shell/src/` — `onPreview` handler (blob URL) + Export host adapter + `/briefing-renderer/` static serving.
