# Tasks: Tabular Results Panel — VS Code Extension Integration

**Input**: Design documents from `/specs/178-vscode-tabular-results/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (results-panel-service.md, webview-messages.md, log-service-extension.md), quickstart.md

**Tests**: Tests are REQUIRED for this feature — vitest unit tests for new services + Playwright VS Code webview E2E for each user story (per plan.md "Testing" and "VS Code Webview E2E Testing" sections).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

**Evidence Directory**: `specs/178-vscode-tabular-results/evidence/`
**Media Directory**: `specs/178-vscode-tabular-results/media/`

This feature is **Integration** (host wiring + new VS Code webview consuming an unchanged shared `ChartPanelWrapper`). Evidence focuses on end-to-end VS Code workflow proof, not new visual components (none introduced — see plan.md "Media Components").

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | vitest + Playwright results using template, with YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed/failed/skipped`, `coverage_pct`) | After full test suite passes |
| `evidence/usage-example.md` | Step-by-step VS Code workflow: import REP → run track-stats → save → reveal → reopen | After US1+US2+US4 work |
| `evidence/integration-flow.md` | End-to-end sequence: tool run → ResultsPanelService → webview → save → STAC asset → FileSavedEvent → AssociatedFiles dropdown | After US2 implementation |
| `evidence/sequence.mermaid` | Mermaid sequence diagram of the save flow (covering R5 host-as-source-of-truth and R7 provenance link) | After US2 implementation |
| `evidence/screenshots/results-panel-table.png` | VS Code window showing Results panel with track-stats table tab (captured from real Playwright run) | After US1 E2E green |
| `evidence/screenshots/results-panel-charts.png` | VS Code window showing Results panel with two range-bearing chart tabs | After US1 E2E green |
| `evidence/screenshots/save-flow.png` | Saved tab + Associated Files dropdown showing the new CSV under "Results" | After US2+US3 E2E green |
| `evidence/screenshots/error-retry.png` | Error tab with Retry button | After US5 E2E green |
| `evidence/screenshots/interaction.gif` | < 5s GIF of: run tool → tab appears → click Save → toast → unsaved dot clears | After Playwright video → GIF |
| `evidence/sample-csv.csv` | A representative `track-stats--<date>.csv` produced by the save flow | After US2 implementation |
| `evidence/log-entry-sample.json` | The `FileSavedEvent` LogEntry produced by `recordFileSaved` (proves R7 sentinel + PROV link) | After US2 implementation |
| `evidence/round-trip-evidence.md` | Demonstrates `buildCsvContent → parseCsvToTableDataset` round-trip on the sample CSV (FR-015 / R3) | After US4 implementation |
| `evidence/webview-e2e-summary.md` | Playwright `tests/e2e/test-tabular-results-*.spec.ts` results with passed/failed counts | After E2E suite green |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | Planning post (already drafted during /speckit.plan) | (existing) |
| `media/linkedin-planning.md` | LinkedIn planning summary (already drafted during /speckit.plan) | (existing) |
| `media/shipped-post.md` | Shipped blog post celebrating completion | Polish phase |
| `media/linkedin-shipped.md` | LinkedIn shipped summary (150–200 words) | Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence + media | Final task in Polish phase |
| Blog PR | PR in debrief.github.io publishing shipped-post.md | Triggered by `/speckit.pr` |

---

## Format: `[ID] [P?] [Story] Description`

- **[P]** — Can run in parallel (different files, no dependencies)
- **[Story]** — Which user story this task belongs to (US1–US5, or FOUNDATION/POLISH)
- **[test]** — Test task (write before implementation per plan.md "Testing")
- File paths are absolute within the repo and shown in backticks

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Wire the new webview entry into the existing esbuild bundling pipeline (R2) and register the new VS Code view container in `package.json`. No new packages — this feature lives entirely in `apps/vscode`, `shared/utils`, and `services/session-state`.

- [x] T001 [P] Add `resultsPanel` entry to the esbuild webview build inputs `apps/vscode/esbuild.webview.config.js`
- [x] T002 [P] Register new view container `debrief.results` and view `debrief.resultsPanel` under `contributes.viewsContainers.panel` and `contributes.views` in `apps/vscode/package.json`
- [x] T003 [P] Add results-panel CSP nonce template (reuse existing `getNonce()` helper, no new file) — verify by reading `apps/vscode/src/views/activityPanelView.ts` for the existing CSP pattern

**Checkpoint**: Build passes (`pnpm --filter @debrief/vscode build`); the empty Results view container is visible in the VS Code panel area but renders nothing yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared utilities, log-service extension, and message-protocol types that ALL user stories depend on. Nothing in Phase 3+ can start until this phase is green.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Shared utility — synthesizer extraction (R6)

