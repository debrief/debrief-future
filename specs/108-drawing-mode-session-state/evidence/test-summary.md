---
feature: "108-drawing-mode-session-state"
captured_at: "2026-05-12T20:10:00Z"
git_sha: "5210c38"
tests_passed: 13
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Wire Drawing Mode and Palette to Session-State Store

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 13 (feature-scoped) |
| Passed | 13 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | Not measured — refactor of message-bridge wiring |

Full project-wide gate:

| Suite | Result |
|-------|--------|
| `uv run ruff check .` | Pass (no errors) |
| `pnpm lint` | Pass (4 pre-existing warnings in `apps/vscode/src/services/llmProxy.ts`; none in changed files) |
| `uv run pyright` | 0 errors, 0 warnings |
| `pnpm -r typecheck` | All 13 workspace packages pass `tsc --noEmit` |
| `uv run pytest` | 1887 passed, 1 skipped, 1 xfailed |
| `pnpm --filter '!@debrief/web-shell' test` | 3 664 passed (vscode 782, session-state 642, components 2 054, stac-writer 22, nl-demo 25, backlog-navigator 139) |
| Web-shell Playwright — `drawing-mode-survives-reload.spec.ts` + `drawing.spec.ts` | 11/11 passed (4 new + 7 pre-existing) |

> Other web-shell Playwright suites (`capture-log-evidence`, `event-log-propagation`, `log-edit-face`) exhibit pre-existing failures on `main` that are unrelated to this feature. The drawing-mode tests, the drawing toolbar tests, and the broader catalog-browse, drawing, selection, and undo-redo suites all pass.

## Test Breakdown

### Vitest — VS Code message-bridge contract (NEW for #108)

File: `apps/vscode/tests/unit/mapPanel.webviewReady.test.ts`

| Test | Status |
|------|--------|
| flushes drawing mode on `webviewReady` when a session is active (C-1) | Pass |
| flushes drawing palette index on `webviewReady` when a session is active (C-2) | Pass |
| posts drawing mode unconditionally — including the null/un-armed default (Decision 3) | Pass |
| does not post drawing state when no active session exists (C-3) | Pass |
| still posts the pre-existing `setDisplayMode` message (no regression) | Pass |

### Vitest — session-state observability (NEW for #108 / SC-005)

File: `services/session-state/tests/unit/slices/spatial.drawing-observability.test.ts`

| Test | Status |
|------|--------|
| drawing mode is observable by external subscribers | Pass |
| drawing mode subscriber fires exactly once per change | Pass |
| drawing palette index is observable by external subscribers | Pass |
| the same store snapshot exposes drawing state to any reader | Pass |

### Playwright — web-shell store wiring (NEW for #108)

File: `apps/web-shell/playwright/tests/drawing-mode-survives-reload.spec.ts`

| Test | Status |
|------|--------|
| store observability: arming polygon updates store; non-map consumer can read it (SC-005) | Pass |
| store subscription: non-map consumer observes drawing-mode changes in real time (SC-005) | Pass |
| programmatic write: setting drawingMode via store propagates to toolbar (FR-001/FR-003) | Pass |
| palette index round-trip via store action (SC-002 store-side) | Pass |

### Existing drawing regression suite (must not regress)

File: `apps/web-shell/playwright/tests/drawing.spec.ts`

| Test | Status |
|------|--------|
| drawing toolbar is present | Pass |
| shape palette opens on click | Pass |
| draw rectangle with custom name appears in FeatureList | Pass |
| draw point with custom name appears in FeatureList | Pass |
| cancelling naming dialog discards the shape | Pass |
| drawing a shape creates a log entry | Pass |
| drawn feature is selectable via FeatureList | Pass |

## Key Scenarios Verified

- **F-3.1 / SC-001** — On `webviewReady`, the host posts the current `drawingMode` from the active session, so a freshly-mounted webview toolbar reflects the previously-armed tool. Verified by the C-1 / C-2 Vitest cases.
- **F-3.2 / SC-002** — Same path posts the current `drawingPaletteIndex`, so a freshly-mounted palette selector reflects the previously-chosen entry.
- **SC-003** — The only remaining `useState<DrawingMode>` / `useState<number>(0)` call sites are the host-driven mirrors in `mapView.tsx`. They are documented (in code) as mirrors, not the source of truth. `App.tsx` has no `useState<DrawingMode>`; it reads `state.drawingMode` from the store.
- **SC-005** — A non-map consumer (here: a Vitest subscriber and a Playwright `window.__sessionStore` consumer) can both read and subscribe to drawing state.
- **Decision 3 invariant** — The post fires unconditionally on the value, so the webview cannot confuse "host has no opinion" with "host says null". Verified by the dedicated Vitest case.
- **C-3 contract** — When there is no active session, the host posts no drawing state. Verified directly.
- **No regression** — All seven existing Drawing — Feature 094 tests continue to pass against the same `setDrawingMode` / `setDrawingPaletteIndex` message types.

## Known Issues

- The web-shell suite has pre-existing flakiness in `capture-log-evidence.spec.ts`, `event-log-propagation.spec.ts`, and `log-edit-face.spec.ts`. These are unrelated to drawing-mode wiring and fail the same way on `main`.
- The original tasks.md proposed forcing a `<MapView>` subtree remount in the Playwright test by clicking `[data-testid="reset-layout"]`. In practice GoldenLayout's `__resetLayout` does not synchronously re-mount the MapView toolbar in the test harness, so the spec replaces "DOM-remount" with "store subscription + programmatic write". The remount contract that #108 actually cares about is the VS Code message-bridge boundary, which is covered deterministically by the Vitest test on `MapPanel.handleWebviewMessage('webviewReady', …)`.

## Environment

- Runner: pytest 8.x · vitest 1.6.1 · @playwright/test 1.58.2
- Browser: Chromium via `@sparticuz/chromium` (Linux bundled binary, extracted to `/tmp/chromium`).
- Branch: `claude/implement-speckit-108-WxO65`
- Date: 2026-05-12
