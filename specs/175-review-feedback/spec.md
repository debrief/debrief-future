# Feature Specification: Review Feedback

**Feature Branch**: `175-review-feedback`
**Created**: 2026-03-30
**Status**: Draft
**Input**: User description: "Analysts and reviewers can attach review feedback to any STAC plot. Feedback is stored as an array of review items per plot. The STAC Catalog Browser surfaces feedback state through visual indicators and filter controls; individual items can be resolved, edited, or deleted."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add Review Feedback to a Plot (Priority: P1)

A reviewer examines a plot in the STAC Catalog Browser and wants to leave feedback for the analyst who created it. They open the plot's detail view, click "Add review note", type their observation (e.g. "Track solution diverges after 14:30Z"), and save. The feedback item appears immediately in the Review section with a "pending" status. The plot's entry in the catalog list now displays an amber "Review" badge.

**Why this priority**: Creating feedback is the foundational action that all other review workflows depend on. Without the ability to add feedback, no other review feature has value.

**Independent Test**: Can be fully tested by opening any plot, adding a review note, and verifying it appears with correct metadata (author, timestamp, pending status) and the plot badge updates.

**Acceptance Scenarios**:

1. **Given** a plot with no existing feedback, **When** a user adds a review note, **Then** the note is saved with status "pending", author and timestamps are populated, and the plot displays an amber "Review" badge in the catalog list.
2. **Given** a plot with existing feedback, **When** a user adds another review note, **Then** both notes appear in the Review section ordered chronologically, and the plot retains the amber "Review" badge.
3. **Given** a user submits a review note, **When** the note is saved, **Then** the note text, author, and created timestamp are displayed in the plot's detail view.

---

### User Story 2 - Resolve and Reopen Feedback Items (Priority: P2)

An analyst receives review feedback and addresses the concern. They open the plot detail view, find the relevant feedback item, and click "Mark as resolved". The item's status changes to "resolved" and records who resolved it and when. If a reviewer later disagrees, they can click "Reopen" to return it to "pending" status, and the resolution cycle is recorded in the item's history.

**Why this priority**: The resolve/reopen workflow is the core review loop that enables collaborative quality assurance between analysts and reviewers.

**Independent Test**: Can be tested by adding a feedback item, resolving it, verifying resolution metadata, then reopening it and verifying the resolution history is recorded.

**Acceptance Scenarios**:

1. **Given** a plot with a pending feedback item, **When** a user clicks "Mark as resolved", **Then** the item status changes to "resolved", the resolver's name and timestamp are recorded, and the plot badge updates based on remaining items.
2. **Given** a plot where all feedback items are resolved, **When** the last item is resolved, **Then** the plot badge changes from amber "Review" to muted "Reviewed".
3. **Given** a resolved feedback item, **When** a user clicks "Reopen", **Then** the item returns to "pending" status, the previous resolution is moved to the resolution history, and the plot badge updates to amber "Review".
4. **Given** a feedback item that has been resolved and reopened multiple times, **When** viewing the item, **Then** a collapsible audit trail shows each resolve/reopen cycle with who and when.

---

### User Story 3 - Filter Plots by Review Status (Priority: P3)

An analyst wants to find all their plots that have outstanding review feedback. They use the "Review status" dropdown in the STAC Catalog Browser filter bar, selecting "Pending review". The catalog list updates to show only plots with at least one pending feedback item. Alternatively, a reviewer selects "No feedback" to find plots that have not yet been reviewed.

**Why this priority**: Filtering enables efficient triage of review feedback across large catalogs, making the review workflow practical at scale.

**Independent Test**: Can be tested by creating plots with varying feedback states (none, pending, all resolved) and verifying each filter option returns the correct subset.

**Acceptance Scenarios**:

1. **Given** a catalog with plots in various feedback states, **When** the user selects "Pending review" from the Review status filter, **Then** only plots with at least one pending feedback item are shown.
2. **Given** a catalog with plots in various feedback states, **When** the user selects "All reviewed", **Then** only plots where all feedback items are resolved are shown.
3. **Given** a catalog with plots in various feedback states, **When** the user selects "No feedback", **Then** only plots with no feedback property are shown.
4. **Given** the Review status filter is set to a non-default value, **When** the user selects "All", **Then** all plots are shown regardless of feedback state.

---

### User Story 4 - Edit a Feedback Note (Priority: P4)