- [x] T004 [P] [FOUNDATION][test] Write unit tests for `synthesizeTableDataset` (table-from-statistics happy path, missing statistics returns null, multi-row arrays) `shared/utils/src/datasetSynthesis.test.ts`
- [x] T005 [FOUNDATION] Implement `synthesizeTableDataset(toolId, properties, sourceLabel): DatasetEnvelope | null` extracted from `apps/web-shell/src/mocks/calcService.ts:478-504` `shared/utils/src/datasetSynthesis.ts`
- [x] T006 [FOUNDATION] Export `synthesizeTableDataset` from the package barrel `shared/utils/src/index.ts`
- [x] T007 [FOUNDATION] Refactor web-shell mock to consume the shared export (no behaviour change — NFR-1 / FR-025 / SC-006) `apps/web-shell/src/mocks/calcService.ts`

### Shared utility — CSV round-trip parser (R3)

- [x] T008 [P] [FOUNDATION][test] Write round-trip tests for `parseCsvToTableDataset` (header-only, quoted strings with commas/newlines, build → parse identity, malformed input throws) `shared/utils/src/csv.test.ts`
- [x] T009 [FOUNDATION] Implement `parseCsvToTableDataset(csv: string, title: string): DatasetEnvelope` (RFC-4180 subset, < 100 LOC, inverse of `buildCsvContent`) `shared/utils/src/csv.ts`
- [x] T010 [FOUNDATION] Export `parseCsvToTableDataset` from the package barrel `shared/utils/src/index.ts`

### LogService extension — `recordFileSaved` (R7)

- [x] T011 [P] [FOUNDATION][test] Write unit tests for `recordFileSaved` covering: happy path links to ToolRunEvent, throws when `parentActivityId` missing, throws when filename does not start with `assets/`, sentinel `was_generated_by.tool === 'debrief.fileSave'`, `used[0]` equals parent id `services/session-state/src/log/logService.test.ts`
- [x] T012 [FOUNDATION] Add `FILE_SAVE_TOOL_SENTINEL = 'debrief.fileSave'` constant and `recordFileSaved` method signature to interface `services/session-state/src/log/types.ts`
- [x] T013 [FOUNDATION] Implement `recordFileSaved` in `services/session-state/src/log/logService.ts` — appends LogEntry via existing persistence path with sentinel tool, `used: [parentActivityId]`, `generated: [filename]` (per `contracts/log-service-extension.md`)

### Message protocol types

- [x] T014 [P] [FOUNDATION][test] Add discriminated-union round-trip tests for the new `results:*` message types `apps/vscode/src/webview/messages.test.ts`
- [x] T015 [FOUNDATION] Add `results:setTabs`, `results:setVisibility`, `results:setLoading`, `results:webviewReady`, `results:save`, `results:saveAs`, `results:retry`, `results:closeTab` to the discriminated union (per `contracts/webview-messages.md`) `apps/vscode/src/webview/messages.ts`

### StacService — delete asset capability (FR-018)

- [x] T016 [P] [FOUNDATION][test] Write unit test for `deleteResultAsset(storePath, itemPath, filename)` (asset removed from STAC item, file removed from disk) `apps/vscode/src/services/stacService.test.ts`
- [x] T017 [FOUNDATION] Add `deleteResultAsset` to `apps/vscode/src/services/stacService.ts` if not already present (FR-018 backing for US4 Delete action)

**Checkpoint**: Foundation ready — all shared utilities, log methods, message types, and STAC delete are tested and merged. User story implementation can now begin in parallel.

---

## Phase 3: User Story 1 — View tool results in a tabular panel (Priority: P1)

**Goal**: A new Results panel appears beneath the editor when a `debrief-calc` tool returns datasets. Tabs render via the unchanged shared `ChartPanelWrapper`. Empty until first result; tab close + tab switch work; unsaved indicator shows on every new tab.

**Independent Test**: Run `track-stats` against a selected track and verify a Results panel appears in the VS Code panel area with one table tab. Run `range-bearing` with two tracks and verify two chart tabs (Range, Bearing) render. Each new tab has the unsaved-dot indicator. Closing a tab removes it; closing the last hides the panel again.

### Unit tests for User Story 1 ⚠️

> Write these tests FIRST, ensure they FAIL before implementation.

