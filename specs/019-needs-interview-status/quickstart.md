# Quickstart: needs-interview Workflow

**Feature**: 019-needs-interview-status
**Date**: 2026-01-26

## Quick Capture with Deferred Interview

### Capture an Idea Quickly

When you have an idea but limited time:

```text
/idea --defer Add batch export for multiple plots
```

**What happens:**
1. Scout performs initial evaluation (hard filters only)
2. Preliminary V/M/A scores assigned
3. Item added to BACKLOG.md with status `needs-interview`
4. Description marked with `[preliminary]`
5. GitHub issue created with minimal content

**Output:**
```
## Idea Captured (Interview Deferred)

Item **030** added to backlog with status `needs-interview`

| V | M | A | Total |
|---|---|---|-------|
| 3 | 2 | 4 | 9 (preliminary) |

Run `/interview` when ready to complete requirements gathering.
```

### Process Deferred Items

When you have time for detailed interviews:

```text
/interview
```

**What happens:**
1. Lists all items with status `needs-interview`
2. Prompts for item selection
3. Conducts interview with multiple-choice questions
4. Updates item: status → `proposed`, scores refined, issue updated

**Output:**
```
## Items Awaiting Interview

| # | ID | Category | Description | Preliminary Score |
|---|-----|----------|-------------|-------------------|
| 1 | 030 | Feature | Add batch export for multiple plots | 9 |
| 2 | 031 | Enhancement | Improve timeline zoom controls | 7 |

Enter item ID to begin interview:
```

### Interview Flow

Each question uses a multiple-choice format:

```markdown
## Question 1 of 4: Export Format

**Context**: You mentioned batch export for multiple plots.

| Option | Answer | Implications |
|--------|--------|--------------|
| A | PDF only | Single format, simpler implementation |
| B | PDF and PNG | Two formats, more user flexibility |
| C | Configurable formats | Maximum flexibility, more complex |
| Custom | Other | Describe your preferred approach |

**Your choice**: _
```

After answering all questions:
- Status changes to `proposed`
- Scores updated based on full understanding
- `[preliminary]` removed from description
- GitHub issue updated with complete requirements

## Workflow Integration

### Before Implementation

Items with `needs-interview` cannot be started:

```text
/speckit.start 030
```

**Output:**
```
Error: Item 030 has status `needs-interview`.

Run `/interview` first to complete requirements gathering.
```

### Full Workflow

```text
1. /idea --defer "Quick thought"     → needs-interview
2. /interview                         → proposed
3. (ideas-guy reviews)               → approved
4. /speckit.start 030                → specified
5. ...continues normally...
```
