# Research: needs-interview Status for Backlog Workflow

**Feature**: 019-needs-interview-status
**Date**: 2026-01-26

## Research Questions Addressed

### Q1: Where does `needs-interview` fit in the workflow status progression?

**Decision**: Insert `needs-interview` before `proposed` as the earliest status.

**Rationale**:
- Current workflow: `proposed` → `approved` → `specified` → ...
- New workflow: `needs-interview` → `proposed` → `approved` → ...
- Items captured quickly lack sufficient detail for scoring
- Only after interview completion should scoring be possible

**Alternatives Considered**:
- After `proposed`: Rejected because proposed items should already have enough detail for scoring
- Parallel status: Rejected because it adds complexity; sequential is clearer

### Q2: What existing files need modification?

**Decision**: Modify three files, create one new file.

| File | Change |
|------|--------|
| `BACKLOG.md` | Add `needs-interview` to Workflow table; update Status Flow diagram |
| `.claude/commands/idea.md` | Add `--defer` flag handling; set status to `needs-interview` |
| `.claude/commands/speckit.start.md` | Add validation to reject `needs-interview` items |
| `.claude/commands/interview.md` | **NEW** - Create command to process deferred items |

**Rationale**: Minimal touch points reduce regression risk. All changes are to markdown documentation files, not application code.

### Q3: How should preliminary scoring work for deferred items?

**Decision**: Assign preliminary V/M/A scores at capture time with a "(preliminary)" notation.

**Rationale**:
- Even partial information enables rough prioritization
- Notation makes clear that scores may change
- Backlog remains sortable by total score

**Implementation**:
- When `--defer` is used, opportunity-scout still estimates V/M/A
- Description includes "[preliminary]" suffix until interview complete
- After interview, scores are updated and "[preliminary]" removed

### Q4: How should the `/interview` command select items?

**Decision**: List all `needs-interview` items and allow selection by ID.

**Flow**:
1. Parse BACKLOG.md for items with status `needs-interview`
2. Display numbered list with ID, Category, Description, preliminary scores
3. User enters item ID to begin interview
4. Interview follows existing pattern from `/idea` command (Step 3)
5. On completion: update status to `proposed`, update scores, update GitHub issue if exists

**Rationale**: Simple selection mechanism; reuses existing interview logic from `/idea`.

### Q5: Constitution compliance verification

| Article | Requirement | Compliance |
|---------|-------------|------------|
| I.1 | Offline by default | **PASS** - All operations are local markdown edits |
| III.4 | Data stays local | **PASS** - No external calls; all changes in repo |
| IV.1 | Services never touch UI | **N/A** - This is workflow tooling, not a service |
| VII | Test-Driven AI | **PASS** - Acceptance criteria defined in spec |
| VIII.1 | Specs before code | **PASS** - Spec exists at `/specs/019-needs-interview-status/spec.md` |

**No constitution violations identified.**

## Technical Approach

### Implementation Files

```text
Changes required:
├── BACKLOG.md                           # Add needs-interview to workflow docs
├── .claude/commands/idea.md             # Add --defer flag handling
├── .claude/commands/interview.md        # NEW - Process deferred items
└── .claude/commands/speckit.start.md    # Reject needs-interview items
```

### Interview Question Format (FR-009, FR-010)

The `/interview` command should use multiple-choice questions asked one at a time:

```markdown
## Question 1 of N: [Topic]

**Context**: [Relevant background from captured idea]

| Option | Answer | Implications |
|--------|--------|--------------|
| A | [First option] | [What this means] |
| B | [Second option] | [What this means] |
| C | [Third option] | [What this means] |
| Custom | Your own answer | Provide details below |

**Your choice**: _
```

This format:
- Reduces cognitive load (choose vs. write)
- Provides context for informed decisions
- Allows custom answers when options don't fit

## Dependencies

No new dependencies required. All implementation uses existing:
- Claude Code command system (markdown files)
- BACKLOG.md parsing patterns (already used in other commands)
- GitHub CLI (`gh`) for issue updates (already used in `/idea`)

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Users forget about deferred items | `/interview` list provides visibility; consider future reminder feature |
| Interview takes too long | Multiple-choice format speeds process; one question at a time |
| Inconsistent status handling | Document status precedence clearly; add validation |
