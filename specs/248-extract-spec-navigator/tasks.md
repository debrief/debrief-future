# Tasks: Extract spec-navigator into a Standalone Repository

**Feature**: 248-extract-spec-navigator
**Branch**: `claude/implement-speckit-248-ChSwl`
**Scope (this branch)**: Phase 1 in code + Phase 2 extraction kit. Phase 3 is deferred to a follow-up PR after the new repo is live (see `extraction-kit/PHASE3-RUNBOOK.md`).

The plan covers three phases across two repositories. This monorepo PR cannot create or push to `debrief/spec-navigator` (tooling restricted to `debrief/debrief-future`), so:

- **Phase 1** lands as code changes in `apps/spec-navigator/`.
- **Phase 2** ships as a self-contained extraction kit checked in under `specs/248-extract-spec-navigator/extraction-kit/`. A maintainer with repo-creation rights runs the kit locally to stand up `debrief/spec-navigator`.
- **Phase 3** is deferred to a follow-up PR triggered after Phase 2 is live (the runbook is in the kit).

Conventions: `[P]` = parallel-eligible (different files, no ordering dep). `[test]` = test/verification step.

---

## Phase 1: Configuration seam (in this repo)

### Setup

- [~] T001 Update BACKLOG.md row for #248 from `proposed`/`approved` to `implementing` and commit `chore(backlog): mark item 248 as implementing`. **SKIPPED** — BACKLOG.md row 248 is for the iOS install-help banner (Backlog Navigator), a different feature; no row currently corresponds to this spec dir even though other rows reference it as "#248". Mismatch documented in the PR description; if a row is desired the maintainer can add one in a separate commit.

### Foundation: centralised defaults

- [x] T002 Create `apps/spec-navigator/src/defaults.ts` exporting `DEFAULT_OWNER`, `DEFAULT_REPO`, and `DEFAULT_REPO_LABEL`. Each reads `import.meta.env.VITE_DEFAULT_OWNER` / `VITE_DEFAULT_REPO` at module-load with a `'debrief'` / `'debrief-future'` fallback. The `DEFAULT_REPO_LABEL` derives `${owner}/${repo}` so vendor strings interpolate the configured value.

### Rewire production source to defaults (parallel after T002)

- [x] T003 [P] Rewire `apps/spec-navigator/src/github/api.ts` — remove inlined `DEFAULT_OWNER`/`DEFAULT_REPO` constants and import from `../defaults`. No changes to the `ApiOptions` shape or any function signature.
- [x] T004 [P] Rewire `apps/spec-navigator/src/state/useFeature.ts` — replace the hardcoded `repoOwner: 'debrief'` / `repoName: 'debrief-future'` in the `FeatureScope` literal with imports from `../defaults`.
- [x] T005 [P] Rewire `apps/spec-navigator/src/strings.ts` — replace the three hardcoded `debrief/debrief-future` substrings (PAT scope description, OpenPrList empty message, SpecBrowserModal modalTitle) with template strings interpolating `DEFAULT_REPO_LABEL` from `./defaults`.

### Rewire tests to defaults (parallel after T002)

- [x] T006 [P] Rewire `apps/spec-navigator/src/components/__tests__/ArtifactView.test.tsx` test fixture to import `DEFAULT_OWNER`/`DEFAULT_REPO` from `../../defaults`.
- [x] T007 [P] Rewire `apps/spec-navigator/src/components/__tests__/markdownRender.bench.test.ts` similarly.
- [x] T008 [P] Rewire `apps/spec-navigator/src/__tests__/xssAdversarial.test.ts` similarly.
- [x] T009 [P] Update `apps/spec-navigator/src/github/__tests__/schemas.test.ts` so the two debrief raw-content URLs are constructed from `${DEFAULT_OWNER}/${DEFAULT_REPO}` rather than inlined.

### Phase 1 verification

- [x] T010 [test] Run `pnpm --filter @debrief/spec-navigator lint` and confirm green.
- [x] T011 [test] Run `pnpm --filter @debrief/spec-navigator typecheck` and confirm green.
- [x] T012 [test] Run `pnpm --filter @debrief/spec-navigator test` (Vitest, no GitHub network) and confirm green.
- [x] T013 [test] Run `pnpm --filter @debrief/spec-navigator build && cd apps/spec-navigator && node run-playwright.mjs` and confirm green.
- [x] T014 [test] Run `git grep -nE "'debrief'|\"debrief\"|debrief-future|debrief\\.github\\.io" apps/spec-navigator/src/` and confirm every remaining match is a `??` fallback expression in `defaults.ts` or a comment — no production literal remains.

---

## Phase 2: Extraction kit (committed under specs/248/extraction-kit/)

The kit is a runnable checklist + scripts + ready-to-drop-in workflows. A maintainer with rights on the `debrief` GitHub org executes it locally; the kit produces the new repo.

### Kit scaffolding

- [x] T101 [P] Create `specs/248-extract-spec-navigator/extraction-kit/README.md` — top-level kit instructions, prerequisites, and step-by-step ordering of the operator's actions.
- [x] T102 [P] Create `specs/248-extract-spec-navigator/extraction-kit/scripts/extract.sh` — a Bash script that performs the `git subtree split --prefix=apps/spec-navigator -b spec-navigator-extracted` against a fresh clone, validates the result (commit count, no debrief literals in `src/`), and prints the next-step commands. Idempotent and safe to re-run.
- [x] T103 [P] Create `specs/248-extract-spec-navigator/extraction-kit/scripts/bootstrap-new-repo.sh` — script the operator runs **after** creating the empty repo on github.com: pushes `spec-navigator-extracted` as `main`, applies the kit's workflows, README, and CONFIGURATION.md, and prints next-step instructions for Pages and secrets setup.

