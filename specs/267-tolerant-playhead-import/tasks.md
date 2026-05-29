---
description: "Task list for 267-tolerant-playhead-import"
---

# Tasks: Tolerant import for out-of-window saved playhead

**Input**: Design documents from `/specs/267-tolerant-playhead-import/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/system-state-helper-delta.md

**Tests**: Included — Constitution Articles VI & VII mandate tests; plan.md enumerates the test files. Test tasks are written first and must fail before their implementation task.

**Organization**: Tasks are grouped by user story (US1 tolerant path, US2 guard rail — both P1) so each is independently testable.

> **DEPENDENCY ON SPEC-261 — SATISFIED (merged 2026-05-29).** This feature amends spec-261's *shipped* code. The real targets are `system-state/validate.ts` (`checkTemporalCrossField`), `read.ts` (the throw site), `store-bridge.ts` (`hydrateStoreFromFeatures`), `errors.ts` (`SystemStateLoadError`), and `types.ts`. **There is no `reconcile.ts`, no `persistence/load.ts`, and no provenance on view-state markers** — all tasks below are reconciled to the merged surfaces (see `contracts/system-state-helper-delta.md`).

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
| `evidence/usage-example.md` | Before/after temporal SystemState JSON + the `checkTemporalCrossField` `recoverable-playhead` result + the emitted `PlayheadClampDiagnostic` | After foundation + US1 complete |
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

## Phase 1: Setup & Dependency Confirmation

**Purpose**: Confirm spec-261's merged surfaces, and stage shared fixtures.

> **261 is MERGED (2026-05-29)** — the gate is now a quick confirmation, not a blocker. Real targets: `system-state/{validate.ts,read.ts,store-bridge.ts,errors.ts,types.ts}`.

- [x] T001 Confirm spec-261 surfaces are present and have the expected shape: `checkTemporalCrossField` in `validate.ts` (returns a string today), `readSystemStateFromFeatureCollection` in `read.ts` (throws `SystemStateLoadError(kind='cross-field-invariant')` at the temporal branch), `hydrateStoreFromFeatures` in `store-bridge.ts` (returns `void` today), `SystemStateLoadError` in `errors.ts` `services/session-state/src/system-state/`
- [x] T002 [P] Reuse the already-shipped 261 fixtures `cross-field/temporal-current-time-out-of-window.json` and `cross-field/temporal-bad-window.json` (`shared/schemas/fixtures/`); add only the missing in-memory cases not covered by them (before-start, on-boundary, single-instant window) `services/session-state/src/system-state/__tests__/fixtures/playhead-clamp-fixtures.ts`

**Checkpoint**: Surfaces confirmed; fixtures ready for both stories.

---

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The diagnostic type, the severity-split cross-field check, the `read.ts` clamp + explicit `{ map, playheadClamps }` return, the `store-bridge` return, and the re-exports — all consumed by BOTH stories.

**⚠️ CRITICAL**: Blocks US1 and US2. Depends on T001.

- [x] T003 Add the `PlayheadClampDiagnostic` interface (`kind:'playhead-clamped'`, `featureId`, `edge:'start'|'end'`, `originalCurrentTime`, `clampedCurrentTime`) `services/session-state/src/system-state/types.ts`
- [x] T004 [P][test] Write `checkTemporalCrossField` tests — `fatal` for `start>end` AND for **unparseable** `start_time`/`end_time`/`current_time` (enumerate each explicitly — review test gap); `recoverable-playhead` (with `edge` + `clampedCurrentTime`) for before-start / after-end; `ok` for in-range/boundary/absent — update existing assertions, must FAIL first `services/session-state/src/system-state/__tests__/validate.test.ts`
- [x] T005 Refactor `checkTemporalCrossField` to return `TemporalCrossFieldResult` (`{status:'ok'} | {status:'fatal';message} | {status:'recoverable-playhead';edge;clampedCurrentTime;message}`); export the type `services/session-state/src/system-state/validate.ts`
- [x] T006 [P][test] Write `read.ts` tests — out-of-window `current_time` no longer throws: `result.map.temporal.current_time` is clamped to the boundary and `result.playheadClamps` has one entry; `start>end` still throws `cross-field-invariant` — update existing throw-assertion + the ~6 callers to destructure `.map`, must FAIL first `services/session-state/src/system-state/__tests__/read.test.ts`
- [x] T007 Amend `read.ts`: change return to `ReadSystemStateResult { map; playheadClamps }` (review 1A — explicit return, not an optional sink); on `fatal` throw `SystemStateLoadError` (unchanged), on `recoverable-playhead` build a typed copy `{ ...v, current_time: clampedCurrentTime }` (review 2A — no `as`-cast) + push the diagnostic; update the ~6 callers/re-exports to destructure `.map` `services/session-state/src/system-state/read.ts`
- [x] T008 Amend `hydrateStoreFromFeatures` to destructure `{ map, playheadClamps }` from `read`, hydrate from `map`, and return `playheadClamps` (still throws for fatal) `services/session-state/src/system-state/store-bridge.ts`
- [x] T009 [P] Re-export `PlayheadClampDiagnostic` and `ReadSystemStateResult` from the helper barrel `services/session-state/src/system-state/index.ts`
- [x] T010 [P] Re-export `PlayheadClampDiagnostic` (and `ReadSystemStateResult`) from the package barrels `services/session-state/src/index.ts` and `services/session-state/src/browser.ts`

**Checkpoint**: Diagnostic type + severity split + read clamp + bridge return exist and unit-pass. Stories can begin.

---

---

## Phase 3: User Story 1 — Open a plot with an orphaned playhead (Priority: P1)

**Goal**: A plot whose temporal `SystemState.current_time` falls outside a coherent `[start_time, end_time]` window opens successfully; the in-memory playhead is clamped to the nearest edge; a single non-blocking notification reports the adjustment; the heal persists on next save.

**Independent Test**: Load a fixture plot with `current_time` after `end_time` → plot opens, `slice.currentTime === end_time`, one `PlayheadClampDiagnostic{edge:'end'}` produced, host shows one non-blocking notification, no dirty marker.

> **NOTE**: the core read/bridge clamp behaviour is delivered in Phase 2 (T005/T007/T008). US1 here is the host wiring (notifications) + E2E + the both-host integration tests.

### Tests for User Story 1 ⚠️ (write first, must FAIL before implementation)

- [x] T011 [P][test][US1] `store-bridge` test: `hydrateStoreFromFeatures` returns ONE `PlayheadClampDiagnostic` for an orphaned-playhead plot and sets the store's `currentTime` to the window edge; returns `[]` for a clean plot (uses a structural `ViewStateStore` stub — no Zustand needed) `services/session-state/src/system-state/__tests__/store-bridge.test.ts`
- [x] T012 [P][test][US1] VS Code tests (review 3A — closes the silent-clamp gap): (a) in `apps/vscode/tests/unit/systemStateBridge.test.ts` — an orphaned-playhead plot does NOT throw and yields a clamp; the existing malformed `toThrow(SystemStateLoadError)` still passes; (b) an `openPlot` clamp-branch test that mocks `vscode.window.showWarningMessage` and asserts it IS called for a returned clamp and `showErrorMessage` is NOT called for the recoverable case `apps/vscode/tests/unit/systemStateBridge.test.ts`

### Web-Shell E2E Tests for User Story 1 🖥️

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — `apps/web-shell/run-playwright.mjs` extracts the bundled `@sparticuz/chromium`. Do NOT skip. See `docs/project_notes/playwright-installation-research.md`.

- [x] T013 [P][US1] Extend the web-shell page object with selectors for the clamp toast and the time-controller playhead position `apps/web-shell/playwright/pages/AnalysisPage.ts`
- [x] T014 [US1] Create the web-shell E2E spec — tolerant scenario: load an orphaned-playhead plot → map renders, non-blocking toast reports the clamp, playhead sits at the window edge; write the screenshot into the evidence dir `apps/web-shell/playwright/tests/playhead-clamp.spec.ts`

### Implementation for User Story 1

- [x] T015 [P][US1] VS Code host: capture the `hydrateStoreFromFeatures` return at `openPlot.ts:~180`; if a clamp is present, show a non-blocking `vscode.window.showWarningMessage`; keep the existing `catch (SystemStateLoadError) → showErrorMessage` for fatal cases (per-plot load — no coalescing needed, FR-006 dropped) `apps/vscode/src/commands/openPlot.ts`
- [x] T016 [P][US1] Web-shell host: capture the `hydrateStoreFromFeatures` return at both call sites (`App.tsx:591,677`); surface a non-blocking message by reusing the existing `logNotification` transient (App.tsx:276, auto-dismiss) — NOT the #259 error banner `apps/web-shell/src/App.tsx`
- [x] T017 [P][US1] Re-export `PlayheadClampDiagnostic` through the host bridge barrels so call sites can type the return `apps/vscode/src/services/systemStateBridge.ts` and `apps/web-shell/src/session-state-browser.ts`
- [x] T018 [US1] Run web-shell E2E tolerant scenario: `cd apps/web-shell && node run-playwright.mjs playhead-clamp`

**Checkpoint**: US1 fully functional — orphaned playheads open, clamp, and notify on every load; valid plots untouched; heal persists on save.

---

---

## Phase 4: User Story 2 — Incoherent window still fails fast (Priority: P1)

**Goal**: A plot whose temporal `SystemState` has `start_time > end_time` still fails to open with the existing structured `SystemStateLoadError(kind='cross-field-invariant')`. Tolerance never leaks into structurally-broken data. When both defects coexist, the incoherent-window failure takes precedence (no clamp attempted).

**Independent Test**: Load a fixture plot with `start_time > end_time` → load throws `SystemStateLoadError(kind='cross-field-invariant')` with the offending feature ID; plot does not open; no diagnostic emitted. A plot with both `start>end` AND out-of-window `current_time` → same hard fail, clamp path never reached (FR-005).

### Tests for User Story 2 ⚠️ (write first, must FAIL before implementation)

- [x] T019 [P][test][US2] `read.ts` guard tests: an incoherent-window (`start>end`) plot still THROWS `SystemStateLoadError(kind='cross-field-invariant')` and is NOT clamped/swallowed (FR-004); a feature with BOTH `start>end` AND out-of-window `current_time` throws before any clamp (precedence, FR-005/R-006) `services/session-state/src/system-state/__tests__/read.test.ts`

### Web-Shell E2E Tests for User Story 2 🖥️

- [x] T020 [US2] Extend the web-shell E2E spec — guard scenario: load an incoherent-window plot → the plot does NOT open, the structured error surface is shown; capture the blocked-state screenshot into the evidence dir `apps/web-shell/playwright/tests/playhead-clamp.spec.ts`

### Implementation for User Story 2

- [x] T021 [US2] Confirm both hosts still surface a fatal `SystemStateLoadError` as an error (VS Code `catch → showErrorMessage` unchanged; web-shell error path) — the clamp wiring (T015/T016) must only handle the returned clamps, never swallow a thrown fatal error `apps/vscode/src/commands/openPlot.ts` and `apps/web-shell/src/App.tsx`
- [x] T022 [US2] Run web-shell E2E guard scenario: `cd apps/web-shell && node run-playwright.mjs playhead-clamp`

**Checkpoint**: Both stories pass — tolerant recovery for orphaned playheads; hard fail preserved for incoherent windows.

---

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verify, capture evidence, write the feature post, and open the PR.

### Verification

- [x] T023 Run the full CI gate before evidence capture: `task verify` (ruff + pnpm lint, pyright + `pnpm -r typecheck`, pytest + vitest). All green required.
- [x] T024 Run quickstart.md validation steps end-to-end (unit, both-host parity, web-shell E2E tolerant + guard, round-trip heal, regression) `specs/267-tolerant-playhead-import/quickstart.md`

### Evidence Collection (REQUIRED)

- [x] T025 Capture test results using the template (`.specify/templates/evidence/test-summary-template.md`) — YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed/failed/skipped`, `coverage_pct`) + key scenarios verified `specs/267-tolerant-playhead-import/evidence/test-summary.md`
- [x] T026 [P] Record usage demonstration — before/after temporal SystemState JSON + the `checkTemporalCrossField` `recoverable-playhead` result + the emitted `PlayheadClampDiagnostic` + the save-time heal (re-open shows no clamp) `specs/267-tolerant-playhead-import/evidence/usage-example.md`
- [x] T027 [P] Write the integration flow narrative — load → `checkTemporalCrossField` (split severity) → `read.ts` clamp + diagnostic → `hydrateStoreFromFeatures` returns → non-blocking host notification → save-time heal `specs/267-tolerant-playhead-import/evidence/integration-flow.md`
- [x] T028 [P] Author the sequence diagram of the same flow (`validate.ts` / `read.ts` / `store-bridge.ts` / host / save) `specs/267-tolerant-playhead-import/evidence/sequence.mermaid`

