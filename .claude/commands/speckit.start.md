---
description: Start the speckit workflow from a prioritized backlog item. Bridges backlog approval to specification creation.
handoffs:
  - label: Create Specification
    agent: speckit.specify
    prompt: Create a specification for this feature
    send: true
---

## User Input

```text
$ARGUMENTS
```

You **MUST** have a backlog item ID provided (e.g., `007`, `12`, or `003`).

## Purpose

This command bridges the gap between backlog prioritization and the speckit workflow. It:

1. Validates a backlog item is ready for specification
2. Extracts the feature description
3. Updates the backlog status to track progress
4. Hands off to `/speckit.specify` with the feature description

## Execution Flow

### Step 1: Parse Input

Extract the backlog item ID from `$ARGUMENTS`:

- Accept formats: `007`, `7`, `#007`, `#7`, `ID 007`
- Normalize to numeric (e.g., `007` → `7`)
- ERROR if no ID provided: "Please provide a backlog item ID, e.g., `/speckit.start 007`"

### Step 2: Read and Parse BACKLOG.md

1. Read `BACKLOG.md` from the repository root
2. Find the items table (starts with `| ID | Category |`)
3. Locate the row matching the requested ID
4. Extract:
   - **ID**: The item number
   - **Category**: Feature, Enhancement, Bug, Tech Debt, Infrastructure, Documentation
   - **Description**: The feature description text
   - **Scores**: V, M, A, Total (may be `-` if unscored)
   - **Status**: Current status (proposed, specified, etc.)

### Step 3: Validate Item

Check the item is ready for specification:

| Check | Pass Condition | Error Message |
|-------|---------------|---------------|
| Item exists | Row found in table | "Backlog item {ID} not found in BACKLOG.md" |
| Status is approved | Status is `approved` | "Item {ID} has status '{status}'. Only 'approved' items can be started. Ask the-ideas-guy to review and approve the item first." |
| Has description | Description is not empty or `-` | "Item {ID} has no description. Add a description to BACKLOG.md first." |

**Status guidance**:
- `proposed` without scores → needs prioritizer to score
- `proposed` with scores → needs ideas-guy to approve
- `approved` → ready for `/speckit.start`
- `specified` or later → already in progress, use `/speckit.clarify` or `/speckit.plan`

### Step 4: Confirm with User

Present the item details and ask for confirmation:

```markdown
## Starting Speckit Workflow for Backlog Item {ID}

| Field | Value |
|-------|-------|
| ID | {ID} |
| Category | {Category} |
| Description | {Description} |
| Scores | V:{V} M:{M} A:{A} = {Total} |
| Status | {Status} → will become `specified` |

**This will:**
1. Create a new feature branch
2. Generate a specification in `specs/NNN-{short-name}/spec.md`
3. Update BACKLOG.md to link to the spec

Proceed with specification? (The handoff button below will continue)
```

### Step 5: Prepare Handoff

When the user confirms (clicks the handoff button), the description will be passed to `/speckit.specify`.

**Important**: The description from BACKLOG.md becomes the feature description for speckit.specify.

### Step 6: Post-Specification Update (CRITICAL)

After `/speckit.specify` completes successfully, you MUST update BACKLOG.md:

1. **Find the spec file path** from the speckit.specify output (e.g., `specs/007-rep-special-comments/spec.md`)

2. **Update the backlog row**:
   - Change status from `approved` to `specified`
   - Convert description to a markdown link: `[Original Description](specs/NNN-feature-name/spec.md)`

3. **Example transformation**:

   Before:
   ```
   | 007 | Enhancement | Implement REP file special comments | 4 | 4 | 4 | 12 | approved |
   ```

   After:
   ```
   | 007 | Enhancement | [Implement REP file special comments](specs/007-rep-special-comments/spec.md) | 4 | 4 | 4 | 12 | specified |
   ```

4. **Commit the BACKLOG.md update** with message:
   ```
   chore(backlog): mark item {ID} as specified

   Links to specs/{NNN}-{short-name}/spec.md
   ```

### Step 7: Report Completion

After both the spec creation and backlog update:

```markdown
## Speckit Workflow Started

**Backlog Item**: {ID} - {Description}
**Spec Created**: `specs/{NNN}-{short-name}/spec.md`
**Branch**: `{branch-name}`
**Backlog Updated**: Status changed to `specified`

### Next Steps

1. Review the generated specification
2. Run `/speckit.clarify` if clarifications are needed
3. Run `/speckit.plan` to create the implementation plan

### Workflow Progress

```
[x] proposed → [x] approved → [x] specified → [ ] clarified → [ ] planned → [ ] tasked → [ ] implementing → [ ] complete
```
```

## Error Handling

| Scenario | Action |
|----------|--------|
| Item not found | ERROR with suggestion to check BACKLOG.md |
| Item is `proposed` (no scores) | ERROR: "Item needs scoring first. Run backlog-prioritizer." |
| Item is `proposed` (has scores) | ERROR: "Item needs approval. Ask ideas-guy to review." |
| Item already `specified` | Suggest `/speckit.clarify` or `/speckit.plan` instead |
| Item is complete | ERROR: "Item {ID} is already complete" |
| BACKLOG.md not found | ERROR: "BACKLOG.md not found at repository root" |
| Parse failure | ERROR with details, suggest manual inspection |

## Integration Notes

### With the-ideas-guy

This command requires the ideas-guy to have reviewed and approved the item (status: `approved`). The ideas-guy changes status from `proposed` to `approved` during their review.

### With opportunity-scout and backlog-prioritizer

The workflow requires these steps in order:
1. Scout or ideas-guy adds item (status: `proposed`)
2. Prioritizer scores it (still `proposed`, but with V/M/A)
3. Ideas-guy reviews and approves (status: `approved`)
4. `/speckit.start {ID}` creates spec (status: `specified`)

This command validates status is `approved` — it won't proceed with `proposed` items.

### Status Flow

This command requires `approved` status and advances to `specified`:

```
proposed ──[prioritizer scores]──> proposed (with scores)
                                        │
                          [ideas-guy reviews]
                                        │
                                        v
                                    approved
                                        │
                          [/speckit.start] ◄── YOU ARE HERE
                                        │
                                        v
specified ──[/speckit.clarify]──> clarified ──[/speckit.plan]──> planned
                                                                    │
                                                       [/speckit.tasks]
                                                                    │
                                                                    v
                                                                 tasked
                                                                    │
                                                     [/speckit.implement]
                                                                    │
                                                                    v
                                                             implementing ──> complete
```
