# Phase 0 Research: Reactivate Webview Log-Panel E2E Suite

**Feature**: 210 — Un-skip webview log-panel E2E suite
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)
**Date**: 2026-04-24

## Scope

Seven research items covering: confirmation that blockers are in place, a performance estimate against SC-005, a diagnostic-artefact interpretation for SC-003, the selection assertion style for the new parity scenarios, the state of sibling suites, the page-model reuse plan, and the local/CI invocation path. All items resolved without raising new `NEEDS CLARIFICATION` markers.

---

## R1 — Blocker deliverables are live

**Decision**: #143 and #176 deliverables are present and usable; no blockers remain for the mechanical reactivation.

**Evidence**:

- `tests/e2e/models/code-server-page.ts:511–523` exposes `getLogPanelFrame()` which focuses the view via the command palette (`Debrief Log: Focus on Debrief Log View`) and resolves the webview iframe via `findWebviewFrameByContent('[data-testid="log-panel"]', 15_000)`. This is the frame-probing helper #143 delivered.
- `tests/e2e/models/code-server-page.ts:339–351` exposes `executeCommand(...)` consistent with the pattern the `fixme`'d suite already uses (`Debrief: Range Bearing`, `Debrief: Track Stats`).
- `shared/components/src/LogPanel/LogPanel.tsx:246, 257–258, 277` renders `[data-testid="log-panel"]`, `[data-testid="log-panel-empty-no-entries"]`, and the `log-panel__entry` child elements.
- `shared/components/src/LogPanel/LogEntry.tsx:101, 133` applies `log-panel__entry--selected` (class) and `aria-selected={isSelected}` (attribute) when an entry is selected. Both selection markers from #176 are live.

