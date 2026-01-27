---
description: Process deferred backlog items that need detailed requirements gathering. Lists items with 'needs-interview' status and conducts structured interviews to complete their specifications.
---

## User Input

```text
$ARGUMENTS
```

You **MAY** have an item ID provided. If not, list all items needing interviews.

## Agent References

| Role | Agent File |
|------|------------|
| Scout (interview) | `.claude/agents/backlog/opportunity-scout.md` |
| Prioritizer (scoring) | `.claude/agents/backlog/backlog-prioritizer.md` |
| Ideas Guy (approval) | `.claude/agents/backlog/the-ideas-guy.md` |

**Read these agent files** when acting in each role to understand the detailed protocols.

## Purpose

This command processes items captured with `/idea --defer` that need detailed requirements gathering:

```
/interview → list items → select one → INTERVIEW → GitHub issue → update backlog → score → approve
                ↑            ↑             ↑            ↑             ↑            ↑        ↑
            (auto)      (user choice) (interactive)  (auto)        (auto)      (auto)   (auto)
```

The human selects a deferred item; the scout conducts the interview; the system creates a GitHub issue, updates the backlog, refines scores, and proceeds to approval.

## Execution Flow

### Step 1: Parse BACKLOG.md for Pending Interviews

1. Read `BACKLOG.md` from the repository root
2. Find all items with status `needs-interview`
3. Extract for each:
   - **ID**: The item number
   - **Category**: Feature, Enhancement, Bug, Tech Debt, Infrastructure, Documentation
   - **Description**: The brief description text
   - **Preliminary Scores**: V, M, A, Total (may have `[preliminary]` note)

**If no items found**: Display "No items awaiting interviews" and exit.

### Step 2: Display Pending Items

Present a numbered list of items awaiting interviews:

```markdown
## Items Awaiting Interview

| # | ID | Category | Description | Prelim Scores |
|---|----|-----------|--------------|----|
| 1 | 035 | Feature | Add batch export feature | V:3 M:3 A:4 |
| 2 | 037 | Enhancement | Improve search performance | V:4 M:2 A:3 |
| 3 | 039 | Tech Debt | Refactor config loading | V:2 M:1 A:5 |

**Select an item by ID** (e.g., `035`) or **number** (e.g., `1`)

Or run `/interview {ID}` directly to skip this step.
```

### Step 3: Item Selection

Accept user selection:

- **By ID**: `035`, `37`, `#039`
- **By list number**: `1`, `2`, `3`

If `$ARGUMENTS` contains an ID, skip Step 2 and use that ID directly.

**Validate selection**:
- Item exists in BACKLOG.md
- Item has status `needs-interview`
- ERROR if not: "Item {ID} doesn't need an interview (status: {status})"

Report: "Selected item {ID}: {description}"

### Step 4: Conduct Interview

**First**, read the opportunity-scout agent definition at `.claude/agents/backlog/opportunity-scout.md` to understand your role and interview approach.

Then act as the **opportunity-scout** in Interview Mode:

1. **Review existing information**: Read the item's current description and any preliminary notes

2. **Assess what's missing** based on the item category:
   - Feature: What problem does it solve? Who benefits? What does success look like?
   - Enhancement: What's the current limitation? What's the desired behavior?
   - Bug: What's broken? Steps to reproduce? Expected vs actual?
   - Tech Debt: What's the current pain? What's the cleaner state?
   - Infrastructure: What capability is needed? What unblocks?

3. **Ask clarifying questions** (use AskUserQuestion tool):

   **Use multiple-choice format when possible** (FR-009):
   ```
   What is the primary use case for this feature?

   A) Batch processing of multiple files
   B) Single file with progress feedback
   C) Background processing with notifications
   D) Other (please describe)
   ```

   **Ask one question at a time** (FR-010):
   - Wait for answer before asking the next question
   - Adapt follow-up questions based on responses
   - Typical: 3-5 questions depending on complexity

