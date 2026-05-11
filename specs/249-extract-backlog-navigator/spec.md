# Feature Specification: Extract backlog-navigator into a Standalone Repository

**Feature Branch**: `249-extract-backlog-navigator`
**Created**: 2026-05-11
**Status**: Draft
**Input**: User description: "Extract backlog-navigator from `apps/backlog-navigator/` into a standalone repository, applying lessons from the spec-navigator extraction (#248). Phase 1: introduce a configuration seam in this repo. Phase 2: subtree split to new repo, stand up CI / hosting / secrets / PR previews. Phase 3: cutover — delete from debrief-future, point at hosted instance."

---

## Context: relationship to #248

The spec-navigator extraction (`specs/248-extract-spec-navigator/`) shipped successfully and is the operational template for this work. This specification reuses the three-phase shape — Phase 1 (decoupling seam in source repo), Phase 2 (subtree split + standalone CI / hosting), Phase 3 (cutover) — but **revises the extraction kit and operational route** based on issues encountered during the #248 hand-off.

The Lessons section enumerates each correction. Where a #248 functional requirement (FR-NNN) still applies verbatim, this spec cites it rather than restating it. Where #248's approach broke, this spec replaces it.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Decouple backlog-navigator from debrief in place (Priority: P1)

A debrief-future maintainer introduces a configuration seam in `apps/backlog-navigator/` analogous to the `src/defaults.ts` pattern landed in #248 Phase 1. Every hardcoded debrief literal — organisation name, repo slug, label conventions, board column definitions, GitHub Projects identifiers, hosting URL — is replaced with a read from a single defaults module that takes its values from build-time environment variables and falls back to the current debrief-future values. Default behaviour is unchanged.

**Why this priority**: As in #248, nothing downstream can run cleanly without this seam. Phase 1 is also the audit step — it surfaces every coupling before the subtree split, so we don't discover them post-extraction.

**Independent Test**: Without performing any extraction, change `VITE_DEFAULT_OWNER` / `VITE_DEFAULT_REPO` (or whatever the analogous env vars are named) at build time, deploy that build, and confirm the app renders the alternative repo's backlog correctly. Reverting to the default reproduces today's experience byte-for-byte.

**Acceptance Scenarios**:

