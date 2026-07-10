---
description: "Task list for Copilot Chat drives Debrief (spike)"
---

# Tasks: Copilot Chat Drives Debrief — STAC Retrieval + Python Tool Plot Editing (Spike)

**Input**: Design documents from `/specs/284-copilot-plot-editing/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included — the spec mandates automated tool-adapter tests with mocked LM invocations (FR-021).

**Organization**: Grouped by user story (US1 search/open, US2 edit, US3 summary, US4 selection) so each is an independently testable increment. All new code lives in `apps/vscode/src/copilot/`; the four reused services are untouched.

---

## Evidence Requirements

> **Purpose**: The spike's product is a findings report + evidenced demo, not shipped code. Copilot Chat **cannot** be driven by Playwright, so end-to-end evidence is manually captured chat transcripts; automated coverage stops at the mocked tool layer (spec FR-021, plan "Web-Shell E2E Testing").

**Evidence Directory**: `specs/284-copilot-plot-editing/evidence/`
**Media Directory**: `specs/284-copilot-plot-editing/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `test-summary.md` | vitest results for the tool adapters (mocked LM invocations) | After tests pass |
| `usage-example.md` | Annotated walkthrough of a chat turn → confirmed edit | After US2 works |
| `screenshots/scenario-*.png` (+ optional `.gif`) | Manual Copilot Chat transcripts for the 5 happy-path + 3 fail-safe scenarios (quickstart.md) | Manual live-demo run |
| `telemetry.jsonl` | Per-invocation log from the demo runs; validated against `contracts/telemetry-record.schema.json` | After demo run |
| `token-budget.md` | Measured summary token sizes vs. ≥2 local-model context windows (FR-025) | After demo run |
| `findings-report.md` | The primary deliverable — what worked/blocked, tool-call quality per model, priming A/B, transferability to the offline NL panel (FR-020, SC-008) | After demo runs |
| `opening-context.md` | Cached opener (mermaid Hook) | During /speckit.plan ✅ |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener (first three post sections) | During /speckit.plan ✅ |
| `media/shipped-post.md` | Feature post = cached opener + ship-time evidence | Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Purpose**: Create the isolated `src/copilot/` folder and declare the LM tool surface so Copilot can discover it.

- [ ] T001 Create the Copilot folder and a barrel entry `apps/vscode/src/copilot/index.ts` (exports `registerLmTools`)
- [ ] T002 Bump `engines.vscode` from `^1.85.0` to `^1.99.0` in `apps/vscode/package.json` (agent-mode tool integration landed in 1.99 — research R1)
- [ ] T003 Add the four `contributes.languageModelTools` entries (`debrief_searchPlots`, `debrief_summarizeCurrentPlot`, `debrief_listTools`, `debrief_runTool`) with `displayName`/`modelDescription`/`inputSchema`/`tags`/`canBeReferencedInPrompt` per `contracts/lm-tools.md` in `apps/vscode/package.json`

**Checkpoint**: `#debrief_*` tools appear in Copilot agent mode (may 404 until registered in Phase 2).

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared plumbing every LM tool needs — boundary types, plot/selection resolution, telemetry, and the registration entry point. **No user story can start until this is done.**

**⚠️ CRITICAL**: Blocks Phases 3–6.

