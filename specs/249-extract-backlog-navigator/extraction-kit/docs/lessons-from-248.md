# Lessons from #248 (spec-navigator extraction)

This kit is a revised version of the kit shipped with
`specs/248-extract-spec-navigator/`. Twelve concrete failures and
friction points from #248's hand-off informed every revision below.

Each lesson maps to the FR / R-NNN that codifies the fix.

---

## Hard failures the kit must prevent

### 1. No lockfile shipped

**Symptom**: Every CI job failed in <10 seconds because
`pnpm install --frozen-lockfile` exited immediately.

**Cause**: The monorepo's `pnpm-lock.yaml` lives at the repo root, not in
`apps/<name>/`; the subtree split therefore carries no lockfile.

**Fix in this kit**: `import-from-source.sh` runs `pnpm install --lockfile-only`
after the subtree split, then commits the resulting lockfile on top of
the extracted history. (R-010 / FR-015.)

### 2. No `packageManager` field in `package.json`

**Symptom**: Identical to (1) — every CI job died in <10 seconds, this
time at the `pnpm/action-setup@v4` step, with an "ambiguous pnpm version"
error.

**Fix in this kit**: Phase 1 (in the source repo) adds
`"packageManager": "pnpm@9.15.5"` to `apps/backlog-navigator/package.json`
**before** the subtree split. The field is then already present when the
split happens. (FR-010 / T023.)

### 3. Hardcoded destination in kit scripts

**Symptom**: `extract.sh` and `bootstrap-new-repo.sh` had
`debrief/spec-navigator` baked in. For a destination of
`deepbluecltd/speckit-navigator`, every line had to be patched by hand.

**Fix in this kit**: The single `import-from-source.sh` script
auto-detects the destination from the current repo's `origin` remote
(or accepts `--destination <org>/<repo>` for override). Templates use
`{{ORG}}`, `{{REPO}}`, `{{HOST}}` placeholders; the script substitutes
from the detected values. (R-009 / FR-017.)

### 4. `actions/deploy-pages` blocks PR previews

**Symptom**: The original kit used the artifact-based Pages action,
which serves exactly one bundle per repo. Adding per-PR previews later
required swapping that whole action out for
`JamesIves/github-pages-deploy-action@v4` and reconfiguring Pages.

**Fix in this kit**: `deploy.yml` uses `JamesIves/github-pages-deploy-action@v4`
with `clean-exclude: previews/` from day one. The kit's prerequisites
say "Settings → Pages → Source: Deploy from a branch → gh-pages → /".
(R-003 / FR-011 / FR-014.)

---

## Friction points the kit should reduce

### 5. Patches 04 (eslint) and 05 (tsconfig) were `.md` recipes, not files

**Symptom**: Both patches were essentially "rewrite this config to drop
the monorepo-relative paths" — mechanical but easy to misapply.

**Fix in this kit**: `templates/.eslintrc.cjs`, `templates/tsconfig.json`,
and `templates/tsconfig.node.json` are drop-in files that
`import-from-source.sh` copies verbatim (with `{{ORG}}` etc.
substituted). The patch markdown becomes rationale doc, not
implementation. (R-012.)

### 6. Patch 01 (vite base flip) was a one-line edit dressed up as a recipe

**Fix in this kit**: `import-from-source.sh` performs the sed
replacement automatically using the auto-detected destination repo
slug. No manual edit step. (R-009 / R-012.)

### 7. README/CONFIGURATION/SECURITY templates had `debrief.github.io` hardcoded

**Fix in this kit**: Templates use `{{ORG}}`, `{{REPO}}`, `{{HOST}}`
placeholders throughout. `import-from-source.sh --dry-run` checks for
unsubstituted placeholders before push. (R-009 / FR-018.)

### 8. Missing PR preview workflow + dummy spec

**Symptom**: Reviewers without local dev tooling had no way to see the
running app until #248 added a preview workflow as an unplanned follow-up.

**Fix in this kit**: `pr-preview.yml`, `pr-preview-cleanup.yml`, and a
bundled dummy `BACKLOG.md` + `specs/<NNN>-<name>/` are first-class kit
components. Previews render meaningful content at the default URL
from the very first PR. (R-004 / R-005 / FR-012 / FR-013 / FR-016.)

