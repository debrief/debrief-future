---
description: Submit an idea to the opportunity-scout for evaluation and capture in the backlog. Handles evaluation, scoring, and approval decision — but stops there. Use /speckit.start to begin implementation later.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** have an idea description provided.

## Agent References

| Role | Agent File |
|------|------------|
| Scout (evaluation + interview) | `.claude/agents/backlog/opportunity-scout.md` |
| Prioritizer (scoring) | `.claude/agents/backlog/backlog-prioritizer.md` |
| Ideas Guy (approval) | `.claude/agents/backlog/the-ideas-guy.md` |

**Read these agent files** when acting in each role to understand the detailed protocols.

## Purpose

This command captures requirements through an adaptive interview:

```
IDEA → scout evaluates → INTERVIEW → summarize → GitHub issue → backlog → score → approve
              ↑              ↑            ↑            ↑            ↑        ↑        ↑
           (auto)      (interactive)   (auto)      (auto)       (auto)   (auto)   (auto)
```

The human suggests an idea; the scout interviews to gather detail; the system creates a **summarized** GitHub issue (not raw Q&A), links it in the backlog, then scores and decides.

**Implementation happens separately**: When ready to implement an approved item, run `/speckit.start {ID}`.

## Execution Flow

### Step 1: Parse the Idea

Extract from `$ARGUMENTS`:
- **Description**: The feature/enhancement idea
- **Category** (optional): Feature, Enhancement, Bug, Tech Debt, Infrastructure, Documentation
  - If not specified, infer from description
- **Flags**:
  - `--defer`: Skip interview, capture quickly with preliminary scores (status: `needs-interview`)
  - `--fast`: Skip interview and detailed reporting (existing option)

If no description provided:
> "Please provide an idea description, e.g., `/idea Add track interpolation for gaps > 5 minutes`"

**Defer Mode**: If `--defer` is present, skip Step 3 (Interview) and Step 4 (GitHub Issue). The idea will be captured with minimal detail and marked as `needs-interview` for later processing via `/interview`.

### Step 2: Scout Evaluation

**First**, read the opportunity-scout agent definition at `.claude/agents/backlog/opportunity-scout.md` to understand your role and interview approach.

Then act as the **opportunity-scout**:

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

### Step 2a: Defer Path (if `--defer` flag)

If `--defer` is present, skip the full interview:

1. **Capture minimal detail**: Use only the provided description
2. **Skip GitHub issue creation**: No issue created yet (will be created during `/interview`)
3. **Proceed directly to Step 5**: Add to backlog with status `needs-interview`

Report: "⏭️ Deferring interview — capturing for later processing"

Continue to Step 5, skipping Steps 3 and 4.

### Step 3: Interview (Interactive)

Follow the **Interview Mode** protocol defined in `.claude/agents/backlog/opportunity-scout.md`.

Conduct an **adaptive conversation** to gather enough detail for implementation:

1. **Assess what's missing** based on the idea type:
   - Feature: What problem does it solve? Who benefits? What does success look like?
   - Enhancement: What's the current limitation? What's the desired behavior?
   - Bug: What's broken? Steps to reproduce? Expected vs actual?
   - Tech Debt: What's the current pain? What's the cleaner state?
   - Infrastructure: What capability is needed? What unblocks?

2. **Ask clarifying questions** (use AskUserQuestion tool):
   - Start with the most important unknowns
   - Ask follow-up questions based on answers
   - Continue until confident you have enough detail for `/speckit.start`
   - Typical: 2-5 questions depending on complexity

