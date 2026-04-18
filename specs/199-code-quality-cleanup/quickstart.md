# Quickstart: Code-Quality Cleanup — Small-Bucket Consolidation

**Feature**: 199-code-quality-cleanup
**Date**: 2026-04-18

This quickstart is a reproducible script a reviewer or implementer can run from the repo root to verify every sub-change in the PR. All commands assume `pnpm` and `uv` are installed and the feature branch (`199-code-quality-cleanup`) is checked out.

---

## 1. One-shot verification — the whole PR

Before pushing any commit in this PR, run the same command CI runs:

```sh
task verify
```

All three steps (lint, typecheck, test) must pass. If `task` is not installed, fall back to the four-command sequence in the project's `CLAUDE.md` (§ Before Pushing).

---

## 2. Sub-change checks

### 2a. `decisions.md` cycle record (Contract 1, SC-005)

```sh
# Entry exists, discoverable by either keyword
grep -c "^### ADR-" docs/project_notes/decisions.md                    # count has gone up by 1
grep -n -i "cycle" docs/project_notes/decisions.md | tail -n +1        # at least one new match in the new entry
grep -n -i "type-only" docs/project_notes/decisions.md | tail -n +1    # at least one new match in the new entry

# Both cycles named in full
grep -n "mapPanel.*activityPanelView.*calcService" docs/project_notes/decisions.md
grep -n "activityPanelView.*resultsPanelService" docs/project_notes/decisions.md
```

**Expected**: each grep returns at least one line in the newly-added ADR. If any cycle has been eliminated on `main` between branch creation and merge, the ADR is scoped down accordingly (see Contract 1 failure mode).

### 2b. `LogPanelProps` consolidation (Contract 2, SC-002)

```sh
# Old names no longer exported anywhere in the monorepo
grep -rn "LogTimelineProps\|LogByFeatureProps" shared/ apps/ services/ 2>/dev/null
# Expected: zero matches

# Consolidated interface still exists
grep -n "^export interface LogPanelProps" shared/components/src/LogPanel/types.ts
# Expected: exactly one match

# Component source files use the new name
grep -n "LogPanelProps" shared/components/src/LogPanel/LogTimeline.tsx shared/components/src/LogPanel/LogByFeature.tsx
# Expected: at least two matches per file (import + annotation)

# Component package typecheck + unit tests pass
pnpm --filter @debrief/components typecheck
pnpm --filter @debrief/components test
```

### 2c. `shared/components/diff/` removal (Contract 3, SC-003)

```sh
# Directory is gone
test ! -d shared/components/diff && echo OK || echo MISSING-REMOVAL

# No stale references anywhere except this spec directory
grep -rn "shared/components/diff" --exclude-dir=node_modules --exclude-dir=specs
# Expected: zero matches (or only matches inside specs/199-code-quality-cleanup/)

# Install + full verify still pass
pnpm install
task verify
```

### 2d. knip ignore rule (Contract 4, SC-001)

```sh
# Config file exists at repo root
test -f knip.json && echo OK || echo MISSING-KNIP-CONFIG

# Running knip reports zero specs/** entries
pnpm dlx knip | grep -c "^specs/"
# Expected: 0

# Non-specs findings unchanged (capture baseline before the change, diff after)
# Baseline from main:   pnpm dlx knip > /tmp/knip-main.txt    (run on main branch before work)
# After:                pnpm dlx knip > /tmp/knip-branch.txt  (run on 199-code-quality-cleanup)
diff <(grep -v "^specs/" /tmp/knip-main.txt) <(grep -v "^specs/" /tmp/knip-branch.txt)
# Expected: no diff (no non-specs findings were masked)
```

### 2e. Loader `plotName` resolution + TODO promotion (Contract 5)

```sh
# No surviving un-tracked TODOs in the files covered by this PR
grep -n "TODO:" apps/loader/src/main/ipc/config.ts
grep -n "TODO:" apps/loader/src/renderer/components/StoreSelector/index.tsx
grep -n "TODO:" apps/loader/src/renderer/hooks/useLoadWorkflow.ts
# Expected: zero matches in all three

# Tracked TODOs (with issue numbers) exist where expected
grep -n "TODO(#" apps/loader/src/main/ipc/config.ts
grep -n "TODO(#" apps/loader/src/renderer/components/StoreSelector/index.tsx
# Expected: at least one match per file

# Existing TODO(#137) in stacService.ts is still present and unchanged
grep -n "TODO(#137)" apps/vscode/src/services/stacService.ts
# Expected: at least one match

# Loader unit + E2E tests pass (exercises the plotName fix)
pnpm --filter @debrief/loader test
```

**Manual UI check for the `plotName` fix**: open the loader Electron app, select an existing plot whose display name differs from its ID, load a REP file into it, and confirm the progress strings and final toast reference the plot's display name (not the UUID-like ID).

---

## 3. GitHub issue audit (Contract 5b)

After the PR opens, list the freshly-filed issues referenced by the `TODO(#NNN)` markers:

```sh
# (Using the GitHub MCP tools available in the harness — no gh CLI)
# For each new NNN found in the grep step above, verify it is open:
# mcp__github__issue_read issue_number=NNN owner=debrief repo=debrief-future
```

**Expected**: every `TODO(#NNN)` reference in the diff points at an open issue in `debrief/debrief-future` with a remediation hint in the body.

---

## 4. Before-pushing checklist

- [ ] `task verify` passes locally on the feature branch.
- [ ] `pnpm dlx knip` shows zero `specs/**` entries and no new non-`specs/**` entries hidden.
- [ ] `grep -rn "LogTimelineProps\|LogByFeatureProps" shared/ apps/ services/` returns zero matches.
- [ ] `shared/components/diff/` is deleted and no reference to it survives outside this spec dir.
- [ ] `decisions.md` gains exactly one new ADR entry, discoverable by "cycle" and "type-only".
- [ ] Loading an existing plot by a display name distinct from its ID shows the display name in the loader.
- [ ] All `TODO(#NNN)` references in the diff resolve to open issues.
- [ ] PR description lists the two new issue numbers and notes the `TODO(#137)` audit result.

If every box is checked, this PR is ready for review.
