---
description: "Task list for spec 260 — viewport lock"
---

# Tasks: Viewport Lock

**Input**: Design documents from `/specs/260-viewport-lock/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/mcp-setViewport.md, quickstart.md
**Branch**: working branch `claude/implement-viewport-lock-rjNkL`; spec branch identifier `260-viewport-lock` (held in `.specify/.active-feature`).

**Tests**: Spec includes 12 acceptance scenarios across 3 stories + 6 measurable success criteria. Tests are REQUIRED per Constitution Article VI (Testing) and Article VII (TDD for AI collaboration). All listed test tasks are mandatory, not optional.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. The P1 story (Story 1 — multi-scene capture with consistent framing) is the core value delivery; P2 and P3 extend it without depending on each other beyond foundation.

---

## Evidence Requirements

**Evidence Directory**: `specs/260-viewport-lock/evidence/`
**Media Directory**: `specs/260-viewport-lock/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | Vitest + Playwright run summary with YAML front matter (per `.specify/templates/evidence/test-summary-template.md`) | After all unit/integration/E2E tests pass |
| `evidence/usage-example.md` | Concrete walkthrough — lock → capture×3 → verify identical viewports → unlock | After Story 1 lands |
| `evidence/screenshots/banner-light.png` | On-map `ViewportLockBanner` in light theme | After ViewportLockBanner Storybook E2E |
| `evidence/screenshots/banner-dark.png` | Banner in dark theme | Same |
| `evidence/screenshots/banner-vscode.png` | Banner in vscode theme | Same |
| `evidence/screenshots/toolbar-disabled-light.png` | `LeafletToolbar` disabled state (zoom + fit) — light | Same |
| `evidence/screenshots/toolbar-disabled-dark.png` | Toolbar disabled state — dark | Same |
| `evidence/screenshots/toolbar-disabled-vscode.png` | Toolbar disabled state — vscode | Same |
| `evidence/screenshots/storyboard-padlock-light.png` | Storyboard panel header with padlock toggle in both states — light | Same |
| `evidence/screenshots/storyboard-padlock-dark.png` | Storyboard panel header — dark | Same |
| `evidence/screenshots/storyboard-padlock-vscode.png` | Storyboard panel header — vscode | Same |
| `evidence/screenshots/multi-scene-thumbnails.png` | The three identically-framed scene thumbnails side-by-side — the Hook image (planned at `images/viewport-lock-multi-scene-thumbnails.png` post-ship) | After Playwright Story 1 spec runs |
| `evidence/screenshots/interaction.gif` | < 5s, < 2MB GIF of lock → capture → unlock sequence in the web-shell | After Playwright Story 1 spec runs with video |
| `evidence/mcp-locked-response.json` | Sample `SetViewportOutput` from the reject branch (proof of `errorCode: 'VIEWPORT_LOCKED'`) | After MCP unit tests pass |
| `evidence/opening-context.md` | Cached opener (Hook + What We're Building + How It Fits + Key Decisions) | Already produced during `/speckit.plan` |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener — exists from `/speckit.plan` | ✓ already cached |
| `media/shipped-post.md` | Feature post — first three sections copied verbatim from `evidence/opening-context.md`; remaining sections (Screenshots, By the Numbers, Lessons Learned, What's Next) written from evidence | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Update PR #626 | The PR already exists for this branch; final task amends its description with evidence + media links | Final task in Polish phase |
| Blog PR | Cross-repo PR to `debrief.github.io` with `media/shipped-post.md` | Triggered by `/speckit.pr` |

---

## Phase 1: Setup

**Purpose**: confirm working environment + active-feature pointer + branch hygiene before any code changes. No new dependencies, no new packages — this feature adds nothing to either `package.json` or `pyproject.toml`. Zero scaffolding beyond what already exists.

- [x] T001 Verify `.specify/.active-feature` resolves to `260-viewport-lock` and the working branch is `claude/implement-viewport-lock-rjNkL` `.specify/.active-feature`
- [x] T002 Confirm pre-push verification commands pass on a clean tree before edits: `task verify` (or the four-command fallback in `CLAUDE.md` → "Before Pushing") — establishes the green baseline this feature must hold `CLAUDE.md`

## Phase 2: Foundation — Session-state slice + MCP contract (blocks all stories)

**Purpose**: introduce the `viewportLocked` state, its action, the typed exclusion at the persistence boundary, and the MCP tool's reject branch. Every user story consumes this foundation. **No UI yet** — the slice + tool can be unit-tested in isolation, and stories 1/2/3 can be implemented and tested independently once this lands.

Per `/speckit.review` decision 2A, the `Omit<>` widening also excludes `drawingMode` and `drawingPaletteIndex` and deletes the corresponding hand-reset lines in `extractPersistentState` — one ephemeral-field pattern in the file, properly applying Article IV.5.

### Type model

- [x] T003 Add `viewportLocked: boolean` to `SpatialSlice`, append `viewportLocked: false` to `DEFAULT_SPATIAL_SLICE`, add `setViewportLocked: (locked: boolean) => void` to `SpatialActions` `services/session-state/src/types/spatial.ts`
- [x] T004 Widen `PersistentSessionState.spatial` to `Omit<SpatialSlice, 'viewportLocked' | 'drawingMode' | 'drawingPaletteIndex'>` (per `/speckit.review` 2A) `services/session-state/src/types/index.ts`

### Store slice implementation

- [x] T005 Implement `setViewportLocked` reducer in the spatial slice creator `services/session-state/src/store/slices/spatial.ts`

### Persistence boundary

- [x] T006 Delete the two hand-reset lines for `drawingMode: null` and `drawingPaletteIndex: 0` in `extractPersistentState` (the widened `Omit<>` from T004 now enforces exclusion at type level — `tsc` will fail if any of the three ephemeral fields leak into the persisted shape) `services/session-state/src/persistence/save.ts`
- [x] T007 In the spatial-slice restoration block of `loadSession`, always set `viewportLocked: false` regardless of what is on disk (FR-011 / FR-012 — session/plot load is the canonical force-unlock event) `services/session-state/src/persistence/load.ts`

### MCP setViewport reject branch

- [x] T008 Add optional `errorCode?: 'VIEWPORT_LOCKED'` to `SetViewportOutput` (string-literal type per `contracts/mcp-setViewport.md`) `services/session-state/src/server/tools/setViewport.ts`
- [x] T009 At the top of the `setViewport` function (before validation), short-circuit when `store.getState().viewportLocked === true` and return `{ success: false, error: 'Viewport is locked — unlock to change view.', errorCode: 'VIEWPORT_LOCKED' }` — the reject runs **before** input validation per the contract (locked is the dominant signal) `services/session-state/src/server/tools/setViewport.ts`

### Foundation tests (run in parallel — independent fixtures)

- [x] T010 [P][test] Extend the existing spatial-slice test with `setViewportLocked` cases: default is `false`; toggle on flips to `true`; toggle off flips to `false`; setting same value is idempotent `services/session-state/tests/unit/slices/spatial.test.ts`
- [x] T011 [P][test] Extend the existing persistence test: assert that `extractPersistentState(store)` returns a `spatial` object that does NOT contain `viewportLocked`, `drawingMode`, or `drawingPaletteIndex` keys regardless of their in-memory values (use `Object.keys()` rather than property reads — this is the strongest signal that the `Omit<>` is actually applied) `services/session-state/tests/unit/persistence.test.ts`
- [x] T012 [P][test] Add load-path test: a persisted session with `viewportLocked: true` injected into the JSON loads back with `viewportLocked: false` in the store (FR-011 — defence-in-depth even though save shouldn't emit the field) `services/session-state/tests/unit/persistence.test.ts`
- [x] T013 [P][test] Create `setViewport-locked-rejects.test.ts`: given store with `viewportLocked: true`, `setViewport({ coordinates: <valid 4 corners> })` returns `{ success: false, error: <non-empty>, errorCode: 'VIEWPORT_LOCKED' }`; assert `store.getState().viewport` is unchanged `services/session-state/tests/unit/server/setViewport-locked.test.ts`
- [x] T014 [P][test] Add unlocked-regression case to the same file: given store with `viewportLocked: false`, the same `setViewport` call returns `success: true`, `errorCode === undefined`, and `store.getState().viewport` reflects the new value (FR-010 — no regression) `services/session-state/tests/unit/server/setViewport-locked.test.ts`

**Foundation gate**: T003–T014 must all be green before Phase 3 starts. Run `pnpm --filter @debrief/session-state test` to verify.

## Phase 3: User Story 1 — Multi-scene capture with consistent framing (Priority: P1)

**Story goal**: an analyst can lock the viewport from the Storyboard panel, capture three scenes at three different timestamps, and verify all three thumbnails share identical framing (centre + zoom). Every map gesture and toolbar control that would otherwise change the viewport is inert.

**Independent test (mapped to spec acceptance scenarios 1.1–1.5)**: with a plot loaded, frame a region, click the padlock in the Storyboard panel header, capture three scenes at three different `currentTime` values without changing anything else; verify all three scenes' `properties.viewport.coordinates` are exactly equal. Drag, scroll-wheel zoom, double-click, box-zoom (shift-drag), and arrow keys on the map produce no movement while locked. Hovering the disabled toolbar zoom/fit buttons shows the "Viewport locked" tooltip.

**Note**: this phase depends only on Phase 2 — it does NOT depend on Phases 4 (MCP reject) or 5 (L shortcut). Stories 2 and 3 can be implemented in parallel with this one once Phase 2 is green.

### Component scaffolding

- [x] T015 Create `ViewportLockBanner` component — conditional render (returns `null` when `locked === false`), single `<div role="status" aria-live="polite">` with banner text "🔒 Viewport locked — click to unlock" wrapping an inner button that calls `onUnlock`; banner copies the structural pattern from `shared/components/src/MapView/DrawingGuidanceOverlay/DrawingGuidanceOverlay.tsx` `shared/components/src/MapView/ViewportLockBanner/ViewportLockBanner.tsx`
- [x] T016 Create `ViewportLockBanner` CSS — container uses `pointer-events: none` (per `/speckit.review` 4A); inner unlock button uses `pointer-events: auto`; positioned absolute along map's top edge with `z-index` above tile layers but below dialog overlays; comment in the file explicitly references the pointer-events discipline so a future maintainer cannot regress it `shared/components/src/MapView/ViewportLockBanner/ViewportLockBanner.css`
- [x] T017 Export `ViewportLockBanner` from the MapView barrel `shared/components/src/MapView/index.ts`
- [x] T018 Create `ViewportLockBanner` Storybook story (locked + unlocked variants) `shared/components/src/MapView/ViewportLockBanner/ViewportLockBanner.stories.tsx`

### MapView integration — gesture handler toggle + banner mount

- [x] T019 Accept `viewportLocked: boolean` and `onViewportLockChange: (locked: boolean) => void` as new optional props on `MapView` (additive — existing call sites are unaffected) `shared/components/src/MapView/MapView.tsx`
- [x] T020 Add a `handlerSnapshotRef = useRef<{ dragging: boolean; scrollWheelZoom: boolean; doubleClickZoom: boolean; touchZoom: boolean; boxZoom: boolean; keyboard: boolean } | null>(null)` inside `MapView` — captures pre-lock state per `research.md` R1 `shared/components/src/MapView/MapView.tsx`
- [x] T021 Add `useEffect` keyed on `[viewportLocked, map]`: when transitioning OFF → ON, snapshot each of the six handlers' `.enabled()` into the ref, then call `.disable()` on each; when transitioning ON → OFF, for each of the six handlers call `.enable()` only if `snapshotRef.current?.[handler] === true`, then clear the ref. Idempotent: re-entering the same state (e.g. `false → false`) is a no-op `shared/components/src/MapView/MapView.tsx`
- [x] T022 Mount `<ViewportLockBanner locked={viewportLocked} onUnlock={() => onViewportLockChange?.(false)} />` as a sibling of the existing `DrawingGuidanceOverlay` inside the MapView's container `<div>` (NOT inside the Leaflet map pane — the banner sits over the map in DOM order, not as a Leaflet layer) `shared/components/src/MapView/MapView.tsx`

### LeafletToolbar integration — disabled-state for three buttons

**Note**: `LeafletToolbar.tsx` is a `L.Control.extend()` class, not a React component (per `/speckit.review` 1A). The disabled-state path is imperative — extend the existing `updateProps()` bridge.

- [x] T023 Add `viewportLocked: boolean` field to `ToolbarControl` class (initialised `false` in constructor); add `viewportLocked` to the `updateProps()` parameter shape; on `updateProps`, when `viewportLocked` changes, call new private methods `setZoomInEnabled`, `setZoomOutEnabled`, `setFitEnabled` with the inverse boolean `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`
- [x] T024 Implement the three `setXxxEnabled(enabled: boolean)` methods on `ToolbarControl` — each toggles a `debrief-leaflet-toolbar__button--disabled` CSS class on the button anchor, sets `aria-disabled="true"|"false"`, sets the `title` attribute to "Viewport locked" when disabled (browser-native hover tooltip) or restores the original title when enabled, and short-circuits the click handler if `aria-disabled === 'true'` `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`
- [x] T025 Add `--disabled` CSS rule to the toolbar stylesheet: `opacity: 0.4; cursor: not-allowed; pointer-events: auto;` (we still want the hover tooltip; the click short-circuit lives in JS per T024) `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.css`
- [x] T026 Update the React wrapper site that calls `controlRef.current.updateProps(...)` to thread `viewportLocked` through `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx`

### StoryboardPanel integration — padlock toggle

- [x] T027 Add optional `viewportLocked?: boolean` and `onViewportLockToggle?: () => void` props to `StoryboardPanelProps` `shared/components/src/panels/StoryboardPanel/types.ts`
- [x] T028 Render a padlock toggle `<button data-testid="viewport-lock-toggle" aria-pressed={viewportLocked} aria-label={viewportLocked ? 'Unlock viewport' : 'Lock viewport'} disabled={!hasActivePlot}>` immediately to the left of the existing Capture button inside the panel header (line ~200 of the file). Use an open/closed padlock SVG glyph that matches the project's chrome icon style — reuse a vscrui icon if available, otherwise an inline SVG `shared/components/src/panels/StoryboardPanel/StoryboardPanel.tsx`
- [x] T029 Update the existing `StoryboardPanel.stories.tsx` to include a "Viewport locked" variant (padlock `aria-pressed="true"`) and an "Empty state" variant (padlock disabled) `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx`

### Host wiring — VS Code map panel

- [x] T030 Add a new outbound message kind `viewportLockChanged` (host → webview) carrying `{ viewportLocked: boolean }`; add the symmetric inbound kind (webview → host) for when the user toggles via banner/padlock/shortcut. Define types so both ends compile against the same shape `apps/vscode/src/webview/messages.ts`
- [x] T031 In the VS Code `mapPanel.ts`, subscribe the spatial slice's `viewportLocked` field and post `viewportLockChanged` to the webview when it changes; on inbound `viewportLockChanged` from webview, call `store.getState().setViewportLocked(payload.viewportLocked)` `apps/vscode/src/webview/mapPanel.ts`
- [x] T032 In the webview entrypoint, on inbound `viewportLockChanged` set the React state that's passed to `MapView`'s `viewportLocked` prop; on `MapView`'s `onViewportLockChange` callback, post the symmetric outbound message to the host `apps/vscode/src/webview/web/mapView.tsx` (or the equivalent entrypoint file — discover at implementation time)

### Host wiring — web-shell

- [x] T033 In the web-shell entrypoint that mounts `MapView`, wire `viewportLocked` from the session-state spatial slice via the existing Zustand selector pattern and the toggle callback to `setViewportLocked` `apps/web-shell/src/` (entrypoint to be discovered — search for existing MapView mount site)

### Story 1 tests (parallel where independent)

- [x] T034 [test] Vitest snapshot-restore correctness test for `MapView`'s handler toggle (closes GAP-1 from `/speckit.review`): render `MapView` with a stub host that disables the `keyboard` handler before any lock toggle; flip `viewportLocked` true → false → true → false; assert at the end that `map.keyboard.enabled() === false` (the host's prior decision is preserved), while `map.dragging.enabled() === true` (the default-on handler is properly restored) `shared/components/src/MapView/__tests__/MapView.viewportLock.test.tsx`
- [x] T035 [P][test] RTL test for `ViewportLockBanner`: renders nothing when `locked={false}`; renders `role="status"` element with click handler when `locked={true}`; clicking fires `onUnlock` `shared/components/src/MapView/ViewportLockBanner/__tests__/ViewportLockBanner.test.tsx`
- [x] T036 [P][test] RTL test for `StoryboardPanel` padlock: `aria-pressed` reflects `viewportLocked` prop; click fires `onViewportLockToggle`; the button is `disabled` when `hasActivePlot === false`; follows the pattern at `shared/components/src/StacBrowser/__tests__/ThumbnailSizeToggle.test.tsx` `shared/components/src/panels/StoryboardPanel/__tests__/ViewportLockToggle.test.tsx`
- [x] T037 [P][test] Storybook E2E spec covering the three new visual states (banner locked variant, toolbar disabled variant, storyboard padlock-pressed variant) — light / dark / vscode theme variants each; captures screenshots into `specs/260-viewport-lock/evidence/screenshots/` from the spec file using the path-resolution pattern in `apps/web-shell/playwright/tests/properties-screenshots.spec.ts` `shared/components/e2e/ViewportLock.spec.ts`

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip Playwright E2E tasks. The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Standard browser CDN downloads are blocked (403) but the bundled binary works fully. Run `node apps/web-shell/run-playwright.mjs` (or the equivalent for shared-components Playwright) to extract and configure. See `docs/project_notes/playwright-installation-research.md`.

- [x] T038 [test] Web-shell Playwright E2E spec for Story 1 (the headline workflow): load plot → pan/zoom → click padlock → assert banner visible + toolbar zoom/fit `aria-disabled="true"` with `title="Viewport locked"` → exercise every gesture (drag, scroll-wheel, double-click, box-zoom, arrow keys) and assert map centre+zoom unchanged after each → capture three scenes at three different `currentTime` values → read each captured scene's `properties.viewport.coordinates` via `page.evaluate` against the live session store (NOT via `viewport-invariants.ts` — that helper is for occlusion) → assert all three coordinate arrays are exactly equal → unlock → assert all gestures restored → assert toolbar buttons re-enabled. Record video; the post-spec hook converts it to `evidence/screenshots/interaction.gif` (< 5s, < 2MB) `apps/web-shell/playwright/tests/viewport-lock-story1.spec.ts`

**Story 1 checkpoint**: P1 acceptance scenarios 1.1–1.5 must all map green to T034–T038. SC-001, SC-002, SC-005 are exercised here. After this phase Story 1 ships independently — Stories 2 and 3 can land separately if needed.

## Phase 4: User Story 2 — External viewport-change attempts are safely rejected (Priority: P2)

**Story goal**: while the lock is on, an external programmatic surface (e.g. an LLM tool call) attempting to change the viewport gets a structured, machine-detectable rejection rather than silently mutating or silently no-op'ing. The unlocked path is unchanged.

**Independent test (mapped to spec acceptance scenarios 2.1–2.2)**: with `viewportLocked: true`, calling `setViewport(...)` returns `{ success: false, errorCode: 'VIEWPORT_LOCKED' }` and the store's `viewport` is unchanged. With `viewportLocked: false`, the same call succeeds and `errorCode` is absent.

**Note**: this story is effectively delivered by Phase 2 (foundation T008–T009 add the reject branch, T013–T014 test it). Phase 4 holds the **integration evidence** and the **caller-contract documentation** tasks that don't fit cleanly under Phase 2.

### Integration evidence

- [x] T039 [test] End-to-end MCP test: drive the actual MCP server harness (not the in-process `setViewport` function), call `session.setViewport` over the MCP transport with the store locked, assert the returned envelope carries `errorCode: 'VIEWPORT_LOCKED'` at the JSON-RPC level. Existing MCP test infra in `services/session-state/tests/` is the model `services/session-state/tests/integration/setViewport-mcp.test.ts`
- [x] T040 Capture a sample locked rejection response as `evidence/mcp-locked-response.json` — the literal JSON-RPC envelope a caller would observe `specs/260-viewport-lock/evidence/mcp-locked-response.json`

### Caller-contract documentation

- [x] T041 Update the MCP tool description in `setViewport.ts` (the `description` string registered with the tool) to mention the `errorCode: 'VIEWPORT_LOCKED'` branch so LLM callers reading the tool's manifest discover the contract `services/session-state/src/server/tools/setViewport.ts`

**Story 2 checkpoint**: P2 acceptance scenarios 2.1–2.2 map green to T013, T014, T039. SC-003 is fully exercised.

## Phase 5: User Story 3 — Quickly toggle and automatically clear the lock (Priority: P3)

**Story goal**: the user can toggle the lock with the `L` keyboard shortcut when the map has focus, and the lock automatically clears when a different plot or session is loaded.

**Independent test (mapped to spec acceptance scenarios 3.1–3.5)**: pressing `L` while the map has focus toggles the lock. Opening a different plot resets the lock to off. Loading a different session resets the lock to off. A saved session opened from disk starts unlocked regardless of save-time state.

**Note**: the auto-unlock path is delivered by Phase 2 (T007 — load.ts always emits `viewportLocked: false`). The plot-switch auto-unlock requires a host-side hook because plot switch is not a "session load" — it's a `loadPlot` message. The keyboard shortcut introduces the **first** single-letter map-focused binding in the project; backlog item #261 captures the convention work for when a second shortcut arrives.

### Plot-switch auto-unlock

- [x] T042 In the VS Code host's `loadPlot` handler, call `store.getState().setViewportLocked(false)` immediately before sending the `loadPlot` message to the webview (FR-012) `apps/vscode/src/webview/mapPanel.ts`
- [x] T043 In the web-shell's plot-open handler (the equivalent of `loadPlot` — discover at implementation time, likely in `apps/web-shell/src/services/` or the catalog-selection callback), call `setViewportLocked(false)` on the session store `apps/web-shell/src/` (entrypoint to be discovered)

### Keyboard shortcut

- [x] T044 Add a `keydown` listener to the `MapView` root `<div>`: when `event.key === 'l'` AND no modifier keys (no `metaKey`, `ctrlKey`, `altKey`, `shiftKey`) AND the event target's `closest('input, textarea, [contenteditable]')` is null, call `onViewportLockChange?.(!viewportLocked)` and `event.preventDefault()`. Bound on the container `<div>`, not at document level, so it doesn't fire while typing in a scene description. The listener remains active even when locked (the user MUST be able to exit via this shortcut even after Leaflet's `keyboard` handler is disabled by the lock). Add inline comment referencing backlog #261 (convention work for future map shortcuts) `shared/components/src/MapView/MapView.tsx`
- [x] T045 Ensure the `MapView` root `<div>` is keyboard-focusable: add `tabIndex={0}` if not already present, OR confirm that `.leaflet-container`'s default focusability covers the shortcut (Leaflet sets `tabIndex={0}` on its container when the `keyboard` handler is enabled — verify behaviour when that handler is disabled by the lock) `shared/components/src/MapView/MapView.tsx`

### Story 3 tests

- [x] T046 [P][test] Vitest test for the `L` shortcut: render `MapView`, programmatically focus the container, dispatch `KeyboardEvent('keydown', { key: 'l' })`, assert `onViewportLockChange` called with `!viewportLocked`. Negative case: same event with `metaKey: true` (or focus on an `<input>` inside the map) does NOT fire `shared/components/src/MapView/__tests__/MapView.keyboardShortcut.test.tsx`
- [x] T047 [test] Web-shell Playwright spec for Story 3 (auto-unlock): lock viewport, switch plots via the catalog, assert padlock is back to `aria-pressed="false"` and dragging the new map works. Combine with Story 1's GIF if the spec is small enough; otherwise its own file `apps/web-shell/playwright/tests/viewport-lock-story3.spec.ts`

**Story 3 checkpoint**: P3 acceptance scenarios 3.1–3.5 map green to T012 (save/load round-trip), T046, T047. SC-004, SC-006 are exercised here.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: full CI gate, evidence capture, blog post, PR amendment. All implementation tasks (T003–T047) must be complete and green before any task in this phase runs.

### CI verification

- [x] T048 Run `task verify` (or the four-command fallback in `CLAUDE.md`) and confirm all four steps pass: lint (ruff + ESLint), typecheck (pyright + tsc), unit tests (pytest + Vitest excluding web-shell), Playwright E2E (web-shell + spec-navigator). Fix any regressions surfaced. `task verify`

### Evidence collection

- [x] T049 Capture test results using the template at `.specify/templates/evidence/test-summary-template.md` — YAML front matter with `feature: viewport-lock`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`; body lists every test file added or extended in this feature and the spec acceptance scenarios each one exercises `specs/260-viewport-lock/evidence/test-summary.md`
- [x] T050 Create the usage-example walkthrough — mirror the structure of `quickstart.md` but condensed into a single "see this work in 60 seconds" demo, with the lock toggle and the three identical-framing thumbnails as the punchline `specs/260-viewport-lock/evidence/usage-example.md`
- [ ] T051 [P] Confirm Storybook E2E screenshots (T037) have landed at `specs/260-viewport-lock/evidence/screenshots/banner-{light,dark,vscode}.png`, `toolbar-disabled-{light,dark,vscode}.png`, and `storyboard-padlock-{light,dark,vscode}.png` — if any are missing, re-run `pnpm --filter @debrief/components test:e2e ViewportLock` `specs/260-viewport-lock/evidence/screenshots/`
- [ ] T052 [P] Confirm the multi-scene thumbnail screenshot from Story 1 Playwright (T038) has landed at `specs/260-viewport-lock/evidence/screenshots/multi-scene-thumbnails.png` — this is the Hook image for the blog post `specs/260-viewport-lock/evidence/screenshots/multi-scene-thumbnails.png`
- [ ] T053 [P] Confirm `interaction.gif` (T038 video conversion) has landed at `specs/260-viewport-lock/evidence/screenshots/interaction.gif` (< 5s, < 2MB); re-encode if oversized `specs/260-viewport-lock/evidence/screenshots/interaction.gif`
- [x] T054 [P] MCP rejection evidence already captured at T040 — confirm `specs/260-viewport-lock/evidence/mcp-locked-response.json` exists and parses as valid JSON `specs/260-viewport-lock/evidence/mcp-locked-response.json`

### Project memory updates

- [x] T055 Append a one-line entry to `docs/project_notes/issues.md` linking PR #626 and the spec dir; cross-reference PRs #623 and #625 as the immediate predecessors `docs/project_notes/issues.md`
- [x] T056 Update `docs/project_notes/viewport-mutation-audit.md` Section E ("Future lock viewport feature") with a small banner at the top noting "Realised in spec 260 — see `specs/260-viewport-lock/`" — keeps the audit doc as the system-of-record for the mutation sites while pointing readers to the realisation `docs/project_notes/viewport-mutation-audit.md`

### Media content

- [x] T057 Spawn the Content Specialist via the Task tool to write `media/shipped-post.md`. The first three sections (Hook, What We're Building, How It Fits) must be copied verbatim from `specs/260-viewport-lock/evidence/opening-context.md` per the cached-opener contract. Add new sections: `## Screenshots` (the three multi-scene thumbnails + the locked map banner — embed `interaction.gif`), `## By the Numbers` (test counts from T049, files touched, dev-days), `## Lessons Learned` (the prior PR #623/#625 sequence and why an explicit lock was the right next step), `## What's Next` (mention backlog #261 + #262). Title prefixed with "Building " `specs/260-viewport-lock/media/shipped-post.md`

### PR amendment

- [ ] T058 Amend PR #626's description with the test-summary, links to the evidence screenshots, and a brief recap of acceptance-scenario coverage. The PR already exists from the spec-phase work; do NOT create a new one `mcp__github__update_pull_request`

### Ship

- [ ] T059 Create PR and publish blog: run `/speckit.pr`. This finalises the PR description, cross-posts the blog PR to `debrief.github.io`, and returns both URLs `/speckit.pr`

**Task T059 must run last. It depends on every other task being complete.**

---

## Dependencies

### Phase order

```
Phase 1 (Setup, T001–T002)
        │
        ▼
Phase 2 (Foundation, T003–T014)  ◄── blocks everything below
        │
        ├──────────────────┬──────────────────┐
        ▼                  ▼                  ▼
   Phase 3 (Story 1)   Phase 4 (Story 2)  Phase 5 (Story 3)
   T015–T038           T039–T041           T042–T047
        │                  │                  │
        └──────────────────┴──────────────────┘
                           │
                           ▼
                  Phase 6 (Polish, T048–T059)
                  T059 runs last
```

### Story completion order

The spec prioritises P1 > P2 > P3. Recommended landing order:

1. **Phase 2 foundation** (T003–T014) — un-blocks all three stories.
2. **Phase 3 Story 1** (T015–T038) — the headline workflow; everything from this phase ships value on its own.
3. **Phase 4 Story 2** (T039–T041) — light wrap-up of the reject branch (most of the work lives in Phase 2; this phase is integration evidence + documentation).
4. **Phase 5 Story 3** (T042–T047) — the polish layer (keyboard shortcut + plot-switch auto-unlock).
5. **Phase 6 Polish** (T048–T059) — CI gate, evidence, media, PR.

### Within-phase parallelism

Tasks tagged `[P]` are explicitly parallel-safe (independent fixtures, independent files). Notable parallel batches:

- **T010 + T011 + T012 + T013 + T014** (Phase 2 tests) — all read-only against the slice / persistence / MCP code added in T003–T009; no shared fixture mutation.
- **T035 + T036 + T037** (Phase 3 component tests) — three different component test files with no shared state.
- **T051 + T052 + T053 + T054** (Phase 6 evidence-confirm tasks) — each touches a different file path under `evidence/screenshots/` or `evidence/`.

### Cross-phase parallel opportunity

Once Phase 2 is green, an experienced contributor with two terminals can run Phases 3 and 5 in parallel — Story 1 and Story 3 touch different files at the integration layer (`StoryboardPanel` + `ViewportLockBanner` vs `MapView.tsx` keyboard listener + host plot-switch hooks). Phase 4 has so few tasks it's not worth parallelising. The implementation strategy below recommends the sequential P1 → P2 → P3 path for review-clarity; parallel landing is an option, not a recommendation.

---

## Implementation Strategy

### MVP-first delivery (recommended)

Land in three reviewable chunks corresponding to the priority order:

**Chunk 1 — Lock can be turned on, gestures inert, MCP rejects** (Phase 2 + Phase 3 + Phase 4):

This is the minimum that ships value. P1 + P2 acceptance scenarios all map green. Story 3 (the L shortcut + plot-switch auto-unlock) can land in a follow-up if reviewer time is tight — the panel padlock + banner-click are sufficient toggle paths, and the spec's FR-012 (force-unlock on plot load) is already partially delivered by T007's session-load path.

After this chunk, the feature is **usable**: an analyst can lock, capture, unlock, and the MCP surface is safe. Approximately 38 of 59 tasks.

**Chunk 2 — Polish** (Phase 5):

Adds the L shortcut and the plot-switch hook. Independently testable. 6 tasks (T042–T047).

**Chunk 3 — Evidence + media + PR** (Phase 6):

CI gate, screenshots, blog post, PR amendment. 12 tasks (T048–T059).

### Constitutional gates

- **After Phase 2 (T003–T014)**: type-check + spatial-slice + persistence + MCP tests all green. Article VI (testing) satisfied at the foundation layer.
- **After Phase 3 (T038)**: Article I.3 (no silent failures) re-verified — GAP-1 (handler snapshot-restore correctness) is tested at T034.
- **Before Phase 6 (T048)**: full `task verify` clean. Article XIII (CI MUST pass) satisfied.
- **At T059 (PR)**: every box ticked. Articles VIII (docs) and XII (community engagement) satisfied via the blog post.

### Risk register (carry from `/speckit.review`)

| Risk | Mitigation in this task plan |
|---|---|
| Silent handler-restore regression (Article I.3) | T034 — Vitest test asserting host-disabled handlers stay disabled across a lock cycle. |
| Toolbar disabled-state confusion (`L.Control` is class-based not React) | T023–T026 explicitly extend the class via `updateProps()` — matches existing imperative pattern. |
| Banner clicks leaking to toolbar | T016 — `pointer-events: none` on container; comment in CSS references `/speckit.review` 4A so a future maintainer cannot regress. |
| Story 1 verification mechanism (the `viewport-invariants.ts` confusion from the review) | T038 — explicit `page.evaluate` against `scene.properties.viewport.coordinates`; quickstart and plan both updated post-review. |
| First-of-its-kind L shortcut (no precedent in `MapView`) | T044/T045 spell out focus management; backlog #261 captures the convention work for the next map shortcut. |
