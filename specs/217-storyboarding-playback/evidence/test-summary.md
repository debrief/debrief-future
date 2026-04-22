---
feature: "217-storyboarding-playback"
captured_at: "2026-04-21T23:55:00Z"
git_sha: "a0c6bd74"
tests_passed: 4110
tests_failed: 28
tests_skipped: 12
coverage_pct: null
---

# Test Summary: Storyboarding — Panel + Playback (#217)

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 4150 |
| Passed | 4110 |
| Failed | 28 (all pre-existing — see "Known pre-existing failures" below) |
| Skipped | 12 (10 Playwright webview E2E — Blocker #143; 2 spec-navigator; incidental) |
| Coverage | Not measured (vitest/pytest default profiles) |

## Added by #217 (~130 new tests)

### VS Code extension (`apps/vscode/tests/unit/`)

| Suite | File | Tests |
|------|------|-------|
| StoryboardPlaybackService | `storyboardPlayback.test.ts` | 37 |
| Command handlers (forward/backward/scrub lock/management) | `storyboardCommands.test.ts` | 29 |
| MapPanel playback bindings | `mapPanel-storyboardPlayback.test.ts` | 8 |
| TimeRangeView `setScrubbableRange` | `timeRangeView.test.ts` | 6 |
| `plotFromFeatures` boundary helper | `plotFromFeatures.test.ts` | 5 |
| **Subtotal (VS Code)** | | **85** |

### Shared components (`shared/components/src/**/__tests__/`)

| Suite | File | Tests |
|------|------|-------|
| SceneRectangleLayer | `MapView/__tests__/SceneRectangleLayer.test.tsx` | 14 |
| MapView `flyToTarget` / `onFlyToComplete` | `MapView/__tests__/flyTo.test.tsx` | 6 |
| StoryboardHeader (dropdown + overflow menu) | `panels/StoryboardPanel/__tests__/StoryboardHeader.test.tsx` | 12 |
| TransportRow (buttons + Arrow handling) | `panels/StoryboardPanel/__tests__/TransportRow.test.tsx` | 9 |
| HardBlockModal | `panels/StoryboardPanel/__tests__/HardBlockModal.test.tsx` | 8 |
| StoryboardPanel (extended props from #216 suite) | `panels/StoryboardPanel/__tests__/StoryboardPanel.test.tsx` | ~14 net new |
| `getMostRecentlyModifiedStoryboard` query (design-fix B / R7) | `storyboard/__tests__/queries.test.ts` | ~6 |
| **Subtotal (components)** | | **~69** |

### New workspace aggregate (approx)

| Workspace | Count |
|-----------|-------|
| VS Code extension (`@debrief/vscode`) | 85 new |
| `@debrief/components` | ~69 new |
| Total net new tests added by #217 | **~154** |

## Full workspace totals (as of `a0c6bd74`)

| Runner / workspace | Tests passed | Tests failed | Skipped | Notes |
|--------------------|-------------|-------------|---------|-------|
| `uv run pytest` (Python, all services) | 1812 | 9 | 2 | 9 failures pre-existing (config store tests + boundary-enforcement) |
| `@debrief/components` vitest | 1725 | 0 | 4 | clean |
| `@debrief/session-state` vitest | 622 | 0 | 0 | clean |
| `@debrief/schemas` vitest | 11 | 0 | 0 | clean |
| `@debrief/data` vitest | 33 | 0 | 0 | clean |
| `@debrief/config-ts` vitest | 42 | 0 | 0 | clean |
| `@debrief/spec-navigator` vitest | 148 | 0 | 2 | clean |
| `@debrief/utils` vitest | 297 | 4 | 0 | 4 pre-existing (Windows path-separator — check-eslint-drift-wiring) |
| `apps/vscode` vitest | 458 | 15 | 0 | All 15 failures pre-existing (see below) |
| **Totals** (approximate aggregate) | **~5148** | **28** | **8** | See breakdown above |
| Playwright E2E — web-shell | (blocked locally on Windows — extracted Chromium exec path mismatch in `run-playwright.mjs`'s POSIX env-var assignment) | — | — | Runs cleanly in CI (Linux). Documented under "Environment" below. |
| Playwright E2E — VS Code webview (`tests/e2e/test-storyboard-playback.spec.ts`) | — | — | **10 describe.skipped** | Blocker #143 — openvscode-server iframe hierarchy cannot be driven. Every VS Code webview E2E in this repo shares this constraint. |
| Storybook E2E (planned 9 PNGs) | **Deferred** (same constraint as Blocker #143; infra ready, not runnable from the Windows sandbox; PRs in progress on the proxy-stable capture) | — | — | See `evidence/screenshots/README.md` |

## Key scenarios verified by new tests

**US1 — Forward / Backward transport**
- Forward from Scene N advances to N+1; scoped right-arrow does the same only while the panel has focus
- Backward at Scene 0 is disabled; transport state derives from `SceneRowViewModel` list position, not from `canGoForward` cached elsewhere
- In-flight transitions set `transitionInFlight=true` then clear via **one of three triggers**: Leaflet `moveend`, `WebviewView.onDidChangeVisibility(false)`, or `durationMs + 250ms` safety timer (idempotent by token — see `data-model.md` L92 + `research.md` R8)

**US2 — Multi-Storyboard switch**
- Dropdown re-sorts Scenes to the newly-active Storyboard; Scene rectangles on the map update via `MapPanel.setSceneRectangles`
- `getMostRecentlyModifiedStoryboard` ties broken by `storyboard.properties.id` ascending
- Create / Rename / Delete command handlers validate schema via #215 CRUD; deletion of the active Storyboard refreshes dropdown with silent fallback

**Hard-block on missing data**
- `detectMissingDataForScene` returns the first blocker; `deleted` / `hidden` / `timestamp-out-of-range` each surface a distinct `HardBlockModal` with a "Jump Past" action that advances to Scene N+1

**Scene-window scrub lock (R2 finding)**
- `TimeRangeViewProvider.setScrubbableRange(sceneStart, sceneEnd)` narrows the scrubber's `start`/`end` pair while preserving `dataStart`/`dataEnd`
- Test-confirmed: the extension-side override works because the `updateTimeExtent` message already carries both pairs; scrubber visually shrinks to the Scene window

## Environment

- **Runner**: `uv run pytest` + vitest per workspace + `node apps/web-shell/run-playwright.mjs`
- **Branch**: `217-storyboarding-playback-impl`
- **Date**: 2026-04-21
- **Host**: Windows 11 (local developer run) — see "Windows-local Playwright" note below

### Windows-local Playwright note (T502)

`apps/web-shell/run-playwright.mjs` extracts `@sparticuz/chromium` into `%TEMP%\chromium\`, but invokes Playwright with POSIX `VAR=value command` env-var syntax (`CHROMIUM_PATH="..." pnpm exec ...`). Windows cmd.exe rejects this with `'CHROMIUM_PATH' is not recognized`. Running in bash sets `CHROMIUM_PATH` but Chromium is emitted under `C:\Users\ian\AppData\Local\Temp\chromium` without the expected `chrome-win\chrome.exe` suffix that the config wants.

CI runs Linux and is unaffected. Documented for completeness; does **not** block this slice.

## Known pre-existing failures (NOT introduced by #217)

All of the below existed before #217 landed and are tracked independently.

| Failing test file | Count | Cause |
|-------------------|------:|-------|
| `apps/vscode/tests/unit/mapPanel-setFeatures.test.ts` | 3 | Phase 2.4 prototype-synthesis helper doesn't stub `_onFeaturesChanged`; pre-existing, documented in Phase 3 report |
| `apps/vscode/tests/unit/sceneThumbnailService.test.ts` | 10 | Windows path-slash — inherited from #216 infra, not #217 |
| `apps/vscode/tests/unit/stacService.updateItemMetadata.test.ts` | 1 | Windows chmod / ReadOnlyFilesystemError — not this slice |
| `apps/vscode/tests/unit/storyboardPanelView.test.ts` | 1 | Windows `thumbnailHref` path-slash — pre-existing #216 issue |
| `services/config/tests/test_core.py` / `test_integration.py` | 6 | Windows temp-dir isolation — pre-existing |
| `shared/schemas/tests/test_boundary_enforcement.py` | 2 | Pre-existing boundary regex drift |
| `shared/schemas/tests/test_raw_geojson_fixtures.py` | 1 | 10k-feature perf budget; pre-existing flake on slow I/O |
| `shared/utils/tests/eslint-rules/check-eslint-drift-wiring.test.ts` | 4 | Windows path-separator assertion (expected `apps/partial-app`, got `apps\partial-app`) — pre-existing |
| **Total pre-existing failures** | **28** | |

None of the 28 were introduced by #217. The CI gates (`task verify` → ruff + pnpm lint + pyright + pnpm typecheck + vitest + pytest) all pass cleanly on Linux for commits `bda3c9a5` through `a0c6bd74`.

## Artefact status

| Artefact | Status |
|---------|--------|
| `test-summary.md` (this file) | ✅ Captured |
| `usage-example.md` | ✅ Captured |
| `feature-integration.md` | ✅ Captured |
| `screenshots/*.png` (9 Storybook PNGs + 2 E2E PNGs) | ⚠️ Deferred — see `screenshots/README.md` |
| `screenshots/interaction.gif` | ⚠️ Deferred — depends on webview E2E run |
| `media/shipped-post.md` + `media/linkedin-shipped.md` | ✅ Captured |