A reviewer realises their original note was unclear or contained an error. They open the plot detail view, find their feedback item, click "Edit", update the note text, and save. The note text is updated, an "edited" indicator appears, and the edit is recorded in the Analysis Log.

**Why this priority**: Editing supports accuracy of review records, though it is less frequently used than adding or resolving feedback.

**Independent Test**: Can be tested by adding a feedback item, editing its note text, and verifying the updated text is shown with an "edited" indicator and correct timestamps.

**Acceptance Scenarios**:

1. **Given** an existing feedback item, **When** a user edits the note text, **Then** the updated text is displayed, an "edited" indicator appears, and the note_updated_at timestamp is set.
2. **Given** an edited feedback item, **When** viewing the item, **Then** the original author and creation timestamp remain unchanged.

---

### User Story 5 - Delete a Feedback Item (Priority: P5)

A user determines a feedback item is no longer relevant (e.g. added in error) and deletes it. The item is removed from the plot. If it was the last feedback item, the plot's feedback property is removed entirely and the badge disappears.

**Why this priority**: Deletion is a housekeeping action used less frequently, but necessary for maintaining clean review records.

**Independent Test**: Can be tested by adding a feedback item, deleting it, and verifying it is removed from the review section, the badge updates, and deletion is recorded in the Analysis Log.

**Acceptance Scenarios**:

1. **Given** a plot with multiple feedback items, **When** a user deletes one item, **Then** that item is removed and the remaining items are still displayed.
2. **Given** a plot with a single feedback item, **When** the user deletes it, **Then** the review property is removed entirely and the plot no longer shows a feedback badge.
3. **Given** a feedback item is deleted, **When** checking the Analysis Log, **Then** the deletion is recorded as a provenance event with the item ID, deleting user, and timestamp.

---

### Edge Cases

- What happens when two users simultaneously edit the same feedback item? The system uses optimistic locking — the second user receives a conflict notification and must re-fetch before retrying.
- What happens when a user resolves a feedback item while another user is editing its note? The optimistic lock prevents stale writes; the second operation is rejected with a conflict.
- What happens when a plot has hundreds of feedback items? The review section displays all items in chronological order; performance must remain acceptable.
- What happens when the note text is empty? The system must require non-empty note text when creating or editing a feedback item.
- What happens when a plot is deleted while it has feedback? Feedback is deleted along with the plot as part of STAC item removal.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow any user to add a review feedback item to any STAC plot (item).
- **FR-002**: System MUST assign a unique identifier to each feedback item at creation time.
- **FR-003**: System MUST automatically populate the author, creation timestamp, and update timestamp when a feedback item is created.
- **FR-004**: System MUST set the initial status of all new feedback items to "pending".
- **FR-005**: System MUST allow any user to edit the note text of any feedback item, regardless of who authored it.
- **FR-006**: System MUST track when a note was last edited separately from the general update timestamp.
- **FR-007**: System MUST allow any user to delete any feedback item by its identifier.
- **FR-008**: System MUST remove the feedback property entirely from a plot when the last feedback item is deleted.
- **FR-009**: System MUST allow any user to toggle a feedback item's status between "pending" and "resolved".
- **FR-010**: System MUST record the resolver identity and timestamp when a feedback item is resolved.
- **FR-011**: System MUST maintain a history of resolve/reopen cycles, recording who resolved and reopened and when for each cycle.
- **FR-012**: System MUST record all edits and deletions as provenance events in the Analysis Log, capturing item identifier, acting user, and timestamp.
- **FR-013**: System MUST use optimistic locking for feedback operations to prevent conflicting concurrent modifications.
- **FR-014**: System MUST return a conflict notification when an operation is attempted against a stale version of the plot.
- **FR-015**: System MUST display a visual badge on each plot in the catalog list reflecting its derived feedback state (pending, all reviewed, or no feedback).
- **FR-016**: System MUST provide a "Review status" filter in the catalog browser allowing users to filter plots by feedback state: All, Pending review, All reviewed, or No feedback.
- **FR-017**: System MUST display feedback items in the plot detail view in chronological order by creation time, showing note text, author, timestamps, resolution state, and resolution history.
- **FR-018**: System MUST display an "edited" indicator on feedback items whose note has been modified after creation.
- **FR-019**: System MUST require non-empty note text when creating or editing a feedback item.
- **FR-020**: System MUST update the plot's last-modified timestamp whenever feedback is added, edited, deleted, resolved, or reopened.