- [ ] T004 [P] Define LM-tool boundary types (`SearchPlotsInput`, `SummarizeCurrentPlotInput`, `ListToolsInput`, `RunToolInput`, `PlotMatch`, `PlotSummary`, `FeatureInventoryEntry`, `ToolRegistryView`, `ChatEditOutcome`, `TelemetryRecord`) per `data-model.md`, deriving from `@debrief/schemas`/service types with `Pick`/`Omit` (Article IV.5), in `apps/vscode/src/copilot/types.ts`
- [ ] T005 [P] Implement per-invocation telemetry writer (JSONL append, host-stamped time, fields per `contracts/telemetry-record.schema.json`) reusing the #191 structured-logging pattern from `apps/vscode/src/services/llmProxy.ts`, in `apps/vscode/src/copilot/telemetry.ts`
- [ ] T006 [US4] Implement plot + selection resolution (active panel via `getMapPanel()`; explicit `plotId` override matched against `openPlotsService.getOpenPlots()`; synchronous selection read via `toolMatchAdapter.getSelectedFeatureIds()`; `panel.getFeatures()`) in `apps/vscode/src/copilot/plotContext.ts` (depends on T004)
- [ ] T007 Implement the `registerLmTools(context, deps)` wiring that calls `vscode.lm.registerTool` for all four tools and pushes disposables (deps = calcService, stacService, resultsPanelService, openPlotsService, toolMatchAdapter, getMapPanel, telemetry) in `apps/vscode/src/copilot/registerLmTools.ts` (depends on T004)
- [ ] T008 Call `registerLmTools(...)` during extension activation in `apps/vscode/src/extension.ts` (wire existing service singletons; no new services)
- [ ] T009 [P] [test] Add a mocked-LM test harness (fake `LanguageModelToolInvocationOptions`, `CancellationToken`, and stub service deps) in `apps/vscode/src/__tests__/copilot/harness.ts`

**Checkpoint**: Tools register and resolve the current plot/selection; adapters can be unit-tested in isolation.

## Phase 3: User Story 1 — Find and open a plot from STAC (Priority: P1)

**Goal**: An analyst asks Copilot to find/open a plot; the local STAC catalog is searched by free-text / time / platform / bbox and the chosen plot opens in the Debrief editor.

**Independent Test**: With the sample catalog and no plot open, ask for matches by each criterion; verify correct matches are reported and the selected plot opens (quickstart scenario 1).

### Tests for User Story 1 ⚠️ (write first, ensure they fail)

- [ ] T010 [P] [US1] [test] Unit-test the 4-criteria filter (free-text substring, time-interval overlap, platform membership, bbox intersection, AND-combination, no-match message) over a fixture item set in `apps/vscode/src/__tests__/copilot/searchCatalog.test.ts`
- [ ] T011 [P] [US1] [test] Test `debrief_searchPlots.invoke` delegates to the filter, returns `PlotMatch[]`, and opens via `debrief.openPlot` when `open:true` and single match (mocked command) in `apps/vscode/src/__tests__/copilot/searchPlotsTool.test.ts`

### Implementation for User Story 1

- [ ] T012 [US1] Implement the client-side catalog search (4-criteria filter over `stacService.listItems()`; map items → `PlotMatch`; platform data from collection summaries) in `apps/vscode/src/copilot/searchCatalog.ts` (depends on T004)
- [ ] T013 [US1] Implement the `debrief_searchPlots` LM tool (read — no confirmation): validate input, run search, format `PlotMatch[]` as the tool result, and invoke `debrief.openPlot` on a single-match `open:true`; write a telemetry record; in `apps/vscode/src/copilot/searchPlotsTool.ts` (depends on T012, T005)
- [ ] T014 [US1] Handle the empty-result and empty-catalog cases with a structured "no matches, criteria applied: …" result (no hallucinated plots — US1 AC-3) in `apps/vscode/src/copilot/searchPlotsTool.ts`

**Checkpoint**: US1 fully functional — search + open works for all four criteria.

## Phase 4: User Story 2 — Edit the current plot via a Python tool (Priority: P1)

**Goal**: Copilot discovers the applicable Debrief tool, proposes the call, and after a plain-language confirmation the Python tool runs against the open plot's live features — applied as a dirty, undoable edit, never written to disk from chat. Analytical tools return a chat summary + populate the Results panel.

**Independent Test**: Open a sample plot, issue a styling command and a speed-filter, confirm each; verify features change in the editor, the doc is dirty, a single revert undoes the edit, and nothing hit disk before an explicit Save (quickstart scenarios 3–4).

### Tests for User Story 2 ⚠️ (write first, ensure they fail)

