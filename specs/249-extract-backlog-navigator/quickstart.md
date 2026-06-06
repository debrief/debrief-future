# Quickstart: Extract backlog-navigator into a Standalone Repository

**Feature**: 249-extract-backlog-navigator
**Audience**: The engineer (or AI agent) starting Phase 0 of the migration
**Prerequisite reading**: [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/hosted-url.md](./contracts/hosted-url.md),
[contracts/ci-surface.md](./contracts/ci-surface.md)

This document is a working entry point — what to do first, what to verify
before each phase boundary, and where to find the contracts that govern
the work. The authoritative content lives in the artefacts above.

This work follows #248 (spec-navigator extraction) as its operational
template, with the revisions captured in research.md. Where #248 hit a
friction point, the kit revisions in R-003, R-004, R-009, R-010, R-011, R-012
prevent the same failure here.

---

## Where the active feature is recorded

This work is being executed on the cloud-session branch
`claude/backlog-navigator-spec-PO00f`. The `.specify/.active-feature` file at
the repo root contains:

```
249-extract-backlog-navigator
```

So speckit commands resolve the active feature even though the branch name
does not follow the `NNN-` convention. Do not delete this file mid-session.

---

## Phase 0 — Coupling audit (this repo, prerequisite to Phase 1)

**Goal**: produce `docs/extraction-audit/backlog-navigator/coupling-inventory.md`.
This document is the **input** to Phase 1 (FR-001) — the audit's findings
determine which literals Phase 1 will move into `defaults.ts` and which
will stay (test/fixture content).

### What to enumerate

1. **Hardcoded debrief literals** in `apps/backlog-navigator/src/` —
   organisation name (`'debrief'`), repo slug (`'debrief-future'`), label
   conventions, column names, GitHub Projects IDs, hosted-URL strings.
   File:line locations.

   A pre-audit scan already identifies:
   - `src/github/api.ts:25` — `DEFAULT_OWNER = 'debrief'`
   - `src/github/api.ts:26` — `DEFAULT_REPO = 'debrief-future'`
   - `vite.config.ts:34` — `'/debrief-future/backlog-navigator/'` (base default)
   - `vite.config.ts` (PWA manifest) — `'Debrief Backlog Navigator'`,
     `'Edit the Debrief project backlog from any device.'`
   - Any inline `'debrief.github.io'` references the grep surfaces.

2. **Workspace deps** — every `@debrief/*` import:
   - Pre-audit scan finds **only** `@debrief/components/hooks/useIsMobile`
     in `src/App.tsx`, `src/editors/EditorOverlayProvider.tsx`, and the
     test-setup comment. R-007 handles this (inline-copy in Phase 1).
   - Audit confirms no other workspace deps.

3. **Monorepo-shared infrastructure**:
   - `shared/eslint-rules/*` — which (if any) are inherited?
   - `tsconfig.base.json` — which compilerOptions are inherited and need
     inlining for the standalone repo?
   - Root `devDependencies` — which are consumed by backlog-navigator only
     and are therefore Phase 3 cleanup candidates?

4. **Test fixtures** that are *content* (rendered as backlog items) vs
   *couplings* — FR-002 explicitly says fixture content stays.

### Audit done when

- [ ] `docs/extraction-audit/backlog-navigator/coupling-inventory.md` exists
      and is reviewed.
- [ ] Every literal in §1 has a file:line citation.
- [ ] Every `@debrief/*` import in §2 is enumerated.
- [ ] §3 enumerates eslint rules, tsconfig fields, and root devDeps.
- [ ] §4 distinguishes production-code literals from fixture content.

---

## Phase 1 — Configuration seam (this repo)

**Goal**: replace every audit-identified literal in
`apps/backlog-navigator/src/` by threading defaults through `defaults.ts`
(new), `src/github/api.ts` (edited), `src/strings.ts` (extended), and
`vite.config.ts` (env-driven PWA manifest). Inline-copy `useIsMobile`.
Add `packageManager` field to `package.json`. Default values reproduce
today's behaviour byte-for-byte.

### Where to start

