# Quickstart: Verify Loader Knip Config + CI Gate

This is the reproducible procedure a maintainer follows to (a) confirm the feature is complete at implementation time, or (b) audit the whitelist's premise in the future. Target runtime: under five minutes (SC-006).

After this feature lands, the verification below becomes a one-time setup step — the new CI gate (`task knip`) runs automatically on every PR from then on.

## Prerequisites

- Repository cloned, on a commit containing this feature (`201-knip-loader-config` branch or merged to main).
- `pnpm` available (version per `package.json#packageManager`).
- `task` available (project uses Taskfile 3.x — see `Taskfile.yml`).
- `task install` run once (installs pinned `knip` and other dev deps).

## Step 1 — Capture the "before" baseline

Check out the parent commit (the commit immediately before `knip.json` was introduced) and run (before `knip` was pinned, so use `dlx` here):

```sh
pnpm dlx knip --reporter compact > /tmp/knip-before.txt 2>&1 || true
```

Count loader main-process findings:

```sh
grep -cE '^apps/loader/src/main/' /tmp/knip-before.txt
```

**Expected baseline**: 12 (per backlog item #202 description).

## Step 2 — Apply / inspect the config

Switch back to the feature commit (or `main` after merge). Confirm the config is present:

```sh
cat knip.json
```

**Expected**: matches the contract in [contracts/knip-config.schema.json](./contracts/knip-config.schema.json). Exactly three `entry` paths under `workspaces["apps/loader"]`; no `ignore` / `ignoreDependencies` keys.

Optionally validate the config against the feature contract:

```sh
npx -y ajv-cli@5 validate \
  -s specs/201-knip-loader-config/contracts/knip-config.schema.json \
  -d knip.json
```

**Expected**: `knip.json valid`.

Confirm `knip` is pinned as a dev dep:

```sh
node -e "console.log(require('./package.json').devDependencies.knip)"
```

**Expected**: a caret-pinned 5.x SemVer string (e.g., `^5.20.0`), not `latest`.

Confirm `updater.ts` has been deleted:

```sh
test ! -f apps/loader/src/main/updater.ts && echo "DELETED ✓"
```

**Expected**: `DELETED ✓`.

## Step 3 — Capture the "after" report

From the repo root:

```sh
pnpm exec knip --reporter compact > /tmp/knip-after.txt 2>&1 || true
```

Count loader main-process findings:

```sh
grep -cE '^apps/loader/src/main/' /tmp/knip-after.txt
```

**Expected**: `0` — all 11 reachable files are covered by the entry declarations, and the 12th (`updater.ts`) is no longer on disk.

**If the count is > 0**: investigate which file was flagged:
```sh
grep -E '^apps/loader/src/main/' /tmp/knip-after.txt
```
Either a genuinely orphaned file has been added to the loader's main tree (don't silence it — delete or wire it up), or the `knip.json` entries have drifted out of sync with real entry paths. Fix before accepting.

## Step 4 — Confirm non-loader findings are unchanged

```sh
diff \
  <(grep -vE '^apps/loader/src/main/' /tmp/knip-before.txt | sort) \
  <(grep -vE '^apps/loader/src/main/' /tmp/knip-after.txt  | sort)
```

**Expected**: empty output (no diff). This is SC-002 — "byte-identical for non-loader packages".

If the diff is non-empty, the config has inadvertently affected another package. Do not accept the feature; narrow the config further.

## Step 5 — Build smoke test

From the repo root:

```sh
pnpm --filter debrief-loader build:main
```

**Expected**: Exits 0 (TypeScript compilation of the main-process tree succeeds). This also confirms `updater.ts` had no silent consumers — if anything was importing it, the build would now fail.

## Step 6 — Run the new CI gate locally

```sh
task knip
```

**Expected**: Exits 0 with no output (or "No unused files found"). This is the same command CI now runs on every PR.

Stress test (verifies SC-005 — "genuinely orphaned file gets flagged"):

```sh
echo "export const never_called = () => {}" > apps/loader/src/main/stress_orphan.ts
task knip
# Expected: non-zero exit; stress_orphan.ts reported as unused.
rm apps/loader/src/main/stress_orphan.ts
task knip
# Expected: exits 0 again.
```

## Step 7 — Confirm the full verify pipeline

```sh
task verify
```

**Expected**: Exits 0. Exercises the full local-pre-flight pipeline (lint → typecheck → test → knip).

## Step 8 — Write / refresh the evidence record

Open `specs/201-knip-loader-config/evidence/verification-record.md` and ensure sections 1–9 are populated with the numbers/paths/version/CI URL captured above. Commit if updated.

## Acceptance Summary

All six success criteria in [spec.md](./spec.md) can be confirmed from the outputs above:

| SC | How verified |
|----|--------------|
| SC-001 | Step 1 count (12) vs Step 3 count (0) — fully cleared. |
| SC-002 | Step 4 diff is empty. |
| SC-003 | Step 5 exits 0. |
| SC-004 | By inspection — Step 3's loader-scoped grep returns nothing. |
| SC-005 | Step 6 stress test — dummy orphan flagged on introduction and cleared on removal. |
| SC-006 | This document completes in under 5 minutes on a workstation with deps installed. |

## Failure Modes

| Symptom | Likely cause | Remediation |
|---------|--------------|-------------|
| Step 3 count > 0 and the file is reachable | Entry path typo in `knip.json` or knip version mismatch | Check `knip.json` paths against actual filenames; check `knip` version in lockfile. |
| Step 3 count > 0 and the file is NOT reachable | New genuine orphan since the feature was written | This is the whitelist working correctly — file a new issue for the orphan; do NOT silence it. |
| Step 4 diff is non-empty | Config scope leaked beyond `apps/loader` | Check `workspaces` in `knip.json` contains only `apps/loader`; remove any other keys. |
| Step 5 fails with `Cannot find module './updater'` | Something still imports `updater.ts` after the deletion (should not happen — verified pre-commit) | Investigate the import and either remove it or restore `updater.ts` from git history. |
| Step 6 fails with "knip command not found" | `task install` was not run | Run `task install`; knip is pinned in root `devDependencies`. |
| Step 6 fails on CI but passes locally | Lockfile drift between commits | Regenerate `pnpm-lock.yaml`, commit, push. |
