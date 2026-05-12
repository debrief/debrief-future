# Tasks: Extract backlog-navigator into a Standalone Repository

**Feature**: 249-extract-backlog-navigator
**Branch**: `claude/backlog-navigator-spec-PO00f`
**Scope (this branch)**: **Phase 0** (coupling audit, in this repo) + **Phase 1** (configuration seam, in `apps/backlog-navigator/`) + **Phase 2** (extraction kit shipped under `specs/249-extract-backlog-navigator/extraction-kit/`). **Phase 3** (cutover) is deferred to a follow-up PR after the new repo is live (the runbook ships with the kit).

The plan covers three operator phases across two repositories. This monorepo PR cannot create or push to `<org>/backlog-navigator` (tooling restricted to `debrief/debrief-future`), so:

- **Phase 0** lands as `docs/extraction-audit/backlog-navigator/coupling-inventory.md`.
- **Phase 1** lands as code changes in `apps/backlog-navigator/` (FR-001 through FR-010).
- **Phase 2** ships as a self-contained extraction kit checked in under `specs/249-extract-backlog-navigator/extraction-kit/`. A maintainer with org-admin rights on the destination org runs the kit locally to stand up the new repo (FR-011 through FR-020).
- **Phase 3** is deferred to a follow-up PR triggered after Phase 2 is live (FR runbook: `extraction-kit/PHASE3-RUNBOOK.md`).

Conventions:
- `[P]` = parallel-eligible (different files, no ordering dependency).
- `[test]` = test/verification step (running an existing test or grep, not new tests against tests).
- All paths absolute or relative to repo root.

## Evidence Requirements

> **Purpose**: Capture artifacts that prove (a) the Phase 1 config seam is functionally a no-op for the existing build, (b) every audit-identified literal has been removed from production code, and (c) the extraction kit produces a buildable standalone repo when run end-to-end.