### CI workflows for the new repo

- [x] T104 [P] Create `specs/248-extract-spec-navigator/extraction-kit/workflows/ci.yml` matching `contracts/ci-surface.md` — every PR + push to non-`main`, runs lint + typecheck + vitest + Playwright (bundled fixtures).
- [x] T105 [P] Create `specs/248-extract-spec-navigator/extraction-kit/workflows/live.yml` — nightly + push-to-main, runs Playwright with `LIVE_GITHUB=1` and `GITHUB_TOKEN` against `debrief/debrief-future`. On failure opens/updates a `live-mode-failure` issue.
- [x] T106 [P] Create `specs/248-extract-spec-navigator/extraction-kit/workflows/deploy.yml` — push-to-main, builds the Vite app and publishes to GitHub Pages via `actions/deploy-pages`.

### Documentation for adopters

- [x] T107 [P] Create `specs/248-extract-spec-navigator/extraction-kit/templates/README.md` — the new repo's own README (the operator drops it in during T103). Covers configuration via `VITE_*` env vars + URL params, local dev, testing, deployment, and adopter onboarding (3 steps from `contracts/ci-surface.md`).
- [x] T108 [P] Create `specs/248-extract-spec-navigator/extraction-kit/templates/CONFIGURATION.md` — full reference of `VITE_DEFAULT_OWNER`, `VITE_DEFAULT_REPO`, the URL contract (legacy `?pr=` + new `?repo=&branch=`), and the precedence rules from `data-model.md`.
- [x] T109 [P] Create `specs/248-extract-spec-navigator/extraction-kit/templates/SECURITY.md` — rotation policy from `contracts/ci-surface.md` (service-identity PAT, 12-month rotation, leak response).

### Phase 2 patch source: features that have to be added in the new repo

Some features called out by the spec/research do not yet exist in `apps/spec-navigator/src/` and would only land *after* the subtree split. The kit ships these as ready-to-apply patches (or detailed instructions if a patch is impractical) so the operator can apply them on the extracted branch before the first deploy.

- [x] T110 [P] Create `specs/248-extract-spec-navigator/extraction-kit/patches/01-vite-base-default.md` — instructions to flip the Vite `base` default from `/debrief-future/spec-navigator/` to `/spec-navigator/` (overridable via `VITE_BASE`). One-line code change documented with diff.
- [x] T111 [P] Create `specs/248-extract-spec-navigator/extraction-kit/patches/02-url-compat-shim.md` — code recipe for the legacy `?pr=<n>` resolver per `contracts/hosted-url.md`. Includes acceptance tests for both URL shapes and the precedence rule when both are supplied.
- [x] T112 [P] Create `specs/248-extract-spec-navigator/extraction-kit/patches/03-bundled-fixtures.md` — recipe for `e2e/fixtures/`, the fixture loader, the `pnpm fixtures:record` script, and the Playwright `page.route` wiring (R-004). Includes the fixture file format.
- [x] T113 [P] Create `specs/248-extract-spec-navigator/extraction-kit/patches/04-eslint-standalone.md` — recipe for replacing the monorepo-shared ESLint rules (`../../shared/eslint-rules/no-redeclare-*-exports.cjs`) with a minimal standalone config when the app leaves the monorepo.
- [x] T114 [P] Create `specs/248-extract-spec-navigator/extraction-kit/patches/05-tsconfig-standalone.md` — recipe for inlining the relevant settings from `../../tsconfig.base.json` after the subtree split.

### Phase 3 runbook (deferred to a follow-up PR)

- [x] T115 Create `specs/248-extract-spec-navigator/extraction-kit/PHASE3-RUNBOOK.md` capturing the cutover checklist from `quickstart.md` Phase 3 (delete app + 2 dedicated workflows, update `spec-navigator-comment.yml` URL host, remove 2 spec-nav refs from `ci.yml`, update CLAUDE.md, add ADR-031). Lists the smoke-test PR procedure that gates the merge.

---

## Polish & Evidence

- [x] T201 Capture evidence/test-summary.md using `.specify/templates/evidence/test-summary-template.md`. Record git SHA, ISO timestamp, and test counts from T010–T013.
- [x] T202 [P] Capture evidence/usage-example.md showing (a) a non-default `VITE_DEFAULT_REPO` build smoke run pointing at a different public repo, and (b) the grep verification that `src/` has zero debrief literals outside fallbacks.
- [x] T203 [P] Verify `evidence/opening-context.md` already exists from `/speckit.plan`. If absent, generate a brief opening-context note (this is a backend/infra feature with no UI evidence required by the Quality Rubric).
- [x] T204 Final `task verify` (or 4-step fallback) at repo root passes before push.
- [~] T205 Update BACKLOG.md row for #248 to `complete` (strikethrough each cell with `~~`) and commit `chore(backlog): mark item 248 as complete`. **SKIPPED** — same reason as T001; no matching row exists.

---

## Dependencies

- Phase 1 Setup (T001) precedes everything else.
- Foundation T002 must complete before T003–T009 (parallel block).
- Phase 1 verification T010–T014 runs after the foundation/rewire block.
- Phase 2 kit (T101–T115) is independent of Phase 1 source changes once T002 lands; T101–T114 can all run in parallel.
- Polish T201–T205 runs last, after Phase 1 verification is green and Phase 2 kit is committed.

## Out of scope for this PR

- Creating the new `debrief/spec-navigator` repo (tooling restricted; deferred to operator).
- Live deploy of the hosted instance (depends on operator running the kit).
- Phase 3 deletion of `apps/spec-navigator/` (deferred to follow-up PR per `PHASE3-RUNBOOK.md`).
- `specFormatVersion` (deferred per decision 3A; backlog #255).
