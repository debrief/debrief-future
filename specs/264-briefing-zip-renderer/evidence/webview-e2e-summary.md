# Playwright E2E summary — air-gapped briefing zip

Captured 2026-05-20 via `apps/briefing-renderer/run-playwright.mjs`
and `shared/components/run-playwright.mjs` (Sparticuz Chromium 143,
headless, `--allow-file-access-from-files`).

## Results

### `apps/briefing-renderer` (16 specs)

| Suite | Tests | Pass | Fail | Notes |
|-------|-------|------|------|-------|
| `briefing-zip-file-protocol.spec.ts` | 2 | 2 | 0 | `file://`-origin boot + no external requests on initial render |
| `briefing-zip-network-isolation.spec.ts` | 1 | 1 | 0 | SC-002: 0 external requests across load → play → toggle → replay |
| `briefing-zip-playback.spec.ts` | 2 | 2 | 0 | Instant Scene transport + slider disabled for instant Scenes |
| `briefing-zip-mode-toggle.spec.ts` | 2 | 2 | 0 | 10 consecutive Present ↔ Minimal toggles (SC-005); P key reachable in Present |
| `briefing-zip-screenshots.spec.ts` | 5 | 5 | 0 | Evidence producers — Minimal/Present/Empty/Error/Halted screenshots |
| `briefing-component-stories.spec.ts` | 2 | 2 | 0 | **T074/T075** — story-mode component captures (TransportBar, ModeToggle) |
| `briefing-zip-end-to-end.spec.ts` | 1 | 1 | 0 | **T079** — real export → real unzip → real play full pipeline |
| `briefing-zip-interaction-gif.spec.ts` | 1 | 1 | 0 | **T086** — captures interaction recording into interaction.gif |
| **Briefing renderer total** | **16** | **16** | **0** | |

### `shared/components` Storybook E2E (3 specs)

| Suite | Tests | Pass | Fail | Notes |
|-------|-------|------|------|-------|
| `MapViewBriefingProps.spec.ts` | 3 | 3 | 0 | **T019** — `BriefingTileLayerProps` story captured in light/dark/vscode themes |

### Combined total: **19 Playwright specs, 0 failures**.

## Highlights

- The headline FR-015 + SC-002 invariant is observed: **zero external
  requests** are issued by the SPA across a full lifecycle.
- The end-to-end spec (T079) invokes the actual export pipeline,
  unzips the bytes into a temp directory, opens the resulting
  `index.html` from a real `file://` URL, advances through all 4
  Scenes, presses Replay, and asserts zero external requests for
  the entire flow. The SPA + export converge here.
- The Present-mode chrome correctly hides the Minimal-mode controls;
  Present-mode hides everything except the hover-revealed corner
  control. The `P` keyboard shortcut is always reachable so the user
  is never trapped (FR-024).
- The eight evidence-producer specs (5 lifecycle + 1 interaction GIF
  + 2 story-mode component) each capture into
  `specs/264-briefing-zip-renderer/evidence/screenshots/` — these are
  the source-of-truth images for the shipped blog post.
- The MapView briefing-prop story renders in real Storybook + Leaflet
  for all three theme variants (T019), captured as PNGs in evidence.

## Reproduce locally

```sh
# Briefing-renderer Playwright suite (16 specs)
cd apps/briefing-renderer
pnpm build
node run-playwright.mjs --reporter=list

# Shared-components Storybook MapView spec (3 specs, 3 themes)
cd shared/components
node run-playwright.mjs MapViewBriefingProps
```

In cloud sessions (Claude Code on the web) both wrappers extract a
bundled Chromium via `@sparticuz/chromium`; on a local desktop machine
use `pnpm exec playwright install chromium` and the respective package
`test:e2e` scripts instead.