4. **Stop interviewing when you have**:
   - Clear problem statement
   - Success criteria or acceptance conditions
   - Key constraints (if any)
   - Scope boundaries (what's in/out)

Report: "Interview complete — captured {summary}"

### Step 5: Create GitHub Issue

Synthesize the interview into a **summarized feature description** (not raw Q&A):

1. Create a GitHub issue using `gh issue create`:
   - **Title**: Clear, actionable (same style as backlog descriptions)
   - **Body**: Structured summary with sections:
     ```
     ## Problem
     {What problem does this solve?}

     ## Proposed Solution
     {What should be built?}

     ## Success Criteria
     - {Criterion 1}
     - {Criterion 2}

     ## Constraints
     - {Any technical or strategic constraints}

     ## Out of Scope
     - {What this does NOT include}

     ---
     _Originally captured via `/idea --defer`, interview completed via `/interview`_
     ```

2. Capture the issue number and URL

**If item already has an issue** (FR-011):
- Update the existing issue instead of creating a new one
- Use `gh issue edit {number} --body "{new_body}"`
- Add comment noting the interview completion

Report: "Created issue #{number}: {title}" or "Updated issue #{number}"

### Step 6: Update Backlog Status

1. Read `BACKLOG.md`
2. Find the row for the selected item
3. Update the row:
   - Change status from `needs-interview` to `proposed`
   - Convert description to markdown link: `[{Short title}]({issue_url})`
4. Save BACKLOG.md

Report: "Updated item {ID}: status → proposed, linked to #{issue_number}"

### Step 7: Refine Scores

Act as the **backlog-prioritizer**:

1. Read the updated item description (follow link to issue for full context)
2. Read `STRATEGY.md` for scoring guidance
3. Re-score each dimension with full information:
   - **Value (V)**: How much does this improve Debrief's capability? (1-5)
   - **Media (M)**: How interesting for blog/LinkedIn? (1-5)
   - **Autonomy (A)**: How suitable for AI implementation? (1-5)
4. Update BACKLOG.md with refined scores
5. Compare to preliminary scores

Report: "Scores refined: V:{old}→{new} M:{old}→{new} A:{old}→{new}"

### Step 8: Strategic Review (Final Step)

Act as the **ideas-guy** in Approval Mode:

1. Read `STRATEGY.md` (current phase, themes, criteria)
2. Evaluate the item with full detail now available:
   - Does it serve an active theme?
   - Does it fit the current phase?
   - Does it conflict with CONSTITUTION.md?
   - Is it already in the Parking Lot?

3. Decide:
   - **Approve**: Change status to `approved`, report success
   - **Park**: Move to Parking Lot, explain why
   - **Reject**: Log in Rejected Items, explain why

4. Report the decision and STOP

## Output Format

### Success Path (Item Approved)
```
## Interview Complete: {Description}

### 1. Item Selected
ID: {ID} | Category: {Category}
Original capture: {date or "quick capture via --defer"}

### 2. Interview Conducted
Questions asked: {count}
Key findings:
- {finding 1}
- {finding 2}

### 3. Issue Created/Updated
#{issue_number}: [{title}]({url})

### 4. Backlog Updated
Status: `needs-interview` → `proposed`

### 5. Scores Refined
| Dimension | Preliminary | Final | Change |
|-----------|-------------|-------|--------|
| Value | {old_v} | {new_v} | {delta} |
| Media | {old_m} | {new_m} | {delta} |
| Autonomy | {old_a} | {new_a} | {delta} |
| **Total** | {old_total} | {new_total} | {delta} |

### 6. Strategic Review
✅ **Approved** — {reason}

### Next Step
When ready to implement, run: `/speckit.start {ID}`
```

### No Items Path
```
## Interview Queue Empty

No items have status `needs-interview`.

**To add items for later interview:**
- Use `/idea --defer {description}` for quick capture
- Items will appear here for detailed requirements gathering
```

### Invalid Selection Path
```
## Invalid Selection

Item {ID} cannot be interviewed:
- **Current status**: {status}
- **Required status**: `needs-interview`

{guidance based on status}
```

## Error Handling

| Scenario | Action |
|----------|--------|
| No items need interview | Display "No items awaiting interviews" |
| Invalid ID | Ask for valid selection from the list |
| Item wrong status | Explain why and suggest correct action |
| BACKLOG.md not found | ERROR — stop workflow |
| `gh` CLI not available | Fall back to local file (same as /idea) |
| `gh issue create` fails | Fall back to local file (same as /idea) |

### Status Guidance

| Current Status | Guidance |
|----------------|----------|
| `proposed` | "Item already has full detail. No interview needed." |
| `approved` | "Item is approved. Run `/speckit.start {ID}` to begin." |
| `specified` or later | "Item is in progress. Use speckit commands to continue." |
| `complete` | "Item is already complete." |

## Example Usage

### List all pending interviews
```
Human: /interview
```
→ Shows numbered list of needs-interview items

### Interview specific item
```
Human: /interview 035
```
→ Skips list, starts interview for item 035

### Select from list
```
Human: /interview
Claude: [shows list with items 1, 2, 3]
Human: 2
Claude: [starts interview for selected item]
```
