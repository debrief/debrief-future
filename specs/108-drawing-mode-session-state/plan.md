# Implementation Plan: Wire Drawing Mode and Palette to Session-State Store

**Branch**: `108-drawing-mode-session-state` | **Date**: 2026-05-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/108-drawing-mode-session-state/spec.md`

## Summary

Tech-debt resolution for findings F-3.1 and F-3.2 of the architectural consistency review. Move the drawing-mode and drawing-palette-index source-of-truth from React component-local `useState` into the existing `session-state` spatial slice so that the values survive VS Code webview rebuilds, are observable by non-map consumers, and match the architectural rule that session-relevant UI state lives in the store.

**Technical approach** — discovery during planning surfaced that substantial wiring already exists (the architectural review predates work merged in PR #559). The web-shell already reads `drawingMode`/`drawingPaletteIndex` from the store. The VS Code extension host already subscribes to the spatial slice and forwards changes to the webview, and the webview already round-trips its toolbar clicks back to the host via `drawingModeChanged`. The remaining gap is that the **initial state** on webview mount/remount is never sent: `handleWebviewMessage('webviewReady', …)` in `mapPanel.ts` posts `setCurrentTime` and `setDisplayMode` but not `setDrawingMode` or `setDrawingPaletteIndex`. So when a VS Code webview rebuilds, the host-side session-state still has (e.g.) `drawingMode='polygon'`, but the webview's local mirror falls back to its default `null`/`0`. The fix is to post both drawing values on `webviewReady`, mirroring the existing pattern.

Secondary work: tighten the typing of the local mirror in `mapView.tsx`, add a regression unit test that confirms `webviewReady` flushes drawing state, and add a Playwright assertion that the drawing toolbar reflects the previously armed mode after a webview reload.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, per Article XV) — both frontends.
**Primary Dependencies**: React 18.x (existing), Zustand ^5.0.0 (existing — `@debrief/session-state` store), VS Code Extension API ^1.85.0 (existing — extension host messaging), `@debrief/schemas` (existing — `DrawingMode` type lives at `services/session-state/src/types/spatial.ts:64`).
**Storage**: N/A — drawing-mode and palette-index are in-memory session state. No persistence is added or removed.
**Testing**: Vitest (unit; new test for `webviewReady` initial-state flush in `apps/vscode/src/webview/__tests__/`). Playwright via `apps/web-shell/playwright/` for the web-shell regression. The VS Code webview behaviour relies on the same extension messages that are already exercised in `apps/vscode/test/`; we add a focused unit test rather than driving the real VS Code chrome (#142 reliability constraint).
**Target Platform**: VS Code Extension webview (Linux/macOS/Windows host) + web-shell SPA (modern Chromium).
**Project Type**: Existing monorepo — no new packages, no new project boundaries.
**Performance Goals**: N/A — this is a refactor of where in-memory state lives. No new async paths, no new renders beyond what already happens on mount.
**Constraints**: Must not regress existing drawing-toolbar behaviour. Must not introduce a new public API on the session-state store (FR-010). Must not break the existing `drawingModeChanged` message contract used by `apps/vscode/src/webview/mapPanel.ts:1066-1069`.
**Scale/Scope**: Two call-site additions in `mapPanel.ts` (initial post on `webviewReady`). Two cosmetic comment updates in `mapView.tsx`. One new unit test, one new Playwright check. Approximately 30–60 lines of production change.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Clause | Applicable? | Compliance |
|---------|--------|-------------|------------|
| I — Defence-Grade Reliability | I.1 Offline by default | Yes | ✅ No network involved. |
| I — Defence-Grade Reliability | I.3 No silent failures | Yes | ✅ Drawing-mode handler logs on unknown values (spec edge case); existing message infra already surfaces errors. |
| II — Schema Integrity | II.1 LinkML single source of truth | Partial | ✅ `DrawingMode` is a TypeScript union at `session-state/types/spatial.ts:64`; this feature does not change its source. No schema regeneration required. |
| IV — Architectural Boundaries | IV.1 Services never touch UI | N/A | No services involved. |
| IV — Architectural Boundaries | IV.2 Frontends never persist | N/A | No persistence. |
| IV — Architectural Boundaries | IV.4 Persistence-host abstraction | N/A | No persistence. |
| VI — Testing | VI.2 Services require unit tests | Adapted | ✅ Adding a unit test for the message-bridge initial-state flush. |
| VI — Testing | VI.3 Integration tests for workflows | Yes | ✅ Adding a web-shell Playwright regression that asserts drawing-mode persistence. |
| VII — Test-Driven AI Collaboration | All clauses | Yes | ✅ Acceptance criteria in spec (US1, US2 scenarios) are testable; Success Criteria SC-001/SC-002/SC-003/SC-005 are verifiable. |
| VIII — Documentation | VIII.1 Specs before code | Yes | ✅ Spec exists; this plan documents the technical approach. |
| VIII — Documentation | VIII.3 ADRs for significant choices | Yes | ✅ Architectural-review entry F-3.1/F-3.2 is the ADR-style record this work resolves. No new ADR needed. |
| IX — Dependencies | All clauses | Yes | ✅ Zero new dependencies. |
| XIII — Contribution Standards | XIII.1 Atomic commits | Yes | ✅ One commit for the source-of-truth move (host + webview), one for tests. |
| XV — Strict Type Safety | All clauses | Yes | ✅ All new code typed; the `DrawingMode` union is reused; no `any`. |

**Result**: PASS — no violations, no entries required in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/108-drawing-mode-session-state/
├── spec.md                            # /speckit.specify output (done)
├── plan.md                            # This file (/speckit.plan output)
├── research.md                        # Phase 0 output
├── data-model.md                      # Phase 1 output (state model, since no data entities)
├── quickstart.md                      # Phase 1 output (verify the fix end-to-end)
├── contracts/                         # Phase 1 output (extension-message contract delta)
│   └── webview-messages.md
├── checklists/
│   └── requirements.md                # Already populated
└── evidence/
    └── opening-context.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/
├── vscode/
│   ├── src/
│   │   └── webview/
│   │       ├── mapPanel.ts            # host side — add initial-state posts on webviewReady
│   │       ├── messages.ts            # message-contract types (no schema change needed — existing 'setDrawingMode' and 'setDrawingPaletteIndex' messages already typed)
│   │       └── web/
│   │           └── mapView.tsx        # webview — refresh comments; local mirror retained intentionally
│   └── src/webview/__tests__/         # new unit test: webviewReady flushes drawing state
└── web-shell/
    ├── src/
    │   └── App.tsx                    # no production change — already wired to store; add comment if helpful
    └── playwright/
        └── tests/
            └── drawing-mode-survives-reload.spec.ts  # new Playwright regression

services/
└── session-state/
    └── src/store/slices/spatial.ts    # no change — `setDrawingMode` and `drawingPaletteIndex` already present

shared/
└── components/
    └── src/MapView/                   # no change — `MapView` already accepts `drawingMode` as a prop
```