- [x] T018 [P] [US1][test] Vitest: `addDatasetsForToolResult` adds one tab per `__datasets` envelope (FR-002) `apps/vscode/src/services/resultsPanelService.test.ts`
- [x] T019 [P] [US1][test] Vitest: `addDatasetsForToolResult` synthesises a single table tab from `properties.statistics` when `__datasets` is absent (FR-003) `apps/vscode/src/services/resultsPanelService.test.ts`
- [x] T020 [P] [US1][test] Vitest: First tab triggers `results:setVisibility { visible: true }`; subsequent adds do not (FR-004) `apps/vscode/src/services/resultsPanelService.test.ts`
- [x] T021 [P] [US1][test] Vitest: `handleCloseTab` removes the tab and emits `results:setVisibility { visible: false }` when last tab closes (FR-006) `apps/vscode/src/services/resultsPanelService.test.ts`
- [x] T022 [P] [US1][test] Vitest: New tabs default to `state.kind === 'unsaved'` so the dot indicator is on (FR-007) `apps/vscode/src/services/resultsPanelService.test.ts`

### VS Code Webview E2E tests for User Story 1 🖥️

> ⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS — Do NOT skip or omit these. The project uses `@sparticuz/chromium` which bundles a Linux Chromium binary via npm. Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

- [ ] T023 [P] [US1][test] Add `ResultsPanelPage` page object with selectors for tab list, active tab, table cells, chart canvases, unsaved dot `tests/e2e/models/resultsPanelPage.ts`
- [ ] T024 [P] [US1][test] Extend webview injector with `getResultsPanelFrame()` helper `tests/e2e/helpers/webview-injector.ts`
- [ ] T025 [US1][test] Playwright spec: import REP, select track, run track-stats, assert table tab appears with unsaved dot; run range-bearing, assert two chart tabs (Range, Bearing); close one tab, assert removal; close last, assert panel hidden `tests/e2e/test-tabular-results-display.spec.ts`

### Implementation for User Story 1

- [x] T026 [US1] Define `ResultTab` and `PlotKey` types per data-model.md `apps/vscode/src/services/resultsPanelService.ts`
- [x] T027 [US1] Implement `ResultsPanelService` constructor wiring deps (`stacService`, `logService`, `calcService`, `panelView`, `activityPanelView`, `sessionManager`) and in-memory `_tabs: ResultTab[]` + `_panelVisible: boolean` `apps/vscode/src/services/resultsPanelService.ts`
- [x] T028 [US1] Implement `addDatasetsForToolResult` per `contracts/results-panel-service.md` pseudo-code (extract `__datasets`, fall back to `synthesizeTableDataset`, push tabs, emit `results:setVisibility` on first, emit `results:setTabs`) `apps/vscode/src/services/resultsPanelService.ts`
- [x] T029 [US1] Implement `handleCloseTab` (remove tab, hide panel when empty, emit `results:setTabs`) `apps/vscode/src/services/resultsPanelService.ts`
- [x] T030 [US1] Implement private `_toChartTabData()` mapper from `ResultTab[]` → `ChartTabData[]` (preserves `isLoading`, `isSaved`, `errorMessage`) `apps/vscode/src/services/resultsPanelService.ts`
- [x] T031 [US1] Implement `ResultsPanelViewProvider` (WebviewViewProvider) — bundles `dist/webview/resultsPanel.js`, applies CSP nonce, forwards messages to `ResultsPanelService`, replays state on `results:webviewReady` `apps/vscode/src/views/resultsPanelView.ts`
- [x] T032 [US1] Implement React entry that renders `<PanelContext.Provider><ChartPanelWrapper/></PanelContext.Provider>` and translates host messages into `ChartContextProps` `apps/vscode/src/webview/web/resultsPanel.tsx`
- [x] T033 [US1] Wire `executeTool.ts` to call `resultsPanelService.addDatasetsForToolResult({ plotKey, toolId, result, sourceFeatureIds, parameters, parentActivityId })` after successful runs `apps/vscode/src/commands/executeTool.ts`
- [x] T034 [US1] Instantiate `ResultsPanelService` and `ResultsPanelViewProvider` in `activate()` and register the provider with `vscode.window.registerWebviewViewProvider('debrief.resultsPanel', ...)` `apps/vscode/src/extension.ts`

**Checkpoint**: User Story 1 fully functional — running a tool from the toolbar makes the Results panel appear with a tab; tabs render table or charts; close + switch work. Run T025 Playwright spec to verify.

---

## Phase 4: User Story 2 — Save results as CSV with provenance (Priority: P1)

**Goal**: Save and Save As actions on a result tab persist a CSV to the plot's `assets/` directory, register it as a STAC asset, and append a `FileSavedEvent` to the analysis log linked to the originating ToolRunEvent. Failed saves leave no partial state. Saved tabs lose their unsaved dot and have Save disabled.

**Independent Test**: Click Save on a track-stats tab → assert (a) CSV exists at `<plot>/assets/track-stats--<date>.csv`, (b) STAC item lists the asset, (c) analysis log contains a `FileSavedEvent` with `was_generated_by.tool === 'debrief.fileSave'` and `used[0]` equal to the ToolRunEvent's `activity_id`, (d) tab is in `saved` state. Click Save As, fill base name, submit → assert filename uses sanitised input.

