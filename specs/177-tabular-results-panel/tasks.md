# Tasks: Tabular Results Panel

**Feature**: 177-tabular-results-panel

## Phase 1: Setup

- [x] T001 [P] Add CSV formatting and filename sanitization utilities `shared/utils/src/csv.ts`
- [x] T002 [P] Add `displayHint` field to `DatasetEnvelope` type `shared/components/src/ChartRenderer/types.ts`
- [x] T003 [P] Add `TabularResultState` and save-related types to `ChartTabData` in `shared/components/src/panels/PanelContext.tsx`

## Phase 2: Foundation

- [x] T004 Create `TableRenderer` component `shared/components/src/TableRenderer/TableRenderer.tsx`
- [x] T005 Create barrel export `shared/components/src/TableRenderer/index.ts`
- [x] T006 Export `TableRenderer` from `shared/components/src/index.ts`

## Phase 3: User Story 1 — View Tabular Results

- [x] T007 Update `ChartPanelWrapper` to dispatch between table and chart rendering based on `displayHint`
- [x] T008 Add save button UI (Save, Save As) and unsaved indicator to panel title bar
- [x] T009 Add error state display and retry button to panel

## Phase 4: User Story 2 — Save Results

- [x] T010 Add save request/response message types to `apps/vscode/src/webview/messages.ts`
- [x] T011 Add `onSave`, `onSaveAs`, `onRetry` callbacks to `PanelContext` `ChartContextProps`
- [x] T012 Wire save handlers in `apps/web-shell/src/App.tsx` (mock implementation for web-shell)

## Phase 5: Tests

- [x] T013 [test] Write CSV utility tests `shared/utils/tests/csv.test.ts`
- [x] T014 [test] Write TableRenderer tests `shared/components/src/TableRenderer/TableRenderer.test.tsx`
- [x] T015 [test] Run full verification (lint, typecheck, test)

## Phase 6: Evidence

- [x] T401 Capture test results in `specs/177-tabular-results-panel/evidence/test-summary.md`
- [x] T402 Create usage example in `specs/177-tabular-results-panel/evidence/usage-example.md`
