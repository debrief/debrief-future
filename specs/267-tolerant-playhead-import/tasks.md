---
description: "Task list for 267-tolerant-playhead-import"
---

# Tasks: Tolerant import for out-of-window saved playhead

**Input**: Design documents from `/specs/267-tolerant-playhead-import/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/system-state-helper-delta.md

**Tests**: Included — Constitution Articles VI & VII mandate tests; plan.md enumerates the test files. Test tasks are written first and must fail before their implementation task.

**Organization**: Tasks are grouped by user story (US1 tolerant path, US2 guard rail — both P1) so each is independently testable.

> **⚠️ HARD DEPENDENCY ON SPEC-261**: `services/session-state/src/system-state/` does **not exist yet** — spec-261 (`261-session-state-systemstate`) is planned/tasked but unimplemented. This feature *amends* spec-261's helper, `validate.ts`, reconciliation, and `persistence/load.ts`. **No implementation task below can start until spec-261's SystemState load layer is merged** (see research.md § R-005). T001 is the gate.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. Used in the PR description, docs, and the feature blog post.

**Evidence Directory**: `specs/267-tolerant-playhead-import/evidence/`
**Media Directory**: `specs/267-tolerant-playhead-import/media/`

**Feature type**: Integration / VS Code-extension-workflow behavioural change (load path). No standalone UI component → no Storybook story; visual evidence comes from web-shell Playwright (the clamp toast + opened plot).

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | Vitest results (clamp, reconciliation, validate severity, load diagnostics, both-host parity) using the test-summary template | After all unit tests pass |
| `evidence/usage-example.md` | Before/after FeatureCollection + `clampPlayheadToWindow` snippet showing the clamp + diagnostic | After foundation + US1 complete |
| `evidence/integration-flow.md` | The load → clamp → notify → save-heal flow, narrated | After US1 complete |
| `evidence/sequence.mermaid` | Sequence diagram of the same flow across helper / load.ts / host | After US1 complete |
| `evidence/screenshots/playhead-clamp-toast.png` | Web-shell: opened plot + non-blocking clamp toast (tolerant path) | After web-shell E2E passes |
| `evidence/screenshots/incoherent-window-blocked.png` | Web-shell: incoherent-window plot fails to open (guard rail) | After web-shell E2E passes |
| `evidence/webview-e2e-summary.md` | Web-shell E2E pass/fail summary (tolerant + guard scenarios) | After web-shell E2E passes |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener (Hook, What We're Building, How It Fits, Key Decisions) | During `/speckit.plan` ✅ (already created) |
| `media/shipped-post.md` | Feature post = cached opener (first 3 sections verbatim) + ship-time evidence | Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task |
| Blog PR | PR in debrief.github.io with shipped-post.md | Triggered by `/speckit.pr` |

---

## Phase 1: Setup & Dependency Gate

**Purpose**: Confirm the spec-261 substrate exists before any amendment begins, and stage the shared test fixtures.

- [ ] T001 **GATE** Verify spec-261's SystemState load layer is present and merged: `services/session-state/src/system-state/` exists with `validate.ts`, `index.ts`, the temporal reconciliation helper (`reconcile.ts`/`mapping.ts`), `SystemStateLoadError` (with `kind: 'cross-field-invariant'`), and `services/session-state/src/persistence/load.ts` reads SystemState. **If absent, STOP — this feature cannot proceed (research.md § R-005); coordinate with spec-261 or fold this relaxation into 261's delivery.**
- [ ] T002 [P] Add shared in-memory fixture FeatureCollections — temporal SystemState with `current_time` before-start, after-end, in-range, on-boundary, single-instant window, and an incoherent `start>end` window `services/session-state/src/system-state/__tests__/fixtures/playhead-clamp-fixtures.ts`

**Checkpoint**: Substrate confirmed; fixtures ready for both stories.

---

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared diagnostic type, the pure clamp helper, the `validate.ts` severity split, and the `load.ts` diagnostics channel — all consumed by BOTH stories.

**⚠️ CRITICAL**: Blocks US1 and US2. Depends on T001 (gate).

- [ ] T003 Define `PlayheadClampDiagnostic` type (`kind`, `featureId`, `edge`, `originalCurrentTime`, `clampedCurrentTime`) and the `clampPlayheadToWindow` function signature (stub) `services/session-state/src/system-state/diagnostics.ts`
- [ ] T004 [P][test] Write `clampPlayheadToWindow` unit tests (before-start→start, after-end→end, in-range/boundary→null, single-instant window) — must FAIL first `services/session-state/src/system-state/__tests__/clamp.test.ts`
- [ ] T005 Implement `clampPlayheadToWindow` in epoch-ms space (`Math.min(Math.max(...))`, matching the store's `stepForward`/`stepBackward` arithmetic) `services/session-state/src/system-state/diagnostics.ts`
- [ ] T006 [P][test] Write `validate.ts` cross-field severity tests — `start_time > end_time` still throws `SystemStateLoadError(kind='cross-field-invariant')`; out-of-window `current_time` no longer throws — must FAIL first `services/session-state/src/system-state/__tests__/validate-cross-field.test.ts`
- [ ] T007 Split `validate.ts` cross-field severity: keep the `start>end` throw, REMOVE the `current_time ∈ [start,end]` throw (delegated to reconciliation) `services/session-state/src/system-state/validate.ts`
- [ ] T008 Add the non-fatal `clampDiagnostics: readonly PlayheadClampDiagnostic[]` channel to the `load.ts` result shape (empty by default; hard errors still throw) `services/session-state/src/persistence/load.ts`
- [ ] T009 Export `PlayheadClampDiagnostic` + `clampPlayheadToWindow` from the helper barrel (re-exported by `@debrief/session-state`) `services/session-state/src/system-state/index.ts`

**Checkpoint**: Clamp primitive + diagnostic type + severity split + load channel exist and unit-pass. Stories can begin.

---

---

## Phase 3: User Story 1 — Open a plot with an orphaned playhead (Priority: P1)

**Goal**: A plot whose temporal `SystemState.current_time` falls outside a coherent `[start_time, end_time]` window opens successfully; the in-memory playhead is clamped to the nearest edge; a single non-blocking notification reports the adjustment; the heal persists on next save.

**Independent Test**: Load a fixture plot with `current_time` after `end_time` → plot opens, `slice.currentTime === end_time`, one `PlayheadClampDiagnostic{edge:'end'}` produced, host shows one non-blocking notification, no dirty marker.

### Tests for User Story 1 ⚠️ (write first, must FAIL before implementation)

- [ ] T010 [P][test][US1] `applyTemporalReconciliation` tests: out-of-window → `{slice:{currentTime:edge}, clamp:Diagnostic}` with correct `edge`/ISO values; in-range/absent → `{slice, clamp:null}` byte-identical to spec-261 (FR-009) `services/session-state/src/system-state/__tests__/reconcile-clamp.test.ts`
- [ ] T011 [P][test][US1] `load.ts` tests: `clampDiagnostics` populated (one entry) for a clamped plot, empty for a clean plot; multi-plot load aggregates diagnostics across plots (FR-006) `services/session-state/src/persistence/__tests__/load-clamp.test.ts`
- [ ] T012 [P][test][US1] Provenance test: persisting a healed temporal SystemState appends one `LogEntry` recording original→clamped value; no provenance write when the analyst doesn't save (FR-007/FR-008, R-002) `services/session-state/src/system-state/__tests__/clamp-provenance.test.ts`

### Web-Shell E2E Tests for User Story 1 🖥️

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — `apps/web-shell/run-playwright.mjs` extracts the bundled `@sparticuz/chromium`. Do NOT skip. See `docs/project_notes/playwright-installation-research.md`.

- [ ] T013 [P][US1] Extend the web-shell page object with selectors for the clamp toast and the time-controller playhead position `apps/web-shell/playwright/pages/AnalysisPage.ts`
- [ ] T014 [US1] Create the web-shell E2E spec — tolerant scenario: load an orphaned-playhead plot → map renders, non-blocking toast reports the clamp, playhead sits at the window edge; write the screenshot into the evidence dir `apps/web-shell/playwright/tests/playhead-clamp.spec.ts`

### Implementation for User Story 1

- [ ] T015 [US1] Amend `applyTemporalReconciliation` to clamp `current_time` to the window via `clampPlayheadToWindow` and return `{slice, clamp: PlayheadClampDiagnostic | null}` (epoch-ms compare; ISO values in the diagnostic) `services/session-state/src/system-state/reconcile.ts`
- [ ] T016 [US1] Wire `load.ts` to collect the diagnostic from each `applyTemporalReconciliation` call into `clampDiagnostics` (aggregating across all plots in a multi-plot load) `services/session-state/src/persistence/load.ts`
- [ ] T017 [P][US1] VS Code host: render clamp diagnostics as ONE coalesced non-blocking `window.showWarningMessage` (count-summarised for multi-plot restore) on plot open `apps/vscode/src/commands/openPlot.ts`
- [ ] T018 [P][US1] Web-shell host: render clamp diagnostics as ONE coalesced non-blocking toast on plot load (reuse the existing App toast surface) `apps/web-shell/src/App.tsx`
- [ ] T019 [US1] Provenance enrichment: carry the in-memory pending clamp diagnostic to the next save so `writeSystemStateIntoFeatureCollection`'s `LogEntry` for the temporal variant records original→clamped (no auto-save, no dirty — FR-008) `services/session-state/src/system-state/write.ts`
- [ ] T020 [US1] Run web-shell E2E tolerant scenario: `cd apps/web-shell && node run-playwright.mjs playhead-clamp`

**Checkpoint**: US1 fully functional — orphaned playheads open, clamp, notify, and heal on save; valid plots untouched.

---

---

## Phase 4: User Story 2 — Incoherent window still fails fast (Priority: P1)

**Goal**: A plot whose temporal `SystemState` has `start_time > end_time` still fails to open with the existing structured `SystemStateLoadError(kind='cross-field-invariant')`. Tolerance never leaks into structurally-broken data. When both defects coexist, the incoherent-window failure takes precedence (no clamp attempted).

**Independent Test**: Load a fixture plot with `start_time > end_time` → load throws `SystemStateLoadError(kind='cross-field-invariant')` with the offending feature ID; plot does not open; no diagnostic emitted. A plot with both `start>end` AND out-of-window `current_time` → same hard fail, clamp path never reached (FR-005).

### Tests for User Story 2 ⚠️ (write first, must FAIL before implementation)

- [ ] T021 [P][test][US2] `load.ts` propagates `SystemStateLoadError` for an incoherent-window plot — the error THROWS out of load and is NOT swallowed into `clampDiagnostics` (FR-004) `services/session-state/src/system-state/__tests__/validate-cross-field.test.ts`
- [ ] T022 [P][test][US2] Precedence test: a temporal feature with BOTH `start>end` AND out-of-window `current_time` throws before reconciliation/clamp runs (FR-005, R-006) `services/session-state/src/system-state/__tests__/reconcile-clamp.test.ts`

### Web-Shell E2E Tests for User Story 2 🖥️

- [ ] T023 [US2] Extend the web-shell E2E spec — guard scenario: load an incoherent-window plot → the plot does NOT open, the structured error surface is shown; capture the blocked-state screenshot into the evidence dir `apps/web-shell/playwright/tests/playhead-clamp.spec.ts`

### Implementation for User Story 2

- [ ] T024 [US2] Confirm/ensure `load.ts` does not catch `SystemStateLoadError` from `validate.ts` (incoherent window propagates to the host error surface unchanged from spec-261) `services/session-state/src/persistence/load.ts`
- [ ] T025 [US2] Run web-shell E2E guard scenario: `cd apps/web-shell && node run-playwright.mjs playhead-clamp`

**Checkpoint**: Both stories pass — tolerant recovery for orphaned playheads; hard fail preserved for incoherent windows.

---

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verify, capture evidence, write the feature post, and open the PR.

### Verification

- [ ] T026 Run the full CI gate before evidence capture: `task verify` (ruff + pnpm lint, pyright + `pnpm -r typecheck`, pytest + vitest). All green required.
- [ ] T027 Run quickstart.md validation steps 1–6 end-to-end (unit, both-host parity, web-shell E2E tolerant + guard, round-trip heal, regression) `specs/267-tolerant-playhead-import/quickstart.md`

### Evidence Collection (REQUIRED)

- [ ] T028 Capture test results using the template (`.specify/templates/evidence/test-summary-template.md`) — YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed/failed/skipped`, `coverage_pct`) + key scenarios verified `specs/267-tolerant-playhead-import/evidence/test-summary.md`
- [ ] T029 [P] Record usage demonstration — before/after temporal SystemState + `clampPlayheadToWindow` snippet + the emitted diagnostic + the save-time provenance entry `specs/267-tolerant-playhead-import/evidence/usage-example.md`
- [ ] T030 [P] Write the integration flow narrative — load → split-severity validate → clamp + diagnostic → coalesced notification → save-time heal `specs/267-tolerant-playhead-import/evidence/integration-flow.md`
- [ ] T031 [P] Author the sequence diagram of the same flow (helper / load.ts / host / save) `specs/267-tolerant-playhead-import/evidence/sequence.mermaid`