1. Read [`docs/extraction-audit/backlog-navigator/coupling-inventory.md`](../../docs/extraction-audit/backlog-navigator/coupling-inventory.md) §1 — the literals to remove.
2. In `apps/backlog-navigator/src/github/api.ts`: replace the two inline
   constants with `import.meta.env.VITE_DEFAULT_OWNER ?? 'debrief'` and
   `import.meta.env.VITE_DEFAULT_REPO ?? 'debrief-future'`.
3. Create `apps/backlog-navigator/src/defaults.ts` exporting build-time
   defaults (PWA manifest fields, host string, any other audit-identified
   coupling). Pattern matches the data-model table.
4. Edit `apps/backlog-navigator/vite.config.ts` so the PWA manifest fields
   read from `process.env.VITE_*` with the same fallbacks (vite.config
   evaluates before `import.meta.env` is available; `process.env` is the
   correct reader here, same as `VITE_BASE_URL` already in use).
5. Extend `apps/backlog-navigator/src/strings.ts` with the `host` constant
   (and any other strings the audit identifies as couplings vs. user-facing
   content).
6. Inline-copy `useIsMobile` per R-007:
   - Create `apps/backlog-navigator/src/hooks/useIsMobile.ts` with provenance
     comment.
   - Update `src/App.tsx` and `src/editors/EditorOverlayProvider.tsx` imports
     to the local path.
7. Add `"packageManager": "pnpm@10.33.0"` (or the current pinned version)
   to `apps/backlog-navigator/package.json` (FR-010, R-002).
8. Run `pnpm test`, `pnpm typecheck`, `pnpm test:e2e` against the default
   values; all must remain green.
9. Smoke-test with a non-default `VITE_DEFAULT_OWNER`/`VITE_DEFAULT_REPO`
   pointing at any other public GitHub repo with a `BACKLOG.md`; confirm
   the rendering smoke-test passes against it.

### Phase 1 done when

- [ ] `grep -ri 'debrief\|debrief-future\|debrief.github.io' apps/backlog-navigator/src/` returns zero matches outside default-fallback expressions.
- [ ] `grep -r '@debrief' apps/backlog-navigator/src/` returns zero matches.
- [ ] `apps/backlog-navigator/package.json` has the `packageManager` field.
- [ ] All Vitest and Playwright suites pass against the default values.
- [ ] A non-default `VITE_DEFAULT_OWNER`/`VITE_DEFAULT_REPO` build renders
      without error.
- [ ] PR description references this spec dir (`specs/249-extract-backlog-navigator/`).
- [ ] No new module under `src/config/`. No new JSON Schema. No new Zod
      schema beyond what already exists.

---

## Pre-Phase 2 — Prerequisites (operator)

Before any script runs:

### Step 0a — Install the GitHub App on the destination repo (R-011)

The Claude code GitHub App (or whichever agent is being used) must be
authorised on the destination repo's parent organisation *and* on the
destination repo itself. Without this, the first `git push` from the
agent's environment returns 403 silently.

Resolve via the GitHub web UI:
`https://github.com/organizations/<ORG>/settings/installations` → Configure
→ Repository access → Add the destination repo.

### Step 0b — Create the destination repo EMPTY (R-011 / FR-020)

`https://github.com/organizations/<ORG>/repositories/new` →

- Set the name (e.g., `backlog-navigator`).
- **Uncheck** "Add a README".
- **Uncheck** ".gitignore".
- **Uncheck** "Choose a license".

If any of those are left checked, the first push fails and you need the
merge fallback (Step 0c).

### Step 0c — (Fallback) If the target is already non-empty

`bootstrap-new-repo.sh --merge-unrelated-histories` performs the
`git merge --allow-unrelated-histories` and the `--ours`/`--theirs`
resolution path for the conflicting README. This produces a noisier
history (an extra merge commit) but works.

### Step 0d — Decide and record the destination slug (R-009)

Pass via flag:
```sh
./scripts/extract.sh --destination <org>/<repo> --host <org>.github.io
./scripts/bootstrap-new-repo.sh --destination <org>/<repo> --host <org>.github.io
```

Or record in `kit-config.json` at the start of bootstrap:
```json
{
  "destination": { "org": "deepbluecltd", "repo": "backlog-navigator" },
  "host": "deepbluecltd.github.io"
}
```

---

## Phase 2 — Extraction + bootstrap (new repo)

