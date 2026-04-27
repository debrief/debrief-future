# Phase 0 Research — Storyboard Edit Suite Polish Follow-up

**Feature**: 234-storyboard-edit-polish-followup
**Date**: 2026-04-26
**Status**: Complete — no NEEDS CLARIFICATION remaining

This document records the research that resolves the technical-context unknowns and the design decisions that drive Phase 1 contracts.

---

## R1 — Story-only mock-port: shared with the web-shell harness or independent?

### Decision
Factor out a **single shared helper** at `shared/components/src/panels/StoryboardPanel/__testing__/storyOnlyMockPort.ts`. Both the web-shell harness and the four upgraded Storybook stories import it. The helper exposes:

```ts
export function createStoryOnlyMockPort(seed: SceneEditFixtureSeed, knobs?: MockPortKnobs): {
  state: StoryboardEditState;
  dispatch: (action: StoryboardEditAction) => void;
  port: { postMessage: (msg: OutboundMessage) => void };
};
```

`MockPortKnobs` carries optional `induceCopyFailure?: SceneId` and `induceRefreshFailure?: SceneId` flags that the mock-port uses to deterministically route specific outbound messages to the failure branch.

### Rationale
- **FR-003 mandates a single behavioural layer.** Two copies would invite drift: a story would silently behave differently from the harness, and a reviewer's mental model would become unreliable.
- The reducer is already pure and exported; the mock-port is a thin React-context-friendly adapter. A shared helper is ~80 LOC.
- `__testing__/` (double-underscore) is the **new convention** introduced by this feature for test-only exports under `shared/components`. No prior `__testing__/` directory exists in the package today (initial review noted this — earlier drafts of R1 mistakenly cited a `FilterBar/__testing__/` precedent that does not exist). The convention is enforced by FR-044 (ESLint rule forbidding production imports from `__testing__/*`), so it is load-bearing in CI rather than relying on author discipline.

### Alternatives considered
- **Inline factory in each story file**: rejected — duplicates the seed + dispatch wiring four times, drifts the moment one story adds a knob.
- **Re-import the harness's mock port directly from `apps/web-shell/`**: rejected — `shared/components` cannot depend on an app. The dependency must flow the other way.
- **Storybook decorator with global state**: rejected — leaks state between stories, breaking story isolation.

---

## R2 — Code-server chrome spec: should it run all 11 commands, or just the ones with native chrome?

### Decision
Run all 11 commands via the command palette, but only **assert on native-chrome surfaces** (input-box, quick-pick, notification toasts). For commands without a native prompt (e.g. delete, undo, refresh-thumbnail), the assertion is "command palette accepted the command + the matching Log Panel card appears". The web-shell suite owns the click-flow + state-transition assertions for those commands.

### Rationale
- **FR-010 demands palette invocation for all 11 commands** — that's the integration-point regression guard.
- **FR-014 forbids duplicating click flows already covered by web-shell** — so the assertions for non-prompt commands stop at "command was reachable".
- This produces a thin (~150 LOC) spec that captures the unique chrome value without bloating into a full integration suite.

### Alternatives considered
- **Only test the 3 prompt-bearing commands**: rejected — doesn't satisfy FR-010's "each of the 11 new commands" requirement; invites silent palette-binding regressions.
- **Test all 11 commands end-to-end in code-server**: rejected — duplicates web-shell coverage (FR-014), runs ~10× slower, and adds CI flake without information gain.

---

## R3 — Where does the code-server spec live?

### Decision
`tests/e2e/test-storyboard-edit.spec.ts` (repo root). Not `apps/vscode/tests/e2e/test-storyboard-edit.spec.ts` as spec.md FR-010 suggests.

### Rationale
- The repo's existing code-server E2E spec for the storyboard family lives at `tests/e2e/test-storyboard-playback.spec.ts`. The Playwright config + helpers under `tests/e2e/` (global-setup, global-teardown, models, scripts) are wired for code-server runs via `node run-playwright.mjs` from `apps/web-shell/` — but the **specs themselves** are at the repo-root `tests/e2e/`.
- Spec FR-010's path is a transcription drift; the same drift appears in #230's plan.md (which used the correct repo path). No spec-text change needed; tasks.md will use the actual path.
- This keeps all code-server chrome tests in one directory — a discoverability win for future contributors.

