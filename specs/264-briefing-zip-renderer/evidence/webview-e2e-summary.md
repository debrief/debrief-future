# Playwright E2E summary — air-gapped briefing zip

Captured 2026-05-20 via `apps/briefing-renderer/run-playwright.mjs`
(Sparticuz Chromium 143, headless).

## Results

| Suite | Tests | Pass | Fail | Notes |
|-------|-------|------|------|-------|
| `briefing-zip-file-protocol.spec.ts` | 2 | 2 | 0 | `file://`-origin boot + no external requests on initial render |
| `briefing-zip-network-isolation.spec.ts` | 1 | 1 | 0 | SC-002: 0 external requests across load → play → toggle → replay |
| `briefing-zip-playback.spec.ts` | 2 | 2 | 0 | Instant Scene transport + slider disabled for instant Scenes |
| `briefing-zip-mode-toggle.spec.ts` | 2 | 2 | 0 | 10 consecutive Present ↔ Minimal toggles (SC-005); P key reachable in Present |
| `briefing-zip-screenshots.spec.ts` | 5 | 5 | 0 | Evidence producers — Minimal/Present/Empty/Error/Halted screenshots |
| **Total** | **12** | **12** | **0** | |

## Highlights

- The headline FR-015 + SC-002 invariant is observed: **zero external
  requests** are issued by the SPA across a full lifecycle (load, two
  Scene advances, two mode toggles, two Scene rewinds).
- The Present-mode chrome correctly hides the Minimal-mode controls;
  Present-mode hides everything except the hover-revealed corner
  control. The `P` keyboard shortcut is always reachable so the user
  is never trapped (FR-024).
- The five evidence-producer specs each capture a real PNG into
  `specs/264-briefing-zip-renderer/evidence/screenshots/` — these are
  the source-of-truth images for the shipped blog post.

## Skipped / deferred

- `time-range Scene playback` Playwright assertion is deferred to
  unit-tests (`apps/briefing-renderer/src/playback/__tests__/playbackDriver.test.ts`)
  — the dev fixture ships only instant Scenes, and constructing a
  fixture with a time-range Scene inside a Playwright spec adds
  complexity that the unit-test layer already covers.
- The end-to-end "real export → real unzip → real play" Playwright
  spec (T079) is deferred. The current Playwright suite drives the
  built SPA directly using the dev fixture; the export-side pipeline
  is exercised by the vitest integration test
  (`apps/vscode/tests/unit/briefingZipExport/export.integration.test.ts`)
  which round-trips through JSZip's loader. Wiring those two halves
  into a single Playwright spec is meaningful future work but not
  required to verify SC-001 / SC-002 / SC-005.

## Reproduce locally

```sh
cd apps/briefing-renderer
pnpm build
node run-playwright.mjs --reporter=list
```

In cloud sessions (Claude Code on the web) the wrapper extracts a
bundled Chromium via `@sparticuz/chromium`; on a local desktop machine
use `pnpm exec playwright install chromium` and `pnpm test:e2e` instead.