- [ ] T015 [P] [US2] [test] Test `debrief_listTools.invoke` returns the live registry projected to `ToolRegistryView[]` (mutating flag derived from `resultType` `mutation/` prefix) and reports the degraded state when the registry is unavailable, in `apps/vscode/src/__tests__/copilot/listToolsTool.test.ts`
- [ ] T016 [P] [US2] [test] Test `debrief_runTool.prepareInvocation`: mutating toolId yields `confirmationMessages` with plain-language body (tool, plot, features, params — never raw JSON); analytical toolId yields none, in `apps/vscode/src/__tests__/copilot/runTool.prepare.test.ts`
- [ ] T017 [P] [US2] [test] Test `debrief_runTool.invoke`: (a) invalid toolId/params rejected pre-dispatch with a corrective result and **no** `calcService.executeTool` call (FR-017); (b) mutation applies via `mapPanel.updatePlotFeatures` with **no** `stacService.writeGeoJson` call (FR-011); (c) analytical result routes to `resultsPanelService.addDatasetsForToolResult`; (d) failure routes to `addErrorTab` + structured error; (e) decline applies nothing (FR-016), in `apps/vscode/src/__tests__/copilot/runTool.invoke.test.ts`

### Implementation for User Story 2

- [ ] T018 [US2] Implement `debrief_listTools` (read): delegate to `calcService.listTools()`, project to `ToolRegistryView[]` (id, name, description, params schema, category, `mutating`, applicability), degraded-state result when unavailable; telemetry; in `apps/vscode/src/copilot/listToolsTool.ts` (depends on T005)
- [ ] T019 [US2] Implement the dirty-only edit applier: `mapPanel.updatePlotFeatures(layer)` + mark session dirty via `sessionManager`, **omitting** the Tools-panel path's immediate `writeGeoJson` (research R5 / FR-011), in `apps/vscode/src/copilot/applyChatEdit.ts` (depends on T004)
- [ ] T020 [US2] Implement `debrief_runTool.prepareInvocation`: resolve tool from live registry; for mutating tools build the plain-language `confirmationMessages`; analytical tools omit them; set `invocationMessage`; in `apps/vscode/src/copilot/runToolTool.ts` (depends on T018, T006)
- [ ] T021 [US2] Implement `debrief_runTool.invoke` core: validate toolId/params against the registry schema (corrective result, no spawn, on failure — FR-017); resolve plot + operating features (scope); call `calcService.executeTool(...)` under a cancellation-aware wrapper; in `apps/vscode/src/copilot/runToolTool.ts` (depends on T006, T019)
- [ ] T022 [US2] Wire result routing in `invoke`: mutation → `applyChatEdit`; analytical/dataset → `resultsPanelService.addDatasetsForToolResult`; failure → `resultsPanelService.addErrorTab` + structured error text (FR-014/FR-018), in `apps/vscode/src/copilot/runToolTool.ts` (depends on T021)
- [ ] T023 [US2] Record provenance via `LogService.recordToolResult(...)` **plus** the chat-initiator flag and the analyst's `utterance` (metadata field, no schema change — research R7 / FR-023), in `apps/vscode/src/copilot/runToolTool.ts`
- [ ] T024 [US2] Append the run's `TelemetryRecord` (validation outcome, confirmation outcome, per-stage latency, retries) in `apps/vscode/src/copilot/runToolTool.ts` (depends on T005)
- [ ] T025 [US2] Enforce the guard: a mutating result reaching `invoke` without a prior confirmation MUST throw (data-model validation rule), in `apps/vscode/src/copilot/runToolTool.ts`

**Checkpoint**: US2 fully functional — chat-driven edits and analytical runs work, gated and dirty-only.

## Phase 5: User Story 3 — Ask questions about the current plot (Priority: P2)

**Goal**: With a plot open, the analyst asks about its contents; Copilot calls the summary tool and answers from a thinned, token-bounded feature inventory. The summary also reports its own token size (probe) and lists open plots (override discovery).

**Independent Test**: Open a sample plot, ask content questions, verify answers match the actual features; confirm `approxTokens` and `openPlots` are present, and "no plot open" is handled cleanly (quickstart scenario 2).

### Tests for User Story 3 ⚠️ (write first, ensure they fail)