### Web-Shell E2E Evidence Collection (REQUIRED) 🖥️

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — `apps/web-shell/run-playwright.mjs` auto-provisions the bundled Chromium. See `docs/project_notes/playwright-installation-research.md`.

- [x] T029 Run the web-shell E2E suite: `cd apps/web-shell && node run-playwright.mjs playhead-clamp`
- [x] T030 [P] Confirm the captured screenshots landed: tolerant toast + opened plot, and incoherent-window blocked state `specs/267-tolerant-playhead-import/evidence/screenshots/`
- [x] T031 [P] Document web-shell E2E results (tolerant + guard scenarios) `specs/267-tolerant-playhead-import/evidence/webview-e2e-summary.md`

### Media Content

- [x] T032 Create the feature blog post via the Content Specialist (`.claude/agents/media/content.md`) — title prefixed `Building `; copy the first three sections (What We're Building, How It Fits, Key Decisions) VERBATIM from `evidence/opening-context.md`; write Screenshots, By the Numbers, Lessons Learned, What's Next from the evidence `specs/267-tolerant-playhead-import/media/shipped-post.md`

### PR Creation

- [x] T033 Create PR and publish blog: run `/speckit.pr`

**Task T033 MUST run last — it depends on all evidence (T025–T031) and media (T032) tasks being complete. It updates the existing feature PR (#650) in debrief-future and publishes `shipped-post.md` to debrief.github.io.**

---

## Dependencies

### Phase Dependencies

- **Phase 1**: T001 (confirm 261 surfaces — quick, 261 merged) → T002 fixtures.
- **Phase 2 (Foundational)**: Depends on T001. Blocks both stories. Within it: T003 (type) → T004 (validate test) → T005 (validate impl) → T006 (read test) → T007 (read impl) → T008 (bridge return); T009/T010 (re-exports) follow once the type exists.
- **Phase 3 (US1)** and **Phase 4 (US2)**: Both depend on Phase 2 (the core clamp lands in T005/T007/T008). US1 is host wiring + E2E + integration tests; US2 is the guard tests + guard E2E. Independently testable; staffable in parallel after Phase 2.
- **Phase 5 (Polish)**: Depends on US1 + US2 complete. T033 (`/speckit.pr`) is strictly last.

### Story Dependencies

- **US1 (tolerant path)**: Depends on Phase 2. Host notification wiring (T015 VS Code / T016 web-shell), type re-export through host barrels (T017), E2E (T014/T018).
- **US2 (guard rail)**: Depends on Phase 2 (T005/T007 preserve the `start>end` throw). No dependency on US1 — verifiable on its own.

### Within Each Story

- Test tasks (`[test]`) are written first and MUST fail before their implementation task.
- Phase 2 is sequential through one dependency chain (`validate.ts` → `read.ts` → `store-bridge.ts`).
- Same-file tasks are sequential, never `[P]` across phases: `read.test.ts` (T006 in P2, T019 in P4); `playhead-clamp.spec.ts` (T014 in P3, T020 in P4); `openPlot.ts`/`App.tsx` (T015/T016 in P3, confirmed in T021 P4). Cross-phase same-file edits are safe because phases are sequential.

### Parallel Opportunities

- T002 (fixtures) is `[P]` after T001.
- Foundation re-exports T009 / T010 are `[P]` (distinct barrels) once T003 lands.
- US1: integration tests T011 / T012 are `[P]` (distinct files); host renderers T015 (VS Code) / T016 (web-shell) / T017 (barrels) are `[P]` (distinct files).
- Evidence: T026 / T027 / T028 are `[P]`; T030 / T031 are `[P]`.
- After Phase 2, US1 and US2 can be developed in parallel by different contributors.

---

## Implementation Strategy

### Incremental Delivery

1. **Confirm (T001)** — 261 is merged; verify the surfaces match (quick).
2. **Foundation (Phase 2)** — the diagnostic type, the `checkTemporalCrossField` severity split, the `read.ts` clamp + explicit `{ map, playheadClamps }` return, the `hydrateStoreFromFeatures` return, the re-exports. Unit-green before any story.
3. **US1 (tolerant path)** — wire the host notifications + E2E. Ship → orphaned playheads open, clamp, notify (every load until healed), heal on save.
4. **US2 (guard rail)** — verify the incoherent-window hard fail survives end-to-end. Keeps the relaxation honest (the XIV.4 exception's justification).
5. **Polish** — `task verify`, evidence + screenshots, feature post from the cached opener, update PR #650 via `/speckit.pr`.

### Notes

- `[P]` = different files, no dependencies. `[Story]` (US1/US2) maps tasks for traceability.
- **Behavioural amendment** to spec-261 (merged) — no LinkML/schema change, no new dependency, **no provenance write** (261 FR-013). The schema-adherence suite must pass unchanged (SC-006).
- Commit after each task or logical group. Run `task verify` before pushing (CLAUDE.md "Before Pushing").
- The single most important invariant across both stories: **the clamp is never silent** (Article I.3 — repeating notification) and **never leaks into `start>end`** (the guard rail).
- Total: 33 tasks (T001–T033). PR #650 already exists for this branch — T033 updates it.
