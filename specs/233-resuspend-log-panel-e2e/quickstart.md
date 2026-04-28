# Quickstart: Re-activate Log Panel E2E Suite

**Feature**: 233-resuspend-log-panel-e2e
**Audience**: Operator (developer or AI agent) executing the un-suspend recipe
**Time budget**: ~30 minutes interactive + 3× CI runs in the background

This quickstart is the *executable form* of the spec's `Un-Suspend Recipe` (lines 76–107). Follow it top-to-bottom on a fresh feature branch rebased on a post-#142 main.

---

## Prerequisites

- [x] **#142 merged to main.** Verified — `BACKLOG.md` shows `~~142~~ ... ~~complete~~`; PR #548 (close-out) merged 2026-04-25.
- [x] **Local repo clean.** `git status` shows no unstaged changes before starting.
- [x] **Tooling available.** `task`, `node`, `bash`, `pnpm`, `uv` — see `CLAUDE.md` "Before Pushing" for canonical install commands.
- [ ] **Branch ready.** Already on the feature branch (`233-resuspend-log-panel-e2e` in local; in cloud Claude Code this is `claude/speckit-plan-233-...`). Active feature pinned at `.specify/.active-feature` = `233-resuspend-log-panel-e2e`.

If any unchecked item fails, stop — fix that first.

---

## Step 1 — Sync to post-#142 main

```sh
git fetch origin main
git rebase origin/main
```

Confirm the rebase is clean:

```sh
git log -1 --format='%h %s' origin/main
# Expect to see #142's close-out (e.g. "Merge pull request #548 from debrief/claude/implement-speckit-142-...")
# anywhere in: git log --oneline origin/main | head -10
```

---

## Step 2 — Restore the skip-guard script

```sh
# Restore from the pre-#534 SHA called out in spec.md line 90
git show 5385f6e8:scripts/check-log-panel-skip-guard.sh > scripts/check-log-panel-skip-guard.sh
chmod 0644 scripts/check-log-panel-skip-guard.sh
```

Verify the contract holds against the *current* (still-muted) test file — the guard should **fail** here, because `.fixme` is still present:

```sh
bash scripts/check-log-panel-skip-guard.sh
# Expected exit code: 1
# Expected stdout: ❌ Log-panel skip-guard failed! ... 19:test.describe.fixme(...
```

That failure is the proof the guard works. Proceed to step 3 to remove the violation.

---

## Step 3 — Un-mute the test file

Edit `tests/e2e/test-log-panel.spec.ts`:

1. Replace `test.describe.fixme('Log Panel', () => {` with `test.describe('Log Panel', () => {`.
2. Delete lines 11–18 (the eight-line `// #233 — Re-suspended pending #142 ...` comment block).

After the edit, line 11 should be `test.describe('Log Panel', () => {` (or thereabouts; line numbers shift down by 8 once the comment is gone).

Verify the guard now passes:

```sh
bash scripts/check-log-panel-skip-guard.sh
# Expected exit code: 0
# Expected stdout: ✅ Log-panel skip-guard passed (...)
```

---

## Step 4 — Re-wire the skip-guard into `Taskfile.yml`

Edit `Taskfile.yml`:

1. Locate the `lint:` task block (currently around line 105).
2. Delete the six-line `# #210's log-panel skip-guard removed 2026-04-24 per spec 233 ...` comment (currently lines 115–120).
3. In the same place, add this one line (immediately after `bash scripts/check-adr-refs.sh`):

   ```yaml
       - bash scripts/check-log-panel-skip-guard.sh
   ```

Verify:

```sh
task lint
# Expected: all lint steps green, including the new skip-guard line.
```

---

## Step 5 — Run the suite locally

The canonical Playwright invocation (matches CI — see `.github/workflows/e2e.yml` line 193):

```sh
npx playwright test --config tests/e2e/playwright.config.ts test-log-panel
```

> **Note**: earlier drafts of this quickstart referenced
> `node apps/vscode/tests/e2e/run-playwright.mjs test-log-panel` by analogy
> with the web-shell and spec-navigator runners. That file does not exist —
> the VS Code E2E suite uses the root-level `tests/e2e/playwright.config.ts`
> directly. Use the `npx playwright test ...` form above.

**Expected outcome**: 5 tests passed, 0 failed, 0 skipped.

If any test fails, **stop**. Triage that specific failure — #142 may be incomplete, or a residual flake survived. The spec's `Edge Cases` section (line 60) describes the narrow-mute fallback (per-test `test.fixme` rather than re-`.describe.fixme`-ing the whole block).

---

## Step 5b — Dispose the superseded webview-injection POC (FR-006)

The probe at `tests/e2e/test-webview-probe.spec.ts` is explicitly marked superseded by `tests/e2e/test-webview-resolve.spec.ts` (see the inline comment on line 44). Delete it:

```sh
# 1. Confirm the replacement exists and is active (not muted):
grep -n "test\.describe\." tests/e2e/test-webview-resolve.spec.ts | head -3
# Expect: a plain `test.describe(...)` — no `.skip` or `.fixme`.

# 2. Check whether webview-injector.ts has importers besides the probe:
grep -rln "webview-injector" tests/e2e/ --include="*.ts" | grep -v test-webview-probe.spec.ts
# If output is empty: safe to delete the helper too.
# If output lists other files: leave webview-injector.ts in place; capture as a one-line note in evidence/.

# 3. Delete the probe (and the helper if step 2 returned empty):
git rm tests/e2e/test-webview-probe.spec.ts
# Conditionally:
#   git rm tests/e2e/helpers/webview-injector.ts
```

If `webview-injector.ts` had other importers, append to `specs/233-resuspend-log-panel-e2e/evidence/muted-suite-triage.md` under a new "Orphan helpers" section listing the file and its remaining importers — that's the deferred follow-up.

---

## Step 5c — Verify the muted-suite triage artefact (FR-007)

The triage table at `specs/233-resuspend-log-panel-e2e/evidence/muted-suite-triage.md` is created as part of this PR. Verify it:

```sh
# Confirm row count matches reality:
grep -cE "^\| [0-9]+ \|" specs/233-resuspend-log-panel-e2e/evidence/muted-suite-triage.md
# Expect: 16

# Confirm each row's spec file actually exists and is currently muted:
for f in $(grep -oE "test-[a-z-]+\.spec\.ts" specs/233-resuspend-log-panel-e2e/evidence/muted-suite-triage.md | sort -u); do
  [ -f "tests/e2e/$f" ] || echo "MISSING: $f"
  grep -lE "test\.describe\.(skip|fixme)" "tests/e2e/$f" >/dev/null || echo "NOT MUTED: $f"
done
# Expect: no output (all sixteen exist and are muted).
```

The optional spot-check on `test-real-webview` (FR-007 sub-requirement) is documented inside the triage file itself; do it only if you're uncertain Patch 3 was complete.

---

## Step 6 — Strike-through `BACKLOG.md`

Open `BACKLOG.md`, find the row beginning `| 233 |`, and:

