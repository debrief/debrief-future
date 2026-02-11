---
description: Resolve merge conflicts against main. Merges main into the current branch and resolves all conflicts.
---

## User Input

```text
$ARGUMENTS
```

Optional: a merge strategy hint (e.g., "prefer ours for package-lock", "keep their schema changes"). If empty, resolve on a case-by-case basis using best judgement.

## Purpose

When a PR has conflicts against `main`, this command merges `main` into the current feature branch, resolves every conflict, and commits the result — ready to push.

## Execution Flow

### Step 1: Validate State

1. Confirm we are NOT on `main` or `master`. ERROR if so: "Switch to your feature branch first."
2. Confirm the working tree is clean (`git status --porcelain`). If dirty, stash changes automatically and note this for later.

### Step 2: Fetch and Merge

```bash
git fetch origin main
git merge origin/main
```

If the merge completes cleanly (exit 0), skip to Step 4.

### Step 3: Resolve Conflicts

For each conflicted file (from `git diff --name-only --diff-filter=U`):

1. Read the file with conflict markers.
2. Understand both sides:
   - **ours** (HEAD) = the feature branch changes
   - **theirs** (origin/main) = what landed on main
3. Produce a correct merged result that preserves the intent of both sides.
4. Apply the resolution and `git add` the file.

**Resolution principles:**
- Preserve all functional changes from both sides.
- For generated files (lock files, schema outputs), regenerate rather than manually merge when possible.
- For conflicting formatting-only changes, prefer the `main` version.
- If `$ARGUMENTS` contains strategy hints, honour them.
- If a conflict is genuinely ambiguous and cannot be resolved with confidence, list it and ask the user before proceeding.

### Step 4: Complete the Merge

```bash
git commit --no-edit
```

If changes were stashed in Step 1, run `git stash pop`.

### Step 5: Report

Output a summary:

```
## Merge Complete

**Branch**: {current branch}
**Merged**: origin/main → {current branch}
**Conflicts resolved**: {count} file(s)
{list of resolved files, one per line}

Ready to push.
```

## Error Handling

| Scenario | Action |
|----------|--------|
| On main/master | ERROR: switch to feature branch first |
| Dirty working tree | Auto-stash, proceed, pop after |
| Clean merge (no conflicts) | Skip resolution, report success |
| Ambiguous conflict | Ask user before resolving |
| Merge commit fails | Report error, leave state for manual recovery |