---

## Operational gotchas to call out in the runbook

### 9. GitHub App must be authorised on the new repo before any push works

**Symptom**: The first `git push` from the agent's environment returned
403 silently until the Claude/agent GitHub App was installed via the
GitHub web UI on the destination repo. #248 lost ~30 minutes here.

**Fix in this kit**: Prereq Step 0b in `README.md` includes the
web-UI navigation path. The Step 12 push in `import-from-source.sh`
detects a 403 response and prints the same instructions inline. The
required scope is narrower than in #248's kit: only the destination
repo needs the GitHub App authorised, because the script never
pushes to anywhere else. (R-011.)

### 10. Target repo must be empty

**Symptom**: GitHub's web UI defaults the "Add a README", ".gitignore",
and "Choose a license" toggles to checked. If any is left on, the
first push fails (non-empty target). #248 hit this rescue path mid-flight.

**Fix in this kit**: Prereq Step 0a explicitly says "uncheck all three
init options". `import-from-source.sh` Step 4 detects an existing
HEAD in the destination and either aborts with explicit guidance or
merges with `--allow-unrelated-histories` if the flag is supplied.
Conflicts on `README.md`/`LICENSE`/`.gitignore` are auto-resolved in
favour of the imported tree. (R-011 / FR-020.)

### 11. Workflow logs inaccessible to the agent during debugging

Not strictly a kit issue — the agent operating `import-from-source.sh`
typically has no MCP/API path to fetch CI job logs when a workflow
fails. Diagnosis in #248 worked only because the failure category was
guessable from the sub-10-second completion time.

**Fix in this kit**: `README.md` calls out that the operator may need
to paste job log excerpts back to the agent during debugging. No code
fix is possible — this is a coordination note.

---

## What patch 03 was wrong about

### 12. Patch 03 (bundled fixtures + recorder) was 90% maintainer overhead

**Symptom**: The original `patches/03-bundled-fixtures.md` proposed
replacing the in-process Playwright route mock with a fixture corpus +
recorder script. In practice, the existing in-process mock
(`e2e/mock-github.ts`) already gave full offline test coverage in #248.
The patch added beforeEach wiring in every test, fixture corpus
maintenance, and a PAT-authenticated recorder script — substantial
cost for no new coverage.

**Fix in this kit**: Patch 03 is **dropped**. The standalone repo's
Playwright suite uses the in-process route mock that already lives in
`e2e/mock-github.ts` (carried unchanged via the subtree split). If
upstream API drift detection becomes wanted, `workflows/live.yml.template`
is shipped as an opt-in adopter add-on. (R-006 / R-015 / FR-019.)

See [`why-no-patch-03.md`](why-no-patch-03.md) for the long-form
rationale.

---

## Summary

| # | Lesson | Fix lives at |
|---|---|---|
| 1 | No lockfile shipped | `scripts/import-from-source.sh` step 9 |
| 2 | No `packageManager` field | Phase 1 source edit (T023) — pre-extraction |
| 3 | Hardcoded destination | Auto-detected from current repo's `origin`; `--destination` flag for override |
| 4 | `actions/deploy-pages` blocks previews | `workflows/deploy.yml` uses JamesIves action |
| 5 | Markdown-recipe configs | `templates/*` drop-in files |
| 6 | Vite base flip as recipe | `scripts/import-from-source.sh` step 5 (automated sed) |
| 7 | Hardcoded host in templates | `{{HOST}}` placeholder throughout |
| 8 | No PR previews / no dummy | `workflows/pr-preview*.yml` + `templates/BACKLOG.dummy.md` |
| 9 | GitHub App authorisation gap | `README.md` Step 0b + import-from-source 403 detection |
| 10 | Non-empty target repo | `README.md` Step 0b + `--merge-unrelated-histories` |
| 11 | Workflow logs inaccessible | `README.md` debugging note (coordination only) |
| 12 | Patch 03 was overkill | Kit drops patch 03; `live.yml` is opt-in only |