**Goal**: lift `apps/backlog-navigator/` into `<org>/<repo>` with preserved
history, working CI (including per-PR previews + Lighthouse), and live
GitHub Pages hosting on the `gh-pages` branch.

### Run `extract.sh`

```sh
cd specs/249-extract-backlog-navigator/extraction-kit
./scripts/extract.sh --destination <org>/<repo> --host <org>.github.io
```

What it does (R-001, R-009, R-010, R-012):

1. Fresh clone of debrief-future into a working temp dir.
2. `git subtree split --prefix=apps/backlog-navigator -b extracted`.
3. Checkout `extracted`.
4. Sed-replace the vite-base default to `/<repo>/`.
5. `pnpm install --lockfile-only` → commits the new `pnpm-lock.yaml`.
6. Smoke: `pnpm install && pnpm test && pnpm build`. Aborts on failure
   with the offending log.
7. Leaves the working tree on branch `extracted` for the bootstrap step.

### Run `bootstrap-new-repo.sh`

```sh
./scripts/bootstrap-new-repo.sh --destination <org>/<repo> --host <org>.github.io
```

What it does:

1. Pushes `extracted` to `<destination>` as `main` (or the merge-unrelated-
   histories fallback if the target is non-empty — `--merge-unrelated-histories`
   flag).
2. Copies `templates/*` into the working tree with `{{ORG}}`, `{{REPO}}`,
   `{{HOST}}` substituted: README.md, CONFIGURATION.md, SECURITY.md,
   .eslintrc.cjs, tsconfig.json, tsconfig.node.json, .gitignore.
3. Copies `workflows/*.yml` into `.github/workflows/`: ci.yml, deploy.yml,
   pr-preview.yml, pr-preview-cleanup.yml, lighthouse.yml.
   (`live.yml.template` is also copied to `workflows/` for adopter opt-in
   but **not** to `.github/workflows/`.)
4. Copies the bundled dummy speckit dataset to `specs/<NNN>-<name>/` and
   the dummy `BACKLOG.md` to the repo root.
5. Commits + pushes.

### One-time GitHub web-UI configuration

After the first push:

1. **Wait for the first workflow run to push to `gh-pages`** (a few
   minutes; check `Actions` tab).
2. Settings → Pages → **Source: Deploy from a branch** → branch:
   `gh-pages` → folder: `/ (root)` → Save.
3. (Optional, for `live.yml`): Settings → Secrets → register `LIVE_GITHUB_TOKEN`
   with a fine-grained read-only PAT scoped to the upstream repo.
4. Branch protection on `main`: require `ci.yml / lint-typecheck-test`,
   `ci.yml / e2e`, and `lighthouse.yml / lighthouse` to pass.

### Smoke-test the preview pipeline

1. Open a trivial PR (whitespace change suffices).
2. `pr-preview.yml` runs (a few minutes).
3. Click the URL in the sticky comment.
4. Confirm the bundled dummy `BACKLOG.md` renders at the default URL.
5. Try the `?pr=<n>` legacy form (against the bundled default OWNER/REPO);
   confirm it resolves.
6. Try the `?repo=<external>/<repo>&branch=<branch>` form against a
   public repo with a `BACKLOG.md`; confirm it renders.

### Phase 2 done when

- [ ] New repo exists with the stated description and homepage.
- [ ] First push triggered a green `ci.yml` run with **no manual
      intervention** (i.e., no "fix lockfile" or "fix packageManager"
      follow-ups).
- [ ] `lighthouse.yml` is green; report artifact uploaded.
- [ ] A trivial PR produced a working preview URL via the sticky comment.
- [ ] `https://<host>/<repo>/` serves the latest `main` build.
- [ ] A `main` redeploy did **not** wipe any in-flight `previews/pr-<n>/`
      folder (verified by opening a trivial PR, then pushing to main
      immediately, then re-checking the preview folder).
- [ ] A first-time contributor (no debrief org credentials) can clone,
      install, and run `pnpm lint && pnpm typecheck && pnpm test && pnpm
      test:e2e` to a green result.

---

## Hold — wait 7 days (or 7 nightly `live.yml` runs if enabled)

Before starting Phase 3, the new repo's `ci.yml` must have been green for
≥7 consecutive days (or `live.yml`, if enabled, ≥7 consecutive nights).