### Alternatives considered
- **Create `apps/vscode/tests/e2e/`** as a parallel home: rejected — fragments the test surface with no benefit; the code-server runner is already wired for `tests/e2e/`.
- **Edit spec.md to fix the path**: deferred — it's a path detail, not a behavioural change; resolving in plan.md + tasks.md is sufficient and avoids spec churn.

---

## R4 — How does axe consume Storybook iframes?

### Decision
Drive Storybook's iframe directly via Playwright's `page.goto('/iframe.html?id=components-storyboardpanel--with-edit-form&globals=theme:vscode')`. After the story renders, run `await new AxeBuilder({ page }).analyze()` scoped to the iframe's body. Repeat per story per theme variant.

### Rationale
- `@axe-core/playwright` works against any rendered DOM. The Storybook iframe URL is a stable, JavaScript-free entry point — no Storybook UI navigation needed (faster + less flaky).
- The same pattern appears in `shared/components/e2e/` for the existing `FilterBar` and `MapView` a11y specs.
- Theme variants matter: contrast violations differ across light/dark/vscode; we need all three.

### Alternatives considered
- **Render each story directly with React Testing Library + jest-axe**: rejected — doesn't match the production rendering path (Storybook applies its own decorators + theme CSS). Catches fewer real violations.
- **One axe run per panel state, ignore stories**: rejected — FR-021 explicitly requires the four story iframes.

### Severity policy
- `serious` / `critical` → **fail the test** (FR-022).
- `moderate` → **warn** + log to `evidence/a11y-report.md` with rationale (fixed or accepted-risk). The report is a markdown table per FR-023.
- `minor` → noise filter; not enumerated in the report.

---

## R5 — Perf test: which surface, which budget, which methodology?

### Decision
Target the **pure, already-exported** `composeSceneEditViewModels` function at `shared/components/src/panels/StoryboardPanel/types.ts:325`. New file: `shared/components/src/panels/StoryboardPanel/__tests__/composeSceneEditViewModels.perf.test.ts` (vitest; sits alongside the existing component unit tests in `__tests__/`). Synthetic plot at 5 Storyboards × 50 Scenes (= 250 Scenes in memory) — but the function under test is invoked against the **active** Storyboard's 50 Scenes per call (the 5 × 50 fixture is in memory specifically to validate that the FR-008 active-only invariant from #230 is preserved). 100 iterations, take median, assert ≤ 50 ms hard / ≤ 60 ms in CI (20 % tolerance per spec edge case). Single JIT-warm-up run untimed.

### Rationale
- **`storyboardPanelView.refresh()` is webview-coupled.** The function lives in `apps/vscode/src/views/storyboardPanelView.ts` (614 LOC), `import * as vscode from 'vscode'`, and operates on a `WebviewView` instance. Vitest jsdom would need extensive `vscode` API mocks; setup overhead would dominate the perf measurement and obscure regressions.
- **`composeSceneEditViewModels` is the actual O(active-storyboard Scenes) hot path** that #230 enriched. Pinning the budget on the pure composer measures the right thing.
- The existing `apps/vscode/tests/unit/storyboardEditService.perf.test.ts` is the **methodology** template (median over many iterations, vitest, named budget) — but it lives at a different layer (the service composer) and we are not mirroring its file location, only its shape.
- The 50 ms budget is set by #218 SC-014 and explicitly carried forward by #230's research; it is the right target.
- A 20 % CI tolerance buffer (60 ms soft budget) is the spec's edge-case mitigation for CI-machine noise. The hard 50 ms remains the ratchet point — local dev catches anything close.

### Alternatives considered
- **Target `storyboardPanelView.refresh()` with a full vscode mock**: rejected — mock setup would dominate the measurement; the perf number would not reflect production hot-path cost.
- **Refactor `refresh()` to extract a pure `composeRefreshPayload(input)` helper**: rejected — useful but out-of-scope plumbing for #234. `composeSceneEditViewModels` already exists and is already exported.
- **Re-use the existing service-layer perf test verbatim**: rejected — that test covers `onPlotOpened`, which is one layer down from where #230's enrichment landed.
- **Run the perf test in Playwright (browser) instead of vitest (Node)**: rejected — the function is pure TypeScript with no DOM; vitest is the right environment, faster and more deterministic.

### Failure-loud guarantee (FR-032)
The assert message includes: `actual median Xms (budget 50ms, soft 60ms in CI), p95 Yms — composeSceneEditViewModels public-API contract: shared/components/src/panels/StoryboardPanel/CONTRACTS.md` so a regression's failure log is self-diagnosing AND points the next reader at the public contract (FR-046).

