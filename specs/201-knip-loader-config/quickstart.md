# Quickstart: Verify Loader Knip Config

This is the reproducible procedure a maintainer follows to (a) confirm the feature is complete, or (b) audit the whitelist's premise in the future. Target runtime: under five minutes (SC-006).

## Prerequisites

- Repository cloned, on a commit containing this feature (`201-knip-loader-config` branch or merged to main).
- `pnpm` available (version per `package.json#packageManager`).
- Network access to fetch `knip` via `pnpm dlx` on first run. (Subsequent runs use pnpm's dlx cache.)

## Step 1 — Capture the "before" baseline

Check out the parent commit (the commit immediately before `knip.json` was introduced) and run:

```sh
pnpm dlx knip --reporter compact > /tmp/knip-before.txt 2>&1 || true
```

Count loader main-process false positives:

```sh
grep -cE '^apps/loader/src/main/' /tmp/knip-before.txt
```

**Expected baseline**: 12 (per backlog item #202 description).

## Step 2 — Apply / inspect the config

Switch back to the feature commit (or main after merge). Confirm the config is present:

```sh
cat knip.json
```

**Expected**: matches the contract in [contracts/knip-config.schema.json](./contracts/knip-config.schema.json). Must contain exactly three `entry` paths under `workspaces["apps/loader"]` and no `ignore` / `ignoreDependencies` keys.

Optionally validate the config against the feature contract:

```sh
npx -y ajv-cli@5 validate \
  -s specs/201-knip-loader-config/contracts/knip-config.schema.json \
  -d knip.json
```

**Expected**: `knip.json valid`.

## Step 3 — Capture the "after" report

From the repo root:

```sh
pnpm dlx knip --reporter compact > /tmp/knip-after.txt 2>&1 || true
```

Count loader main-process findings:

```sh
grep -cE '^apps/loader/src/main/' /tmp/knip-after.txt
```

**Expected**: 1 — this is the single genuine orphan (`apps/loader/src/main/updater.ts`) deliberately NOT silenced (see research.md R-004). If the count is 0, the whitelist has become too broad; if the count is > 1, either a new genuine orphan has appeared or the config has regressed — investigate before accepting.

Confirm specifically that `updater.ts` is the retained finding:

```sh
grep -E '^apps/loader/src/main/' /tmp/knip-after.txt
```

**Expected output** (or equivalent in whichever reporter format is active):

```text
apps/loader/src/main/updater.ts
```

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

**Expected**: Exits 0 (TypeScript compilation of the main-process tree succeeds). No change in behaviour from baseline, because the config change is not on the compilation path — this step simply confirms no accidental coupling.

If you want additional confidence (longer run), the full build — including `electron-builder` packaging — may be run locally but is not required by this feature:

```sh
pnpm --filter debrief-loader build      # optional, not required for acceptance
```

## Step 6 — Write / refresh the evidence record

Open `specs/201-knip-loader-config/evidence/verification-record.md` and ensure sections 1–7 are populated with the numbers/paths captured above. Commit if updated.

## Acceptance Summary

All six success criteria in [spec.md](./spec.md) can be confirmed from the outputs above:

| SC | How verified |
|----|--------------|
| SC-001 | Step 1 count (12) minus Step 3 count for reachable files (12 − 1 orphan = 11 silenced) — all previously-flagged reachable files no longer reported. |
| SC-002 | Step 4 diff is empty. |
| SC-003 | Step 5 exits 0. |
| SC-004 | By inspection — Step 3's loader-scoped grep now returns only genuine findings (zero known noise). |
| SC-005 | Implicitly held by FR-004 and the contract (no `ignore` globs); provable by temporarily adding a non-reachable file under `src/main/` and re-running Step 3 (optional stress test). |
| SC-006 | This document completes in under 5 minutes on a workstation with dlx cache warm. |

## Failure Modes

| Symptom | Likely cause | Remediation |
|---------|--------------|-------------|
| Step 3 count is 0 | `ignore` glob accidentally added to `knip.json` — whitelist is too broad. | Remove the `ignore` key; re-run from Step 2. |
| Step 3 count is > 1, and the extra file is NOT `updater.ts` | A new genuine orphan has appeared in the main-process tree since the feature was written. | This is the whitelist working correctly — file a new issue for the orphan; do NOT silence it here. |
| Step 4 diff is non-empty | Config scope leaked beyond `apps/loader`. | Check `workspaces` in `knip.json` contains only `apps/loader`; remove any other keys. |
| Step 5 fails | Unrelated regression in the loader build — not caused by this feature. | Investigate separately; do not gate this feature on unrelated failures. |