- [ ] T026 [P] [US3] [test] Test the summariser: thinned inventory (no geometry), size cap → `truncated:true`, `approxTokens` populated, over a fixture plot, in `apps/vscode/src/__tests__/copilot/summarize.test.ts`
- [ ] T027 [P] [US3] [test] Test `debrief_summarizeCurrentPlot.invoke`: active-plot default vs explicit `plotId`; `openPlots` list present; no-plot-open → `{noPlotOpen:true}` (US3 AC-3), in `apps/vscode/src/__tests__/copilot/summarizeTool.test.ts`

### Implementation for User Story 3

- [ ] T028 [US3] Implement the thinned summary builder (metadata + `FeatureInventoryEntry[]`, no geometry; size-bounded with `truncated` flag; approximate token count via a char/word heuristic — no tokenizer dep — FR-025) in `apps/vscode/src/copilot/summarize.ts` (depends on T004, T006)
- [ ] T029 [US3] Implement `debrief_summarizeCurrentPlot` (read): resolve plot (active/explicit), build summary, attach `openPlots` from `openPlotsService`, handle no-plot-open; telemetry; in `apps/vscode/src/copilot/summarizeCurrentPlotTool.ts` (depends on T028, T005)

**Checkpoint**: US3 fully functional — plot Q&A grounded, token probe emitting.

## Phase 6: User Story 4 — Act on the current selection (Priority: P3)

**Goal**: "run X on the selection" / "summarise the selection" resolves to the analyst's actual selected features; an empty selection is reported, not guessed.

**Independent Test**: Select features on the map, issue a selection-scoped command, verify the tool receives exactly the selected features; with nothing selected, verify the "nothing selected" reply (quickstart scenario 5).

> Selection *reading* lives in `plotContext` (T006, foundation). This phase wires `scope: 'selection'` through the run + summary tools and covers the empty-selection path.

### Tests for User Story 4 ⚠️ (write first, ensure they fail)

- [ ] T030 [P] [US4] [test] Test `scope:'selection'` passes exactly the selected feature ids to `calcService.executeTool`, and empty selection returns the "nothing selected" result (US4 AC-1/AC-2), in `apps/vscode/src/__tests__/copilot/selectionScope.test.ts`

### Implementation for User Story 4

- [ ] T031 [US4] Wire `scope` resolution in `debrief_runTool.invoke` (default `'selection'` when a selection exists else `'all'`; empty selection on an explicit selection-scope → structured "nothing selected") in `apps/vscode/src/copilot/runToolTool.ts` (depends on T021, T006)
- [ ] T032 [US4] Support selection-scoped summaries in `debrief_summarizeCurrentPlot` (summarise only selected features when asked) in `apps/vscode/src/copilot/summarizeCurrentPlotTool.ts` (depends on T029, T006)

**Checkpoint**: All four user stories independently functional.

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Domain priming, run the demo, capture evidence + findings, write the post, open the PR.

### Cross-cutting

- [ ] T033 [P] Author the domain-priming instructions file (Debrief vocabulary: plot, track, platform, selection; tool-usage conventions) in `apps/vscode/.github/copilot-instructions.md` (FR-027)
- [ ] T034 Run the full CI gate locally (`task verify` — ruff/pyright/eslint/tsc/vitest); ensure the new strict TS passes with no `any`
- [ ] T035 Run `quickstart.md` verification (tool discovery + all 8 scenarios) in a live VS Code 1.99+ Copilot session

### Demo runs (manual — Copilot Chat is not Playwright-drivable)

- [ ] T036 Execute the 5 happy-path scenarios (open / summarise / style edit / selection filter / selection summary) under model A; capture transcript screenshots (+ optional GIF) to `specs/284-copilot-plot-editing/evidence/screenshots/`
- [ ] T037 Execute the 3 fail-safe scenarios (no plot open, ambiguous track, invented tool id) — verify each fails safely with the plot untouched; capture to `evidence/screenshots/` (FR-028)
- [ ] T038 Re-run the happy-path scenarios under model B and with the priming file toggled off, annotating `activeModel`/`primingEnabled` (FR-026/FR-027)

### Evidence Collection (REQUIRED)

