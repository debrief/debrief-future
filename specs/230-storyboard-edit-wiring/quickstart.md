# Quickstart: Storyboard Edit Wiring

**Feature**: 230 | **Phase**: 1 | **Date**: 2026-04-24

This guide walks a new contributor through the feature, from spec → plan → first running test. It is scoped to what you need to pick up the implementation on day one, not an exhaustive reference.

---

## 0. What this feature is

The #218 Storyboard edit suite has every service, dispatcher, component, and command-handler in place — but the VS Code webview is not wired to the in-panel affordances users need. This feature adds the chevron-to-open-form affordance, the right-click overflow menu, a shared reducer hook, an interactive web-shell harness for Playwright, upgrades the four Storybook stories from static to interactive, and fixes two pre-existing errors (viewport race + STAC-load diagnostic).

Read in this order:

1. `spec.md` — what we're building (user stories, FRs, SCs)
2. `plan.md` — technical approach, file layout, constitution gates
3. `research.md` — *why* each design decision (12 entries)
4. `data-model.md` — reducer state shape + action union
5. `contracts/postmessage-contract.md` — 3 new inbound + 11 new outbound message types
6. This file — how to run it

---

## 1. Prerequisites

- Working copy: `/Users/ian/git/worktrees/230-storyboard-edit-wiring/` (worktree created by `/speckit.start`; `cd` there first)
- Node + pnpm — check `pnpm -v` works
- Python + uv — check `uv --version` works
- Playwright: no manual install needed; `@sparticuz/chromium` is bundled and provisioned by `run-playwright.mjs`

---

## 2. First 10 minutes — sanity check

```bash
cd /Users/ian/git/worktrees/230-storyboard-edit-wiring

# Confirm main baseline green (this branch has no code changes yet)
task verify
```

Expected: lint + typecheck + unit tests + Playwright E2E all pass. The 2,983 tests from #218 are your baseline — this feature must not regress any.

If `task` isn't installed:

```bash
uv run ruff check . && pnpm lint
uv run pyright && pnpm -r typecheck
uv run pytest && pnpm --filter '!@debrief/web-shell' test
cd apps/web-shell && node run-playwright.mjs && cd ../..
```

---

## 3. File landmarks

You will be touching these files. Read them before you edit them.

**Webview entry points (VS Code extension side)**:

- `apps/vscode/src/webview/web/storyboardPanel.tsx` — currently ~7 × `useState` calls; rewire to `useReducer`
- `apps/vscode/src/webview/web/mapView.tsx` — adds mount-time + `whenReady` viewport emit (viewport-race fix)

**Extension dispatcher**:

- `apps/vscode/src/views/storyboardPanelView.ts` — `refresh()` gets enriched payload; see `contracts/postmessage-contract.md`
- `apps/vscode/src/services/stacService.ts` — add structured diagnostics at each null-return in `loadPlot`
- `apps/vscode/src/types/storyboardPanelMessages.ts` — extend both unions
- `apps/vscode/src/messages/storyboardEdit.ts` — add i18n strings for menu labels

**Shared components**:

- `shared/components/src/panels/StoryboardPanel/useStoryboardEditReducer.ts` — **NEW**, pure reducer + hook
- `shared/components/src/panels/StoryboardPanel/SceneOverflowMenu.tsx` — **NEW**, native `<menu>` component
- `shared/components/src/panels/StoryboardPanel/SceneRow.tsx` — add chevron + wire dbl-click + right-click
- `shared/components/src/panels/StoryboardPanel/StoryboardPanel.stories.tsx` — upgrade four edit-suite stories to interactive

**Web-shell harness**:

- `apps/web-shell/src/App.tsx` — detect `?storyboard-edit-harness=1` → mount harness
- `apps/web-shell/src/StoryboardEditHarness.tsx` — **NEW**, mock-port + reducer wrapper

**Playwright**:

- `apps/web-shell/playwright/tests/storyboard-edit.spec.ts` — **NEW**, primary E2E surface
- `tests/e2e/test-storyboard-edit.spec.ts` — **NEW**, thin code-server chrome-only suite

---

## 4. Test-first day one (recommended order)

1. **Reducer unit tests first**. Write `useStoryboardEditReducer.test.ts` against the action union in `data-model.md` + state transitions T1–T4 before writing the reducer. Aim for one test per action + one per invariant.
2. **SceneOverflowMenu component test second**. Test render + keyboard nav + ARIA attributes before behaviour — `@axe-core/playwright` later in the web-shell suite.
3. **SceneRow integration third**. Render a SceneRow with a spy reducer; assert chevron click + dbl-click + right-click dispatch the expected actions.
4. **Webview entry point integration**. Replace the `useState` pile with the reducer hook. Unit tests here are optional; the web-shell E2E is the real gate.
5. **Web-shell harness page + Playwright**. The harness is the primary E2E surface (per the SRD) — this is where the polish loop runs end-to-end.
6. **Viewport race fix**. Simple: add the two emit calls in `mapView.tsx`; write a web-shell test that opens a plot and captures immediately.
7. **STAC-load diagnostic**. Structured logging at each null-return in `loadPlot`. Reproduce against the specific plot from PR #520's manual test; identify the failing path; fix it.
8. **Storybook stories upgrade**. Last step — wire the four stories to the same reducer hook. If the reducer is solid, this is mechanical.
9. **Code-server chrome test**. Last — only the flows that require real VS Code chrome.

