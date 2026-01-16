---
description: Submit an idea to the opportunity-scout and orchestrate it through the full backlog-to-spec pipeline. Handles evaluation, scoring, approval, and spec creation in one flow.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** have an idea description provided.

## Purpose

This command orchestrates the full pipeline from idea to specification, reducing manual handoffs:

```
IDEA → scout evaluates → backlog → score → approve → /speckit.start
              ↑              ↑        ↑        ↑           ↑
           (auto)         (auto)   (auto)   (auto)    (auto if approved)
```

The human suggests an idea; the scout evaluates it; the system handles the rest.

## Execution Flow

### Step 1: Parse the Idea

Extract from `$ARGUMENTS`:
- **Description**: The feature/enhancement idea
- **Category** (optional): Feature, Enhancement, Bug, Tech Debt, Infrastructure, Documentation
  - If not specified, infer from description

If no description provided:
> "Please provide an idea description, e.g., `/idea Add track interpolation for gaps > 5 minutes`"

### Step 2: Scout Evaluation

Act as the **opportunity-scout**:

1. Read `STRATEGY.md` — check current phase, themes, parking lot
2. Read `CONSTITUTION.md` — check for conflicts
3. Apply **hard filters**:
   - Can it work offline? (CONSTITUTION requirement)
   - Does it conflict with CONSTITUTION.md?
   - Is it already in the Parking Lot?

4. If hard filter fails → STOP with explanation:
   > "This idea can't proceed because: {reason}"

5. Apply **soft filters** (flag, don't reject):
   - Theme fit uncertain?
   - Phase fit uncertain?
   - Scope unclear?

6. If passes hard filters → proceed to Step 3

Report: "Scout evaluation: ✅ Passes hard filters" (with any soft filter flags)

### Step 3: Add to Backlog

1. Read `BACKLOG.md`
2. Find the next available ID (scan existing IDs, use max + 1)
3. Add row with any flags from scout evaluation:
   ```
   | {ID} | {Category} | {Description} | - | - | - | - | proposed |
   ```
4. Save BACKLOG.md

Report: "Added as item {ID}"

### Step 3: Score the Item

Act as the **backlog-prioritizer**:

1. Read the item description
2. Read `STRATEGY.md` for scoring guidance
3. Score each dimension:
   - **Value (V)**: How much does this improve Debrief's capability? (1-5)
   - **Media (M)**: How interesting for blog/LinkedIn? (1-5)
   - **Autonomy (A)**: How suitable for AI implementation? (1-5)
4. Update BACKLOG.md with scores
5. Report scores with brief rationale

### Step 4: Strategic Review

Act as the **ideas-guy** in Approval Mode:

1. Read `STRATEGY.md` (current phase, themes, criteria)
2. Evaluate the item:
   - Does it serve an active theme?
   - Does it fit the current phase?
   - Does it conflict with CONSTITUTION.md?
   - Is it already in the Parking Lot?

3. Decide:
   - **Approve**: Change status to `approved`, continue to Step 5
   - **Park**: Move to Parking Lot, STOP and explain why
   - **Reject**: Log in Rejected Items, STOP and explain why

### Step 5: Trigger Specification (if approved)

If the item was approved:

1. Report: "Item {ID} approved. Starting specification workflow..."
2. Hand off to `/speckit.start {ID}` via the handoff button below

If parked or rejected:
- Explain the decision
- Suggest alternatives or timing for revisit
- STOP (do not trigger speckit)

## Output Format

### Success Path (Approved)
```
## Idea Pipeline: {Description}

### 1. Added to Backlog
Item **{ID}** added as {Category}

### 2. Scored
| V | M | A | Total |
|---|---|---|-------|
| {V} | {M} | {A} | {Total} |

**Rationale**: {brief explanation}

### 3. Strategic Review
✅ **Approved** — {reason}

### 4. Ready for Specification
Click the handoff below to start `/speckit.start {ID}`
```

### Parked Path
```
## Idea Pipeline: {Description}

### 1. Added to Backlog
Item **{ID}** added as {Category}

### 2. Scored
| V | M | A | Total |
|---|---|---|-------|
| {V} | {M} | {A} | {Total} |

### 3. Strategic Review
🅿️ **Parked** — {reason}

Moved to STRATEGY.md Parking Lot.
**Revisit when**: {condition}

Item remains in backlog as `proposed` for future consideration.
```

### Rejected Path
```
## Idea Pipeline: {Description}

### 1. Added to Backlog
Item **{ID}** added as {Category}

### 2. Scored
| V | M | A | Total |
|---|---|---|-------|
| {V} | {M} | {A} | {Total} |

### 3. Strategic Review
❌ **Rejected** — {reason}

Logged in STRATEGY.md Rejected Items.
Item removed from backlog.
```

## Handoff

Only if approved:
- Label: "Start Specification"
- Command: `/speckit.start {ID}`

## Fast-Track Option

If the human says `/idea --fast {description}`:
- Skip detailed reporting
- Just output: "Item {ID}: {status} — {one-line reason}"
- Still trigger speckit.start if approved

## Error Handling

| Scenario | Action |
|----------|--------|
| No description | Ask for one |
| BACKLOG.md not found | ERROR |
| STRATEGY.md not found | ERROR |
| Duplicate description | Warn but proceed (different IDs allowed) |

## Example Usage

```
Human: /idea Add progress indicators during long file imports