### Unit tests for User Story 2 ⚠️

- [x] T035 [P] [US2][test] Vitest: `handleSave` writes CSV via `vscode.workspace.fs.writeFile`, calls `stacService.addResultAsset`, calls `logService.recordFileSaved`, transitions tab to `saved`, emits `results:setTabs` (FR-009, FR-012) `apps/vscode/src/services/resultsPanelService.test.ts`
- [x] T036 [P] [US2][test] Vitest: `handleSave` STAC failure path deletes the file from disk and sets tab to `error` state (FR-011) `apps/vscode/src/services/resultsPanelService.test.ts`
- [x] T037 [P] [US2][test] Vitest: `handleSave` write failure leaves no STAC entry and no log entry (FR-011) `apps/vscode/src/services/resultsPanelService.test.ts`
- [x] T038 [P] [US2][test] Vitest: `handleSaveAs` re-sanitises `baseName` and `tag`, then delegates to the same save sequence (FR-010) `apps/vscode/src/services/resultsPanelService.test.ts`
- [ ] T039 [P] [US2][test] Vitest: After successful save, `ActivityPanelViewProvider.addResultFile` is called with the saved filename (FR-013/FR-014 wiring) `apps/vscode/src/services/resultsPanelService.test.ts`

### VS Code Webview E2E tests for User Story 2 🖥️

- [ ] T040 [P] [US2][test] Extend `ResultsPanelPage` with `clickSave()`, `clickSaveAs()`, `fillSaveAsForm()`, `getActiveTabSavedState()` `tests/e2e/models/resultsPanelPage.ts`
- [ ] T041 [US2][test] Playwright spec: open REP, run track-stats, click Save, assert toast, assert tab transitions to saved (no dot, Save disabled), assert CSV file exists on disk, assert STAC asset present, assert FileSavedEvent in `prov/log.json` with correct PROV link `tests/e2e/test-tabular-results-save.spec.ts`
- [ ] T042 [US2][test] Playwright spec (same file): click Save As → fill base name `my-stats` → submit → assert filename starts with `my-stats--` `tests/e2e/test-tabular-results-save.spec.ts`

### Implementation for User Story 2

- [x] T043 [US2] Implement `handleSave(tabId)` per `contracts/results-panel-service.md` (find tab, build CSV via `buildCsvContent`, generate filename via `generateCsvFilename`, write file, register STAC asset, on failure delete file + set error, on success record FileSavedEvent, transition state, call `activityPanelView.addResultFile`, emit `results:setTabs`) `apps/vscode/src/services/resultsPanelService.ts`
- [x] T044 [US2] Implement `handleSaveAs(tabId, baseName, tag?)` — re-sanitises inputs via `sanitizeFilename`, then delegates to the same save sequence with the chosen base name `apps/vscode/src/services/resultsPanelService.ts`
- [x] T045 [US2] Wire webview message router so `results:save` and `results:saveAs` reach the service handlers `apps/vscode/src/views/resultsPanelView.ts`
- [x] T046 [US2] Wire `ChartContextProps.onSave` and `onSaveAs` callbacks in the React entry to post `results:save` / `results:saveAs` messages to the host `apps/vscode/src/webview/web/resultsPanel.tsx`
- [x] T047 [US2] Verify CSP allows `acquireVsCodeApi()` postMessage path (existing pattern — no change expected) `apps/vscode/src/views/resultsPanelView.ts`

**Checkpoint**: User Story 2 fully functional — Save persists everything, Save As works with custom names, failed saves clean up. T041 and T042 Playwright specs green.

---

## Phase 5: User Story 3 — Discover saved results via Layers toolbar (Priority: P2)

**Goal**: Saved CSV files appear under a "Results" section in the existing Layers toolbar Associated Files dropdown, refreshed automatically after each save (no manual reload).

**Independent Test**: Save a result; without any user-driven refresh, open the Activity panel's Associated Files dropdown and confirm the CSV appears under "Results".

### Unit tests for User Story 3 ⚠️

- [x] T048 [P] [US3][test] Vitest: `ActivityPanelViewProvider.addResultFile` updates `_resultFiles` and triggers `_sendLayersUpdate` with `resultsChanged: true` (FR-013/FR-014) `apps/vscode/src/views/activityPanelView.test.ts`
- [x] T049 [P] [US3][test] Vitest: After `ResultsPanelService.handleSave` succeeds, `activityPanelView.addResultFile` is invoked exactly once with the new asset path `apps/vscode/src/services/resultsPanelService.test.ts`

### VS Code Webview E2E tests for User Story 3 🖥️

- [ ] T050 [US3][test] Playwright spec: extend save spec — after Save, open Associated Files dropdown without reload, assert new CSV appears under "Results" section `tests/e2e/test-tabular-results-save.spec.ts`

