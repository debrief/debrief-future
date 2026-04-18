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

### 2d. knip ignore rule + pinned devDep (Contract 4, SC-001, SC-009)

```sh
# Config file exists at repo root
test -f knip.json && echo OK || echo MISSING-KNIP-CONFIG

# knip is pinned exactly in root devDependencies (no ^ or ~)
grep -E '"knip": *"[0-9]+\.[0-9]+\.[0-9]+"' package.json
# Expected: exactly one match (e.g. "knip": "5.31.0")

# Fresh install picks up the pinned version
pnpm install
test -d node_modules/knip && echo OK || echo KNIP-NOT-INSTALLED

# Running the pinned knip reports zero specs/** entries
pnpm exec knip | grep -c "^specs/"
# Expected: 0

# Non-specs findings unchanged (capture baseline before the change, diff after).
# IMPORTANT: capture the baseline from the SAME pinned version so the comparison
# isolates config change from version drift. Do not use `pnpm dlx knip@latest`.
# Baseline from main:   pnpm exec knip > /tmp/knip-main.txt    (run on main branch with the pinned knip installed)
# After:                pnpm exec knip > /tmp/knip-branch.txt  (run on 199-code-quality-cleanup)
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

# Pre-push guard for the literal anti-pattern (FR-020, SC-010)
grep -rn "TODO(#NNN)" apps/ services/ shared/
# Expected: zero matches. A non-zero result means a placeholder escaped review — DO NOT push.

# Loader unit tests pass — exercises the plotName fix AND the new regression test (FR-021)
pnpm --filter @debrief/loader test
# Expected: tests/unit/useLoadWorkflow.test.ts is present and green.

# Sanity: temporarily revert useLoadWorkflow.ts:~73 to `plotName = existingPlotId;`
# and re-run the loader tests. The new test MUST go red. Revert the revert.
# This confirms the test is a real gate, not a false gate (Contract 6 failure mode).
```

**Manual UI check for the `plotName` fix**: open the loader Electron app, select an existing plot whose display name differs from its ID, load a REP file into it, and confirm the progress strings and final toast reference the plot's display name (not the UUID-like ID). The vitest above is the CI gate; this UI check is a belt-and-braces verification that the wiring reaches the screen.

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
- [ ] `knip` is pinned exactly in root `package.json` `devDependencies` (no `^`/`~`); `pnpm install` succeeds.
- [ ] `pnpm exec knip` (pinned, not `pnpm dlx knip@latest`) shows zero `specs/**` entries and no new non-`specs/**` entries hidden versus the same pinned version on `main`.
- [ ] `grep -rn "LogTimelineProps\|LogByFeatureProps" shared/ apps/ services/` returns zero matches.
- [ ] `shared/components/diff/` is deleted and no reference to it survives outside this spec dir.
- [ ] `decisions.md` gains exactly one new ADR entry, discoverable by "cycle" and "type-only".
- [ ] `pnpm --filter @debrief/loader test` is green and includes the new `useLoadWorkflow` regression test (FR-021).
- [ ] Loading an existing plot by a display name distinct from its ID shows the display name in the loader (manual belt-and-braces check).
- [ ] `grep -rn "TODO(#NNN)" apps/ services/ shared/` returns zero matches (FR-020 pre-push guard).
- [ ] All `TODO(#...)` references in the diff resolve to **open** issues in `debrief/debrief-future`.
- [ ] PR description lists the two new issue numbers and notes the `TODO(#137)` audit result.

If every box is checked, this PR is ready for review.
