# Feature Specification: Add 'needs-interview' Status to Backlog Workflow

**Feature Branch**: `019-needs-interview-status`
**Created**: 2026-01-26
**Status**: Draft
**Input**: User description: "Add 'needs-interview' status to backlog workflow"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Defer Interview for Quick Capture (Priority: P1)

A user has a flash of inspiration but limited time. They want to capture the idea immediately without committing to a full interview session.

**Why this priority**: This is the core value proposition. Quick capture without blocking on detailed requirements gathering enables more ideas to be captured when inspiration strikes.

**Independent Test**: Can be fully tested by running `/idea --defer "My quick idea"` and verifying the item appears in BACKLOG.md with status `needs-interview`. Delivers immediate value by preventing idea loss.

**Acceptance Scenarios**:

1. **Given** a user has an idea but limited time, **When** they run `/idea --defer "Add batch export feature"`, **Then** the idea is captured in BACKLOG.md with status `needs-interview` and preliminary scores.
2. **Given** an idea is captured with `--defer`, **When** the user views BACKLOG.md, **Then** they can see which items need interviews by their status column.

---

### User Story 2 - Batch Interview Processing (Priority: P2)

A user has dedicated time to work through deferred ideas. They want to see all pending interviews and process them efficiently.

**Why this priority**: Without the ability to process deferred items, the `needs-interview` status would create a dead end. This story enables the workflow to complete.

**Independent Test**: Can be fully tested by having items with `needs-interview` status, running `/interview`, selecting an item, completing the interview, and verifying the status changes to `proposed`.

**Acceptance Scenarios**:

1. **Given** three items exist with status `needs-interview`, **When** the user runs `/interview`, **Then** they see a numbered list of all items awaiting interviews with their IDs and descriptions.
2. **Given** the interview list is displayed, **When** the user selects an item, **Then** the standard interview process begins for that item.
3. **Given** an interview completes successfully, **When** the interview summary is saved, **Then** the item's status changes from `needs-interview` to `proposed` and scores are updated.

---

### User Story 3 - Agent Recognition of Insufficient Detail (Priority: P3)

When agents (opportunity-scout, ideas-guy) evaluate an idea, they recognize when captured information is insufficient and can mark items appropriately.

**Why this priority**: Enables agents to proactively flag items needing more detail rather than proceeding with incomplete information or blocking entirely.

**Independent Test**: Can be fully tested by submitting a vague idea through `/idea` and verifying the agent suggests using `--defer` or marks the item as `needs-interview` when detail is clearly insufficient.

**Acceptance Scenarios**:

1. **Given** an idea is submitted with minimal detail (e.g., "improve performance"), **When** the scout evaluates it, **Then** the agent suggests deferring the interview or asks if the user wants to proceed with limited information.
2. **Given** preliminary scoring occurs for a deferred item, **When** scores are assigned, **Then** a note indicates scores are preliminary and may change after interview.

---

### Edge Cases

- What happens when no items have `needs-interview` status? Display "No items awaiting interviews" and exit gracefully.
- What happens when a user tries to `/speckit.start` an item with `needs-interview` status? Display error: "Item {ID} needs interview first. Run `/interview` to complete requirements gathering."
- How does the system handle interrupted interviews? The item remains `needs-interview`; partial progress is not saved.
- What happens if an item already has a GitHub issue link? The interview updates the existing issue rather than creating a new one.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: BACKLOG.md MUST document `needs-interview` as a valid status in the workflow section, positioned before `proposed` in the workflow flow.
- **FR-002**: The `/idea` command MUST accept a `--defer` flag that skips the interview and sets status to `needs-interview`.
- **FR-003**: When `--defer` is used, the system MUST still capture preliminary V/M/A scores based on available information.
- **FR-004**: The `/interview` command MUST list all backlog items with status `needs-interview`.
- **FR-005**: The `/interview` command MUST allow selection of a single item to process.
- **FR-006**: After interview completion, the system MUST update the item's status from `needs-interview` to `proposed`.
- **FR-007**: After interview completion, the system MUST update V/M/A scores based on newly gathered information.
- **FR-008**: The `/speckit.start` command MUST reject items with status `needs-interview` with a clear error message.
- **FR-009**: Interview questions MUST favor multiple-choice format to streamline the interview process.
- **FR-010**: Interview questions MUST be asked one at a time to avoid overwhelming the user.
- **FR-011**: The interview MUST update the existing GitHub issue (if present) rather than creating a duplicate.

### Key Entities

- **Backlog Item**: Extended to include `needs-interview` as a valid status value between initial capture and `proposed`.
- **Interview Session**: Represents an in-progress interview, tracking the target item ID, questions asked, and answers received.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can capture an idea in under 30 seconds using the `--defer` flag, compared to 2-5 minutes for a full interview.
- **SC-002**: 100% of items with `needs-interview` status are visible when running `/interview`.
- **SC-003**: After completing an interview, 100% of items transition to `proposed` status.
- **SC-004**: The `/speckit.start` command correctly rejects `needs-interview` items with an actionable error message 100% of the time.
- **SC-005**: Users can complete a deferred interview in a single session without needing to re-enter previously captured information.