**Rationale**: The assertion surface the current (`fixme`'d) scenarios reference and the two additional selection scenarios the plan adds can all be expressed in terms of already-shipped DOM contracts and helper methods.

**Alternatives considered**:

- Writing a bespoke frame resolver inside `test-log-panel.spec.ts`. Rejected — `findWebviewFrameByContent` is already stabilised by #143 and used by `getActivityPanelFrame` / `getLogPanelFrame` alike; duplicating it would violate FR-003 ("consume the shared fixtures and page model").

---

## R2 — Performance estimate against SC-005 (≤ 90 s median wall-clock)

**Decision**: SC-005's 90-second median budget is **tight but achievable** with five scenarios that each call `openPlotViaStacTree` independently. No shared `beforeAll` is introduced; each scenario remains self-contained per `fullyParallel: false` + `workers: 1`.

**Evidence**:

- `tests/e2e/playwright.config.ts:97` sets `timeout: 60_000` per test — even a worst-case single scenario stays under the per-suite budget.
- Per the #143 spec (`specs/143-fix-stac-tree/spec.md:68`, FR-001), `openPlotViaStacTree` is budgeted at 30 s in CI. Empirically (#143's evidence), typical completion is <15 s once the STAC tree pre-seeding lands.
- Five scenarios × ~12–15 s each = 60–75 s + setup/teardown = expected median ≈ 70–85 s. Within budget.

**Rationale**: A shared fixture that opens the plot once and reuses it across scenarios would shave ~30 s, but it would introduce inter-scenario state coupling (e.g. the first scenario expects *no* log entries; a subsequent scenario leaves entries behind). That coupling would make individual-test debugging harder and violate the Independent Test principle in the spec's user stories.

**Alternatives considered**:

- `test.beforeAll` that opens the plot once per worker. Rejected — introduces state coupling; a failing scenario could leave the panel in a bad state for subsequent ones. Worker state sharing in Playwright also differs from Jest-style `beforeAll` semantics and tends to surface as flakiness.
- Reducing scenario count to 3 (drop the 2 selection parity scenarios). Rejected — FR-006 and User Story 3 explicitly call for the parity coverage; it's why the spec differs from what's already in the `fixme`'d file.
- Run scenarios in parallel (`fullyParallel: true`). Rejected — the CI config pins `workers: 1` for openvscode-server stability across all suites; this suite MUST NOT override that.

**Mitigation — SC-005 reactive trigger**: Ship 5 scenarios. Apply the fallback **reactively**, not pre-emptively, according to the following rule:

- **Warning (85 s)**: If the 10-run median on `main` exceeds 85 s, open a tracking issue. No code change yet; the suite is still within budget but the headroom has narrowed.
- **Breach (90 s)**: If the 10-run median exceeds 90 s on any rolling window, consolidate the two selection scenarios into a single `test(...)` body ("click → assert selected → click again → assert deselected") that shares one `openPlotViaStacTree` cycle. This still satisfies FR-006's parity intent and saves ~12–15 s of per-suite wall-clock.

Pre-emptive consolidation (shipping with 4 scenarios from the outset) is rejected because per-scenario debuggability is valuable at current headroom — a failing selection assertion in a dedicated scenario is easier to triage than a failure midway through a compound scenario.

---

## R3 — Diagnostic artefacts on failure (SC-003)

**Decision**: Keep Playwright's existing `trace: 'on-first-retry'` and do **not** introduce per-suite screenshot hooks or override the project-level config. SC-003's intent is satisfied by the local-spike-run path (retries=1 locally → trace captured) and by CI assertion-level error messages.

**Evidence**:

- `tests/e2e/playwright.config.ts:81` — `retries: process.env.CI ? 0 : 1`. Locally, a failing spike run retries once, triggering the `on-first-retry` trace capture. That is the SC-003-relevant path (spike / contrived regression is explicitly local-verification work per the success-criterion wording).
- `tests/e2e/playwright.config.ts:83` — HTML reporter is enabled. In CI, the HTML report captures assertion error + stack trace even without a Playwright trace.
- No sibling active suite in `tests/e2e/` uses a bespoke `afterEach` screenshot hook. Adding one here would violate FR-003 and FR-005 (suite MUST use the same artefact conventions as siblings).

**Rationale**: SC-003 describes a deliberate regression spike — a developer manually breaks the LogPanel contract on a branch and runs the suite locally. Locally, retries=1 applies, and `trace: on-first-retry` fires, producing both trace and screenshot automatically. No spec change or config override needed.

**Alternatives considered**:

- Override `retries` or `trace` at suite level via `test.use(...)`. Rejected — breaks FR-003 (shared config).
- Add `test.afterEach(async ({ page }) => { if (testInfo.status === 'failed') await page.screenshot(...) })` hook. Rejected — duplicates what Playwright's built-in `screenshot: 'only-on-failure'` option does, and introducing it only in this suite creates a one-off. If the *project* decides screenshot-on-failure is wanted globally, that's a separate tech-debt item, not in scope here.

---

## R4 — Selection assertion style for the two new parity scenarios

**Decision**: Assert against the `log-panel__entry--selected` **class** (matching the web-shell suite's `toHaveClass(/selected/)` pattern). Do **not** assert against `aria-selected` — accessibility-attribute coverage belongs in #209 (LogPanel axe-core audit) to keep concerns separate.

**Evidence**:

- `apps/web-shell/playwright/tests/log-panel.spec.ts:170, 187, 191` uses `toHaveClass(/selected/)` — the parity baseline.
- `shared/components/src/LogPanel/LogEntry.tsx:101` applies `log-panel__entry--selected` via `className`. The regex `/selected/` matches this BEM-modifier form.
- Backlog item #209 (`LogPanel axe-core accessibility audit`) is scoped to accessibility attributes including `aria-selected` (per its description). Keeping accessibility semantics out of this feature preserves separation of concerns.

**Rationale**: Parity means asserting the same observable state against the same DOM hooks. The class-based assertion is what the web-shell suite uses; using the same assertion style in the VS Code suite makes the two suites genuinely comparable, which is the whole point of web-shell parity (User Story 3).

**Alternatives considered**:

- Assert `aria-selected="true"`. Rejected — introduces an a11y assertion that is #209's scope; duplicate work if #209 adds stricter coverage.
- Assert both. Rejected — same reason, plus noise.

---

## R5 — State of sibling `blocked-by-#143` suites (KNOWN RISK)

**Decision**: Explicitly call out that four sibling suites (`test-analysis-tool.spec.ts`, `test-event-log-propagation.spec.ts`, `test-capture-log-evidence.spec.ts`, `test-log-edit-face.spec.ts`) remain `test.describe.skip` with "blocked: webview iframe (#143)" comments — even though #143 is marked `complete` in BACKLOG.md. Scope of this feature stays narrowly on `test-log-panel.spec.ts` (as the backlog item dictates), but the risk that latent webview-iframe flakiness surfaces on reactivation is real.

**Evidence**:

- `grep -l 'blocked: webview iframe (#143)' tests/e2e/*.spec.ts` returns five files:
  - `tests/e2e/test-log-panel.spec.ts` — `fixme` (our target)
  - `tests/e2e/test-analysis-tool.spec.ts` — `skip`
  - `tests/e2e/test-event-log-propagation.spec.ts` — `skip`
  - `tests/e2e/test-capture-log-evidence.spec.ts` — `skip`
  - `tests/e2e/test-log-edit-face.spec.ts` — `skip`
- `test-log-panel.spec.ts` was promoted from `skip` to `fixme` under Feature 176 decision 9A — signalling it was chosen as the front-runner for reactivation. The other four have not been promoted.
- `test-analysis-tool.spec.ts` has an *additional* blocker (`test.fixme('requires debrief-calc service — not installed in E2E environment')`) which is orthogonal to #143 — so its `.skip` removal has a separate path.

**Rationale — narrowing scope is correct**: The backlog item #210 specifies *one* file. Expanding to reactivate all five is scope creep and would introduce unrelated risk (e.g. debrief-calc availability for `test-analysis-tool`). Reactivating log-panel first is the intended front-runner and validates the webview iframe path before anyone takes on the others.

**Rationale — flagging risk is correct**: If reactivation reveals the `getLogPanelFrame()` → `findWebviewFrameByContent` path still has intermittent failures in CI (beyond what #143 stabilised for STAC tree resolution), that's a real outcome. The plan's mitigation: ship with monitoring, not with blind confidence.

**Mitigation — revert-to-`fixme` trigger rule**:

**Trigger condition** (fires the moment either branch evaluates true on `main`): revert-to-`test.describe.fixme` is invoked when `tests/e2e/test-log-panel.spec.ts` shows either

- **2 consecutive failures within a 24-hour window** on `main`, OR
- **≥ 3 failures in the last 10 main-branch runs** (rolling window).

Either branch counts as "reproducible, not a one-off" and removes ambiguity about when to act (replacing the earlier intent-only "verify reproducible" step).

Once triggered, the response is:

1. Open the fastest-available PR reverting `test.describe(...)` → `test.describe.fixme(...)` (one-line change).
2. File a new bug ticket capturing the specific failure mode — which iframe didn't resolve, which timeout fired, which assertion failed, trace artefact attached.
3. That ticket becomes the new blocker for this feature; #210 reopens until resolved.

**Alternatives considered**:

- Reactivate all five suites in this PR. Rejected — violates backlog scope; conflates multiple unrelated blockers (debrief-calc, edit-face stability, event-log propagation state coupling).
- Block the feature pending reactivation of a canary suite first. Rejected — `test-log-panel.spec.ts` IS the canary by virtue of being `fixme` rather than `skip`.

---

## R6 — Page model reuse vs additions

**Decision**: No additions to `tests/e2e/models/code-server-page.ts`. The existing surface (`openPlotViaStacTree`, `getWebviewFrame`, `getLogPanelFrame`, `executeCommand`, `page`) is sufficient for all five scenarios.

**Evidence**:

- The three existing scenarios in the `fixme`'d file already compile against the page model as-is; removing the `fixme` flag doesn't require any helper additions.
- The two new selection-parity scenarios need only: `logFrame.locator('.log-panel__entry').first()`, `.click()`, and `toHaveClass(/selected/)` — all primitive Playwright operations, no helper warranted.

**Rationale**: FR-003 and FR-007 both call for page-model stability. An additive helper (e.g. `getFirstLogEntry()`) would be a minor convenience but would set a precedent that every suite might add bespoke helpers, eroding the page-model's role as the *shared* abstraction.

**Alternatives considered**:

- Add a convenience method like `getLogEntries()` returning a Locator. Rejected — one-line savings, not worth the API surface growth.

---

## R7 — Local and CI invocation path

**Decision**: The suite is invoked via the same path as other active E2E specs — no new invocation wrapper, no new npm script.

**Evidence**:

- CI workflow (`.github/workflows/ci.yml`) runs `task test` → includes the E2E job. The log-panel suite is picked up by `testMatch: '*.spec.ts'` in `tests/e2e/playwright.config.ts:78`. No explicit listing required.
- Local: from repo root, `pnpm --filter <…> test` or the direct `tests/e2e/scripts/*.sh` scripts handle invocation. The `/quickstart.md` Phase 1 artefact documents the concrete local commands.

**Rationale**: Zero-touch on the invocation path is the whole point of "first-class suite" treatment.

**Alternatives considered**: N/A — no other invocation model exists in this project.

---

## Resolved Unknowns Summary

| Unknown | Status | Resolution |
|---------|--------|------------|
| Are #143 / #176 deliverables live? | ✅ Resolved | R1 — yes, all required helpers and DOM hooks confirmed. |
| Does runtime fit SC-005 (≤ 90 s)? | ✅ Resolved | R2 — yes, tight but feasible at 5 scenarios. Fallback: consolidate to 4. |
| Are diagnostic artefacts captured on failure? | ✅ Resolved | R3 — yes, via local retry path; CI assertion messages suffice. |
| Which selection marker to assert? | ✅ Resolved | R4 — `log-panel__entry--selected` class, matching web-shell pattern. |
| Are sibling suites in a similar state? | ⚠️ Known Risk | R5 — four siblings still `.skip`; reactivation may surface latent flakiness. Mitigation documented. |
| Are page-model additions required? | ✅ Resolved | R6 — no, existing surface sufficient. |
| Is a new invocation path needed? | ✅ Resolved | R7 — no, picked up by existing `testMatch`. |

## Open Items for Phase 1

None. All Technical Context placeholders in plan.md are filled; no `NEEDS CLARIFICATION` markers carry over. Proceed to quickstart.md and agent-context update.