---

## R6 — Interaction GIF: capture pipeline + size budget

### Decision
Use Playwright's `recordVideo` to capture a webm of the polish-loop scenario (rename → describe → delete + undo → refresh-stale), then convert to GIF via ffmpeg in a `videoToGif.ts` helper. Settings: 10 fps, max-width 960 px, palettegen + paletteuse for size (the standard ffmpeg GIF recipe). Target: < 5 s, < 2 MB hard cap with a 1.8 MB soft warning (10 % runner-variance margin).

### Rationale
- **Playwright's video capture is per-test-context**, low-overhead, and already wired in `properties-screenshots.spec.ts:121` and `theme-runtime-switch.spec.ts:122`. No new dep.
- **ffmpeg is a system binary, NOT a tracked devDep.** Prior art: #217 T520 (marked complete) successfully invoked ffmpeg with `scale=800:-1` to convert a webm to a ≤ 2 MB / ≤ 5 s GIF; #189 T048 followed the same pattern. The path is proven on the relevant CI + dev runners. Earlier drafts of this research item incorrectly cited a `tools/screenshot/` directory that does not exist — there is no current ffmpeg invocation site in `tools/`. Article IX (dependencies are liabilities) requires us to acknowledge ffmpeg as an **explicit system-binary dependency**; FR-045 adds a `task verify:ffmpeg` check that fails fast with a remediation message when ffmpeg is missing locally.
- 10 fps is the standard "feels animated, doesn't blow up file size" trade-off for a UI demo. 24 fps + 5 s would breach the 2 MB budget without palette optimisation.
- A single shared helper (`apps/web-shell/playwright/helpers/videoToGif.ts`) means future GIF captures (#229 and beyond) reuse this path.
- **1.8 MB soft / 2 MB hard split** mirrors the perf budget's 50 / 60 ms split. The helper logs a warning when the produced GIF exceeds 1.8 MB (so we know we're approaching the ceiling) and the test fails when it exceeds 2 MB (the spec's hard cap).

### Alternatives considered
- **Stream of static screenshots**: rejected — kills the "demonstrates an animation" narrative the spec asks for.
- **Third-party GIF lib (gifenc, gif.js)**: rejected — adds a new dep for what ffmpeg does for free, and #217/#189 prior art establishes ffmpeg as the project's GIF tool.
- **Cap the GIF at 3 s**: rejected — too short to fit four interactions; 5 s is the right ceiling.

### Failure mode
If the GIF exceeds the 2 MB budget, the test fails (assertion on file size). The fix is to drop fps or shorten the scenario, not to relax the budget. If ffmpeg is missing on the runner, FR-045 catches it at `task verify` time before the GIF spec runs.

---

## R7 — Harness knob: how does `?induceCopyFailure=<sceneId>` reach the mock-port?

### Decision
Extend the existing `apps/web-shell/src/storyboard-edit-harness-querystring.ts` parser to accept `induceCopyFailure?: string`. The parsed value flows into `StoryboardEditHarness.tsx` and is passed to `createStoryOnlyMockPort` as part of `MockPortKnobs`. The mock-port's copy-to-other handler checks `knobs.induceCopyFailure === sceneId` before dispatching — if matched, it routes to the failure branch (mirroring what the real service would do on a deep-copy IO error).

### Rationale
- **Existing knob system in `storyboard-edit-harness-querystring.ts` already parses URL params** into a typed `StoryboardEditHarnessInitialState`. Adding one more optional field is the minimum-disruption extension.
- The shared mock-port helper already accepts `MockPortKnobs` (per R1). Threading `induceCopyFailure` through is one additional field, not a new API.
- Deterministic + reset-per-page-load = ideal for Playwright (no test-order dependencies).

### Alternatives considered
- **Stub `crypto.randomUUID` to force a collision**: rejected — too fragile; couples test to UUID generation strategy.
- **Mock at the network layer**: rejected — there's no network in the harness; it's all in-memory.
- **Add a runtime button to the harness UI**: rejected — adds harness-only UI surface; query-string param is invisible to humans by default.

---

## R8 — Cross-cutting: which existing assets do we reuse?

| Asset | Use |
|-------|-----|
| `useStoryboardEditReducer` (from #230) | Story-only mock-port wraps it; perf test allocates view-models that consume its state |
| `StoryboardEditHarness` + `storyboard-edit-harness-querystring.ts` | Extended with `?induceCopyFailure` knob |
| `tests/e2e/test-storyboard-playback.spec.ts` selector helpers (`.monaco-inputbox input`, `.quick-input-widget input`) | Reused verbatim in the new code-server spec |
| `apps/vscode/tests/unit/storyboardEditService.perf.test.ts` | Pattern source for the new panel-view perf test |
| `@axe-core/playwright` (in `shared/components/package.json`) | Wired into both the new a11y spec + the existing storybook a11y patterns |
| ffmpeg (system binary; prior art #217 T520 + #189 T048; surfaced by FR-045 `task verify:ffmpeg`) | GIF synthesis from Playwright video |
| `apps/web-shell/playwright/tests/properties-screenshots.spec.ts` path-resolution pattern | The new GIF + the code-server screenshot resolve their evidence paths the same way |

No new patterns invented; every new file slots into a pattern that already exists in the repo.

---

## R9 — Risks + mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| axe surfaces a serious violation we cannot fix in this feature's scope | Low (the surfaces already pass keyboard-nav unit tests in #230) | Land US3 last; if a serious violation appears, scope the fix in OR file as a separate backlog item with explicit sign-off — do not silently downgrade the budget. |
| Perf test flakes on slow CI runners | Medium (CI variance is real) | The 20 % CI tolerance buffer (60 ms soft budget) is the explicit spec mitigation. Median (not mean) of 100 iterations dampens spikes. |
| GIF exceeds 2 MB budget on first capture | Medium | The ffmpeg palette pipeline + 10 fps + ≤ 5 s gives ~20 % headroom. If we breach, drop to 8 fps before relaxing duration. |
| `?induceCopyFailure` knob bleeds into production builds | Very low | The knob is parsed only inside `StoryboardEditHarness.tsx`, which is a web-shell-only mount. The VS Code panel never instantiates it. Linter rule already forbids harness imports from `apps/vscode/`. |
| Story-only mock-port drifts from the harness mock-port | Low (single shared helper per R1) | Reducer-action discriminated union is the contract; TS strict mode catches drift at compile time. |

---

## R10 — `PortContext` injection + no-provider failure mode (review-driven)

### Decision
Introduce a React context `PortContext` (defined alongside the reducer in `shared/components/src/panels/StoryboardPanel/`) whose value is a `MockPortHandle['port']`-shaped object (`{ postMessage(msg): void }`). The production webview entry (`apps/vscode/src/webview/web/storyboardPanel.tsx`) wraps the panel in `<PortContext.Provider value={vscode}>` where `vscode = acquireVsCodeApi()`. The harness + stories wrap the panel in `<PortContext.Provider value={mockPort.port}>`.

The default context value is **NOT undefined**. It is a port shim that throws `Error("StoryboardPanel: no PortContext.Provider in the tree — production webview must wrap with acquireVsCodeApi(); stories/harness must wrap with createStoryOnlyMockPort().port")` when `postMessage` is called. The error fires at action-emit time (when a user clicks something), not at mount time. This honours Article I.3 (no silent failures): mounting an unwrapped panel does not crash, but the first dispatch makes the missing wiring obvious.

### Rationale
- **React context is the idiomatic test seam** for replacing IO at the boundary. Stories + harness already use providers (theme, log) — adding one more is consistent.
- **Prop drilling (`port` on `<StoryboardPanel>`)** would propagate through SceneRow, SceneOverflowMenu, StoryboardHeader, etc. — every component that emits a message would need the prop. Context is cleaner.
- **Patching `acquireVsCodeApi` at module scope** (the third option) would couple the test seam to a global. Strict-type-safety (Article XV) prefers explicit context.
- **Throwing-default rather than undefined-default** turns a silent `undefined.postMessage is not a function` deep in event handlers into an actionable error message at the right boundary.

### Alternatives considered
- Prop injection: rejected (above).
- Patching `acquireVsCodeApi`: rejected (above).
- Default no-op port that swallows messages: rejected — that IS a silent failure (Article I.3 violation).

### Test coverage (T1A)
Unit test in `shared/components/src/panels/StoryboardPanel/__tests__/PortContext.test.tsx` covers: (a) provider supplies port → dispatch → message emitted; (b) no provider → mount succeeds → dispatch throws the documented error message.

---

## R11 — `videoToGif.ts` helper testability (review-driven)

### Decision
Place the helper at `apps/web-shell/playwright/helpers/videoToGif.ts`. Export a single function `convertWebmToGif(input: string, output: string, opts?: GifOptions): Promise<{ sizeBytes: number; durationSec: number }>`. The function shells out to `ffmpeg` via `child_process.execFile` (no shell injection surface), generates a palette via `palettegen`, applies it via `paletteuse`, and probes the output via `ffprobe`. Return value carries the measured size + duration so callers can assert against budgets.

Unit-test the helper at `apps/web-shell/playwright/helpers/__tests__/videoToGif.test.ts` against a tiny fixture webm checked in at `apps/web-shell/playwright/fixtures/sample.webm` (≤ 50 KB; 1 second of solid colour). Test asserts (a) output GIF exists, (b) measured fps ≤ 12 (allows palette-rounding), (c) measured size > 0, (d) duration matches input duration ± 0.1 s. Skipped when `ffmpeg` is missing locally (CI has it; FR-045 enforces).

### Rationale
- **Separating helper unit test from full Playwright spec** makes diagnosis cheap — when an ffmpeg flag breaks, the unit test fails in seconds, not after a 90 s Playwright run.
- **A 50 KB checked-in webm fixture** keeps the test deterministic and offline-by-default (Article I.1).

### Alternatives considered
- Cover via integration only (i.e., the Playwright GIF spec): rejected — slow feedback; failure diagnosis requires reading Playwright traces.
- Generate the fixture webm at test time: rejected — adds a Playwright dep to a vitest unit test.

---

## R12 — A11y categoriser as a pure function (review-driven)

### Decision
Extract the violation-categorisation logic from the a11y spec into a pure function `categoriseAxeViolations(results: AxeResults): { fail: Violation[]; warn: Violation[]; ignore: Violation[] }` placed at `apps/web-shell/playwright/helpers/a11yCategoriser.ts`. The function maps axe severity to action: `serious` + `critical` → `fail`, `moderate` → `warn`, `minor` → `ignore`. The Playwright spec calls the categoriser, fails the test on any `fail` entries, writes `warn` entries to the markdown report + raw JSON, drops `ignore` entries.

Unit-test at `apps/web-shell/playwright/helpers/__tests__/a11yCategoriser.test.ts`: (a) serious → fail; (b) critical → fail; (c) moderate → warn + report row written via injectable writer; (d) minor → ignore; (e) mixed input → correct partition. The writer is injectable so the unit test does not touch the filesystem.

### Rationale
- **The pass/warn/fail decision IS a codepath** — it deserves the same scrutiny as the rule-running code. Without a unit test, a refactor of the categoriser could silently turn moderate-warns into ignores, suppressing visibility of accessibility regressions.
- **Pure function + injectable writer** keeps the test fast and side-effect-free.

### Alternatives considered
- Inline categorisation logic in the Playwright spec: rejected — couples logic to runner; harder to test.

---

## R13 — `composeSceneEditViewModels` formal public-API contract (review-driven, was deferred-item #3)

### Decision
Promote `composeSceneEditViewModels` from "exported helper" to "public API of `@debrief/components`". Concretely:
1. Pin its signature in a new `shared/components/src/panels/StoryboardPanel/CONTRACTS.md` document. The contract states: function signature, the FR-008-derived O(active-storyboard Scenes) invariant, the FR-030-derived 50 ms median budget, the conditions under which the budget should be re-baselined (e.g., when a SceneEditViewModel field is added).
2. Add an entry to `shared/components/CHANGELOG.md` under an "Unreleased — Public API" heading noting the promotion + the perf invariant.
3. The perf test (FR-030) cites `CONTRACTS.md` in its assertion failure message so a future regressor finds the contract before reading the function body.

### Rationale
- **#234 makes this function the centre of the perf-budget guard.** Once it is the regression target, future readers need to understand its invariants without spelunking through #218 → #230 → #234 specs.
- **Pre-v4.0.0 (Article XIV) does not exempt us from documenting public APIs** — it just exempts us from backwards-compatibility obligations. A pinned signature + invariant doc is exactly the kind of explicit-contract clarity Article XV asks for.
- **The CHANGELOG entry** sets expectations for downstream consumers (tests, future panels) that the function is now a stable surface.

### Alternatives considered
- Leave informal: rejected — defeats the point of pinning a perf budget.
- Promote to a separate package: rejected — premature; it lives where it is used.

---

## Open questions

None. All NEEDS CLARIFICATION items from the technical context resolved. Review-driven items R10–R13 also resolved. Phase 1 may proceed.