1. **Given** an audit of `apps/backlog-navigator/src/`, **When** Phase 1 lands, **Then** no `'debrief'`, `"debrief"`, `debrief-future`, or `debrief.github.io` literal remains in `src/` outside the `defaults.ts` fallbacks (same grep guard as #248's `extract.sh`).
2. **Given** Phase 1 has landed with default configuration, **When** a user loads the running app inside debrief-future's web-shell, **Then** every behaviour observable today is unchanged.
3. **Given** Phase 1 has landed, **When** a developer rebuilds with non-default env vars pointing at an unrelated public GitHub repo with a comparable backlog shape, **Then** the app renders that repo's backlog without source-code changes.
4. **Given** Phase 1 has landed, **When** the existing Vitest and Playwright suites run against the default configuration, **Then** all tests pass.

---

### User Story 2 — Extract to a standalone, independently buildable repository (Priority: P2)

A maintainer creates the new repository (`deepbluecltd/backlog-navigator` or as the org decides), runs the extraction kit, and stands up:

- a history-preserving subtree split of `apps/backlog-navigator/`,
- a CI pipeline (lint, typecheck, vitest, Playwright) that goes green on the first push,
- a GitHub Pages deployment of `main` to a stable URL,
- **a per-PR preview deployment workflow that posts the preview URL as a sticky PR comment**,
- a bundled dummy speckit dataset so the preview renders meaningful content with no query parameters,
- documentation a non-debrief contributor can follow end-to-end.

**Why this priority**: This is the core deliverable. It depends on Phase 1 and unlocks Phase 3. **Crucially, the PR-preview infrastructure must be designed in from the start, not bolted on afterwards** — #248 ended up reworking `deploy.yml` to share the `gh-pages` branch with previews; doing it once is half the work.

**Independent Test**: A reviewer without local dev tooling opens any PR in the new repo, clicks the preview URL in the bot comment, and sees the bundled dummy backlog render. CI shows lint / typecheck / vitest / playwright-bundled all green. After merge to main, the production URL serves the latest build within 10 minutes.

**Acceptance Scenarios**:

1. **Given** the new repository exists empty, **When** the extraction kit runs end-to-end, **Then** the resulting `main` branch contains every commit that ever touched `apps/backlog-navigator/` in debrief-future with original author + date metadata, **and** the first push to that branch triggers a green CI run with no manual intervention.
2. **Given** the new repository's first PR is opened, **When** the `pr-preview.yml` workflow runs, **Then** a build is published to `https://<org>.github.io/<repo>/previews/pr-<n>/` and a single sticky comment is posted (or updated on re-push) containing that URL plus at least four sample URL shapes (default view; `?repo=<org>/<repo>&branch=<branch>`; `?pr=<n>` legacy form; `?repo=<external>/<repo>&branch=<branch>`).
3. **Given** a PR is closed (merged or abandoned), **When** `pr-preview-cleanup.yml` runs, **Then** the corresponding `previews/pr-<n>/` folder is removed from the `gh-pages` branch.
4. **Given** the new repository, **When** a contributor with no debrief-organisation credentials clones, installs, and runs `pnpm test && pnpm test:e2e`, **Then** the suite goes green using in-process route interception (the existing `mock-github.ts` pattern), with no requirement to record or download fixtures.
5. **Given** the new repository's `main` branch updates, **When** `deploy.yml` completes, **Then** the production URL `https://<org>.github.io/<repo>/` serves the latest build **without overwriting any in-flight PR preview folders** (achieved via `clean-exclude: previews/` in the deploy action).
6. **Given** the bundled dummy speckit dataset exists at `specs/<NNN>-<name>/`, **When** a reviewer opens any preview or production URL with no query parameters, **Then** that dataset renders fully — markdown, tree navigation, link rewriting — without any external GitHub fetch.

---

### User Story 3 — Cut over debrief-future to consume the hosted instance (Priority: P3)

Identical in shape to #248's User Story 3: delete `apps/backlog-navigator/` from debrief-future; update every documentation reference to point at the hosted instance and/or the new repository; remove root-level dev dependencies used only by backlog-navigator; drop the per-app Playwright suite from the "Before Pushing" steps; update the per-PR review-app comment to link to the new hosted instance.

**Why this priority**: As with #248, this is when the savings actually realise. Don't cut over until Phase 2 has been green for at least one week of nightly runs.

**Independent Test**: After Phase 3 ships, `apps/backlog-navigator/` no longer exists in debrief-future; CI in debrief-future no longer runs backlog-navigator's Playwright suite; documentation and PR review-app comments link to the new hosted instance; everything else in debrief-future continues to build and ship.

**Acceptance Scenarios** are structurally identical to #248 FR-018 through FR-023; the implementing PR MUST restate them concretely, substituting "backlog-navigator" for "spec-navigator".

---

### Edge Cases

The edge cases enumerated in #248 (in-flight PRs, cross-cutting commits, format drift, hosted-instance outage, version mismatches, live-mode flake, PAT scope mismatches, anonymous rate limits, schema evolution, cached service workers, same-day rollback) all apply unchanged. Two additional edge cases were observed during the #248 hand-off and must be planned for explicitly:

- **GitHub App authorisation gap**: The agent or operator pushing the first commits to the new repo must have write access — either as an org member or via an installed GitHub App (e.g., the Claude code app). #248 hit a 30-minute block here because the Claude GitHub App wasn't yet installed on the target repo; the user resolved it by installing the app via the GitHub web UI. The kit's prerequisites checklist must call this out.
- **Pages source incompatibility with per-PR previews**: GitHub Pages can serve only one artifact per repo if configured for the "GitHub Actions" source. Per-PR preview folders require the `Deploy from a branch` source pointing at `gh-pages`. **Set this from day one** — switching later is not just a config flip, it requires reworking `deploy.yml` away from `actions/deploy-pages` to a branch-based publisher (e.g., `JamesIves/github-pages-deploy-action@v4`). #248 had to do this rework mid-flight; backlog-navigator must not repeat it.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Phase 0 — Coupling audit (in debrief-future, prerequisite to Phase 1)

- **FR-001**: Produce `docs/extraction-audit/backlog-navigator/coupling-inventory.md`. Enumerate every hardcoded debrief literal in `apps/backlog-navigator/src/` (org name, repo slug, label names, column names, GitHub Projects IDs, hosted URL strings) with file:line locations. **The audit is the input to Phase 1**, not optional.
- **FR-002**: Distinguish in the audit between *production-code* literals (which Phase 1 will move into `defaults.ts`) and *fixture / test-data* literals (which represent content being rendered, not couplings — leave these alone).
- **FR-003**: The audit also covers `apps/backlog-navigator`'s relationship to monorepo-shared infrastructure: which `shared/eslint-rules/*` it consumes, which `tsconfig.base.json` settings it inherits, whether it imports any `@debrief/*` workspace packages, whether its tests reference root-level fixtures, and whether it depends on root-level dev dependencies. **The audit's findings determine which extraction-kit patches are needed**; see "Recommended Extraction Kit Contents" below.

#### Phase 1 — Configuration seam (in debrief-future)

- **FR-004**: Add `apps/backlog-navigator/src/defaults.ts` exporting every audited literal as a single typed defaults object, sourced from `import.meta.env.VITE_*` variables with fallbacks to the current debrief-future values. Adapt the shape from #248 FR-001 / FR-002.
- **FR-005**: Replace every occurrence of an audited literal in `apps/backlog-navigator/src/` with a read from `defaults.ts`. After this PR, the only place any debrief literal appears in `src/` is in the `defaults.ts` fallback expressions. (Same outcome as #248 FR-003.)
- **FR-006**: Default builds (no env vars overridden) produce byte-identical user-facing behaviour to pre-Phase-1. (Same as #248 FR-004.)
- **FR-007**: A build with `VITE_DEFAULT_OWNER`, `VITE_DEFAULT_REPO`, and any audited adjuncts set to a third-party public repo renders that repo's backlog correctly with no source edits. (Same as #248 FR-005.)
- **FR-008**: The existing Vitest and Playwright suites continue to pass against default configuration. (Same as #248 FR-006.)
- **FR-009**: Phase 1 lands as a single normal PR against debrief-future; the audit document is referenced from the PR description. (Same as #248 FR-007 / FR-008 / FR-009.)
- **FR-010**: The Phase 1 PR MUST add a `packageManager` field to `apps/backlog-navigator/package.json` (e.g., `"packageManager": "pnpm@10.33.0"`). Without this, the standalone repo's CI fails before any tool runs because `pnpm/action-setup@v3` cannot resolve a pnpm version. (Discovered in #248; see Lessons.)

#### Phase 2 — Standalone repository (new repo)

Adopt #248 FR-010 through FR-017 verbatim where they describe outcomes (history preserved; CI on every PR; Pages deploy on merge to main; contributor green build with no credentials; `specFormatVersion` handling; `LIVE_GITHUB=1` opt-in mode). Then **replace** these specifics:

- **FR-011 (replaces #248 FR-015)**: Hosting MUST use the `gh-pages` branch as the Pages source, with deploys performed by a branch-publishing action (e.g., `JamesIves/github-pages-deploy-action@v4`), **not** `actions/deploy-pages` against an artifact. Rationale: per-PR previews require multiple subpaths in the same Pages site; the artifact-based action can only serve one site total.
- **FR-012**: The standalone repo MUST include a `pr-preview.yml` workflow that, on `pull_request` opened / synchronize / reopened, builds with `VITE_BASE=/<repo>/previews/pr-<n>/` and `VITE_DEFAULT_OWNER` / `VITE_DEFAULT_REPO` pointing at the *new repo itself* (so previews render the bundled dummy dataset with no query params), deploys to `gh-pages` under `previews/pr-<n>/`, and upserts a single PR comment marked with an HTML-comment sentinel.
- **FR-013**: The standalone repo MUST include a `pr-preview-cleanup.yml` workflow that, on `pull_request` closed, removes the `previews/pr-<n>/` folder from `gh-pages`.
- **FR-014**: The standalone repo's `deploy.yml` MUST use `clean-exclude: previews/` when publishing main, so production redeploys do not wipe in-flight PR preview folders.
- **FR-015**: The standalone repo MUST commit a `pnpm-lock.yaml` from the first push. The extraction kit MUST regenerate this lockfile because the monorepo's lockfile lives at the root and is **not** carried by the subtree split.
- **FR-016**: The standalone repo MUST bundle a dummy speckit dataset at `specs/<NNN>-<name>/` (recommend cloning one stable, narrative-rich spec from debrief-future, the way #248 used `237-active-storyboard-persistence`). This dataset makes preview URLs work with no query parameters and gives reviewers something coherent to look at.
- **FR-017**: The standalone repo's `VITE_BASE` MUST default to a value matching the new repo's name (`/<repo>/`), and MUST be derivable at build time without source edits (env-var override, with the default in `vite.config.ts` matching the repo slug). **Do not** ship `/spec-navigator/` or similar fixed string when the actual repo slug differs — #248 had to rename `spec-navigator` to `speckit-navigator` across many files because the kit assumed the repo name.
- **FR-018**: The standalone repo's tests, scripts, and docs MUST be free of hardcoded `debrief.github.io` URLs; templated URLs MUST derive from the destination org / repo. The kit's `bootstrap-new-repo.sh` (or equivalent) MUST perform the substitutions automatically, not as a "follow the recipe" patch.
- **FR-019**: Patch 03 from #248 ("bundled Playwright fixtures + `LIVE_GITHUB=1` toggle") is **optional** and SHOULD be deferred unless live-mode CI drift detection against real GitHub is required. The in-process Playwright route mock (analogous to `e2e/mock-github.ts`) already provides full offline test coverage; the bundled-fixtures workflow is primarily maintainer tooling for refreshing fixtures via a recorded PAT-authenticated session, and adds substantial complexity (per-test `beforeEach` wiring, fixture-corpus maintenance, recorder script).
- **FR-020**: The standalone repo MUST be created **empty** on github.com — no README, no `.gitignore`, no LICENSE checkbox. If the operator forgets and the target repo already contains an initial commit, the kit MUST offer a `--merge-unrelated-histories` fallback to `bootstrap-new-repo.sh` (a `git merge --allow-unrelated-histories` followed by an `--ours` / `--theirs` resolution path for the README conflict). #248 hit this path; it works but should be a first-class option, not an ad-hoc rescue.

#### Phase 3 — Cutover (in debrief-future)

- **FR-021**: Delete `apps/backlog-navigator/` from debrief-future. (Mirrors #248 FR-018.)
- **FR-022**: Update every documentation reference (READMEs, ADRs, runbooks, CLAUDE.md, root-level scripts) to point at the new hosted instance and / or the new repository. (Mirrors #248 FR-019.)
- **FR-023**: Remove root-level dev dependencies used only by backlog-navigator; drop the per-app Playwright suite from the "Before Pushing" steps. (Mirrors #248 FR-020 / FR-021.)
- **FR-024**: Update the per-PR review-app comment to link to the new hosted instance with the correct branch context. (Mirrors #248 FR-022.)
- **FR-025**: Add an ADR documenting the move, with a back-reference to the ADR for #248. (Mirrors #248 FR-023.)
- **FR-026**: The cutover criterion is: at least 7 consecutive nightly `live.yml` runs green on the standalone repo (if live mode is enabled), or 7 days of green `ci.yml` runs (if not). Phase 3 MUST NOT merge before that window has elapsed.

#### Cross-cutting

- **FR-027**: User-facing experience for end users (everyone except backlog-navigator maintainers and PR reviewers) is unchanged at every phase boundary. (Mirrors #248 FR-024.)
- **FR-028**: debrief-future's `main` branch remains shippable throughout — no phase boundary leaves it in a half-extracted state. (Mirrors #248 FR-025.)
- **FR-029**: The new repo is public and compatibly licensed with debrief-future. (Mirrors #248 FR-026.)

---

## Lessons from #248 — what changes in this kit

Each item below is a concrete, observed failure or friction point from the spec-navigator extraction. The recommended kit (next section) bakes the fix in.

### Hard failures the kit must prevent

1. **No lockfile shipped**. Symptom: every CI job failed in <10 seconds because `pnpm install --frozen-lockfile` exited immediately. Cause: the monorepo's `pnpm-lock.yaml` lives at the repo root, not in `apps/<name>/`; the subtree split therefore carries no lockfile. **Fix**: `extract.sh` must generate a fresh `pnpm-lock.yaml` in the working tree after the split (run `pnpm install` once with `--lockfile-only`), then commit it on top of the extracted history.
2. **No `packageManager` in package.json**. Symptom: identical to (1) — every CI job died in <10 seconds, this time at the `pnpm/action-setup@v3` step, with an "ambiguous pnpm version" error. **Fix**: Phase 1 (in debrief-future) adds `"packageManager": "pnpm@X.Y.Z"` to `apps/<name>/package.json` so the field is already present when the split happens.
3. **Hardcoded destination in kit scripts**. `extract.sh` and `bootstrap-new-repo.sh` had `debrief/spec-navigator` baked in as the new repo slug. For a destination of `deepbluecltd/speckit-navigator`, every line had to be patched by hand. **Fix**: kit scripts accept `--destination <org>/<repo>` and `--host <org>.github.io` flags (or read them from a `kit-config.json` produced by a one-time wizard at the start of bootstrap).
4. **`actions/deploy-pages` blocks PR previews**. The original kit used the artifact-based Pages action, which serves exactly one bundle per repo. Adding per-PR previews later required swapping that whole action out for `JamesIves/github-pages-deploy-action@v4` and re-doing the Pages source config. **Fix**: the kit's `deploy.yml` template uses `JamesIves/github-pages-deploy-action@v4` from day one, with `clean-exclude: previews/`. The kit's prerequisites say "set Pages source to gh-pages branch" rather than "GitHub Actions".

### Friction points the kit should reduce

5. **Patches 04 (eslint) and 05 (tsconfig) were `*.md` recipes, not files**. Both were essentially "rewrite this config to drop the monorepo-relative paths" — mechanical, but the recipe shape made them easy to misapply. **Fix**: kit ships `templates/.eslintrc.cjs` and `templates/tsconfig.json` (and `tsconfig.node.json`) as drop-in files that bootstrap copies verbatim. The patch markdown becomes the rationale doc, not the implementation.
6. **Patch 01 (vite base flip)** was a one-line edit dressed up as a recipe. **Fix**: `extract.sh` performs the sed replacement automatically using the `--destination` repo slug.
7. **README / CONFIGURATION / SECURITY templates had `debrief.github.io` hardcoded**. Adopters using a different org had to grep and replace. **Fix**: templates use `{{HOST}}`, `{{ORG}}`, `{{REPO}}` placeholders; bootstrap substitutes from the destination flag.
8. **Missing PR-preview workflow + dummy spec**. Reviewers without local dev tooling had no way to see the running app until #248 added a preview workflow as an unplanned follow-up. **Fix**: `pr-preview.yml`, `pr-preview-cleanup.yml`, and a bundled dummy dataset under `specs/<NNN>-<name>/` are first-class parts of the kit.

### Operational gotchas to call out in the runbook

9. **GitHub App must be authorised on the new repo before any push works**. The first `git push` from the agent's environment returns 403 until the Claude / agent GitHub App is installed via the GitHub web UI on the destination repo. **Fix**: the kit's prerequisites section in `README.md` includes a "Step 0: install the GitHub App on the destination repo" with a screenshot or web-UI navigation path.
10. **Target repo must be empty**. GitHub's web UI defaults the "Add a README", ".gitignore", and "Choose a license" toggles to checked. If any is left on, the first push fails (or, with the merge-unrelated-histories fallback, creates a noisier history). **Fix**: kit prereqs explicitly say "uncheck all three init options"; bootstrap detects a non-empty target and offers the merge fallback rather than aborting.
11. **Workflow logs inaccessible to the agent**. When CI failed during the hand-off, the agent had no MCP / API path to fetch the actual job logs to diagnose — diagnosis worked only because the jobs' completion times (<10s) made the failure category guessable. **Fix**: not strictly a kit issue, but the runbook should call out that the operator may need to paste job-log excerpts back to the agent during debugging.

### What patch 03 was wrong about

12. The original `patches/03-bundled-fixtures.md` proposed replacing the in-process Playwright route mock with a fixture corpus + recorder script. In practice, the existing in-process mock (`e2e/mock-github.ts`) already gave full offline test coverage in #248; patch 03 was 90% maintainer-tooling overhead with no test-quality dividend. **Fix**: backlog-navigator's kit drops patch 03 from the required path. If `live.yml` (nightly drift against real GitHub) is wanted, document it as an optional add-on.

---

## Recommended Extraction Kit Contents

The kit should live at `specs/249-extract-backlog-navigator/extraction-kit/` (same shape as #248's). Contents:

```
extraction-kit/
├── README.md                          # operator runbook
├── PHASE3-RUNBOOK.md                  # cutover steps
├── kit-config.json                    # OR: --destination flag; either way, no hardcoding
├── scripts/
│   ├── extract.sh                     # subtree split + lockfile regen + vite base sed
│   └── bootstrap-new-repo.sh          # push, install workflows, install templates, no patch walk
├── workflows/
│   ├── ci.yml                         # lint, typecheck, vitest, playwright-bundled (with pnpm build step)
│   ├── deploy.yml                     # main → gh-pages root, with clean-exclude: previews/
│   ├── pr-preview.yml                 # PR → gh-pages/previews/pr-<n>/, sticky comment
│   ├── pr-preview-cleanup.yml         # closed PR → rm preview folder
│   └── live.yml                       # OPTIONAL — only if drift detection wanted
├── templates/
│   ├── README.md                      # placeholders: {{ORG}}, {{REPO}}, {{HOST}}
│   ├── CONFIGURATION.md
│   ├── SECURITY.md
│   ├── .eslintrc.cjs                  # standalone; no monorepo refs
│   ├── tsconfig.json                  # inlined from tsconfig.base.json
│   ├── tsconfig.node.json
│   ├── .gitignore                     # adds playwright-report/, test-results/, .chromium-path
│   └── specs-dummy/                   # bundled spec to render at default URL
└── docs/
    ├── lessons-from-248.md            # this section, extracted
    └── why-no-patch-03.md             # the in-process mock is sufficient
```

The kit intentionally **does not include `patches/`**. Phase 1's audit-driven seam, plus the templated `.eslintrc.cjs` / `tsconfig.json`, plus `extract.sh`'s automated vite-base flip, replace the role the `patches/` directory played in #248.

---

## Phase Ordering (operator's-eye view)

A condensed version of the operator runbook:

1. **Phase 0 — Audit** (debrief-future PR): produce `docs/extraction-audit/backlog-navigator/coupling-inventory.md`. Get it reviewed.
2. **Phase 1 — Seam** (debrief-future PR): land `apps/backlog-navigator/src/defaults.ts`; replace every audited literal; add `packageManager` to `package.json`; ensure all existing tests pass.
3. **Pre-Phase 2 — Prerequisites**:
   - Operator with org-admin rights creates the destination repo **empty** (uncheck all three init options).
   - Install the relevant GitHub App on the destination repo (Claude code, or equivalent — required before any agent-driven push works).
   - Decide the destination repo slug; record it in `kit-config.json` or pass via `--destination`.
4. **Phase 2 — Extract + bootstrap**:
   - `./scripts/extract.sh --destination <org>/<repo>` — performs subtree split, regenerates `pnpm-lock.yaml`, applies vite base flip with destination slug, runs a smoke `pnpm install && pnpm test && pnpm build` on the extracted source, aborts if anything fails.
   - `./scripts/bootstrap-new-repo.sh --destination <org>/<repo>` — pushes extracted branch to destination as `main`, copies workflows from `workflows/`, copies templates from `templates/` with `{{ORG}}` / `{{REPO}}` / `{{HOST}}` substituted, commits, pushes.
5. **One-time GitHub web-UI config**:
   - Settings → Pages → Source: "Deploy from a branch" → branch `gh-pages` → folder `/ (root)`.
   - (Trigger any PR or push to main first so the `gh-pages` branch exists before this config flips.)
   - If `live.yml` is enabled: register the live-mode `GITHUB_TOKEN` secret with read-only scopes on the consumer repo.
6. **Smoke-test the preview pipeline**: open a trivial PR; watch `pr-preview.yml` run; click the URL in the bot comment; confirm the bundled dummy spec renders.
7. **Hold**: wait at least 7 days of green CI (or 7 nightlies if `live.yml` is on) before starting Phase 3.
8. **Phase 3 — Cutover** (debrief-future PR): delete `apps/backlog-navigator/`; update doc references; flip the per-PR review-app comment to link the new hosted instance; add an ADR documenting the move.

---

## Key Entities

- **Coupling-inventory document** (`docs/extraction-audit/backlog-navigator/coupling-inventory.md`): the artefact produced by Phase 0; lists every hardcoded debrief literal in `apps/backlog-navigator/src/` with file:line locations, classified as production-code (move to `defaults.ts`) or fixture / test-data (leave alone).
- **Defaults module** (`apps/backlog-navigator/src/defaults.ts`): single source of truth for every audited literal; reads `import.meta.env.VITE_*` with current debrief values as fallbacks.
- **Extraction kit** (`specs/249-extract-backlog-navigator/extraction-kit/`): operator-runbook, scripts, workflow templates, and config / doc templates that drive Phase 2 end-to-end. Contents listed in the "Recommended Extraction Kit Contents" section above.
- **Destination repository**: the new standalone GitHub repo (e.g., `deepbluecltd/backlog-navigator`). Must exist empty before extraction; hosts the subtree-split `main`, the `gh-pages` branch (production + PR previews), CI workflows, and contributor docs.
- **PR preview deployment**: per-PR build published to `https://<host>/<repo>/previews/pr-<n>/`, announced via a single sticky PR comment, cleaned up automatically on PR close.
- **Bundled dummy speckit dataset** (`specs/<NNN>-<name>/` inside the standalone repo): a single stable, narrative-rich spec cloned from debrief-future so preview and production URLs render meaningful content with no query parameters.

---

## Out of Scope

- Reuse for non-debrief consumers beyond what URL params already enable. (Same as #248.)
- Migration of any non-`apps/backlog-navigator/` code — the audit must flag and gate any cross-cutting commits surfaced by the subtree split.
- A unified backlog + spec multi-app shell. The two SPAs stay separate hosted instances; cross-linking is a separate piece of work.

---

## Assumptions

- **Destination org / repo slug**: the operator decides (`deepbluecltd/backlog-navigator` or as the org chooses) and records the choice in `kit-config.json` or passes via `--destination`. The kit makes no assumption about a particular org or repo name.
- **GitHub App availability**: the operator has the permissions, or works alongside someone with the permissions, to install the relevant GitHub App on the destination repo before the first agent-driven push.
- **Pages-source choice**: `gh-pages` branch with `JamesIves/github-pages-deploy-action@v4` is settled from day one (replaces #248's `actions/deploy-pages` path).
- **Live-mode CI**: `live.yml` is optional and deferred by default. In-process route-mock Playwright tests are considered sufficient for first ship.
- **Hold period**: 7 days / 7 nightlies of green CI on the standalone repo before Phase 3 cutover, mirroring #248's settled cadence.
- **Public license**: the new repo is public and uses a license compatible with debrief-future, matching #248's posture.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 (Phase 1 completes)**: A debrief-future PR lands such that grepping for any of the debrief literals (`'debrief'`, `"debrief"`, `debrief-future`, `debrief.github.io`) under `apps/backlog-navigator/src/` returns matches only inside `defaults.ts` fallbacks. The default Vitest + Playwright suites pass unchanged.
- **SC-002 (Behaviour parity)**: With default env vars, every behaviour observable in `apps/backlog-navigator/` before Phase 1 is reproducible after Phase 1; no user-visible regression is reported during a one-week soak in debrief-future.
- **SC-003 (Reconfigurability)**: A build with non-default `VITE_DEFAULT_OWNER` / `VITE_DEFAULT_REPO` (and any audited adjuncts) renders an unrelated public GitHub repo's backlog without source edits.
- **SC-004 (Phase 2 first push)**: The first push to the destination repo's `main` triggers a CI run that passes lint, typecheck, Vitest, and bundled-Playwright with zero manual intervention.
- **SC-005 (History preservation)**: 100% of commits that ever touched `apps/backlog-navigator/` in debrief-future appear on the destination repo's `main`, with original author and committer dates preserved.
- **SC-006 (PR-preview latency)**: From `pull_request` open to a working preview URL posted in a sticky bot comment, median time is under 5 minutes; 95th-percentile under 10 minutes.
- **SC-007 (Preview / production isolation)**: A production redeploy of `main` never overwrites an in-flight `previews/pr-<n>/` folder, verified by a smoke test that opens a PR, redeploys main, and confirms the PR preview remains reachable.
- **SC-008 (Anonymous contributor build)**: A contributor who has never authenticated with the debrief organisation can clone the standalone repo, run `pnpm install && pnpm test && pnpm test:e2e`, and see a green suite on first attempt.
- **SC-009 (Default URL renders)**: Loading the standalone repo's production URL with no query parameters renders the bundled dummy spec end-to-end (markdown, tree navigation, link rewriting) without any external GitHub fetch.
- **SC-010 (Phase 3 cutover)**: After Phase 3 ships, `apps/backlog-navigator/` is gone from debrief-future; the per-PR review-app comment links to the new hosted instance; debrief-future's CI no longer runs backlog-navigator's Playwright suite; an ADR records the move.
- **SC-011 (Stability gate)**: Phase 3 ships only after at least 7 consecutive days of green CI (or 7 green nightly `live.yml` runs, if live mode is enabled) on the standalone repo.