This is the cutover gate from #248 FR-018; carried verbatim per spec.

---

## Phase 3 — Cutover (this repo)

**Goal**: a single atomic PR that deletes `apps/backlog-navigator/` and its
three dedicated build/publish/lighthouse workflows, points the existing
`backlog-navigator-comment.yml` at the hosted instance, removes backlog-
navigator references from `ci.yml`, removes the now-unused `@lhci/cli` root
devDep, adds ADR-032, and updates ADR-030's owner annotation.

### What to delete or update (per R-013)

| Path | Action |
|---|---|
| `apps/backlog-navigator/` | delete entirely |
| `.github/workflows/backlog-navigator-preview.yml` | delete |
| `.github/workflows/backlog-navigator-publish.yml` | delete |
| `.github/workflows/backlog-navigator-lighthouse.yml` | delete |
| `.github/workflows/backlog-navigator-comment.yml` | keep; swap URL host to `https://{{HOST}}/{{REPO}}/`. Continues to emit `?pr=<n>` (compat shim handles it). |
| `.github/workflows/ci.yml` | remove the 2 backlog-navigator references (lines 143–144) |
| `heroku.yml`, `app.json`, `Dockerfile.preview` | edit **only** if audit found refs (pre-audit grep finds none) |
| `package.json` (root, `devDependencies`) | remove `@lhci/cli` (verified — only consumed by the deleted workflow) |
| `pnpm-workspace.yaml` | unchanged — `apps/backlog-navigator/` glob resolves to nothing once the dir is deleted |
| `CLAUDE.md` "Before Pushing" Step 4 | remove the backlog-navigator Playwright command |
| `CLAUDE.md` recent changes section | append a one-line note pointing at the new repo |
| `docs/project_notes/decisions.md` | add **ADR-032** (extraction of backlog-navigator); **update ADR-030** with closing note: "Owner moved to standalone repo `{{ORG}}/{{REPO}}` as of #249. PWA tooling decision unchanged, executes there now." |

### Pre-merge verification

1. Open a draft cutover PR. CI passes without backlog-navigator's
   Playwright suite (and without the Lighthouse workflow).
2. The PR's review-app comment includes the new hosted URL parameterised
   with this PR's number (the existing `?pr=<n>` shape).
3. Click the link in the comment; verify the hosted instance renders this
   PR's specs / `BACKLOG.md` via the R-014 compat shim.
4. Only then mark the PR ready for review.

### Phase 3 done when

- [ ] `apps/backlog-navigator/` does not exist.
- [ ] The three deleted workflows are absent.
- [ ] `task verify` (or the four-step fallback) passes; total runtime
      measurably faster (one fewer build target + one fewer Playwright
      suite + one fewer Lighthouse job).
- [ ] ADR-032 is committed; ADR-030 has its owner-moved annotation.
- [ ] `@lhci/cli` is gone from root `devDependencies`.
- [ ] Subsequent PR's `backlog-navigator-comment.yml` runs and the link
      resolves end-to-end via the legacy `?pr=` form.
- [ ] `git grep -i 'apps/backlog-navigator'` returns zero matches in
      tracked files.

---

## Rollback

If Phase 3 reveals a regression, `git revert` of the cutover PR restores
`apps/backlog-navigator/`, the three deleted workflows, the root devDep,
and the doc state in one commit. The hosted instance can stay live — it
does not depend on the in-monorepo path. No data loss path exists; the
migration is purely structural.

---

## Where the open contracts live

| Concern | Document |
|---|---|
| Defaults via `defaults.ts`, `api.ts`, `strings.ts`, vite manifest | [data-model.md](./data-model.md) |
| Hosted-URL query-string contract (incl. legacy `?pr=`) | [contracts/hosted-url.md](./contracts/hosted-url.md) |
| New-repo CI workflows (ci, lighthouse, deploy, pr-preview, pr-preview-cleanup, optional live) | [contracts/ci-surface.md](./contracts/ci-surface.md) |
| Acceptance scenarios per phase | [spec.md](./spec.md) §"User Stories" |
| Audit input (the hardcoded literals etc., produced in Phase 0) | `docs/extraction-audit/backlog-navigator/coupling-inventory.md` |
| Lessons that revise the kit vs #248 | [research.md](./research.md) §"Summary table" |