**Evidence Directory**: `specs/249-extract-backlog-navigator/evidence/`
**Media Directory**: `specs/249-extract-backlog-navigator/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | Counts from `pnpm --filter @debrief/backlog-navigator lint/typecheck/test/test:e2e` + Lighthouse run, with YAML front matter | After Phase 1 verification (T030–T034) |
| `evidence/usage-example.md` | Two demos: (a) build of `apps/backlog-navigator/` with `VITE_DEFAULT_OWNER=octocat VITE_DEFAULT_REPO=hello-world` rendering a foreign repo; (b) `grep` showing zero debrief literals in `apps/backlog-navigator/src/` outside `??` fallbacks | After Phase 1 complete |
| `evidence/coupling-inventory.md` | Mirror of `docs/extraction-audit/backlog-navigator/coupling-inventory.md` (or a symlink note) for in-spec discoverability | Phase 0 |
| `evidence/kit-config-sample.json` | A worked example of `kit-config.json` for `deepbluecltd/backlog-navigator` | Phase 2 |
| `evidence/kit-dry-run.txt` | Captured stdout of `extract.sh --dry-run --destination <stub>/<stub>` showing the operator-facing flow without touching any remote | Phase 2 |
| `evidence/grep-no-debrief-literals.txt` | Output of the grep guard from T035 (the kit's `extract.sh` smoke check) | Phase 1 verification |
| `evidence/opening-context.md` | Cached opener (Hook / What We're Building / How It Fits / Key Decisions) | Already captured by `/speckit.plan` |
| `media/shipped-post.md` | Final feature post combining cached opener + ship-time evidence | Polish phase |

### Feature type

This feature classifies as **Infrastructure + Library/SDK**:
- *Infrastructure*: configuration seam, kit scripts, workflows, deploy targets.
- *Library/SDK*: the kit itself is a reusable artefact other adopters can run.

Per the Quality Rubric, required type-specific evidence is **configuration sample** (`kit-config-sample.json`) and **validation output** (`grep-no-debrief-literals.txt`, `kit-dry-run.txt`). No UI screenshots/GIF needed — the migration explicitly preserves the existing UI byte-for-byte (FR-024).

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener (Hook = before/after comparison table) | During `/speckit.plan` ✅ done |
| `media/shipped-post.md` | Feature post combining cached opener + ship-time evidence | During Polish phase (final-stage task before PR) |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence + kit checked in | Final task (`/speckit.pr`) |
| Blog PR | PR in debrief.github.io with `shipped-post.md` | Triggered by `/speckit.pr` |

---

## Phase 1: Setup

**Purpose**: Mark the backlog item in-progress; scaffold the spec-side directories that downstream phases populate.

- [x] T001 Update `BACKLOG.md` row for item #249 from `approved` to `implementing`, then commit `chore(backlog): mark item 249 as implementing` `BACKLOG.md`
- [x] T002 [P] Create empty `specs/249-extract-backlog-navigator/extraction-kit/` directory tree (`scripts/`, `workflows/`, `templates/`, `templates/specs-dummy/`, `docs/`) so Phase 2 tasks can drop files in their final positions `specs/249-extract-backlog-navigator/extraction-kit/.gitkeep`
- [x] T003 [P] Create empty `docs/extraction-audit/backlog-navigator/` directory so Phase 0 has a settled home `docs/extraction-audit/backlog-navigator/.gitkeep`
- [x] T004 [P] Create empty `specs/249-extract-backlog-navigator/evidence/` already exists from `/speckit.plan` — no-op; create `specs/249-extract-backlog-navigator/media/` for the eventual feature post `specs/249-extract-backlog-navigator/media/.gitkeep`

**Checkpoint**: Spec-side directories exist; backlog status reflects in-progress work.

---

## Phase 2: Foundational — Phase 0 Coupling Audit

**Purpose**: Produce `docs/extraction-audit/backlog-navigator/coupling-inventory.md` (FR-001 through FR-003). The audit's findings are the **input** to Phase 1 — Phase 1 must not start until the audit document exists and lists every literal that needs to move into `defaults.ts` and every `@debrief/*` import that needs handling.

**⚠️ CRITICAL**: User Story 1 (Phase 3 below) cannot begin until this phase is complete.

- [x] T005 Initialise the audit document with the §1/§2/§3/§4 structure required by FR-001/002/003. Header explains the document is the input to Phase 1 `docs/extraction-audit/backlog-navigator/coupling-inventory.md`
- [x] T006 [P] Audit §1 — Hardcoded debrief literals in `apps/backlog-navigator/src/`. List every `'debrief'`, `"debrief"`, `'debrief-future'`, `'debrief.github.io'` occurrence with `file:line` citation. Pre-audit scan baseline: `src/github/api.ts:25` (`DEFAULT_OWNER`), `src/github/api.ts:26` (`DEFAULT_REPO`); confirm by exhaustive grep `docs/extraction-audit/backlog-navigator/coupling-inventory.md`
- [x] T007 [P] Audit §1b — Hardcoded debrief literals in `apps/backlog-navigator/vite.config.ts` (PWA manifest fields + `VITE_BASE_URL` default `/debrief-future/backlog-navigator/`). List with `file:line`; distinguish from `process.env`-driven values that already exist `docs/extraction-audit/backlog-navigator/coupling-inventory.md`
- [x] T008 [P] Audit §2 — Workspace dependencies. List every `@debrief/*` import path under `apps/backlog-navigator/src/`. Pre-audit baseline: `@debrief/components/hooks/useIsMobile` (verified in `src/App.tsx`, `src/editors/EditorOverlayProvider.tsx`, `src/test-setup.ts`); confirm exhaustively and call out the strategy (inline-copy per R-007) `docs/extraction-audit/backlog-navigator/coupling-inventory.md`
- [x] T009 [P] Audit §3 — Monorepo-shared infrastructure. Enumerate: which `shared/eslint-rules/*` are consumed (transitively or directly); which `tsconfig.base.json` settings are inherited; whether the app references any root-level fixtures; which root-level `devDependencies` are consumed only by backlog-navigator. Pre-audit baseline: `@lhci/cli` is backlog-navigator-only `docs/extraction-audit/backlog-navigator/coupling-inventory.md`
- [x] T010 [P] Audit §3b — Repo-level workflow coupling. List every `.github/workflows/*.yml` file that mentions `backlog-navigator`. Pre-audit baseline: 4 dedicated workflows (`backlog-navigator-{preview,publish,lighthouse,comment}.yml`) + 2 references in `ci.yml` (lines 143–144). Confirm whether `heroku.yml`, `app.json`, `Dockerfile.preview` reference backlog-navigator (pre-audit scan: none) `docs/extraction-audit/backlog-navigator/coupling-inventory.md`
- [x] T011 [P] Audit §4 — Production-code vs fixture/test content. Distinguish literals that are *couplings* (which Phase 1 moves into `defaults.ts`) from literals that are *rendered content* (which represent fixture-data being displayed, not couplings — leave these alone per FR-002). Mark each §1/§1b entry as `[coupling]` or `[content]` `docs/extraction-audit/backlog-navigator/coupling-inventory.md`
- [x] T012 [P] Audit §5 — Cross-cutting commits. Run `git log --oneline -- apps/backlog-navigator/` and identify any commits that touched both `apps/backlog-navigator/` and unrelated paths; record commit SHAs for the operator to annotate via `git notes` after subtree split (R-001 policy) `docs/extraction-audit/backlog-navigator/coupling-inventory.md`
- [x] T013 Audit §6 — Summary + Phase 1 patch list. From §1/§1b/§3, derive the *exact* list of files Phase 1 will edit and what each edit does (e.g., "`src/github/api.ts`: replace inline constants with `import.meta.env` reads"). This list IS the input to Phase 3 below `docs/extraction-audit/backlog-navigator/coupling-inventory.md`
- [x] T014 [test] Verify the audit is complete: `grep -ri 'debrief\|debrief-future\|debrief.github.io' apps/backlog-navigator/src/ apps/backlog-navigator/vite.config.ts` produces N results, and the audit document accounts for all N `docs/extraction-audit/backlog-navigator/coupling-inventory.md`

**Checkpoint**: The audit exists and is reviewed. Phase 1 has its definitive scope.

---

## Phase 3: User Story 1 — Decouple backlog-navigator in place (Priority: P1)

**Goal**: Land the configuration seam in `apps/backlog-navigator/` per FR-004–FR-010. Every audit-identified production literal moves into a centralised module; the `packageManager` field is added so the extracted repo's CI works on first push; the single workspace dep (`useIsMobile`) is inline-copied. Default values reproduce today's experience byte-for-byte.

**Independent Test**: Build the app with `VITE_DEFAULT_OWNER=octocat VITE_DEFAULT_REPO=hello-world`, then open the resulting bundle in a browser — it renders `octocat/hello-world`'s `BACKLOG.md` (or an empty state for a repo that has none) without source-code edits. Re-build with no env vars and the app behaves identically to today.

### Foundation: centralised defaults module

- [x] T015 [US1] Create `apps/backlog-navigator/src/defaults.ts` exporting build-time defaults. Pattern from #248 `defaults.ts` plus the PWA-manifest-only fields:
  - Runtime defaults (read at module-load via `import.meta.env`): `DEFAULT_OWNER` (fallback `'debrief'`), `DEFAULT_REPO` (fallback `'debrief-future'`), `DEFAULT_REPO_LABEL` (derived `${DEFAULT_OWNER}/${DEFAULT_REPO}`), `PROD_HOST` (fallback `'debrief.github.io'`).
  - Build-time defaults (consumed by `vite.config.ts` via `process.env` at vite-config evaluation time, not from this file). The two surfaces are documented in the file header `apps/backlog-navigator/src/defaults.ts`

### Inline-copy the single workspace dependency (R-007)

- [x] T016 [US1] Create `apps/backlog-navigator/src/hooks/useIsMobile.ts` — exact copy of `shared/components/src/hooks/useIsMobile.ts` with a provenance comment at the top citing debrief-future #246-hooks-workspace-package as the source. Public surface unchanged (default export, returns `boolean`) `apps/backlog-navigator/src/hooks/useIsMobile.ts`

### Rewire production source to defaults (parallel after T015 + T016)

- [x] T017 [P] [US1] Rewire `apps/backlog-navigator/src/github/api.ts` — remove the two inline `DEFAULT_OWNER`/`DEFAULT_REPO` constants and re-export them from `../defaults`. Existing call sites unchanged `apps/backlog-navigator/src/github/api.ts`
- [x] T018 [P] [US1] Extend `apps/backlog-navigator/src/strings.ts` with a `host` exported const that reads from `defaults.ts`'s `PROD_HOST`. Update any inline `'debrief.github.io'` references the audit (§1) surfaces to read from `host` `apps/backlog-navigator/src/strings.ts`
- [x] T019 [P] [US1] Rewire `apps/backlog-navigator/src/App.tsx` — replace `import { useIsMobile } from '@debrief/components/hooks/useIsMobile'` with `import { useIsMobile } from './hooks/useIsMobile'` (or matching relative path) `apps/backlog-navigator/src/App.tsx`
- [x] T020 [P] [US1] Rewire `apps/backlog-navigator/src/editors/EditorOverlayProvider.tsx` — same import substitution as T019 `apps/backlog-navigator/src/editors/EditorOverlayProvider.tsx`
- [x] T021 [P] [US1] Update `apps/backlog-navigator/src/test-setup.ts` comment that references the workspace import path to reflect the new local path `apps/backlog-navigator/src/test-setup.ts`

### Rewire vite.config.ts to env-driven PWA manifest

- [x] T022 [US1] Edit `apps/backlog-navigator/vite.config.ts` — make every PWA manifest literal env-overridable via `process.env.VITE_*` (with the existing debrief value as the fallback). Fields per data-model.md §B: `VITE_APP_NAME`, `VITE_APP_SHORT_NAME`, `VITE_APP_DESCRIPTION`, `VITE_THEME_COLOR`, `VITE_BG_COLOR`. The existing `VITE_BASE_URL` read is already env-driven; no change there. The Zod `validateManifest()` call remains the boundary `apps/backlog-navigator/vite.config.ts`

### Add `packageManager` field (FR-010 — the #248 Lesson 2 prevention)

- [x] T023 [US1] Edit `apps/backlog-navigator/package.json` to add a top-level `"packageManager"` field. Pin the current pnpm version used by the monorepo (run `pnpm --version` to confirm; expected `"pnpm@10.33.0"` or similar). Without this field, the standalone repo's first `pnpm/action-setup@v4` step fails immediately (verified failure mode from #248 hand-off) `apps/backlog-navigator/package.json`

### Workspace dep cleanup (after T019–T021 confirm no remaining usage)

- [x] T024 [US1] Remove `@debrief/components` from `apps/backlog-navigator/package.json` `dependencies` — verified-only consumer was the now-rewired hook. (Run `grep -r '@debrief/components' apps/backlog-navigator/src/` after T019–T021 to confirm zero remaining imports.) The standalone repo's `package.json` must not carry this dep `apps/backlog-navigator/package.json`

### Rewire tests to defaults (parallel after T015)

- [x] T025 [P] [US1] Audit & rewire any tests under `apps/backlog-navigator/src/**/__tests__/` or `apps/backlog-navigator/e2e/` that reference `'debrief'`/`'debrief-future'` literals. Replace inline strings with imports from `../defaults` or `../../defaults` per #248 pattern; *test content that renders BACKLOG items* (FR-002 — content, not coupling) stays inline `apps/backlog-navigator/src/`
- [x] T026 [P] [US1] Verify `apps/backlog-navigator/test-setup.ts` and `vitest.config.ts` continue to mock-out `window.matchMedia` for the now-local `useIsMobile` (no functional change expected, but the import path changed) `apps/backlog-navigator/test-setup.ts`

### Lighthouse config — confirm `.lighthouserc.json` is portable

- [x] T027 [P] [US1] Read `apps/backlog-navigator/.lighthouserc.json` and verify it has no monorepo-relative paths or debrief literals (pre-scan: it is fully self-contained). No edit expected; record in audit §3 if anything is found `apps/backlog-navigator/.lighthouserc.json`

### Phase 1 verification (gate before opening PR for US1)

- [x] T028 [US1] [test] Run `pnpm --filter @debrief/backlog-navigator lint` and confirm green
- [x] T029 [P] [US1] [test] Run `pnpm --filter @debrief/backlog-navigator typecheck` and confirm green
- [x] T030 [P] [US1] [test] Run `pnpm --filter @debrief/backlog-navigator test` (Vitest) and confirm green
- [x] T031 [US1] [test] Run `pnpm --filter @debrief/backlog-navigator build && cd apps/backlog-navigator && node run-playwright.mjs` and confirm green
- [x] T032 [US1] [test] Smoke build with non-default env vars: `cd apps/backlog-navigator && VITE_DEFAULT_OWNER=octocat VITE_DEFAULT_REPO=hello-world pnpm build`. Verify dist artefacts reference `octocat/hello-world` in the appropriate string-table outputs (grep `dist/assets/*.js` for `octocat`) `apps/backlog-navigator/dist/`
- [x] T033 [US1] [test] Verify the Lighthouse-PWA budget still passes locally: build with `VITE_BASE_URL=/`, `pnpm preview --port 5175`, run `pnpm dlx @lhci/cli@0.13.0 autorun --config ./apps/backlog-navigator/.lighthouserc.json` and confirm green (this verifies the manifest changes from T022 didn't regress the PWA budget) `apps/backlog-navigator/.lighthouseci/`
- [x] T034 [US1] [test] Run the grep guard: `git grep -nE "'debrief'|\"debrief\"|debrief-future|debrief\\.github\\.io" apps/backlog-navigator/src/ apps/backlog-navigator/vite.config.ts` and confirm every remaining match is either a `??` fallback expression in `defaults.ts` / `vite.config.ts`, an i18n string-table value (`'Debrief Backlog Navigator'` etc. are user-facing strings that *could* stay if the audit marks them as content — confirm matches the audit's §4 classification), or a comment. Save the output to `specs/249-extract-backlog-navigator/evidence/grep-no-debrief-literals.txt` `specs/249-extract-backlog-navigator/evidence/grep-no-debrief-literals.txt`
- [x] T035 [US1] [test] Run `git grep -rn '@debrief' apps/backlog-navigator/src/ apps/backlog-navigator/package.json` and confirm zero matches (both source and package.json dep — workspace dep fully severed) `apps/backlog-navigator/`

**Checkpoint**: The app builds and tests pass identically to pre-Phase-1; a non-default `VITE_DEFAULT_OWNER/REPO` build renders a foreign repo; the workspace dep is gone; `packageManager` is present. US1 is independently shippable.

---

## Phase 4: User Story 2 — Extraction kit for the standalone repo (Priority: P2)

**Goal**: Build a self-contained extraction kit under `specs/249-extract-backlog-navigator/extraction-kit/` that an operator with org-admin rights on the destination repo runs locally to produce the new repo. The kit covers FR-011 through FR-020.

**Independent Test**: A reviewer who has not touched debrief-future before reads `extraction-kit/README.md`, supplies `--destination <test-org>/<test-repo>` against an empty test repo they own, runs the two scripts, and the resulting destination repo: (a) has subtree-preserved history of `apps/backlog-navigator/`, (b) goes green on the first CI run with no manual rework, (c) deploys to GitHub Pages on the `gh-pages` branch via `JamesIves/github-pages-deploy-action@v4`, (d) produces a working per-PR preview at `/previews/pr-<n>/` with a sticky comment, (e) renders the bundled dummy `BACKLOG.md` at the default URL with no query params.

> **Note on kit scope**: This branch SHIPS the kit (files committed under `extraction-kit/`). It does NOT EXECUTE the kit (no remote repos are created). End-to-end execution is the operator's job; #248's pattern is that the kit + runbook is the deliverable here.

### Kit scaffolding: README + runbooks

- [x] T036 [P] [US2] Create the kit's operator runbook covering: prerequisites (Step 0a GitHub App install, Step 0b empty repo, Step 0c merge-unrelated fallback per R-011, Step 0d destination slug per R-009); the script ordering; the one-time GitHub web-UI configuration; the smoke-test sequence. Placeholder substitution syntax (`{{ORG}}`, `{{REPO}}`, `{{HOST}}`) is explained here `specs/249-extract-backlog-navigator/extraction-kit/README.md`
- [x] T037 [P] [US2] Create the Phase 3 runbook (the cutover sequence — executed in a *follow-up* PR after this branch ships and the standalone repo is live for ≥7 days). Touch-set per R-013; pre-merge verification steps; rollback path `specs/249-extract-backlog-navigator/extraction-kit/PHASE3-RUNBOOK.md`
- [x] T038 [P] [US2] Create the kit's configuration sample — a worked example of `kit-config.json` with `destination: deepbluecltd/backlog-navigator` and `host: deepbluecltd.github.io`. Also serves as evidence artefact (referenced in Evidence Requirements) `specs/249-extract-backlog-navigator/extraction-kit/kit-config.sample.json`

### Kit scripts: extract + bootstrap

- [x] T039 [US2] Create `extract.sh` (R-001, R-009, R-010, R-012). Accepts `--destination <org>/<repo>` flag (or reads `kit-config.json`). Performs: (1) fresh clone of debrief-future into a working dir; (2) `git subtree split --prefix=apps/backlog-navigator -b extracted`; (3) checkout `extracted`; (4) sed-replace the `vite.config.ts` base default with `/<repo>/`; (5) `pnpm install --lockfile-only` and commit the new `pnpm-lock.yaml`; (6) smoke `pnpm install && pnpm test && pnpm build`; (7) abort on any failure with the offending log. Must be idempotent and safe to re-run. Bash strict mode (`set -euo pipefail`) `specs/249-extract-backlog-navigator/extraction-kit/scripts/extract.sh`
- [x] T040 [US2] Create `bootstrap-new-repo.sh` (R-011, R-012). Accepts `--destination <org>/<repo>` and `--host <host>` flags. Performs: (1) detect non-empty target (offer `--merge-unrelated-histories` fallback); (2) push `extracted` branch to destination as `main` (handle 403 with explicit "install the GitHub App on the destination repo" guidance per R-011); (3) copy `templates/*` into the working tree with `{{ORG}}`/`{{REPO}}`/`{{HOST}}` substituted; (4) copy `workflows/*.yml` into `.github/workflows/`; (5) copy `templates/specs-dummy/` to `specs/` and `templates/BACKLOG.dummy.md` to the repo root; (6) commit + push. Idempotent for safe re-run after partial failure `specs/249-extract-backlog-navigator/extraction-kit/scripts/bootstrap-new-repo.sh`

### CI workflows for the new repo (six files — five default + one optional)

- [x] T041 [P] [US2] Create `ci.yml` per `contracts/ci-surface.md` §`ci.yml`. Triggers on every PR + push to `main`. Jobs: `lint-typecheck-test` (`pnpm lint`, `pnpm typecheck`, `pnpm test`) and `e2e` (`pnpm test:e2e` via `@sparticuz/chromium`). `pnpm/action-setup@v4` resolves the pinned version via the `packageManager` field — no version arg `specs/249-extract-backlog-navigator/extraction-kit/workflows/ci.yml`
- [x] T042 [P] [US2] Create `lighthouse.yml` per `contracts/ci-surface.md` §`lighthouse.yml`. Mirrors `apps/backlog-navigator-lighthouse.yml` but as a top-level workflow with the standalone repo's paths (`apps/backlog-navigator/` → `./`). Carries ADR-030's PWA budget commitment `specs/249-extract-backlog-navigator/extraction-kit/workflows/lighthouse.yml`
- [x] T043 [P] [US2] Create `deploy.yml` per `contracts/ci-surface.md` §`deploy.yml`. Triggers on `push` to `main`. Uses `JamesIves/github-pages-deploy-action@v4` with `branch: gh-pages`, `folder: dist`, `target-folder: .`, **`clean-exclude: previews/`** (FR-014 — preserves in-flight PR preview folders). Build uses `VITE_BASE=/{{REPO}}/` `specs/249-extract-backlog-navigator/extraction-kit/workflows/deploy.yml`
- [x] T044 [P] [US2] Create `pr-preview.yml` per `contracts/ci-surface.md` §`pr-preview.yml` (FR-012). Triggers on `pull_request` (opened/synchronize/reopened). Builds with `VITE_BASE=/{{REPO}}/previews/pr-${{ github.event.pull_request.number }}/`, `VITE_DEFAULT_OWNER={{ORG}}`, `VITE_DEFAULT_REPO={{REPO}}`, `VITE_BACKLOG_NAV_DRY_RUN=true`. Deploys to `gh-pages` under `previews/pr-<n>/` via `JamesIves/github-pages-deploy-action@v4` with `clean-exclude` that protects this PR's folder. Upserts a sticky comment via `actions/github-script@v7` using the `<!-- backlog-nav-preview -->` sentinel. Comment body includes all four sample URL shapes per FR-012 `specs/249-extract-backlog-navigator/extraction-kit/workflows/pr-preview.yml`
- [x] T045 [P] [US2] Create `pr-preview-cleanup.yml` per `contracts/ci-surface.md` §`pr-preview-cleanup.yml` (FR-013). Triggers on `pull_request closed`. Checks out `gh-pages`, removes `previews/pr-<n>/`, commits, pushes. Idempotent (no-op if folder already absent) `specs/249-extract-backlog-navigator/extraction-kit/workflows/pr-preview-cleanup.yml`
- [x] T046 [P] [US2] Create `live.yml.template` — **NOT** placed in `.github/workflows/` by default (FR-019, R-015). Header comment explains "rename to `live.yml` and move into `.github/workflows/` if drift detection against the upstream GitHub API is wanted; supply `LIVE_GITHUB_TOKEN` Actions secret". Body matches `contracts/ci-surface.md` §`live.yml`. The kit's `README.md` documents the opt-in `specs/249-extract-backlog-navigator/extraction-kit/workflows/live.yml.template`

### Templates: drop-in standalone configs (R-012)

- [x] T047 [P] [US2] Create the standalone `README.md` with `{{ORG}}`/`{{REPO}}`/`{{HOST}}` placeholders (FR-018, R-009). Covers: what the app is, local dev quickstart, configuration via `VITE_*` env vars + URL params (referencing `contracts/hosted-url.md`), test commands, deployment overview, adopter onboarding. NO `debrief.github.io` literal anywhere `specs/249-extract-backlog-navigator/extraction-kit/templates/README.md`
- [x] T048 [P] [US2] Create the standalone `CONFIGURATION.md` — full reference of the `VITE_*` env vars (`VITE_DEFAULT_OWNER`, `VITE_DEFAULT_REPO`, `VITE_BASE_URL`, `VITE_APP_NAME`, `VITE_APP_SHORT_NAME`, `VITE_APP_DESCRIPTION`, `VITE_THEME_COLOR`, `VITE_BG_COLOR`, `VITE_BACKLOG_NAV_DRY_RUN`); the URL contract (both `?pr=` and `?repo=&branch=` forms); the precedence rules (data-model.md §"Resolution order"); the opt-in `live.yml` path `specs/249-extract-backlog-navigator/extraction-kit/templates/CONFIGURATION.md`
- [x] T049 [P] [US2] Create the standalone `SECURITY.md` — PAT scopes (R-007 from #248 carried; backlog-nav adds the *write* path via the user's own PAT in `localStorage`, so document that separately), GitHub Pages branch protection guidance, secret rotation policy for `LHCI_GITHUB_APP_TOKEN` and `LIVE_GITHUB_TOKEN`, leak response steps `specs/249-extract-backlog-navigator/extraction-kit/templates/SECURITY.md`
- [x] T050 [P] [US2] Create the standalone `.eslintrc.cjs` — inlines the rules currently inherited from monorepo-shared `shared/eslint-rules/*`. Drop-in file with no monorepo refs (R-012 / #248 Lesson 5). Confirm by `cat` review that no relative path leaves the future standalone repo `specs/249-extract-backlog-navigator/extraction-kit/templates/.eslintrc.cjs`
- [x] T051 [P] [US2] Create the standalone `tsconfig.json` — inlines the relevant compilerOptions from `tsconfig.base.json` (currently inherited by `apps/backlog-navigator/tsconfig.json`). Strict mode mandatory (Article XV). No `extends:` of a monorepo path `specs/249-extract-backlog-navigator/extraction-kit/templates/tsconfig.json`
- [x] T052 [P] [US2] Create the standalone `tsconfig.node.json` for vite-config-only TypeScript. Same drop-in pattern `specs/249-extract-backlog-navigator/extraction-kit/templates/tsconfig.node.json`
- [x] T053 [P] [US2] Create the standalone `.gitignore` — `node_modules/`, `dist/`, `playwright-report/`, `test-results/`, `.chromium-path` (`@sparticuz/chromium` cache), `.lighthouseci/`, `.env.local` `specs/249-extract-backlog-navigator/extraction-kit/templates/.gitignore`

### Bundled dummy speckit dataset (R-005, FR-016)

- [x] T054 [P] [US2] Create the bundled dummy `BACKLOG.md` for the new repo's root — a condensed version with 6–10 items spanning multiple epics, multiple statuses, multiple V·M·A scores, so a reviewer opening the default preview URL exercises sort/filter/group/description-expand/lozenge rendering. Items reference dummy spec dir paths (`specs/NNN-dummy-spec-1/`, etc.) that exist under `templates/specs-dummy/` `specs/249-extract-backlog-navigator/extraction-kit/templates/BACKLOG.dummy.md`
- [x] T055 [P] [US2] Create one bundled dummy spec dir at `templates/specs-dummy/<NNN>-<name>/` containing `spec.md`, a one-line `plan.md`, and a one-line `tasks.md`. Make it linked-from-`BACKLOG.dummy.md`. Recommended source: a stripped, narrative-rich excerpt of an existing spec (mirror #248's choice of `237-active-storyboard-persistence` or pick one that reads cleanly without context). The link surface (spec-anchor links in BACKLOG.md) must be exercised `specs/249-extract-backlog-navigator/extraction-kit/templates/specs-dummy/<NNN>-<name>/spec.md`

### Lessons docs (rationale references, not implementation)

- [x] T056 [P] [US2] Create `docs/lessons-from-248.md` — extract the spec's "Lessons from #248" section into the kit so adopters / future maintainers understand *why* the kit looks the way it does. Twelve enumerated lessons, each linked to the FR / R-NNN that codifies the fix `specs/249-extract-backlog-navigator/extraction-kit/docs/lessons-from-248.md`
- [x] T057 [P] [US2] Create `docs/why-no-patch-03.md` — record the rationale for dropping #248's `patches/03-bundled-fixtures.md`. References R-006 / FR-019 / #248 Lesson 12. Three-paragraph essay max — what patch 03 proposed, why the in-process route mock is sufficient, when (if ever) to opt into `live.yml` `specs/249-extract-backlog-navigator/extraction-kit/docs/why-no-patch-03.md`

### Phase 2 verification

- [x] T058 [US2] [test] Dry-run `extract.sh --dry-run --destination test-org/test-repo` (the script supports a `--dry-run` flag that performs all local operations but does NOT push). Capture stdout to `specs/249-extract-backlog-navigator/evidence/kit-dry-run.txt`. Verify the dry run produces a valid extracted branch and a regenerated `pnpm-lock.yaml` `specs/249-extract-backlog-navigator/evidence/kit-dry-run.txt`
- [x] T059 [P] [US2] [test] Lint kit shell scripts: `shellcheck specs/249-extract-backlog-navigator/extraction-kit/scripts/*.sh` and confirm zero errors (use `# shellcheck disable=...` annotations sparingly, only for false positives) `specs/249-extract-backlog-navigator/extraction-kit/scripts/`
- [x] T060 [P] [US2] [test] Lint kit workflows: `yamllint specs/249-extract-backlog-navigator/extraction-kit/workflows/*.yml` (or `actionlint` if available) and confirm zero errors `specs/249-extract-backlog-navigator/extraction-kit/workflows/`
- [x] T061 [P] [US2] [test] Verify zero hardcoded debrief literals in kit *templates*: `grep -r 'debrief' specs/249-extract-backlog-navigator/extraction-kit/templates/ specs/249-extract-backlog-navigator/extraction-kit/workflows/ specs/249-extract-backlog-navigator/extraction-kit/scripts/` should match only `{{ORG}}`/`{{REPO}}`/`{{HOST}}` placeholders, comments referencing #248's source repo, or the kit-config sample (which IS allowed to mention debrief-future as the *source* repo, not the destination) `specs/249-extract-backlog-navigator/extraction-kit/`
- [x] T062 [P] [US2] [test] Verify the kit substitutes correctly: run `bootstrap-new-repo.sh --dry-run --destination acme/foo --host acme.github.io` (script supports a `--dry-run` flag that performs the substitution in a temp dir but does NOT push). `grep` the temp dir for any remaining `{{...}}` placeholders — should be zero `specs/249-extract-backlog-navigator/evidence/`

**Checkpoint**: The extraction kit is fully checked in under `specs/249-extract-backlog-navigator/extraction-kit/`. An operator with org-admin rights on a destination repo can run it end-to-end without referring back to debrief-future internals. The bundled dummy `BACKLOG.md` + spec dir render at the default URL.

---

## Phase 5: User Story 3 — Cutover runbook (Priority: P3, deferred to follow-up PR)

**Goal**: Ship the cutover *runbook* (already created by T037 as `extraction-kit/PHASE3-RUNBOOK.md`) — the actual cutover is executed in a separate, follow-up PR after the new repo has been live and green for ≥7 days (the cutover gate from #248 FR-018, carried forward). This phase has *no code changes in this branch* — it exists to document the gate, the touch-set, and the rollback path, all of which were captured during Phase 2.

**Independent Test**: A maintainer (in a future PR) reads `extraction-kit/PHASE3-RUNBOOK.md` and follows it step-by-step to land the cutover PR. The runbook is sufficient on its own — no need to refer back to spec.md or plan.md.

> **This phase is intentionally minimal.** The cutover *runbook content* lives in T037's output; this phase's tasks are sanity checks that the runbook is complete and discoverable.

### Runbook completeness verification

- [x] T063 [US3] [test] Read `extraction-kit/PHASE3-RUNBOOK.md` (output of T037) and verify the touch-set table per R-013 is present: `apps/backlog-navigator/` (delete), three workflows (`backlog-navigator-{preview,publish,lighthouse}.yml` — delete), `backlog-navigator-comment.yml` (keep, update URL host), `.github/workflows/ci.yml` (remove lines 143–144), `heroku.yml`/`app.json`/`Dockerfile.preview` (verify clean), `package.json` root (remove `@lhci/cli`), `CLAUDE.md` (trim Step 4), `docs/project_notes/decisions.md` (add ADR-032, amend ADR-030) `specs/249-extract-backlog-navigator/extraction-kit/PHASE3-RUNBOOK.md`
- [x] T064 [US3] [test] Verify the runbook includes the **pre-merge verification sequence** (R-013): smoke-test PR confirms updated `backlog-navigator-comment.yml` emits the new URL form; clicking the link resolves correctly via the R-014 compat shim. Without this gate, the cutover risks landing while the hosted instance is misconfigured `specs/249-extract-backlog-navigator/extraction-kit/PHASE3-RUNBOOK.md`
- [x] T065 [US3] [test] Verify the runbook documents the **cutover gate**: ≥7 consecutive green nightly `live.yml` runs (if enabled), OR ≥7 days of green `ci.yml` runs on the standalone repo, before Phase 3 may merge. References #248 FR-018 `specs/249-extract-backlog-navigator/extraction-kit/PHASE3-RUNBOOK.md`
- [x] T066 [US3] [test] Verify the runbook documents the **rollback path** (R-013): a single `git revert` of the cutover PR restores `apps/backlog-navigator/`, the three deleted workflows, the root devDep, and the doc state. The hosted instance stays live during a rollback `specs/249-extract-backlog-navigator/extraction-kit/PHASE3-RUNBOOK.md`
- [x] T067 [US3] [test] Verify the runbook documents the **ADR pair**: ADR-032 (extraction) added; ADR-030 (vite-plugin-pwa) gets the owner-moved annotation — *not* a status flip, since the PWA tooling decision is unchanged; only the owner moves `specs/249-extract-backlog-navigator/extraction-kit/PHASE3-RUNBOOK.md`

**Checkpoint**: The cutover runbook is complete and discoverable. Phase 3 execution (in a future PR) requires no further design work — just reading the runbook and following it.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Capture evidence proving Phase 0/1/2 landed; update institutional memory (project notes); generate the feature post; trigger the PR + blog publishing flow.

### Repo-level validation (gate before evidence)

- [x] T068 [test] Run full repo verification at the repo root: `task verify` (or the four-step fallback documented in CLAUDE.md "Before Pushing"). Confirms backlog-navigator's Phase 1 changes didn't regress any monorepo concern (lint, typecheck, Vitest, Playwright across all workspaces) `Taskfile.yml`

### Evidence Collection (REQUIRED)

- [x] T069 Capture test results using template `.specify/templates/evidence/test-summary-template.md`. Front matter: `feature: 249-extract-backlog-navigator`, `captured_at` (ISO timestamp), `git_sha` (current HEAD), `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct` (omit if not measured). Body: scenarios verified (T028–T035, T058–T062, T063–T067) — what each gate proved and why. Reference T031/T033 Lighthouse green as PWA-budget evidence `specs/249-extract-backlog-navigator/evidence/test-summary.md`
- [x] T070 Create usage demonstration with two worked examples: (a) running `pnpm build` of `apps/backlog-navigator/` with `VITE_DEFAULT_OWNER=octocat VITE_DEFAULT_REPO=hello-world` and inspecting the dist artefact for the configured slug; (b) operator-facing `extract.sh --dry-run` + `bootstrap-new-repo.sh --dry-run` flow that proves the kit produces a valid extracted tree. Include the expected stdout for each `specs/249-extract-backlog-navigator/evidence/usage-example.md`
- [x] T071 [P] Verify the audit document is committed and discoverable from the spec dir. If not already present, copy or symlink-note `docs/extraction-audit/backlog-navigator/coupling-inventory.md` into `evidence/coupling-inventory.md` (or a short referrer file pointing at the canonical path) `specs/249-extract-backlog-navigator/evidence/coupling-inventory.md`
- [x] T072 [P] Copy the worked `kit-config.sample.json` (created by T038) into `evidence/kit-config-sample.json` as a stable, in-evidence reference `specs/249-extract-backlog-navigator/evidence/kit-config-sample.json`
- [x] T073 [P] Confirm `evidence/grep-no-debrief-literals.txt` (output of T034) is present and shows zero remaining debrief literals outside `??` fallbacks `specs/249-extract-backlog-navigator/evidence/grep-no-debrief-literals.txt`
- [x] T074 [P] Confirm `evidence/kit-dry-run.txt` (output of T058) is present and shows a clean extract.sh dry-run end-to-end `specs/249-extract-backlog-navigator/evidence/kit-dry-run.txt`
- [x] T075 [P] Confirm `evidence/opening-context.md` (cached during `/speckit.plan`) is present and unchanged. No edits expected — its four sections will be copied verbatim into the feature post by T078 `specs/249-extract-backlog-navigator/evidence/opening-context.md`

### Institutional memory updates

- [x] T076 Append entry to `docs/project_notes/issues.md` linking spec dir `specs/249-extract-backlog-navigator/`, the feature PR (created by T079), and the related #248 entry (so the lessons trail is navigable) `docs/project_notes/issues.md`
- [x] T077 Append a planning-time ADR pre-note to `docs/project_notes/decisions.md` documenting the *deferred* ADR-032 (extraction) and the *deferred* ADR-030 amendment. Format: "ADR-032 to be added in cutover PR (Phase 3); ADR-030 to be amended with owner-moved note. Both deferred until the standalone repo has been live ≥7 days." This is a placeholder so future-me knows the cutover PR has known doc obligations `docs/project_notes/decisions.md`

### Media Content

- [x] T078 Create feature blog post by spawning the Content Specialist (`.claude/agents/media/content.md`) via the Task tool. The first four sections (Hook, What We're Building, How It Fits, Key Decisions) are copied **verbatim** from `evidence/opening-context.md` (cached during `/speckit.plan`). The remaining sections (Screenshots / Diagrams, By the Numbers, Lessons Learned, What's Next) are written from the Phase 0/1/2 evidence: audit findings (number of literals removed, workspace deps inlined), kit shape (six workflows, drop-in templates, placeholder substitutions), the twelve-lessons frame from #248. Audience: DSTL scientists, potential adopters, defence maritime analysis community `specs/249-extract-backlog-navigator/media/shipped-post.md`

### PR Creation

- [x] T079 Create PR and publish blog: run `/speckit.pr`

**Task T079 must run last. It depends on all evidence (T069–T075), institutional updates (T076–T077), and the feature post (T078) being complete.**

---

## Dependencies

### Phase dependencies

- **Phase 1 — Setup (T001–T004)**: No dependencies; can start immediately. T001 (backlog marker) should land first so the implementing-state is visible from anywhere.
- **Phase 2 — Foundational audit (T005–T014)**: Depends on Setup. **BLOCKS** all three user-story phases (FR-001 — the audit is the input to Phase 1).
- **Phase 3 — US1 (T015–T035)**: Depends on Phase 2 (audit findings drive the exact patch list). Within US1, T015 (defaults.ts) blocks T017/T018/T025; T016 (useIsMobile copy) blocks T019–T021; T019–T021 block T024 (workspace-dep removal). Verification gates (T028–T035) run after all rewires complete.
- **Phase 4 — US2 (T036–T062)**: Depends on Phase 3 (the kit's `extract.sh` smoke test relies on the post-Phase-1 source being clean). Many kit-file-creation tasks are [P] (independent files). The two dry-run verifications (T058, T062) gate Phase 4 close.
- **Phase 5 — US3 (T063–T067)**: Depends on Phase 4 (the runbook lives in the kit). All US3 tasks are verification of the runbook content T037 produced; no new files.
- **Phase 6 — Polish (T068–T079)**: Depends on all user-story phases. T078 (feature post) depends on T075 (opening-context confirmed present); T079 (PR) depends on everything.

### User-story dependencies

- **US1 (P1)**: Hard dep on Phase 2 audit. No deps on US2/US3.
- **US2 (P2)**: Hard dep on US1 — the kit's `extract.sh` smoke-tests against the post-Phase-1 source. Cannot ship a kit that targets a not-yet-decoupled app.
- **US3 (P3)**: Hard dep on US2 — the runbook lives in the kit.

This is a **sequential** dependency chain (US1 → US2 → US3), unlike the more common P1/P2/P3-parallel pattern, because each phase produces an artefact the next phase consumes.

### Within each user story

- US1: defaults.ts + useIsMobile.ts first (T015, T016) — these are the new files everyone else imports. Then parallel rewires (T017–T021, T025) plus the independent vite/package edits (T022, T023, T027). Workspace-dep cleanup (T024) after the rewires confirm zero remaining imports. Then verification gate.
- US2: README + runbooks (T036–T038) and kit scripts (T039, T040) form the spine; workflows (T041–T046), templates (T047–T053), bundled dataset (T054–T055), and docs (T056–T057) are all independent ([P]). Verification (T058–T062) runs at the close.
- US3: All tasks are sequential reads of `PHASE3-RUNBOOK.md` — verifies the runbook has every required section.

### Parallel opportunities

- All Setup tasks except T001 are [P].
- Phase 2 audit sections (T006–T012) are [P] — independent §1/§1b/§2/§3/§3b/§4/§5 of the same document; in practice they edit the same file so an author may serialise them, but conceptually independent.
- Phase 3 rewires (T017–T021, T025) are [P] after T015/T016 land.
- Phase 4 workflows (T041–T046), templates (T047–T053), bundled dataset (T054–T055), docs (T056–T057), and verifications (T059–T062) are [P].
- Phase 6 evidence-copy tasks (T071–T075) are [P].

### Critical path

T001 → T005 → (T006–T014 in parallel) → T013 → T015 → T016 → (T017–T027 in parallel) → T028 → T029 → T031 → T034 → T035 → T036 → T037 → T039 → T040 → T058 → T062 → T063 → T067 → T068 → T069 → T070 → T078 → T079.

---

## Implementation Strategy

### Incremental delivery

1. **Land the audit first (T005–T014)**, in a separate commit, so reviewers can sign off on what Phase 1 is going to touch *before* any source code moves. The audit is the contract between Phase 0 and Phase 1.
2. **Land Phase 1 (US1) as a coherent commit set** — defaults.ts + useIsMobile copy together (one commit); rewires together (one or two commits); `packageManager` + workspace-dep removal together (one commit); the verification gate (no commit, just a pre-push check). Each commit is reversible on its own.
3. **Land Phase 2 (US2, the kit) as its own logical commit set** — script + runbook commit, then workflows commit, then templates commit, then bundled dataset commit, then lessons docs commit. Each commit is one logical concern; reviewers can step through them in order.
4. **Phase 5 (US3) is verification-only** — typically one commit that confirms `PHASE3-RUNBOOK.md` has every required section.
5. **Polish phase** — evidence captures + institutional-memory notes + feature post + `/speckit.pr`.

This branch's PR ships **Phase 0 + Phase 1 + Phase 2**. Phase 3 (the cutover) is a *separate follow-up PR* that the maintainer with org-admin rights on the destination repo opens after the standalone repo has been live and green for ≥7 days.

### Sequential, not parallel-team

Unlike most multi-priority features where US1/US2/US3 can run in parallel by different developers, this extraction's three phases are **sequentially dependent** — each phase's artefact is the next phase's input. One developer (or one tightly-coordinated pair) should drive all of US1+US2 in this branch; Phase 3 is operator-driven from the kit's runbook.

### Risk management

- **Risk: audit misses a literal.** Mitigated by T014's mechanical grep check; if any debrief literal remains in source after T034 runs, the audit gets updated and Phase 1 has a follow-up commit. Cheap to re-do.
- **Risk: `packageManager` version doesn't match the monorepo at extract time.** Mitigated by reading `pnpm --version` inside T023 (not blindly copying a literal); if the monorepo bumps pnpm later, the extracted repo's `packageManager` field stays valid because it was pinned at the version present in the source tree.
- **Risk: kit's `extract.sh` dry-run masks a real-push failure (e.g., 403 from GitHub App).** Mitigated by R-011's explicit prereq Step 0a in the runbook + bootstrap script's 403-detection-with-guidance behaviour. The dry-run doesn't *prevent* the real failure, but the runbook tells the operator what to do when they hit it.
- **Risk: `clean-exclude: previews/` fails to preserve previews during a main deploy collision.** Mitigated by the verification step in `quickstart.md` Phase 2 (open a trivial PR, push to main immediately, re-check the preview folder) — operator-side smoke test, not automatable from this branch.
- **Risk: ADR-030 update in Phase 3 is forgotten.** Mitigated by T077's pre-note in `decisions.md` flagging both ADR additions as known cutover obligations.

### What does NOT ship in this branch

- The actual destination repo (`<org>/backlog-navigator`) does not get created from this branch. The kit is committed; the operator creates the repo.
- Phase 3 (cutover) — apps/backlog-navigator/ is NOT deleted from this branch. Cutover is a separate, future PR.
- ADR-032 (extraction) and ADR-030 amendment — both land in the cutover PR, not this one.

---

## Notes

- This branch's deliverable: audit (Phase 0) + config seam (Phase 1) + extraction kit (Phase 2). Phase 3 cutover is deferred.
- The kit is **shipped** but not **executed** from this branch — execution requires org-admin rights on the destination repo, which this tooling doesn't have.
- All evidence ships with the PR. The cached opener (`evidence/opening-context.md`) was written during `/speckit.plan` and is reused verbatim by T078.
- `/speckit.pr` (T079) creates the feature PR in debrief-future and publishes the blog post to debrief.github.io.
- The kit deliberately omits `patches/` (see `docs/why-no-patch-03.md`) — drop-in templates + `extract.sh` automation replace the patch-walk pattern from #248.
