# Tasks: needs-interview Status for Backlog Workflow

**Input**: Design documents from `/specs/019-needs-interview-status/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md

**Tests**: Manual acceptance testing per spec scenarios. No automated tests (markdown documentation feature).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/019-needs-interview-status/evidence/`
**Media Directory**: `specs/019-needs-interview-status/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Manual acceptance test results for all scenarios | After all stories verified |
| usage-example.md | Walkthrough of quick capture → interview workflow | After US1 and US2 complete |
| defer-demo.txt | Terminal session showing `/idea --defer` usage | After US1 complete |
| interview-demo.txt | Terminal session showing `/interview` selection | After US2 complete |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | Already exists |
| media/linkedin-planning.md | LinkedIn summary for planning | Already exists |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and documentation structure

- [x] T001 Create evidence directory `specs/019-needs-interview-status/evidence/`
- [x] T002 Verify all prerequisite files exist (spec.md, plan.md, research.md, data-model.md)

---

## Phase 2: Foundational (Status Documentation)

**Purpose**: Document the new status value in BACKLOG.md before any commands can use it

**CRITICAL**: No command changes can proceed until the status is documented.

- [x] T003 Add `needs-interview` status to BACKLOG.md workflow section with status flow diagram `BACKLOG.md`
- [x] T004 Document status validation rules (which commands accept which statuses) `BACKLOG.md`

**Checkpoint**: `needs-interview` status is documented - command modifications can now begin.

---

## Phase 3: User Story 1 - Defer Interview for Quick Capture (Priority: P1)

**Goal**: Allow users to capture ideas quickly with `--defer` flag, setting status to `needs-interview` instead of conducting full interview.

**Independent Test**: Run `/idea --defer "My quick idea"` and verify the item appears in BACKLOG.md with status `needs-interview` and preliminary scores marked with `[preliminary]`.

### Implementation for User Story 1

- [x] T005 Add `--defer` flag parsing to Step 1 (Parse the Idea) `.claude/commands/idea.md`
- [x] T006 Add defer flow that skips interview and uses minimal detail `.claude/commands/idea.md`
- [x] T007 Update Step 5 (Add to Backlog) to set status `needs-interview` when deferred `.claude/commands/idea.md`
- [x] T008 Update Step 6 (Score the Item) to mark scores as `[preliminary]` when deferred `.claude/commands/idea.md`
- [x] T009 Add defer path to Output Format section with appropriate messaging `.claude/commands/idea.md`
- [x] T010 Update Example Usage section to show `--defer` flag `.claude/commands/idea.md`

**Checkpoint**: Users can capture ideas quickly with `--defer` flag. Status shows `needs-interview`, scores show `[preliminary]`.

---

## Phase 4: User Story 2 - Batch Interview Processing (Priority: P2)

**Goal**: Allow users to see all pending interviews and process them efficiently via `/interview` command.

**Independent Test**: With items having `needs-interview` status, run `/interview`, select an item, complete the interview, and verify status changes to `proposed` with updated scores.

### Implementation for User Story 2

- [x] T011 Create `/interview` command with purpose and user input sections `.claude/commands/interview.md`
- [x] T012 Implement Step 1: Parse BACKLOG.md for `needs-interview` items `.claude/commands/interview.md`
- [x] T013 Implement Step 2: Display numbered list of pending items `.claude/commands/interview.md`
- [x] T014 Implement Step 3: Selection by item ID `.claude/commands/interview.md`
- [x] T015 Implement Step 4: Interview process (reuse pattern from idea.md Step 3) `.claude/commands/interview.md`
- [x] T016 Implement Step 5: Update status from `needs-interview` to `proposed` `.claude/commands/interview.md`
- [x] T017 Implement Step 6: Update GitHub issue if exists (FR-011) `.claude/commands/interview.md`
- [x] T018 Add multiple-choice question format (FR-009, FR-010) `.claude/commands/interview.md`
- [x] T019 Add output format for success and edge cases `.claude/commands/interview.md`
- [x] T020 Add error handling for no items, invalid selection `.claude/commands/interview.md`

**Checkpoint**: Users can list and process deferred items via `/interview`. Status transitions correctly.

---

## Phase 5: User Story 3 - Agent Recognition of Insufficient Detail (Priority: P3)

**Goal**: Enable agents to recognize when captured information is insufficient and suggest deferring.

**Independent Test**: Submit a vague idea (e.g., "improve performance") and verify the agent suggests using `--defer` when detail is clearly insufficient.

### Implementation for User Story 3

- [x] T021 Update Step 2 (Scout Evaluation) to detect minimal detail `.claude/commands/idea.md`
- [x] T022 Add suggestion to defer when detail is insufficient `.claude/commands/idea.md`
- [x] T023 Add note about preliminary scores in scoring section `.claude/commands/idea.md`

**Checkpoint**: Agents proactively suggest deferring when ideas lack sufficient detail.

---

## Phase 6: Validation Gate (speckit.start Rejection)

**Goal**: Prevent `/speckit.start` from processing items that still need interviews.

**Independent Test**: Attempt to run `/speckit.start {ID}` on an item with `needs-interview` status and verify it rejects with actionable error message.

### Implementation for Validation Gate

- [x] T024 Add `needs-interview` validation check to Step 3 (Validate Item) `.claude/commands/speckit.start.md`
- [x] T025 Add error message: "Item {ID} needs interview first. Run `/interview` to complete requirements gathering." `.claude/commands/speckit.start.md`
- [x] T026 Update status guidance to include `needs-interview` status `.claude/commands/speckit.start.md`

**Checkpoint**: `/speckit.start` correctly rejects `needs-interview` items with clear guidance.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, evidence collection, and PR creation

### Acceptance Testing

- [x] T027 Verify Scenario 1.1: `/idea --defer` captures with `needs-interview` status
- [x] T028 Verify Scenario 1.2: Deferred items visible by status in BACKLOG.md
- [x] T029 [P] Verify Scenario 2.1: `/interview` lists all `needs-interview` items
- [x] T030 [P] Verify Scenario 2.2: Item selection begins interview process
- [x] T031 [P] Verify Scenario 2.3: Completed interview updates status to `proposed`
- [x] T032 Verify Scenario 3.1: Agent suggests deferring for minimal detail ideas
- [x] T033 Verify Edge Case: No items returns "No items awaiting interviews"
- [x] T034 Verify Edge Case: `/speckit.start` rejects `needs-interview` items

### Evidence Collection

- [x] T035 Create evidence directory `specs/019-needs-interview-status/evidence/`
- [x] T036 Capture test summary with acceptance test results `specs/019-needs-interview-status/evidence/test-summary.md`
- [x] T037 Create usage demonstration walkthrough `specs/019-needs-interview-status/evidence/usage-example.md`
- [x] T038 [P] Capture `/idea --defer` demo session `specs/019-needs-interview-status/evidence/defer-demo.txt`
- [x] T039 [P] Capture `/interview` demo session `specs/019-needs-interview-status/evidence/interview-demo.txt`

### Media Content

- [ ] T040 Create shipped blog post `specs/019-needs-interview-status/media/shipped-post.md`
- [ ] T041 [P] Create LinkedIn shipped summary `specs/019-needs-interview-status/media/linkedin-shipped.md`

### PR Creation

- [ ] T042 Create PR and publish blog: run /speckit.pr

**Task T042 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all command modifications
- **User Story 1 (Phase 3)**: Depends on Phase 2 (status documented)
- **User Story 2 (Phase 4)**: Depends on Phase 2 (status documented)
- **User Story 3 (Phase 5)**: Depends on Phase 2 (status documented)
- **Validation Gate (Phase 6)**: Depends on Phase 2 (status documented)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent of US1
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independent of US1/US2
- **Validation Gate**: Can start after Foundational (Phase 2) - Independent of user stories

### Parallel Opportunities

After Phase 2 completes:
- Phases 3, 4, 5, and 6 can all proceed in parallel (different files)
- Within Phase 7: Acceptance tests for different scenarios can run in parallel
- Within Phase 7: Evidence capture tasks marked [P] can run in parallel
- Within Phase 7: Media content tasks marked [P] can run in parallel

---

## Parallel Example: After Phase 2

```bash
# All user stories can start in parallel (different command files):
Phase 3: idea.md modifications (--defer flag)
Phase 4: interview.md creation (new file)
Phase 5: idea.md modifications (agent suggestions) - WAIT for Phase 3
Phase 6: speckit.start.md validation (different file than Phase 3)
```

**Note**: Phases 3 and 5 both modify `idea.md`, so they must run sequentially.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all command work)
3. Complete Phase 3: User Story 1 (`--defer` flag)
4. **STOP and VALIDATE**: Test quick capture workflow independently
5. Demo the quick capture capability

### Incremental Delivery

1. Complete Setup + Foundational → Status documented
2. Add User Story 1 → Test `--defer` flag → Demo quick capture (MVP!)
3. Add User Story 2 → Test `/interview` → Demo full workflow
4. Add User Story 3 → Test agent suggestions → Complete feature
5. Add Validation Gate → Test rejection → Full protection

### Recommended Execution Order

Since Phases 3 and 5 both modify `idea.md`:

1. Phase 1 (Setup)
2. Phase 2 (Foundational)
3. Phase 3 (US1 - defer flag) ← modify idea.md first
4. Phase 4 (US2 - interview) ← can run parallel with Phase 3
5. Phase 6 (Validation) ← can run parallel with Phases 3-4
6. Phase 5 (US3 - agent suggestions) ← after Phase 3 completes
7. Phase 7 (Polish)

---

## Notes

- [P] tasks = different files, no dependencies
- All changes are to markdown documentation files (no code)
- Manual acceptance testing per spec scenarios
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Evidence is required - capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