**Structure Decision** — No new packages, no new directories outside the spec folder. The implementation is two file-level edits inside `apps/vscode/src/webview/`, plus tests. The architectural rule "VS Code webview cannot reach into the extension-host store directly; messages are the boundary" is preserved — we are filling in a gap in that boundary, not redesigning it.

## Media Components

None — backend/infrastructure feature. The drawing toolbar already has a Storybook story (`shared/components/src/MapView/Drawing.stories.tsx`), but this feature changes no visual output and adds no new component. The story is the existing demonstration surface and does not need to be re-bundled for a blog post.

## Storybook E2E Testing

None — no interactive UI components are added or visually changed by this feature. The existing Drawing story continues to operate against the `<MapView>` prop API, which is unchanged.

## Web-Shell E2E Testing

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|----------|---------------------------|---------------|--------------|
| Drawing mode survives state-store remount in web-shell | MapView, DrawingToolbar | `.leaflet-container`, `[data-testid="drawing-toolbar-polygon"]` (or current selector convention), `[data-testid="drawing-mode-indicator"]` if exposed | Open plot → click polygon tool → assert `store.getState().drawingMode === 'polygon'` via `window.__debriefStore` test hook → force a React subtree remount (clear and re-render `<MapView>`) → assert drawing mode is still `'polygon'` |

**Testing Strategy**:

- [x] Workflow runs end-to-end in the web-shell (cloud-supported via `@sparticuz/chromium`).
- [x] Page-object extension lives in `apps/web-shell/playwright/pages/AnalysisPage.ts` — add a `getDrawingMode()` accessor that reads from the test-mode-exposed store handle. If the handle does not yet exist, add it behind an `if (import.meta.env.MODE === 'test')` guard rather than always-exposing the store.
- [x] Screenshot of the drawing toolbar with polygon armed, before and after the forced remount, written into `specs/108-drawing-mode-session-state/evidence/screenshots/`.

**Test File Location**: `apps/web-shell/playwright/tests/drawing-mode-survives-reload.spec.ts`

**Run Commands**:

- Cloud: `cd apps/web-shell && node run-playwright.mjs drawing-mode-survives-reload`
- Local: `pnpm --filter @debrief/web-shell test drawing-mode-survives-reload`

**Note on VS Code coverage** — the primary user-facing benefit (US1, US2) is in VS Code. We do **not** drive VS Code chrome with Playwright (per #142). Instead the VS Code side is covered by a Vitest unit test on `mapPanel.handleWebviewMessage('webviewReady', …)` that asserts both `setDrawingMode` and `setDrawingPaletteIndex` are posted with the current session-state values. This pairs the boundary contract with a fast, reliable test.

## Complexity Tracking

> No constitution violations to justify.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | — | — |
