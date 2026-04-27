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

The cloud-friendly runner (matches CI):

```sh
node apps/vscode/tests/e2e/run-playwright.mjs test-log-panel
```

**Expected outcome**: 5 tests passed, 0 failed, 0 skipped.

If any test fails, **stop**. Triage that specific failure — #142 may be incomplete, or a residual flake survived. The spec's `Edge Cases` section (line 60) describes the narrow-mute fallback (per-test `test.fixme` rather than re-`.describe.fixme`-ing the whole block).

---

## Step 6 — Strike-through `BACKLOG.md`

Open `BACKLOG.md`, find the row beginning `| 233 |`, and:

- Wrap **every cell** in `~~...~~` (matches the convention used for #142, #143, #228, #230).
- Change the final-column status from `blocked` to `complete`.

Use the existing struck-through rows for #142 / #143 as your formatting reference — they're in the same file, just above row 233.

---

## Step 7 — Atomic commit

All five files in one commit (Decision 2 in research.md):

```sh
git add tests/e2e/test-log-panel.spec.ts \
        scripts/check-log-panel-skip-guard.sh \
        Taskfile.yml \
        BACKLOG.md \
        specs/233-resuspend-log-panel-e2e/  # plan + research + data-model + contracts + quickstart + evidence

git commit -m "$(cat <<'EOF'
test(233): re-activate log-panel E2E suite, restore skip-guard

#142 (visibility-gate Patch 3) is merged; the openvscode-server
resolveWebviewView lifecycle now fires reliably. This commit:

- removes test.describe.fixme from tests/e2e/test-log-panel.spec.ts
  (5 cases return to active CI coverage)
- removes the #233 mute comment block from the same file
- restores scripts/check-log-panel-skip-guard.sh (verbatim from 5385f6e8)
- re-wires it into Taskfile.yml lint task
- removes the temporary mute-explanation comment from Taskfile.yml
- strikes through BACKLOG.md row 233 (status: complete)

Verified: 5 passed, 0 failed, 0 skipped via run-playwright.mjs locally.
Three CI re-runs requested on this PR before merge (FR-003).

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

---

## Done criteria checklist

Map directly to the spec's Success Criteria:

- [ ] **SC-001**: `VS Code E2E` job shows `5 passed` for the log-panel suite on three consecutive runs of this PR.
- [ ] **SC-002**: `grep -nE '^\s*test(\.describe)?\.(skip|fixme)\s*\(' tests/e2e/test-log-panel.spec.ts` returns nothing.
- [ ] **SC-003**: CI logs do not contain `Webview frame with content "[data-testid=\"log-panel\"]" not found after 15000ms` or any `resolveWebviewView` warnings.
- [ ] **SC-004**: The `// #233 — Re-suspended pending #142 ...` comment block is absent from `tests/e2e/test-log-panel.spec.ts`.
- [ ] **FR-005**: `task lint` exits 0 with the new skip-guard line in place.
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