### Implementation for User Story 3

- [x] T051 [US3] Confirm `ActivityPanelViewProvider.addResultFile(name, filePath)` exists; if absent, add it (it pushes into `_resultFiles` and calls `_sendLayersUpdate` with `resultsChanged: true`) `apps/vscode/src/views/activityPanelView.ts`
- [x] T052 [US3] Confirm `_sendLayersUpdate` already includes `resultFiles` and `resultsChanged` in its payload to the activity panel webview; no client-side change needed (existing dropdown reads `resultFiles`) `apps/vscode/src/views/activityPanelView.ts`
- [x] T053 [US3] Audit `ResultsPanelService.handleSave` to ensure `addResultFile` is invoked **after** STAC registration succeeds and **before** the webview state update — verify wiring matches the contract `apps/vscode/src/services/resultsPanelService.ts`

**Checkpoint**: User Story 3 functional — saved files surface in the dropdown automatically. T050 Playwright assertion passes.

---

## Phase 6: User Story 4 — Act on saved result files (Priority: P2)

**Goal**: Open / Open With / Reveal in Explorer / Delete actions on a saved CSV in the Associated Files dropdown work end-to-end. Open round-trips the CSV back into a new Results tab in `saved` state via `parseCsvToTableDataset`.

**Independent Test**: From the Associated Files dropdown, run each of the four actions on a saved CSV and verify the expected behaviour (Open → reopens as tab; Reveal → Explorer focuses file; Open With → editor picker; Delete → confirm dialog → asset gone from STAC + disk).

### Unit tests for User Story 4 ⚠️

- [x] T054 [P] [US4][test] Vitest: `ResultsPanelService.openSavedFile` reads the CSV from disk, parses via `parseCsvToTableDataset`, creates a tab in `state.kind === 'saved'` (FR-015) `apps/vscode/src/services/resultsPanelService.test.ts`
- [x] T055 [P] [US4][test] Vitest: `openSavedFile` parse failure surfaces an error and does NOT create a tab `apps/vscode/src/services/resultsPanelService.test.ts`
- [x] T056 [P] [US4][test] Vitest: `activityPanelView` `file:action` handler routes `open` → `resultsPanelService.openSavedFile`, `reveal` → `vscode.commands.executeCommand('revealFileInOS' / 'revealInExplorer')`, `openWith` → `vscode.commands.executeCommand('explorer.openWith')`, `delete` → confirm dialog + `stacService.deleteResultAsset` (FR-015–FR-018) `apps/vscode/src/views/activityPanelView.test.ts`

### VS Code Webview E2E tests for User Story 4 🖥️

- [ ] T057 [P] [US4][test] Extend page object with dropdown action selectors (`Open`, `OpenWith`, `Reveal`, `Delete`) `tests/e2e/models/resultsPanelPage.ts`
- [ ] T058 [US4][test] Playwright spec: save a result, then for each action assert behaviour (Open → new saved tab in Results panel with parsed data; Reveal → Explorer view focused on file; Open With → picker dialog visible; Delete → confirm → asset removed from STAC item and file removed from disk) `tests/e2e/test-tabular-results-actions.spec.ts`

### Implementation for User Story 4

- [x] T059 [US4] Implement `openSavedFile({ plotKey, assetFilename })` per contract — `vscode.workspace.fs.readFile`, `parseCsvToTableDataset`, push tab in `saved` state with the existing `savedActivityId` looked up from the timeline, emit `results:setTabs` `apps/vscode/src/services/resultsPanelService.ts`
- [x] T060 [US4] Add `file:action` message handler to `ActivityPanelViewProvider` that switches on `action` and dispatches Open / Reveal / OpenWith / Delete `apps/vscode/src/views/activityPanelView.ts`
- [x] T061 [US4] Implement Delete confirmation dialog via `vscode.window.showWarningMessage(..., { modal: true }, 'Delete')` and call `stacService.deleteResultAsset` on confirm `apps/vscode/src/views/activityPanelView.ts`
- [x] T062 [US4] Wire dropdown click handlers in the activity panel webview to post `file:action` messages with the action name and asset path `apps/vscode/src/webview/web/activityPanel.tsx`

**Checkpoint**: User Story 4 functional — all four file actions work. T058 Playwright spec green.

---

## Phase 7: User Story 5 — Recover from tool errors (Priority: P3)

**Goal**: Failed tool runs surface an error tab with a Retry button. No provenance is recorded for the failed run. Retry re-invokes the tool with the original parameters and selection.

**Independent Test**: Trigger a tool failure (e.g., wrong feature type), assert the error tab shows the message + Retry button, assert no new entry in the analysis log, click Retry, assert tool re-runs and on success the tab transitions to a fresh unsaved-success state.