- Wrap **every cell** in `~~...~~` (matches the convention used for #142, #143, #228, #230).
- Change the final-column status from `blocked` to `complete`.

Use the existing struck-through rows for #142 / #143 as your formatting reference — they're in the same file, just above row 233.

---

## Step 7 — Atomic commit

All files in one commit (Decision 2 in research.md). The commit covers FR-001..FR-008 — the un-mute itself plus the three review-pulled-in adjacents (probe disposal FR-006, triage table FR-007, skip-guard scaling decision FR-008):

```sh
git add tests/e2e/test-log-panel.spec.ts \
        scripts/check-log-panel-skip-guard.sh \
        Taskfile.yml \
        BACKLOG.md \
        specs/233-resuspend-log-panel-e2e/   # plan + research + data-model + contracts + quickstart + evidence/

# Conditional adds for FR-006:
git add -u tests/e2e/test-webview-probe.spec.ts   # `git rm` already staged the deletion
# If webview-injector.ts had no other importers and you deleted it too:
# git add -u tests/e2e/helpers/webview-injector.ts

git commit -m "$(cat <<'EOF'
test(233): re-activate log-panel E2E suite, restore skip-guard, dispose probe POC

#142 (visibility-gate Patch 3) is merged; the openvscode-server
resolveWebviewView lifecycle now fires reliably. This commit:

- removes test.describe.fixme from tests/e2e/test-log-panel.spec.ts
  (5 cases return to active CI coverage)                        [FR-001]
- removes the #233 mute comment block from the same file
  AND the corresponding Taskfile.yml mute-explanation comment   [FR-002]
- restores scripts/check-log-panel-skip-guard.sh
  (verbatim from 5385f6e8)                                       [FR-005]
- re-wires it into Taskfile.yml lint task                        [FR-005]
- strikes through BACKLOG.md row 233 (status: complete)          [FR-004]
- deletes tests/e2e/test-webview-probe.spec.ts
  (POC superseded by test-webview-resolve.spec.ts)               [FR-006]
- adds specs/233-resuspend-log-panel-e2e/evidence/
    muted-suite-triage.md
  (16-row catalogue of #143-blocked suites, NOT un-muted here)   [FR-007]
- records "Decision 6 — Skip-guard scaling" in research.md
  (decision only — keep per-suite scripts; no implementation)    [FR-008]

Verified: 5 passed, 0 failed, 0 skipped via
  `npx playwright test --config tests/e2e/playwright.config.ts test-log-panel`
  locally (matches CI invocation in .github/workflows/e2e.yml:193).
Three CI re-runs requested on this PR before merge              [FR-003].

Closes #233.

EOF
)"
```

Confirm the commit landed cleanly:

```sh
git log -1 --stat
# Expect 5 files changed: 4 source + the spec dir.
```

---

## Step 8 — Push and trigger 3× CI verification

```sh
git push -u origin 233-resuspend-log-panel-e2e
```

Open the PR. After the first CI run finishes, hit **Re-run jobs → Re-run failed jobs / all jobs** twice more to get three consecutive `VS Code E2E` runs on the same commit.

**Stability gate**: all three runs MUST be green for the `VS Code E2E` job before merge. If any of the three runs has a log-panel-suite failure, treat the merge as blocked until the cause is identified — do not merge a flaky un-mute.

**SC-003 manual gate**: open the `VS Code E2E` job log of the merge-candidate run (the third re-run) and search it for two strings:

```text
Webview frame with content "[data-testid=\"log-panel\"]" not found after 15000ms
resolveWebviewView
```

The first MUST be absent (it was the #142 symptom). Lines containing the second MAY appear as informational trace, but MUST NOT appear as warnings or errors. If either fails, treat the merge as blocked even when the five tests are green — there is no automated CI assertion for this; the operator owns the check. Capture the grep result (or its absence) in the PR description so the reviewer can verify.

---

## Done criteria checklist

Map directly to the spec's Success Criteria:

- [ ] **SC-001**: `VS Code E2E` job shows `5 passed` for the log-panel suite on three consecutive runs of this PR.
- [ ] **SC-002**: `grep -nE '^\s*test(\.describe)?\.(skip|fixme)\s*\(' tests/e2e/test-log-panel.spec.ts` returns nothing.
- [ ] **SC-003** (manual gate — operator-owned, no CI assertion): CI logs do not contain `Webview frame with content "[data-testid=\"log-panel\"]" not found after 15000ms` or any `resolveWebviewView` warnings. Verified via the log-grep in Step 8; result recorded in the PR description.
- [ ] **SC-004**: The `// #233 — Re-suspended pending #142 ...` comment block is absent from `tests/e2e/test-log-panel.spec.ts`.
- [ ] **FR-005**: `task lint` exits 0 with the new skip-guard line in place.
- [ ] **FR-006**: `tests/e2e/test-webview-probe.spec.ts` is deleted; `webview-injector.ts` either deleted (no importers) or kept with an evidence note (orphan flagged).
- [ ] **FR-007**: `specs/233-resuspend-log-panel-e2e/evidence/muted-suite-triage.md` exists, has 16 rows, and every row's spec file is verified-present-and-muted (Step 5c command produced no output).
- [ ] **FR-008**: `specs/233-resuspend-log-panel-e2e/research.md` contains "Decision 6 — Skip-guard scaling" with rationale; no parametrised guard or ESLint rule is implemented in this PR.
- [ ] **BACKLOG**: row 233 is struck-through and marked `complete`.

When every box is ticked, merge the PR. The feature is closed at that moment.

---

## Failure modes & escalation

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| Skip-guard fails on the un-muted file | Typo in step 3 (kept a `.fixme` somewhere) | Re-run guard; the offending line number is in stdout. |
| Suite still times out at `code-server-page.ts:602` | #142's fix didn't propagate to the openvscode-server image being used by CI | Stop. Open a follow-up issue against #142 with the exact CI run URL. Do **not** re-mute as a workaround in this PR. |
| 1–2 of 5 tests flake, 3–4 stable | Residual flakiness in specific scenarios | Per spec edge case: narrow to per-test `test.fixme(...)` with a pointer to a new follow-up spec. Keep the 3–4 stable tests active; do not re-suspend the whole describe. |
| `task lint` fails on an unrelated check | Pre-existing failure on main, unrelated to this feature | Verify `task lint` was green on `origin/main` before rebase. If it was, narrow the failure and either fix in-place or open a separate ticket. |
| BACKLOG row not in expected format after strike-through | Markdown table column count mismatch | Compare against #142's struck-through row (just above 233) — column count must match exactly. |