- [ ] T039 Capture test summary using template (`.specify/templates/evidence/test-summary-template.md`) in `specs/284-copilot-plot-editing/evidence/test-summary.md`
- [ ] T040 [P] Record usage demonstration (chat turn → confirmed edit, with the dirty/undo/no-disk-write note) in `specs/284-copilot-plot-editing/evidence/usage-example.md`
- [ ] T041 [P] Collect + validate the invocation telemetry against `contracts/telemetry-record.schema.json` in `specs/284-copilot-plot-editing/evidence/telemetry.jsonl`
- [ ] T042 [P] Tabulate measured summary token sizes vs. ≥2 local-model context windows in `specs/284-copilot-plot-editing/evidence/token-budget.md` (FR-025 / SC-007)
- [ ] T043 Write the findings report — what worked/blocked, tool-call quality per model from telemetry, priming A/B difference, confirmation-UX, undo-granularity finding (research R5), transferability to the offline NL panel — answering SC-008's six questions, in `specs/284-copilot-plot-editing/evidence/findings-report.md` (FR-020)

### Media Content

- [ ] T044 Create feature blog post in `specs/284-copilot-plot-editing/media/shipped-post.md` (Content Specialist; first three sections copied verbatim from `evidence/opening-context.md`; remaining sections from evidence — the mermaid Hook opens it)

### PR Creation

- [ ] T045 Create PR and publish blog: run `/speckit.pr`

**Task T045 must run last — it depends on all evidence, findings, and media tasks being complete.**

## Dependencies

### Phase order

- **Setup (P1)** → no deps.
- **Foundational (P2)** → after Setup; **blocks all user stories**.
- **User stories (P3–P6)** → after Foundational. US1, US3 are largely independent; US2 depends on the foundation's plot/selection resolution; US4 wires `scope` into US2/US3 tools (so US4 follows US2 and US3 in practice, though its selection *read* is already in T006).
- **Polish (P7)** → after the user stories that will be demoed are complete.

### Story completion order (recommended)

Foundational → **US1 (P1)** → **US2 (P1)** → **US3 (P2)** → **US4 (P3)** → Polish.

Both P1 stories are the demo core; do them first. US4 is thin (two wiring tasks) and depends on US2/US3 existing.

### Within a story

Tests (write first, fail) → implementation → checkpoint. Provenance/telemetry come after the happy path in US2.

### Parallel opportunities

- Foundation: T004, T005, T009 are `[P]` (distinct files); T006/T007 depend on T004.
- All `[test]` tasks within a story are `[P]` (distinct test files) and precede that story's implementation.
- Across stories after Foundation: US1 and US3 can proceed in parallel; US2 shares `runToolTool.ts` so its tasks are largely sequential.
- Polish evidence tasks T040/T041/T042 are `[P]`; the findings report (T043) consumes them.

## Implementation Strategy

### Incremental delivery

1. Setup + Foundation → tools register and can be unit-tested.
2. **US1** → search + open works end-to-end (the first "Copilot drives Debrief" moment).
3. **US2** → the core hypothesis: chat-driven, confirmed, dirty-only edits. This is the demo centrepiece.
4. **US3** → grounded plot Q&A + the token probe.
5. **US4** → selection scoping (thin).
6. Polish → priming file, live demo runs (2 models × priming A/B), evidence, findings report, post, PR.

Each story adds value without breaking the previous. A useful MVP checkpoint is after US2: search + edit is a complete, demoable story on its own; US3/US4 deepen it.

### Spike discipline

- All new code stays inside `apps/vscode/src/copilot/` (+ `package.json` contribution, one activation call, one `.github/copilot-instructions.md`) so the experiment is trivially removable. The four reused services are **not** modified. Python services are **not** touched.
- The findings report (T043) is the primary deliverable — treat the code as the means, the learning as the product.
- If the session model does not give a clean single-step revert of a chat edit (research R5), that is a **reported finding**, not new undo infrastructure to build here.

### Notes

- `[P]` = different files, no dependency. `[US#]` maps a task to its story. `[test]` tasks are written to fail first.
- Commit after each task or logical group; run `task verify` before pushing (CLAUDE.md "Before Pushing").
- No Storybook/web-shell Playwright tasks: no shared component changes, and Copilot Chat can't be headless-driven — demo evidence is manual (spec FR-021).