### Unit tests for User Story 5 ⚠️

- [x] T063 [P] [US5][test] Vitest: `addErrorTab` creates a tab in `state.kind === 'error'` and emits `results:setTabs` (FR-019) `apps/vscode/src/services/resultsPanelService.test.ts`
- [x] T064 [P] [US5][test] Vitest: `addErrorTab` does NOT call `logService.recordToolResult` (no provenance for failed runs) (FR-019) `apps/vscode/src/services/resultsPanelService.test.ts`
- [x] T065 [P] [US5][test] Vitest: `handleRetry` removes the failed tab and re-invokes `executeTool` with the original `featureIds` and `params` (FR-020) `apps/vscode/src/services/resultsPanelService.test.ts`

### VS Code Webview E2E tests for User Story 5 🖥️

- [ ] T066 [US5][test] Playwright spec: trigger a tool failure, assert error tab + Retry button visible, assert no new log entry, click Retry, assert tool re-runs and tab transitions `tests/e2e/test-tabular-results-actions.spec.ts`

### Implementation for User Story 5

- [x] T067 [US5] Implement `addErrorTab({ plotKey, toolId, errorMessage, sourceFeatureIds, parameters })` — push a tab in `error` state, emit `results:setTabs`, do not touch `logService` `apps/vscode/src/services/resultsPanelService.ts`
- [x] T068 [US5] Implement `handleRetry(tabId)` — remove the failed tab, call `vscode.commands.executeCommand('debrief.executeTool', ...)` with original featureIds + params; the existing executeTool path will then call `addDatasetsForToolResult` or `addErrorTab` again `apps/vscode/src/services/resultsPanelService.ts`
- [x] T069 [US5] Wire `executeTool.ts` failure path to call `resultsPanelService.addErrorTab(...)` instead of just toasting `apps/vscode/src/commands/executeTool.ts`
- [x] T070 [US5] Wire `ChartContextProps.onRetry` callback in the React entry to post `results:retry` `apps/vscode/src/webview/web/resultsPanel.tsx`
- [x] T071 [US5] Wire `results:retry` message router in the view provider to call `resultsPanelService.handleRetry` `apps/vscode/src/views/resultsPanelView.ts`

**Checkpoint**: All five user stories independently functional. T066 Playwright spec green.

---

## Phase 8: Lifecycle — plot close cleanup (cross-cutting, FR-021)

**Goal**: Closing a plot discards unsaved tabs and deletes orphan `ToolRunEvent` log entries (those without a paired `FileSavedEvent`). Saved tabs and their `FileSavedEvent` pairs survive.

### Unit tests

- [x] T072 [P] [POLISH][test] Vitest: On `SessionManager.onActiveSessionChange` (close event), `ResultsPanelService` calls `logService.deleteEntry` for each unsaved tab's `parentActivityId` and discards the tabs (FR-021) `apps/vscode/src/services/resultsPanelService.test.ts`
- [x] T073 [P] [POLISH][test] Vitest: Close event leaves saved tabs' `parentActivityId` log entries intact (FR-021) `apps/vscode/src/services/resultsPanelService.test.ts`

### Implementation

- [x] T074 [POLISH] Subscribe to `sessionManager.onActiveSessionChange` in `ResultsPanelService` constructor and implement the cleanup walker per `contracts/results-panel-service.md` plot-close pseudo-code `apps/vscode/src/services/resultsPanelService.ts`
- [x] T075 [POLISH] Implement `dispose()` to remove the subscription `apps/vscode/src/services/resultsPanelService.ts`

**Checkpoint**: Closing and reopening a plot leaves no orphan ToolRunEvents in the log. Verify via quickstart.md "Lifecycle" section.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: i18n / a11y verification (SC-007), strict-type-safety enforcement (Article XV), evidence collection, media content, and PR creation.

### Cross-cutting hardening

- [x] T076 [POLISH] Verify all new user-facing strings in `resultsPanel.tsx` and `resultsPanelView.ts` come from the existing `resultsPanelLabels.ts` (FR-023, SC-007) `apps/vscode/src/webview/web/resultsPanel.tsx`
- [x] T077 [POLISH] Add ARIA roles, table semantics, and labelled buttons audit per FR-024 / SC-007 — confirm `ChartPanelWrapper` already exposes them and the new wrapper does not strip them `apps/vscode/src/webview/web/resultsPanel.tsx`
- [x] T078 [POLISH] Run `pnpm -r typecheck` and ensure no `any` introduced (Article XV) — fix any pyright/tsc warnings in new files
- [ ] T079 [POLISH] Run `task verify` (full lint + typecheck + unit + Playwright suite per CLAUDE.md "Before Pushing") and resolve any failures

### Evidence Collection (REQUIRED)

