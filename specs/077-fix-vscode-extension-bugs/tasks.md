# Tasks: Fix VS Code Extension Bugs

**Input**: Design documents from `/specs/077-fix-vscode-extension-bugs/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: Unit test included for the ISO-to-epoch conversion (critical data transformation).

**Organization**: Tasks grouped by bug/user story for independent implementation and testing. Bugs 1-3 share a single root cause (Fix 1), so they form one implementation phase. Bug 4 is a separate phase.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the four bug fixes work as expected.

**Evidence Directory**: `specs/077-fix-vscode-extension-bugs/evidence/`
**Media Directory**: `specs/077-fix-vscode-extension-bugs/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest results for temporal conversion and shared component tests | After all tests pass |
| usage-example.md | Step-by-step verification of all four bugs fixed | After all fixes complete |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan (done) |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan (done) |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Purpose**: Verify build health before making changes

- [x] T001 Verify VS Code extension builds cleanly: `cd apps/vscode && npx tsc --noEmit`
- [x] T002 [P] Verify shared components build cleanly: `cd shared/components && npx tsc --noEmit`

**Checkpoint**: Both packages compile without errors — safe to make changes.

---

## Phase 2: User Stories 1-3 — Time Slider, Location Marker, Trail Mode (Priority: P1)

**Goal**: Fix the ISO string → epoch ms type mismatch that causes all three temporal rendering bugs.

**Independent Test**: Load Exercise Alpha, drag the time slider — tracks update, red markers appear in Full mode, trail segments render in Trail mode.

### Test for Fix 1

> **NOTE: Write test FIRST, ensure it FAILS before implementation**

- [x] T003 [test] Write conversion unit test `apps/vscode/tests/unit/temporalConversion.test.ts`
  - Test that `trackToFeature()` converts ISO string times to epoch ms numbers
  - Test with sample ISO strings: `"2024-01-15T10:00:00Z"` → `1705312800000`
  - Test edge case: empty times array → empty array
  - Verify output `times` is `number[]`, not `string[]`

### Implementation for Fix 1

- [x] T004 Convert Track.times from ISO strings to epoch ms in `trackToFeature()` `apps/vscode/src/webview/web/mapView.tsx`
  - Change `times: track.times` to `times: track.times.map(t => new Date(t).getTime())`
  - This single change fixes bugs 1, 2, and 3 simultaneously

- [x] T005 [P] Add defensive type check in `extractTemporalData()` `shared/components/src/MapView/temporal-utils.ts`
  - After extracting `times`, verify `typeof times[0] === 'number'`
  - If strings detected, log a console warning and return `null`
  - Prevents silent failure if another consumer passes wrong types in future

- [x] T006 Run shared components tests: `cd shared/components && npx vitest run`

**Checkpoint**: Time slider, location marker, and trail mode should all work with Exercise Alpha.

---

## Phase 3: User Story 4 — Tool Offering (Priority: P2)

**Goal**: Fix the selection callback registration so tools are offered when features are selected.

**Independent Test**: Load Exercise Alpha, click a track — analysis tools appear in the activity panel.

### Implementation for Fix 2

- [x] T007 Verify `onSelectionChanged` callback behavior in MapPanel `apps/vscode/src/webview/mapPanel.ts`
  - Check if `onSelectionChanged()` replaces or stacks callbacks
  - If it stacks, add a method to clear previous callback before re-registering

- [x] T008 Move selection callback registration outside `if (!panel)` block `apps/vscode/src/commands/openPlot.ts`
  - Extract the `panel.onSelectionChanged(...)` call (lines 189-207)
  - Place it after the `if (!panel) { ... }` block (after line 232)
  - Ensure it runs for both newly created and reused panels
  - Keep the callback body unchanged (session state update + toolMatchAdapter + refresh)

- [x] T009 Run VS Code extension tests: `cd apps/vscode && npx vitest run`

**Checkpoint**: Selecting features should show available tools in both first-load and panel-reuse scenarios.

---

## Phase 4: Integration Verification

**Purpose**: Verify all four fixes work together

- [x] T010 Run full TypeScript build: `npx tsc --noEmit` from workspace root
- [x] T011 [P] Run ESLint: `npx eslint apps/vscode/src/webview/web/mapView.tsx apps/vscode/src/commands/openPlot.ts`
- [x] T012 Verify quickstart.md steps pass `specs/077-fix-vscode-extension-bugs/quickstart.md`

**Checkpoint**: All four bugs fixed, build passes, lint clean.

---

## Phase 5: Polish & Cross-Cutting Concerns

### Evidence Collection

- [x] T013 Create evidence directory and capture test summary `specs/077-fix-vscode-extension-bugs/evidence/test-summary.md`
- [x] T014 [P] Create usage demonstration showing all four fixes `specs/077-fix-vscode-extension-bugs/evidence/usage-example.md`

### Media Content

- [x] T015 Create shipped blog post `specs/077-fix-vscode-extension-bugs/media/shipped-post.md`
- [x] T016 [P] Create LinkedIn shipped summary `specs/077-fix-vscode-extension-bugs/media/linkedin-shipped.md`

### Mark All Tasks Complete

- [x] T017 Update all task checkboxes and verify completion

### PR Creation

- [ ] T018 Create PR and publish blog: run /speckit.pr

**Task T018 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Temporal Fix (Phase 2)**: Depends on Phase 1 — fixes bugs 1, 2, 3
- **Tool Offering Fix (Phase 3)**: Depends on Phase 1 — fixes bug 4 (can run in parallel with Phase 2)
- **Integration (Phase 4)**: Depends on Phases 2 and 3
- **Polish (Phase 5)**: Depends on Phase 4

### User Story Dependencies

- **US1-3 (P1, Temporal)**: Can start after Phase 1 — no dependency on US4
- **US4 (P2, Tools)**: Can start after Phase 1 — no dependency on US1-3
- Phases 2 and 3 CAN run in parallel since they touch different files

### Parallel Opportunities

- T001 and T002 can run in parallel (different packages)
- Phase 2 and Phase 3 can run in parallel (different files, no dependencies)
- T005 can run in parallel with T004 (different files)
- T010 and T011 can run in parallel
- T013 and T014 can run in parallel
- T015 and T016 can run in parallel

---

## Parallel Example: Phases 2 & 3

```bash
# These phases touch different files and can run in parallel:

# Phase 2 (temporal fix):
Task: "Convert Track.times in trackToFeature() — apps/vscode/src/webview/web/mapView.tsx"
Task: "Add defensive type check — shared/components/src/MapView/temporal-utils.ts"

# Phase 3 (tool offering fix):
Task: "Move selection callback — apps/vscode/src/commands/openPlot.ts"
```

---

## Implementation Strategy

### MVP First (Phase 2 Only)

1. Complete Phase 1: Setup (verify builds)
2. Complete Phase 2: Temporal fix (1-line change + test)
3. **STOP and VALIDATE**: Time slider, marker, trail mode all work
4. This fixes 3 of 4 bugs with minimal risk

### Full Delivery

1. Complete Setup → Builds pass
2. Complete Phase 2 → Temporal bugs fixed (3/4)
3. Complete Phase 3 → Tool offering fixed (4/4)
4. Complete Phase 4 → Integration verified
5. Complete Phase 5 → Evidence captured, PR created

---

## Notes

- The temporal fix (Phase 2) is a single-line code change that resolves 3 bugs simultaneously
- The tool offering fix (Phase 3) requires checking MapPanel's callback handling first
- No new dependencies added; no schema changes
- Total scope: ~20 lines of code changes across 3 files
- Evidence is required — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