### Web-Shell E2E Evidence Collection (REQUIRED) 🖥️

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — `apps/web-shell/run-playwright.mjs` auto-provisions the bundled Chromium. See `docs/project_notes/playwright-installation-research.md`.

- [ ] T032 Run the web-shell E2E suite: `cd apps/web-shell && node run-playwright.mjs playhead-clamp`
- [ ] T033 [P] Confirm the captured screenshots landed: tolerant toast + opened plot, and incoherent-window blocked state `specs/267-tolerant-playhead-import/evidence/screenshots/`
- [ ] T034 [P] Document web-shell E2E results (tolerant + guard scenarios) `specs/267-tolerant-playhead-import/evidence/webview-e2e-summary.md`

### Media Content

- [ ] T035 Create the feature blog post via the Content Specialist (`.claude/agents/media/content.md`) — title prefixed `Building `; copy the first three sections (What We're Building, How It Fits, Key Decisions) VERBATIM from `evidence/opening-context.md`; write Screenshots, By the Numbers, Lessons Learned, What's Next from the evidence `specs/267-tolerant-playhead-import/media/shipped-post.md`

### PR Creation

- [ ] T036 Create PR and publish blog: run `/speckit.pr`

**Task T036 MUST run last — it depends on all evidence (T028–T034) and media (T035) tasks being complete. It creates the debrief-future feature PR and publishes `shipped-post.md` to debrief.github.io.**

---

## Dependencies

### Phase Dependencies

- **Phase 1 (Setup & Gate)**: T001 is an absolute gate — spec-261's SystemState load layer must be merged first (research.md § R-005). T002 fixtures can be authored once T001 passes.
- **Phase 2 (Foundational)**: Depends on T001. Blocks both stories. Within it: T003 → T004 → T005 (clamp type→test→impl, same file `diagnostics.ts`); T006 → T007 (validate test→impl); T008, T009 follow.
- **Phase 3 (US1)** and **Phase 4 (US2)**: Both depend on Phase 2. US2's hard-fail is already preserved by T007, so US2 is largely verification + the guard E2E; the two stories are independently testable and can be staffed in parallel after Phase 2.
- **Phase 5 (Polish)**: Depends on US1 + US2 complete. T036 (`/speckit.pr`) is strictly last.

### Story Dependencies

- **US1 (tolerant path)**: Depends on Phase 2. The clamp lives in reconciliation (T015), surfaced via load.ts (T016) and host UI (T017/T018), healed at save (T019).
- **US2 (guard rail)**: Depends on Phase 2 (specifically T007's preserved `start>end` throw). No dependency on US1 — verifiable on its own.

### Within Each Story

- Test tasks (`[test]`) are written first and MUST fail before their implementation task.
- Reconciliation (T015) before load wiring (T016) before host rendering (T017/T018).
- Same-file tasks are sequential, never `[P]`: `diagnostics.ts` (T003/T005), `load.ts` (T008/T016/T024), `validate.ts` tests (T006/T021), `reconcile-clamp.test.ts` (T010/T022), `playhead-clamp.spec.ts` (T014/T023).

### Parallel Opportunities

- T002 (fixtures) is `[P]` once the gate clears.
- Foundation: T004 and T006 (independent test files) are `[P]`.
- US1 tests T010 / T011 / T012 are `[P]` (distinct files); host renderers T017 (VS Code) and T018 (web-shell) are `[P]` (distinct files).
- US2 tests T021 / T022 are `[P]`.
- Evidence: T029 / T030 / T031 are `[P]`; T033 / T034 are `[P]`.
- After Phase 2, US1 and US2 can be developed in parallel by different contributors.

---

## Implementation Strategy

### Incremental Delivery

1. **Gate (T001)** — confirm spec-261 is in. If not, stop; this work has no substrate. (Viable alternative: fold the relaxation into spec-261's own delivery — R-005.)
2. **Foundation (Phase 2)** — the pure clamp helper, the diagnostic type, the `validate.ts` severity split, the `load.ts` channel. Unit-green before any story.
3. **US1 (tolerant path)** — the user-visible win. Ship → orphaned playheads open, clamp, notify, heal on save.
4. **US2 (guard rail)** — verify the incoherent-window hard fail survives end-to-end. This keeps the relaxation honest (the entire justification for the XIV.4 exception).
5. **Polish** — verify (`task verify`), capture evidence + screenshots, write the feature post from the cached opener, open the PR.

### Notes

- `[P]` = different files, no dependencies. `[Story]` (US1/US2) maps tasks for traceability.
- This is a **behavioural amendment** to spec-261 code — no LinkML/schema change, no new dependency. The existing schema-adherence suite must pass unchanged (SC-006).
- Commit after each task or logical group. Run `task verify` before pushing (CLAUDE.md "Before Pushing").
- The single most important invariant across both stories: **the clamp is never silent** (Article I.3) and **never leaks into `start>end`** (the guard rail).
- Total: 36 tasks (T001–T036).