- [ ] T080 [POLISH] Create evidence directory `specs/178-vscode-tabular-results/evidence/`
- [ ] T081 [POLISH] Capture test results using template `.specify/templates/evidence/test-summary-template.md` with YAML front matter (`feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`) in `specs/178-vscode-tabular-results/evidence/test-summary.md`
- [ ] T082 [POLISH] Create usage demonstration walking through US1+US2+US4 quickstart workflow with expected outputs in `specs/178-vscode-tabular-results/evidence/usage-example.md`
- [ ] T083 [P] [POLISH] Document end-to-end save flow with all participants (executeTool → ResultsPanelService → webview → STAC → LogService → ActivityPanel) in `specs/178-vscode-tabular-results/evidence/integration-flow.md`
- [ ] T084 [P] [POLISH] Create Mermaid sequence diagram of the save flow proving R5 (host as source of truth) and R7 (provenance link) in `specs/178-vscode-tabular-results/evidence/sequence.mermaid`
- [ ] T085 [P] [POLISH] Capture screenshot of Results panel with track-stats table tab from a Playwright run to `specs/178-vscode-tabular-results/evidence/screenshots/results-panel-table.png`
- [ ] T086 [P] [POLISH] Capture screenshot of Results panel with two range-bearing chart tabs to `specs/178-vscode-tabular-results/evidence/screenshots/results-panel-charts.png`
- [ ] T087 [P] [POLISH] Capture screenshot of saved state + Associated Files dropdown showing the new CSV under "Results" to `specs/178-vscode-tabular-results/evidence/screenshots/save-flow.png`
- [ ] T088 [P] [POLISH] Capture screenshot of error tab with Retry button to `specs/178-vscode-tabular-results/evidence/screenshots/error-retry.png`
- [ ] T089 [POLISH] Capture interaction GIF (< 5s, < 2MB) of: run track-stats → tab appears → click Save → toast → unsaved dot clears, via Playwright `recordVideo` then convert to GIF, saved to `specs/178-vscode-tabular-results/evidence/screenshots/interaction.gif`
- [ ] T090 [P] [POLISH] Save a representative `track-stats--<date>.csv` produced by the actual save flow to `specs/178-vscode-tabular-results/evidence/sample-csv.csv`
- [ ] T091 [P] [POLISH] Save the corresponding `FileSavedEvent` LogEntry JSON (proves R7 sentinel + PROV link) to `specs/178-vscode-tabular-results/evidence/log-entry-sample.json`
- [ ] T092 [P] [POLISH] Document `buildCsvContent → parseCsvToTableDataset` round-trip on the sample CSV (FR-015 / R3) in `specs/178-vscode-tabular-results/evidence/round-trip-evidence.md`
- [ ] T093 [POLISH] Run full Playwright e2e suite (`xvfb-run --auto-servernum npx playwright test --config tests/e2e/playwright.config.ts test-tabular-results`) and document results in `specs/178-vscode-tabular-results/evidence/webview-e2e-summary.md`

### Media Content

- [ ] T094 [POLISH] Spawn Content Specialist via Task tool with `.claude/agents/media/content.md` to create shipped blog post (What We Built, Screenshots, Lessons Learned, What's Next) in `specs/178-vscode-tabular-results/media/shipped-post.md`
- [ ] T095 [P] [POLISH] Spawn Content Specialist to create LinkedIn shipped summary (150–200 words, hook opening, link to full post) in `specs/178-vscode-tabular-results/media/linkedin-shipped.md`

### PR Creation

- [ ] T096 [POLISH] Create PR and publish blog: run `/speckit.pr`

**Task T096 must run last. It depends on every other task being complete and creates both the feature PR in debrief-future and the blog PR in debrief.github.io.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)** → no deps; can start immediately.
- **Phase 2 (Foundational)** → depends on Phase 1; BLOCKS all user stories.
- **Phase 3 (US1, P1)** → depends on Phase 2.
- **Phase 4 (US2, P1)** → depends on Phase 3 (needs an existing tab to save).
- **Phase 5 (US3, P2)** → depends on Phase 4 (needs a save event to trigger dropdown refresh).
- **Phase 6 (US4, P2)** → depends on Phase 5 (needs a saved file to act on); the Open action also depends on Phase 2 T009 (`parseCsvToTableDataset`).
- **Phase 7 (US5, P3)** → depends on Phase 3 (extends the same `ResultsPanelService` and React entry); independent of US2/US3/US4.
- **Phase 8 (Lifecycle)** → depends on Phase 4 (needs the save / unsaved distinction to identify orphans).
- **Phase 9 (Polish + PR)** → depends on Phases 1–8 complete.

### User Story Dependencies (cross-story)

