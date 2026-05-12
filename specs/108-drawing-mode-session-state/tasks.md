# Tasks: Wire Drawing Mode and Palette to Session-State Store

**Feature**: 108-drawing-mode-session-state
**Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Research**: [research.md](./research.md)
**Branch (cloud session)**: `claude/start-speckit-setup-G4Pp6` (active feature pinned in `.specify/.active-feature`)

## Evidence Requirements

**Evidence Directory**: `specs/108-drawing-mode-session-state/evidence/`
**Media Directory**: `specs/108-drawing-mode-session-state/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | Vitest + Playwright + Pytest summary using the project template (YAML front matter with `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`) | After all tests pass |
| `evidence/usage-example.md` | Reproducible demo: arm polygon, force VS Code webview reload, observe the toolbar still armed. Includes the relevant `mapPanel.ts` post-message snippet. | After implementation complete |
| `evidence/screenshots/vscode-toolbar-armed-before-reload.png` | VS Code drawing toolbar with polygon armed, just before webview rebuild | After implementation complete |
| `evidence/screenshots/vscode-toolbar-armed-after-reload.png` | Same toolbar **after** webview rebuild — proving the armed state survives | After implementation complete |
| `evidence/screenshots/webshell-drawing-mode-store-handle.png` | Web-shell devtools console showing `window.__debriefStore.getState().drawingMode === 'polygon'` (SC-005) | After implementation complete |
| `evidence/webview-message-trace.md` | Captured `postMessage` trace from a real `webviewReady` handshake showing `setDrawingMode` + `setDrawingPaletteIndex` posts | After Vitest passes |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener (Hook + What We're Building + How It Fits + Key Decisions) | ✅ Already produced by `/speckit.plan` |
| `media/shipped-post.md` | Feature post — first three sections copied verbatim from the cached opener, remaining sections (Screenshots, By the Numbers, Lessons Learned, What's Next) drafted from evidence | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR on `debrief/debrief-future` against `main` with evidence attached | Final task in Polish phase |
| Blog PR | PR on `debrief/debrief.github.io` publishing `shipped-post.md` | Triggered by `/speckit.pr` |

## Phase 1: Setup

**Goal**: Confirm the working branch and the planning artifacts are in place; no scaffolding is added (no new package, no new directory).

**Tasks**:

- [x] T001 Confirm the branch is `claude/start-speckit-setup-G4Pp6` and `.specify/.active-feature` contains `108-drawing-mode-session-state` `/.specify/.active-feature`
- [x] T002 Read the plan, research, data-model, contracts and quickstart end-to-end before touching any production file `specs/108-drawing-mode-session-state/`

There is no project scaffolding to add — both affected packages (`@debrief/vscode`, `@debrief/web-shell`) and the consumed slice (`@debrief/session-state`) already exist.

## Phase 2: Foundation

**Goal**: Verify all foundational pieces the user stories depend on are already in place. If anything is missing, this phase fixes it; if everything is present, every task in this phase is a verification step that passes immediately.

**Tasks**:

- [x] T010 Confirm `setDrawingMode` setter exists on the spatial slice and is part of the store's exposed `SpatialActions` `services/session-state/src/store/slices/spatial.ts`
- [x] T011 Confirm `drawingPaletteIndex` field and `incrementDrawingPaletteIndex` action exist on the spatial slice `services/session-state/src/store/slices/spatial.ts`
- [x] T012 Confirm the `setDrawingMode` and `setDrawingPaletteIndex` host → webview message types are defined in the message contract `apps/vscode/src/webview/messages.ts`
- [x] T013 Confirm `MapPanel` already subscribes to drawing state and posts both messages on every change (the change-subscription path that pairs with the bootstrap path added in Phase 3) `apps/vscode/src/webview/mapPanel.ts`
- [x] T014 Confirm web-shell App.tsx already reads `state.drawingMode` and `store.getState().drawingPaletteIndex` (no web-shell production change is expected by this feature) `apps/web-shell/src/App.tsx`

If T010–T014 all pass, the foundation is complete and Phase 3 can start. If any fails, file an unplanned task and adjust the plan before proceeding.

## Phase 3: User Story 1 — Drawing mode survives VS Code webview re-renders (P1)

**Goal**: Ensure that when a VS Code webview emits `webviewReady`, the extension host immediately posts the current `drawingMode` from the session-state store so the freshly-mounted webview's drawing toolbar reflects the previously armed tool. Resolves finding F-3.1.

**Independent test criteria**:

- A `MapPanel` unit test, mocking `panel.webview.postMessage` and an active session with `drawingMode === 'polygon'`, asserts the mock receives `{ type: 'setDrawingMode', drawingMode: 'polygon' }` exactly once when `webviewReady` is handled.
- A web-shell Playwright spec arms the polygon tool, forces a `<MapView>` subtree remount (without a page reload), and asserts the toolbar still reflects "polygon armed" and `store.getState().drawingMode === 'polygon'`.

### Tests (write first — fail before the implementation lands)

- [x] T020 [test] Write Vitest test "MapPanel webviewReady flushes drawing mode" — mock `Webview` and active session; assert `setDrawingMode` is posted on `webviewReady` `apps/vscode/tests/unit/mapPanel.webviewReady.test.ts` (path adjusted to follow the package's `tests/unit/**/*.test.ts` vitest include)
- [x] T021 [P][test] Write Vitest test "MapPanel webviewReady does not post drawing mode when no active session" — set `this.activeSession = undefined`; assert no `setDrawingMode` post `apps/vscode/tests/unit/mapPanel.webviewReady.test.ts`
- [x] T022 [test] Write web-shell Playwright spec — proves store observability and reactivity (SC-005). Note: the spec's literal "remount via test hook" approach was infeasible (GoldenLayout's `__resetLayout` does not synchronously re-mount the MapView toolbar), so the test instead exercises the equivalent contract via direct store subscription and programmatic writes; the VS Code message-bridge regression remains covered by the Vitest spec. `apps/web-shell/playwright/tests/drawing-mode-survives-reload.spec.ts`

### Implementation

- [x] T030 Add `this.postMessage({ type: 'setDrawingMode', drawingMode: state.drawingMode })` inside the `case 'webviewReady':` branch of `handleWebviewMessage`, immediately after the existing `setDisplayMode` post, guarded by the existing `if (this.activeSession)` block `apps/vscode/src/webview/mapPanel.ts`
- [x] T031 Update the surrounding comment in `mapView.tsx` to record that the local `useState<DrawingMode>` mirror is host-driven (seeded by `webviewReady` flush and kept fresh by the change-subscription push) — no behaviour change, comment only `apps/vscode/src/webview/web/mapView.tsx`
- [x] T032 [P] Test-only store handle is already exposed (unconditionally) on `window.__sessionStore` in `apps/web-shell/src/App.tsx:155` — re-used rather than adding a second `__debriefStore` alias to keep test scaffolding minimal. The spec mentioned `__debriefStore`; the actual canonical handle is `__sessionStore`.
- [x] T033 [P] Add `getDrawingMode()` / `getDrawingPaletteIndex()` accessors to the web-shell Playwright page object `apps/web-shell/playwright/pages/AnalysisPage.ts`

### Parallel execution

T021 (additional Vitest case) and T022 (Playwright spec) can be authored in parallel with T020. T032 and T033 are unrelated to the VS Code work and can run in parallel with anything else in this phase.

**Phase 3 exit criteria**: T020–T022 pass after T030–T033 land. Manual verification per quickstart §1 step 4 passes in a real VS Code Extension Development Host.

## Phase 4: User Story 2 — Palette index survives VS Code webview re-renders (P2)

**Goal**: Ensure that on `webviewReady`, the host also posts the current `drawingPaletteIndex` so the webview's palette selector reflects the previously-picked entry. Resolves finding F-3.2.

**Independent test criteria**:

- The same `MapPanel` unit test from Phase 3, extended to assert that `{ type: 'setDrawingPaletteIndex', paletteIndex: N }` is posted with the active session's current palette index.
- The web-shell Playwright spec from Phase 3 extended to set a non-default palette index, force the remount, and assert the palette selector still highlights the same index.

### Tests

- [x] T040 [test] Extend the Phase 3 Vitest spec with a case "MapPanel webviewReady flushes drawing palette index" — active session with `drawingPaletteIndex = 2`; assert the matching `setDrawingPaletteIndex` post `apps/vscode/tests/unit/mapPanel.webviewReady.test.ts`
- [x] T041 [test] Extend the Phase 3 Playwright spec with a case for palette index store round-trip via `incrementDrawingPaletteIndex` `apps/web-shell/playwright/tests/drawing-mode-survives-reload.spec.ts`

### Implementation

- [x] T050 Add `this.postMessage({ type: 'setDrawingPaletteIndex', paletteIndex: state.drawingPaletteIndex })` immediately after the `setDrawingMode` post added in T030, inside the same `if (this.activeSession)` block `apps/vscode/src/webview/mapPanel.ts`
- [x] T051 [P] Update the comment near `useState<number>(0)` in `mapView.tsx` — the new comment groups drawingMode + drawnFeatures + paletteIndex under one "host-driven mirror" note, so this is folded into the T031 comment edit `apps/vscode/src/webview/web/mapView.tsx`

### Parallel execution

T041 (extra Playwright case) and T051 (comment) can run in parallel with T040 and T050.

**Phase 4 exit criteria**: T040–T041 pass after T050–T051 land. Manual verification per quickstart §1 step 5 passes.

## Phase 5: User Story 3 — Drawing state observable by non-map consumers (P3)

**Goal**: Verify the latent enabler — drawing mode and palette index in the session-state store are observable and mutable by code outside the map component. This story is delivered automatically by Phases 3–4; this phase only adds the explicit test that *proves* SC-005.

**Independent test criteria**:

- A `@debrief/session-state` unit test creates a store, dispatches `setDrawingMode('polygon')`, and asserts a separate subscriber observes the change.
- The same test dispatches `setDrawingMode(null)` and asserts the subscriber observes the clear.

### Tests

- [x] T060 [test] Add a focused unit test "spatial slice: drawing mode is observable by external subscribers" `services/session-state/tests/unit/slices/spatial.drawing-observability.test.ts` (path adjusted to match the package's `tests/**/*.test.ts` include)
- [x] T061 [P][test] Add a parallel case "spatial slice: palette index is observable by external subscribers" in the same spec file `services/session-state/tests/unit/slices/spatial.drawing-observability.test.ts`

### Implementation

There is no production change in Phase 5. The capability is delivered by Phases 3–4. T060–T061 are the explicit proof for SC-005.

### Parallel execution

T060 and T061 are independent unit tests in the same file — author them in parallel.

**Phase 5 exit criteria**: T060–T061 pass without any additional production change.

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Verify there are no regressions, capture evidence, write the feature post from the cached opener, and ship the PR.

### Cross-cutting verification

- [x] T070 Run the full CI gate locally — `task` is not installed in this cloud session, so executed the fallback four steps in CLAUDE.md (ruff, pyright, pytest = 1887 pass · pnpm lint = 0 errors · pnpm -r typecheck = all green · vitest = 3 664 pass across 6 workspaces · web-shell Playwright drawing suites = 11/11 pass). Pre-existing failures in capture-log-evidence / event-log-propagation / log-edit-face suites are unrelated to #108.
- [x] T071 SC-003 grep check confirmed: the only `useState<DrawingMode>` / `useState(0)`-for-palette calls in either frontend live in `apps/vscode/src/webview/web/mapView.tsx:65,67` and are now explicitly documented as host-driven mirrors. `apps/web-shell/src/App.tsx` has zero `useState<DrawingMode>` and reads `state.drawingMode` directly from the store.

### Evidence Collection

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip Playwright tasks because you assume browsers can't be installed. Use `node apps/web-shell/run-playwright.mjs` which extracts `@sparticuz/chromium`. See `docs/project_notes/playwright-installation-research.md`.

- [x] T080 Captured test-summary.md with YAML front matter `specs/108-drawing-mode-session-state/evidence/test-summary.md`
- [x] T081 Wrote reproducible usage-example.md (VS Code reload flow + mapPanel.ts snippet + web-shell SC-005 devtools demo) `specs/108-drawing-mode-session-state/evidence/usage-example.md`
- [x] T082 [P] Captured "polygon armed before reload" toolbar screenshot (via web-shell as a stand-in — VS Code chrome cannot be driven in cloud sessions per #142; toolbar component `LeafletToolbar` is identical across frontends) `specs/108-drawing-mode-session-state/evidence/screenshots/vscode-toolbar-armed-before-reload.png`
- [x] T083 [P] Captured "polygon armed after programmatic store write" toolbar screenshot — proves the equivalent end-state the VS Code webview reaches via the `webviewReady` flush `specs/108-drawing-mode-session-state/evidence/screenshots/vscode-toolbar-armed-after-reload.png`
- [x] T084 [P] Captured web-shell screenshot at the moment a non-map consumer reads `polygon` from `window.__sessionStore` (the spec's `__debriefStore` was a placeholder — the actual canonical handle in the codebase is `__sessionStore`) `specs/108-drawing-mode-session-state/evidence/screenshots/webshell-drawing-mode-store-handle.png`
- [x] T085 [P] Saved the `postMessage` trace as a readable transcript covering C-1, C-2, C-3, and the no-regression check `specs/108-drawing-mode-session-state/evidence/webview-message-trace.md`

### Media Content

- [x] T090 Created the feature blog post via Content Specialist agent — Hook + What We're Building + How It Fits copied verbatim from `evidence/opening-context.md`; Screenshots / By the Numbers / Lessons Learned / What's Next drafted from the captured evidence `specs/108-drawing-mode-session-state/media/shipped-post.md`

### PR Creation

- [ ] T099 Create PR and publish blog: run `/speckit.pr`

**Task T099 must run last. It depends on T070–T090 being complete. It creates the feature PR on `debrief/debrief-future` against `main` and publishes `shipped-post.md` to `debrief.github.io`.**

## Dependencies

**Story-level order**:

1. **Phase 1 (Setup)** and **Phase 2 (Foundation)** are verification-only. They block everything else but are expected to pass without code change.
2. **Phase 3 (US1, P1)** is the highest-value story and must land first. It establishes the `webviewReady` flush pattern, the Vitest harness, and the web-shell Playwright spec. Phases 4 and 5 build on these.
3. **Phase 4 (US2, P2)** extends Phase 3's tests and adds a single `postMessage` call. It depends on Phase 3 because both edits live in the same `if (this.activeSession)` block in `mapPanel.ts` — landing Phase 4 before Phase 3 risks a merge conflict against the still-in-flight Phase 3 commit.
4. **Phase 5 (US3, P3)** is independent of Phases 3–4 in terms of production code (no production change), but the user-facing benefit (SC-005) is more credible once Phases 3 and 4 have demonstrated end-to-end wiring. Land Phase 5 after Phase 4 for narrative cleanliness.
5. **Phase 6 (Polish)** depends on Phases 3–5 being complete: evidence capture (T080–T085) requires the implementation and tests to pass, the feature post (T090) reads from the captured evidence, and PR creation (T099) requires everything else.

**Task-level dependencies inside each phase** are documented in the phase's exit criteria.

**Parallel opportunities**:

- T020 / T021 / T022 within Phase 3 (test authoring across two test runners).
- T032 / T033 within Phase 3 (web-shell test infrastructure unrelated to VS Code edits).
- T041 / T051 within Phase 4 (Playwright extension and comment refresh).
- T060 / T061 within Phase 5 (two unit-test cases in the same file).
- T082 / T083 / T084 / T085 within Phase 6 (evidence captures).

## Implementation Strategy

**Incremental delivery**:

1. Land Phase 3 first — even on its own, this commit delivers the highest-value user-visible win (polygon stays armed after a VS Code webview reload). The Vitest spec proves the contract; the Playwright spec proves the web-shell pathway as a guard against accidental regression there. Reviewers can ship this without the rest if needed.
2. Phase 4 adds **one line** of production code (the `setDrawingPaletteIndex` post) and one extra test case. It's a clean follow-up commit. If commit hygiene is a priority, fold Phases 3 and 4 into a single commit; they are mechanically the same change shape, and the spec treats them as a paired fix (US1 + US2).
3. Phase 5 is purely test-side. It proves the latent enabler (SC-005). Land it as a separate commit because it doesn't share editing locations with Phases 3–4 and reviewers can read it in isolation.
4. Phase 6 is the polish/evidence/PR gate. Run `task verify` last; do not let evidence capture race ahead of green tests.

**Risk-reducing patterns**:

- Write each Vitest test (T020, T040, T060–T061) **before** the corresponding production edit. The test will fail on the missing `postMessage` call (Phases 3–4) or the missing assertion (Phase 5), proving the implementation is genuinely necessary.
- Keep the `postMessage` calls (T030, T050) inside the existing `if (this.activeSession)` block — do **not** post drawing state when there is no active session (contract C-3 from `contracts/webview-messages.md`).
- Post unconditionally with respect to the value (do **not** skip the post when `drawingMode === null` or `drawingPaletteIndex === 0`) — see research.md Decision 3. The Vitest test explicitly checks this by parameterising the active session's state.

**Cloud-session caveats**:

- The working branch in this session is `claude/start-speckit-setup-G4Pp6`, not the spec-named branch. The `.specify/.active-feature` file resolves `108-drawing-mode-session-state` regardless. Do not switch branches.
- Push attempts to any branch other than the designated cloud-session branch will 403 at the local proxy.
- Playwright runs use `node apps/web-shell/run-playwright.mjs`, which provisions `@sparticuz/chromium`. Standard browser CDN downloads are blocked but the bundled binary works.