### Key Entities

- **Review Item**: A single piece of review feedback attached to a plot. Has a unique identifier, note text, status (pending/resolved), author, timestamps for creation, last update, and note edit. May have resolution metadata (resolver, resolution time) and a history of resolve/reopen cycles.
- **Plot (STAC Item)**: The maritime analysis plot that feedback is attached to. Contains zero or more review items. Its derived feedback state (no feedback, pending review, all reviewed) drives visual indicators and filtering.
- **Resolution History Entry**: A record of one complete resolve-then-reopen cycle, capturing who resolved, when, who reopened, and when.
- **Provenance Event**: An entry in the Analysis Log recording an edit or deletion action against a feedback item, including item identifier, acting user, and timestamp.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Review and provide quality feedback on STAC plots to improve analysis accuracy.
- **Key Decision(s)**:
  1. Which plots need attention (filtering by review status to find plots requiring review or with outstanding feedback).
  2. How to respond to a specific feedback item (resolve it, edit it, or delete it).
  3. What feedback to add to a plot (composing meaningful review notes).
- **Decision Inputs**: Plot metadata (title, owner, dates), existing feedback items with their statuses, visual badges showing review state at a glance, filter controls to narrow down plots needing attention.

### Screen Progression

| Step | Screen/State               | User Action                            | Result                                                                 |
|------|----------------------------|----------------------------------------|------------------------------------------------------------------------|
| 1    | Catalog list view          | Scan badges to identify plots needing review | Amber "Review" badges highlight plots with pending feedback            |
| 2    | Catalog list view          | Select "Review status" filter          | List filters to show only plots matching the selected feedback state    |
| 3    | Catalog list view          | Click a plot to open detail view       | Plot detail view opens with Review section visible                     |
| 4    | Plot detail — Review section | Read existing feedback items           | User sees note text, author, timestamps, and resolution state per item |
| 5    | Plot detail — Review section | Click "Add review note"                | Text input appears for composing a new note                            |
| 6    | Plot detail — Add note     | Type note text and save                | New feedback item appears in the list with "pending" status            |
| 7    | Plot detail — Review section | Click "Mark as resolved" on an item    | Item status changes to "resolved" with resolver info displayed         |
| 8    | Plot detail — Review section | Click "Edit" on an item                | Note text becomes editable                                             |
| 9    | Plot detail — Edit note    | Modify text and save                   | Updated text is displayed with "edited" indicator                      |

### UI States

- **Empty State**: Plot detail view shows "No review feedback" message with a prominent "Add review note" button.
- **Loading State**: While saving or updating feedback, the affected item shows a brief saving indicator. The action button is disabled to prevent duplicate submissions.
- **Error State**: If a conflict occurs (another user modified the plot), an inline message explains the conflict and prompts the user to refresh and retry.
- **Success State**: After adding, editing, resolving, reopening, or deleting a feedback item, the Review section updates immediately to reflect the change, and the plot's badge in the catalog list updates accordingly.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add a review feedback item to any plot in under 30 seconds, including opening the plot detail view, typing the note, and saving.
- **SC-002**: Users can identify all plots with pending review feedback in the catalog within 10 seconds using the Review status filter.
- **SC-003**: 100% of feedback operations (create, edit, delete, resolve, reopen) are recorded as provenance events in the Analysis Log.
- **SC-004**: Concurrent modifications by multiple users are detected and communicated via conflict notifications — no silent data loss occurs.
- **SC-005**: Users can resolve or reopen a feedback item in a single action (one click) from the plot detail view.
- **SC-006**: The complete resolve/reopen history for any feedback item is accessible from the plot detail view without navigating to another screen.
- **SC-007**: Review status badges on catalog list entries update within 2 seconds of any feedback state change.

## Assumptions

- User identity (author/resolver) is available from the current session context; no separate authentication flow is needed for this feature.
- The existing STAC Catalog Browser filter bar infrastructure supports adding new filter categories (Review status) without architectural changes.
- The Analysis Log (provenance tracking) already exists and accepts new event types; this feature contributes events but does not build the log itself.
- No notifications are sent for review feedback actions — users discover pending feedback through the filter controls and visual badges.
- All feedback operations are local (offline-capable), consistent with the "offline by default" principle.
