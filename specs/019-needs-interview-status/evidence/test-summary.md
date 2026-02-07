# Test Summary: needs-interview Status for Backlog Workflow

**Feature**: 019-needs-interview-status
**Date**: 2026-01-27
**Type**: Manual verification (documentation feature)

## Test Results

### Scenario 1.1: `/idea --defer` captures with `needs-interview` status

**Status**: ✅ PASS

**Verification**:
- `.claude/commands/idea.md` contains `--defer` flag parsing in Step 1
- Step 2a defines defer path that skips interview
- Step 5 shows backlog row format with `needs-interview` status
- Output Format section includes Deferred Path template

**Evidence**: See `defer-demo.txt` for expected command flow.

---

### Scenario 1.2: Deferred items visible by status in BACKLOG.md

**Status**: ✅ PASS

**Verification**:
- `BACKLOG.md` workflow table includes `needs-interview` status
- Status Validation Rules section documents the status
- Backlog Flow diagram shows quick capture path

---

### Scenario 2.1: `/interview` lists all `needs-interview` items

**Status**: ✅ PASS

**Verification**:
- `.claude/commands/interview.md` Step 1 parses BACKLOG.md for `needs-interview` items
- Step 2 displays numbered list format
- "No Items Path" output format handles empty queue

---

### Scenario 2.2: Item selection begins interview process

**Status**: ✅ PASS

**Verification**:
- `.claude/commands/interview.md` Step 3 accepts ID or list number
- Step 4 references opportunity-scout agent for interview
- Multiple-choice question format defined (FR-009, FR-010)

**Evidence**: See `interview-demo.txt` for expected selection flow.

---

### Scenario 2.3: Completed interview updates status to `proposed`

**Status**: ✅ PASS

**Verification**:
- `.claude/commands/interview.md` Step 6 updates status from `needs-interview` to `proposed`
- Step 5 creates/updates GitHub issue
- Step 7 refines scores with full information
- Step 8 proceeds to strategic review

---

### Scenario 3.1: Agent suggests deferring for minimal detail ideas

**Status**: ✅ PASS

**Verification**:
- `.claude/commands/idea.md` Step 2 includes minimal detail detection
- Indicators defined: short description, vague terms, missing problem statement
- User offered choice to proceed with interview or defer

---

### Edge Case: No items returns "No items awaiting interviews"

**Status**: ✅ PASS

**Verification**:
- `.claude/commands/interview.md` includes "No Items Path" output format
- Step 1 explicitly handles case when no items found

---

### Edge Case: `/speckit.start` rejects `needs-interview` items

**Status**: ✅ PASS

**Verification**:
- `.claude/commands/speckit.start.md` Step 3 includes `needs-interview` validation check
- Error message: "Item {ID} needs interview first. Run `/interview` to complete requirements gathering."
- Status Flow diagram shows blocked path from `needs-interview`

---

## Summary

| Category | Pass | Fail | Total |
|----------|------|------|-------|
| User Story 1 (Quick Capture) | 2 | 0 | 2 |
| User Story 2 (Batch Interview) | 3 | 0 | 3 |
| User Story 3 (Agent Recognition) | 1 | 0 | 1 |
| Edge Cases | 2 | 0 | 2 |
| **Total** | **8** | **0** | **8** |

**All acceptance scenarios verified.** The implementation is complete and ready for review.