3. **Stop interviewing when you have**:
   - Clear problem statement
   - Success criteria or acceptance conditions
   - Key constraints (if any)
   - Scope boundaries (what's in/out)

**Example questions by type**:
- "What triggers this? User action, system event, or scheduled?"
- "What should happen when X fails?"
- "Is this blocking other work, or nice-to-have?"
- "Should this work offline? (CONSTITUTION requires it)"

### Step 4: Create GitHub Issue

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
     ```

2. Capture the issue number and URL

Report: "Created issue #{number}: {title}"

### Step 5: Add to Backlog

1. Read `BACKLOG.md`
2. Find the next available ID (scan existing IDs, use max + 1)
3. Add row to the backlog:

   **Normal path** (with GitHub issue):
   ```
   | {ID} | {Category} | [{Short title}](issue_url) | - | - | - | - | - | proposed |
   ```
   - Description is a markdown link to the issue
   - Short title: imperative mood, ~5-10 words (e.g., "Add progress indicators during file imports")

   **Defer path** (no issue yet):
   ```
   | {ID} | {Category} | {Short title} | - | - | - | - | - | needs-interview |
   ```
   - Description is plain text (no link — issue created later during `/interview`)
   - Status is `needs-interview` instead of `proposed`

4. Save BACKLOG.md

Report (normal): "Added as item {ID}, linked to #{issue_number}"
Report (defer): "Added as item {ID} (needs-interview) — run `/interview` later to complete"

### Step 6: Score the Item

Act as the **backlog-prioritizer**:

1. Read the item description (follow link to issue for full context, if available)
2. Read `STRATEGY.md` for scoring guidance
3. Score each dimension:
   - **Value (V)**: How much does this improve Debrief's capability? (1-5)
   - **Media (M)**: How interesting for blog/LinkedIn? (1-5)
   - **Autonomy (A)**: How suitable for AI implementation? (1-5)
4. Update BACKLOG.md with scores
5. Report scores with brief rationale

**Defer path**: When `--defer` is used, scores are **preliminary** based on limited information:
- Mark scores with `[preliminary]` in the rationale
- Scores will be refined during `/interview` when full detail is available
- Report: "Preliminary scores (will be refined during interview)"

### Step 7: Strategic Review (Final Step)

Act as the **ideas-guy** in Approval Mode:

1. Read `STRATEGY.md` (current phase, themes, criteria)
2. Evaluate the item:
   - Does it serve an active theme?
   - Does it fit the current phase?
   - Does it conflict with CONSTITUTION.md?
   - Is it already in the Parking Lot?

3. Decide:
   - **Approve**: Change status to `approved`, report success
   - **Park**: Move to Parking Lot, explain why
   - **Reject**: Log in Rejected Items, explain why

4. Report the decision and STOP

**Do NOT trigger `/speckit.start`** — implementation is a separate decision made later.

## Output Format

### Success Path (Approved)
```
## Idea Pipeline: {Description}

### 1. Scout Evaluation
✅ Passes hard filters

### 2. Interview Complete
Captured: {summary of what was learned}

### 3. Issue Created
#{issue_number}: [{title}]({url})

### 4. Added to Backlog
Item **{ID}** added as {Category}

### 5. Scored
| V | M | A | Total |
|---|---|---|-------|
| {V} | {M} | {A} | {Total} |

**Rationale**: {brief explanation}

### 6. Strategic Review
✅ **Approved** — {reason}

### Next Step
When ready to implement, run: `/speckit.start {ID}`
```

### Parked Path
```
## Idea Pipeline: {Description}

### 1. Scout Evaluation
✅ Passes hard filters

### 2. Interview Complete
Captured: {summary of what was learned}

### 3. Issue Created
#{issue_number}: [{title}]({url})

### 4. Added to Backlog
Item **{ID}** added as {Category}

### 5. Scored
| V | M | A | Total |
|---|---|---|-------|
| {V} | {M} | {A} | {Total} |

### 6. Strategic Review
🅿️ **Parked** — {reason}

Moved to STRATEGY.md Parking Lot.
**Revisit when**: {condition}

Item remains in backlog as `proposed` for future consideration.
Issue remains open for when revisited.
```

### Rejected Path
```
## Idea Pipeline: {Description}

### 1. Scout Evaluation
✅ Passes hard filters

### 2. Interview Complete
Captured: {summary of what was learned}

### 3. Issue Created
#{issue_number}: [{title}]({url})

### 4. Added to Backlog
Item **{ID}** added as {Category}

### 5. Scored
| V | M | A | Total |
|---|---|---|-------|
| {V} | {M} | {A} | {Total} |

### 6. Strategic Review
❌ **Rejected** — {reason}

Logged in STRATEGY.md Rejected Items.
Item removed from backlog.
Issue closed with rejection reason.
```

### Deferred Path (--defer flag)
```
## Quick Capture: {Description}

### 1. Scout Evaluation
✅ Passes hard filters

### 2. Interview Deferred
⏭️ Skipping detailed interview for quick capture

### 3. Added to Backlog
Item **{ID}** added as {Category}
Status: `needs-interview`

### 4. Preliminary Scores
| V | M | A | Total |
|---|---|---|-------|
| {V} | {M} | {A} | {Total} |

**Note**: Scores are preliminary based on limited information.

### Next Steps
- Run `/interview` later to complete requirements gathering
- Interview will create GitHub issue and refine scores
- After interview, item proceeds to normal approval flow
```

## Defer Option

If the human says `/idea --defer {description}`:
- **Skip the interview** — capture the idea with minimal detail
- **Skip GitHub issue creation** — issue will be created during `/interview`
- Set status to `needs-interview` instead of `proposed`
- Assign preliminary scores with note they may change
- Output the deferred path format above

Use `--defer` when you want to capture an idea quickly without committing to a full interview session. Later, run `/interview` to process all deferred items.

## Fast-Track Option

If the human says `/idea --fast {description}`:
- **Skip the interview** — use only the provided description
- Create a minimal GitHub issue (just the description, no structured sections)
- Skip detailed reporting
- Just output: "Issue #{number} → Item {ID}: {status} — {one-line reason}"
- Do NOT trigger speckit.start (user must run it manually when ready)

Note: Fast-track is for well-understood ideas. For complex features, the interview ensures enough detail for implementation.

## Error Handling

| Scenario | Action |
|----------|--------|
| No description | Ask for one |
| BACKLOG.md not found | ERROR — stop workflow |
| STRATEGY.md not found | ERROR — stop workflow |
| `gh` CLI not available | Fall back to local file (see below) |
| `gh issue create` fails | Fall back to local file (see below) |
| Duplicate description | Warn but proceed (different IDs allowed) |

### GitHub Issue Fallback

GitHub issue is preferred, but if `gh` CLI is unavailable or fails:

1. **Create local file** at `docs/ideas/{ID}-{slug}.md` with the same structured content
2. **Link backlog to local file**: `[Title](docs/ideas/{ID}-{slug}.md)`
3. **Warn user**: "GitHub issue creation failed — saved locally. Create issue manually when `gh` is available."

The backlog must always link to *something* — either GitHub issue URL or local file path.

## Example Usage

### Standard Idea (with interview)
```
Human: /idea Add progress indicators during long file imports
```
→ Scout evaluates → Interview → GitHub issue → Backlog → Score → Approve

### Deferred Idea (quick capture)
```
Human: /idea --defer Add batch export feature for reports
```
→ Scout evaluates → Skip interview → Backlog (needs-interview) → Preliminary scores
→ Later: `/interview` → Complete requirements → GitHub issue → Approve

### Fast-Track Idea (minimal output)
```
Human: /idea --fast Add track interpolation for gaps > 5 minutes