---

## 5. Running the web-shell harness locally

```bash
# Terminal 1: start the web-shell dev server
pnpm --filter @debrief/web-shell dev
# Open http://localhost:5173/?storyboard-edit-harness=1 in your browser
```

Query-string knobs for initial state (FR-021):

- `?storyboard-edit-harness=1&stale=sceneA,sceneC` — those Scenes start with stale badges
- `?storyboard-edit-harness=1&pendingDelete=sceneB` — Scene B has a pending soft-delete
- `?storyboard-edit-harness=1&missingData=sceneC:track-alpha,track-bravo` — Scene C hard-blocked by missing source features

---

## 6. Running the Playwright suite

```bash
# Web-shell E2E (primary surface — runs the polish loop end-to-end)
cd apps/web-shell && node run-playwright.mjs storyboard-edit

# Code-server chrome-only E2E (palette + input-box + quick-pick + native toasts)
# Runs via task verify; standalone invocation:
pnpm --filter @debrief/vscode test:e2e -- test-storyboard-edit
```

Evidence artefacts (screenshots + interaction GIF) land under `specs/218-storyboarding-edit/evidence/screenshots/` (per FR-040 — completes #218's deferred T097 / T087). Not under this feature's own evidence directory.

---

## 7. Where the tests live

- **Reducer unit tests**: `shared/components/src/panels/StoryboardPanel/useStoryboardEditReducer.test.ts` (vitest)
- **SceneOverflowMenu component tests**: `shared/components/src/panels/StoryboardPanel/SceneOverflowMenu.test.tsx` (vitest + Testing Library)
- **SceneRow interaction tests**: `shared/components/src/panels/StoryboardPanel/__tests__/SceneRow.test.tsx` (vitest — extended from existing)
- **Web-shell E2E**: `apps/web-shell/playwright/tests/storyboard-edit.spec.ts`
- **Code-server E2E**: `tests/e2e/test-storyboard-edit.spec.ts`

---

## 8. Common traps

- **Don't mutate state in the reducer**. Every branch produces a new object reference. If you `Object.assign(state, ...)` React will not re-render.
- **Don't let local-only state fall out of step with extension-authoritative state**. If the extension emits `scenes` with a row that your `editFormOpenFor` points at, keep it open. If the extension emits without that row (e.g. Scene deleted), the reducer MUST close the form. This is a state invariant in `data-model.md`.
- **Don't add the overflow menu to `StoryboardHeader`'s existing menu**. That menu is Storyboard-level (create/rename/delete storyboards). Scene-level is a separate concern and a separate component (FR-003).
- **Don't paper over the STAC-load bug before diagnosing it**. Add structured logging; reproduce; read the log; **then** fix. A blind guess burns a review cycle.
- **Don't bypass `storyboardPanelView.refresh()`'s O(scenes) invariant**. Any expensive work per-scene here breaks the polish-loop UX (review 13A, carried forward from #218).
- **Don't wire `collapseStoryboardEdits` into the LogTimeline renderer**. Out of scope. That's #176's call.
- **Don't write evidence artefacts under `specs/230-.../evidence/screenshots/`**. They go under `specs/218-storyboarding-edit/evidence/screenshots/` per FR-040.

---

## 9. Definition of done (for Phase A — Row-level affordance + reducer)

- [ ] `useStoryboardEditReducer` hook exists, fully typed, no `any`
- [ ] All reducer actions from `data-model.md` have unit tests
- [ ] `SceneOverflowMenu` component exists with keyboard nav + ARIA
- [ ] `SceneRow` renders chevron + wires dbl-click + right-click
- [ ] `storyboardPanel.tsx` consumes the reducer; all 7 `useState` calls replaced
- [ ] `storyboardPanelView.refresh()` emits `sceneEditViewModels` + `pendingUndoToast` + `storyboardEditViewModel`
- [ ] `task verify` passes (2,983-test baseline remains green)

Phases B, C, D, E are sequential — see `plan.md` §Implementation phases in the SRD (which is at `docs/ideas/230-storyboard-edit-wiring-srd.md` §8).

---

## 10. Getting help

- **Design questions**: re-read `research.md` first; each decision has a *rationale* section.
- **State-shape questions**: `data-model.md` is authoritative.
- **Message-contract questions**: `contracts/postmessage-contract.md` is the source of truth for both VS Code entry point and the web-shell mock port.
- **Failing evidence tests**: check `specs/218-storyboarding-edit/evidence/screenshots/` — if the path doesn't exist, the first test run creates it.
- **Unable to reproduce the STAC-load bug**: the repro plot lives in PR #520's manual-test thread. Ask Doc Boeuf for the specific item ID if it's not obvious from the review history.