- **US1** is the foundation for every other story (without a tab there is nothing to save, retry, or close).
- **US2** strictly precedes **US3** (US3 only fires after a successful save).
- **US3** strictly precedes **US4** (US4 acts on items in the dropdown US3 surfaces).
- **US5** is independent of US2/US3/US4 once US1 is in place — it can be parallelised by a second developer after Phase 3.

### Within Each User Story

- Tests MUST be written first and MUST FAIL before implementation (per plan.md "Testing").
- Models / types before services.
- Services before view providers.
- View providers before React entries.
- React entries before integration wiring (`extension.ts`, `executeTool.ts`).

### Parallel Opportunities

- **Phase 1**: T001, T002, T003 in parallel (different files).
- **Phase 2**: T004+T008+T011+T014+T016 (all `[test]` tasks across different files) in parallel; then T005+T009+T012+T015+T017 in parallel; then barrels T006+T010 in parallel.
- **Phase 3**: All `[US1][test]` vitest tasks T018–T022 in parallel; T023+T024 page object tasks in parallel; implementation tasks T026–T032 must serialise on `resultsPanelService.ts` (same file) but can interleave with T031 (view provider, different file) and T032 (webview entry, different file).
- **Phase 4**: T035–T039 in parallel; T040 in parallel with vitest.
- **Phase 5**: T048+T049 in parallel.
- **Phase 6**: T054+T055+T056 in parallel; T057 in parallel with vitest.
- **Phase 7**: T063+T064+T065 in parallel.
- **Phase 8**: T072+T073 in parallel.
- **Phase 9**: T083, T084, T085, T086, T087, T088, T090, T091, T092 in parallel (all `[P]`); T094 must precede T095 only if both write to the same `media/` directory (different files — can be parallel via the Content Specialist agent).
- **Cross-story**: After Phase 3 is green, US5 (Phase 7) can be developed in parallel with US2 (Phase 4) by a second developer if available.

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Wave 1 — write all failing tests in parallel:
Task: "Write synthesizeTableDataset tests in shared/utils/src/datasetSynthesis.test.ts"
Task: "Write parseCsvToTableDataset tests in shared/utils/src/csv.test.ts"
Task: "Write recordFileSaved tests in services/session-state/src/log/logService.test.ts"
Task: "Write results:* message round-trip tests in apps/vscode/src/webview/messages.test.ts"
Task: "Write deleteResultAsset tests in apps/vscode/src/services/stacService.test.ts"

# Wave 2 — implement to make them pass, in parallel:
Task: "Implement synthesizeTableDataset in shared/utils/src/datasetSynthesis.ts"
Task: "Implement parseCsvToTableDataset in shared/utils/src/csv.ts"
Task: "Implement recordFileSaved in services/session-state/src/log/logService.ts"
Task: "Add results:* discriminated union types in apps/vscode/src/webview/messages.ts"
Task: "Implement deleteResultAsset in apps/vscode/src/services/stacService.ts"
```

---

## Implementation Strategy

### Incremental Delivery

1. **Phase 1 + 2**: Foundation ready — bundling, shared utilities, log extension, message types, STAC delete. No user-visible change yet.
2. **Phase 3 (US1)**: First user-visible result — Results panel renders tabs from tool output. Independently demonstrable.
3. **Phase 4 (US2)**: Save flow works — provenance written, files persisted. Independently demonstrable.
4. **Phase 5 (US3)**: Saved files surface in dropdown. Independently demonstrable.
5. **Phase 6 (US4)**: All four file actions work. Round-trip Open completes parity with web-shell.
6. **Phase 7 (US5)**: Error + Retry. Closes the resilience story.
7. **Phase 8**: Lifecycle cleanup — orphan ToolRunEvents removed on plot close.
8. **Phase 9**: Hardening, evidence, media, PR. Each story along the way is shippable on its own.

### Parallel Team Strategy

With multiple developers:
1. **Dev A** drives Phase 1 + Phase 2 (foundational).
2. Once Phase 2 is green:
   - **Dev A**: Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3) → Phase 6 (US4) (these are sequentially dependent).
   - **Dev B**: Phase 7 (US5) — can start as soon as Phase 3 is green; merges back into the same `resultsPanelService.ts` so coordinate via small commits.
3. **Dev A** wraps up Phase 8 + Phase 9.

---

## Notes

- `[P]` tasks = different files, no dependencies.
- `[Story]` label maps each task to its user story (US1–US5) or to FOUNDATION/POLISH for cross-cutting work.
- Each user story must remain independently testable — Phase 4–7 must not silently break Phase 3.
- Verify tests fail before implementing (TDD per Article VII / plan.md).
- Commit after each task or logical group; respect Article XIII atomic-commit guidance.
- **Evidence is required** — PR description draws directly from `evidence/`.
- Final task T096 runs `/speckit.pr` to create both the feature PR and the blog PR.

