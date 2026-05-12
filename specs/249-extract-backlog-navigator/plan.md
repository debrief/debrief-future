# Implementation Plan: Extract backlog-navigator into a Standalone Repository

**Branch**: `249-extract-backlog-navigator` | **Date**: 2026-05-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/249-extract-backlog-navigator/spec.md`

> **Skeleton status**: all Q1–Q23 slots resolved. Sections marked **[N/A]** have been deliberately ruled out (with reason). The post-design Constitution Check can now re-run and Phase 0 / Phase 1 artefacts (research.md, data-model.md, contracts/, quickstart.md) can be produced.

---

## Summary

Extract `apps/backlog-navigator/` into a standalone, independently buildable GitHub repository, applying corrections from the spec-navigator extraction (#248). The technical approach reuses #248's three-phase shape (in-repo seam → subtree split + standalone CI / hosting → cutover) but ships an extraction kit that bakes in the missing pieces #248 had to retrofit: per-PR previews on `gh-pages` (with `clean-exclude: previews/`), regenerated `pnpm-lock.yaml`, a `packageManager` field landed in Phase 1, destination-aware scripts and templates, and a bundled dummy speckit dataset so previews render with no query parameters.

---

## Technical Context

### Language / Version

- **TypeScript 5.3.x** (strict mode, per Constitution Article XV) — for the extracted SPA source and the Phase 1 `defaults.ts` seam in `apps/backlog-navigator/`.
- **Node 20.x LTS** — target runtime for Vite build + Vitest + Playwright in CI; pinned via `.nvmrc` in the standalone repo and `actions/setup-node@v4` `node-version: 20` in workflow templates.
- **pnpm 10.33.0** — pinned via the `packageManager` field added in Phase 1; mirrored by `pnpm/action-setup@v3` in workflow templates.
- **Bash 5.x** — for kit scripts (`extract.sh`, `bootstrap-new-repo.sh`); POSIX-portable subset where reasonable, but `set -euo pipefail` and `[[ ... ]]` permitted (kit is run on operator laptops and GitHub Actions Ubuntu runners, both ship Bash 5).
- **YAML 1.2** — for GitHub Actions workflow templates.
- **Markdown (GFM)** — for kit documentation templates (`README.md`, `CONFIGURATION.md`, `SECURITY.md`, runbooks).

### Primary Dependencies

- **Runtime (unchanged from current `package.json`)**: React 18.2, react-dom 18.2, `@tanstack/react-virtual` ^3, `react-markdown` ^9, `remark-gfm` ^4, `diff` ^5.2, `zod` ^3.22, `workbox-window` ^7.1.
- **`@debrief/components` workspace dep removed by Phase 1** — the two `useIsMobile` subpath imports (`src/App.tsx`, `src/editors/EditorOverlayProvider.tsx`) are replaced by a local `apps/backlog-navigator/src/hooks/useIsMobile.ts` (copy of the existing implementation in `shared/components/`). Phase 0's audit surfaces any other `@debrief/*` imports; same treatment.
- **Dev**: TypeScript 5.3, Vite 5, `@vitejs/plugin-react` 4, Vitest 1, jsdom 28, `@testing-library/react` 14, Playwright 1.58, `@sparticuz/chromium` 143 (cloud Playwright), `@axe-core/playwright` 4.8, ESLint 8 + `@typescript-eslint/*` 6, `vite-plugin-pwa` 0.20.
- **CI-side actions** (used by the kit's `workflows/` templates): `actions/checkout@v4`, `actions/setup-node@v4`, `pnpm/action-setup@v3`, `JamesIves/github-pages-deploy-action@v4`, `marocchino/sticky-pull-request-comment@v2` (sticky PR-preview comment).
- **Kit scripts depend on**: `git` (subtree split), `pnpm` (lockfile regen), `ripgrep` or POSIX `grep -RnE` (literal-presence guard), `sed` (`vite.config.ts` base flip), `gh` CLI (optional — only if `bootstrap-new-repo.sh` reads / writes GitHub config; not strictly required when the operator uses the web UI for repo creation).

### Storage

N/A.

The standalone backlog-navigator SPA is read-mostly against the GitHub REST API. The only persistent client-side surface is `localStorage` (PAT envelope), inherited unchanged from the current app per spec #244 Assumption A-1 ("no offline edit queue → no IndexedDB / OPFS"). No server-side storage is introduced; PR previews and production builds are static files on the `gh-pages` branch.

The extraction itself produces files (the new repo's `main`, the `gh-pages` branch with `/` and `/previews/pr-<n>/` subpaths), but these are deployment artefacts, not application storage.

### Testing

**In `apps/backlog-navigator/` today (carried forward unchanged)**:

- **Vitest 1.x** (`vitest.config.ts`, jsdom 28 env) — unit/component tests under `src/**/*.test.ts(x)`. `pnpm --filter @debrief/backlog-navigator test` is part of CLAUDE.md's CI fallback step 3.
- **Playwright 1.58** (`playwright.config.ts`, `e2e/` dir) with in-process `mock-github.ts` — deterministic, no live GitHub calls. Two entry-points: `pnpm test:e2e` (local Chromium) and `pnpm test:e2e:cloud` (via `run-playwright.mjs` + `@sparticuz/chromium`, used by `.github/workflows/ci.yml` and CLAUDE.md's CI fallback step 4).
- **TypeScript strict mode** (`pnpm typecheck` → `tsc --noEmit`) and **ESLint** (`pnpm lint`) — already enforced by the monorepo's `task verify`.

**Kit / extraction-specific gates**:

- **Standalone smoke** (in `extract.sh` post-split, inside a `mktemp -d` scratch clone): `pnpm install && pnpm typecheck && pnpm test && pnpm build` against the just-split repo. Fails the extraction loud if anything broke.
- **Standalone E2E smoke** (optional flag `--with-e2e`, default on for CI parity): also run `pnpm test:e2e:cloud` against the scratch clone — catches `@debrief/components` regressions, missing assets, base-path bugs.
- **Literal-presence guard** (Phase 1 step, run from the monorepo): a `pnpm run audit:no-monorepo-literals` script + a CI check that fails the Phase 1 PR if `apps/backlog-navigator/src/` contains any of a configurable set of monorepo-specific literals (e.g. `'debrief-future'`, `useIsMobile` from `@debrief/components`) outside `src/defaults.ts` or `src/hooks/`. Mirrors #248's seam check but tightened to cover the workspace-import case.
- **Preview-deploy gate** (Phase 3, on the standalone repo): a Playwright smoke job that loads the just-deployed `https://<owner>.github.io/<repo>/previews/pr-<n>/` URL and asserts (a) page renders, (b) console has no errors, (c) the dummy speckit dataset is visible. Uses `JamesIves/github-pages-deploy-action@v4`'s `clean-exclude: previews/` to keep prior previews intact.

### Target Platform

- **Production app**: **GitHub Pages** (Jekyll-bypass via `.nojekyll`) served from the `gh-pages` branch of the standalone repo at `https://<owner>.github.io/<repo>/`. The Vite `base` is set to `/<repo>/` for production deploys (parameterised by the kit's bootstrap, not hard-coded).
- **PR previews**: same `gh-pages` branch, under `/previews/pr-<n>/`. Each PR's Vite `base` is set to `/<repo>/previews/pr-<n>/`. Deploys use `JamesIves/github-pages-deploy-action@v4` with `target-folder: previews/pr-<n>/` and `clean-exclude: previews/` so concurrent previews don't wipe each other. Cleanup on PR close is handled by a separate workflow that deletes `previews/pr-<n>/` from `gh-pages`.
- **Browsers**: modern evergreen (Chrome ≥ 120, Firefox ≥ 121, Safari ≥ 17, Edge ≥ 120) per the current backlog-navigator support matrix; same as #244 / #242.
- **CI runners**: **GitHub Actions** `ubuntu-latest` (Ubuntu 24.04 LTS as of this plan) for both monorepo CI (Phase 1) and standalone-repo CI (Phase 2+). `actions/setup-node@v4` with `node-version: '20'`, `pnpm/action-setup@v3` reads pnpm version from `packageManager`.
- **Kit-script host**: operator laptop (macOS or Linux; Bash 5+, git ≥ 2.40 for subtree-split semantics, pnpm 10.33+, optionally `gh` 2.50+).
- **Out of scope**: self-hosted runners, alternative hosts (Netlify / Vercel / Cloudflare Pages). Kit templates are GitHub-Pages-specific by design; porting to other hosts is left to the adopting org.
- **Portability note**: the kit's Vite `base` rewrite is a single-string parameter (`KIT_BASE_PATH`) passed through `vite.config.ts` and the deploy workflow. Swapping to another static host (Netlify, Cloudflare Pages, S3 + CloudFront) only requires (a) replacing the `JamesIves/github-pages-deploy-action@v4` step with the new host's deploy primitive, and (b) updating `KIT_BASE_PATH`. The app source remains untouched. This is not in scope for #249 but documented in `CONFIGURATION.md` so adopters aren't surprised.

### Project Type

**Web-app extraction**.

#249 extracts `apps/backlog-navigator/` — a React 18 + Vite 5 single-page web app — from the `debrief/debrief-future` monorepo into its own GitHub repo. The artefact being produced is a standalone web app; everything else in the plan (seam, kit scripts, workflow templates, cleanup PR) exists to support that extraction without breaking the running app at either end.

### Performance Goals

- **Kit `extract.sh` end-to-end on operator laptop**: ≤ 5 min wall-clock for the happy path (subtree split + lockfile regen + standalone smoke build + first push). Measured during Phase 0 against an actual run; if the smoke includes `--with-e2e`, the budget rises to ≤ 10 min.
- **PR preview deploy latency** (from PR commit pushed → sticky comment updated with URL): **median < 5 min, p95 < 10 min** (matches spec SC-006). Measured via the `marocchino/sticky-pull-request-comment` timestamp vs. the workflow `started_at`.
- **Production deploy latency** (merge-to-main → `https://<owner>.github.io/<repo>/` serves the new build): **median < 6 min, p95 < 12 min**. Slightly looser than preview because production uses a fresh build + `actions/deploy-pages` round-trip.
- **Standalone repo full-CI run** (lint + typecheck + unit + e2e on `ubuntu-latest`): ≤ 8 min median. The monorepo's analogous suite for backlog-navigator runs in ~6 min today; the standalone repo loses some pnpm-cache leverage but gains by not building sibling workspaces.
- **Loaded SPA performance** (in the extracted app): **unchanged from current** — #244's Lighthouse CI gate (`@lhci/cli`) continues to enforce the LCP/CLS/TBT budgets after extraction. The kit copies the existing `.lighthouserc.json` verbatim and the same gate runs in the standalone repo's CI.

### Constraints

1. **No `debrief/*` org assumption.** The kit accepts the destination owner/repo as parameters (env vars or CLI flags). All workflow templates, README/CONFIGURATION boilerplate, and CODEOWNERS templates are tokenised (`{{ORG}}`, `{{REPO}}`, `{{BASE_PATH}}`) and rendered by `bootstrap-new-repo.sh`. No hard-coded `debrief/` strings outside the in-monorepo extraction script's defaults.
2. **First standalone push must go green.** Phase 2 acceptance gate: the first push to the new standalone repo's `main` triggers CI that passes (lint + typecheck + unit + e2e + production deploy to `gh-pages`). The kit's smoke step (`pnpm install && pnpm build && pnpm test`) runs locally before the push so a red first-push is caught pre-flight.
3. **Production deploys must never wipe in-flight previews.** Enforced at the workflow level: production deploy targets the repo root of `gh-pages` with `clean-exclude: previews/`. Preview deploys target `previews/pr-<n>/` with `clean: false` (or `clean-exclude` of sibling preview dirs). Cleanup of `previews/pr-<n>/` is exclusively the responsibility of the on-close cleanup workflow.
4. **Phase 1 seam is purely additive.** The `defaults.ts` module and the `useIsMobile` inlining must not change runtime behaviour of `apps/backlog-navigator/` in `debrief-future`. Verified by: existing Vitest + Playwright suites pass unchanged, and a brief diff-review checklist in `quickstart.md` confirms no call sites read `defaults` indirectly.
5. **Kit must be re-runnable.** `extract.sh` is idempotent within a single operator session: re-running after a failed step (e.g. push rejected) does not leave the local clone in a corrupt state. Achieved by working in a tempdir under `/tmp` (or `$TMPDIR`) and never mutating the source monorepo checkout.
6. **No secrets in committed files.** PAT-bearing operations (live-mode E2E, if enabled) read from `GH_TOKEN` env var or repo secrets only. `.env*` is gitignored in the standalone template.
7. **Export seam constraint** (from Q3): the only public exports of `apps/backlog-navigator/src/defaults.ts` are `defaultRepo: { owner: string; repo: string }` and `defaultLandingState` (typed). The kit's smoke check parses this file and fails if more symbols are exported — keeps the seam minimal.

### Scale / Scope

- **Codebase being extracted**: `apps/backlog-navigator/` is ~3.5k LOC TypeScript/TSX + ~600 LOC tests + ~150 LOC config (Vite, ESLint, Playwright). Single workspace, no nested packages. The Git history under the path is ~80 commits since #242 landed.
- **Single standalone SPA**, one production deploy URL. No multi-tenant, no per-user state on the server.
- **Concurrent PR previews in the standalone repo**: budget for **≤ 30 open at once** at peak (a conservative ceiling given expected O(10) PRs/week). `gh-pages` directory listing remains performant well past this; the cleanup workflow guarantees closed-PR folders are removed within minutes.
- **Kit operator audience**: O(1) operators per extraction (one engineer drives the runbook). The kit is not designed for parallel multi-operator runs against the same destination repo.
- **Runbook length**: PHASE3-RUNBOOK.md targets ≤ 30 minutes of operator-attended time end-to-end (kit run + first-push verification + sticky-comment sanity check). Long-tail items (e.g. DNS for a custom domain, if any) are out of scope for #249.
- **Phase 3 cleanup PR size**: ~15 file deletions + ~50 lines of CI/config edits in `debrief-future`. Small enough to review in a single sitting.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The applicable principles from `constitution.md` v1.3.0 for this feature are listed below. Each will be checked once the Technical Context is settled.

- **I. Defence-Grade Reliability** — **N/A**. This feature ships GitHub-hosted infrastructure (kit + standalone SPA + Pages workflow) and a documentation runbook. No code path in `debrief-future`'s defence runtime changes. Phase 1 seam is additive and traversed by the existing Vitest suite.
- **II. Schema Integrity** — **[N/A]** _No schema changes. The backlog-navigator consumes the GitHub REST surface and existing speckit artefact shapes; no LinkML changes._
- **III. Data Sovereignty** — **N/A**. The Backlog Navigator reads public GitHub REST data (issues, labels, comments) and writes nothing back outside what the user explicitly does via PAT-authenticated GitHub API calls (existing behaviour from #242). The extraction kit moves source code and CI configuration between Git repos — no user-owned operational data is involved. Provenance/lineage requirements do not apply.
- **IV. Architectural Boundaries (incl. IV.4 persistence-host abstraction)** — **[N/A]** _Backlog-navigator does not persist user data. No writer abstraction involved._
- **V. Extensibility** — PASS at the V.1/V.2 level. The kit is structured for debrief-team re-use (e.g. extracting a future second tool); broader external re-use is documented in the kit README but not validated as an acceptance criterion. No vendor-specific dependencies beyond GitHub Actions / Pages (already debrief-future's CI substrate).
- **VI. Testing** — **PASS** with the following per-phase gates:
  - **Phase 1 (debrief-future seam)**: existing Vitest unit suite + Playwright E2E for `apps/backlog-navigator/` must pass unchanged. A new unit test asserts `defaults.ts` exports exactly `defaultRepo` and `defaultLandingState` (the kit's contract surface).
  - **Phase 2 (kit + standalone repo)**: kit's smoke step runs `pnpm install && pnpm build && pnpm test` against the freshly-extracted clone *before* the first push. The standalone repo's first CI run (lint + typecheck + unit + e2e) must go green — this is the Phase 2 acceptance gate (per Q9 constraint #2).
  - **Phase 3 (debrief-future cutover)**: a single PR that removes `apps/backlog-navigator/` and its CI references; the remaining `debrief-future` CI suite must stay green. Sticky-comment redirect is verified manually against an open PR.
  - **Kit scripts**: `bootstrap-new-repo.sh` and `extract.sh` ship with a `test/` directory of bash-level fixtures (sample tokenised templates + expected rendered output). Run in CI via a tiny `kit-test` job.

  No new test framework introduced. No test deletions.
- **VII. Test-Driven AI Collaboration** — **PASS**. The kit and the runbook are designed for agent-executable verification:
  - Every `extraction-kit/scripts/*.sh` exits 0 on success, non-zero on failure, and prints a single-line `OK: <step>` / `FAIL: <reason>` marker. An agent driving the runbook can branch on exit code without parsing prose.
  - `PHASE3-RUNBOOK.md` is structured as numbered steps, each with an explicit "verify" check (e.g. "curl https://<org>.github.io/<repo>/previews/pr-1/ returns 200 and contains `<title>Backlog Navigator`").
  - `bootstrap-new-repo.sh` produces a `bootstrap-report.json` with `{ filesRendered, tokensReplaced, smokeTestExitCode }` — machine-readable acceptance evidence.
  - Phase 1 unit test for `defaults.ts` exports is an explicit AI-verifiable contract.
- **VIII. Documentation** — **PASS minimum**. Ships: ADR-031 ("Extracting Backlog Navigator to its own repo") in `docs/project_notes/decisions.md`, `extraction-kit/README.md` (operator quick-start), `extraction-kit/PHASE3-RUNBOOK.md` (verifiable runbook per Q15), and a `docs/project_notes/issues.md` log entry with ticket ID and URL. The standalone repo inherits debrief-future's existing app-level docs verbatim via the kit's copy step — no new README/CONFIGURATION/SECURITY templates authored as part of this feature.
- **IX. Dependencies** — **PASS with one new CI dependency, pinned and justified**.
  - **New**: `JamesIves/github-pages-deploy-action`, pinned to `v4` (major) plus a commit SHA in the workflow file per IX.2. Used by both the production-deploy workflow and the per-PR preview workflow.
  - **IX.1 justification**: the official `actions/deploy-pages@v4` action publishes a single artefact to the Pages root and does not support directory-scoped publishing (i.e. `previews/pr-<n>/`). Without sub-directory support, per-PR preview deploys cannot coexist with production at the same Pages origin. `JamesIves/github-pages-deploy-action` writes directly to the `gh-pages` branch and supports `target-folder` + `clean-exclude`, which are load-bearing for FR-011 / FR-014. Considered alternatives: (a) separate `gh-pages-previews` repo — rejected, splits origin and complicates linking; (b) Cloudflare Pages / Vercel — rejected, adds vendor surface against the spirit of V.3 and a billing relationship.
  - **No new runtime dependencies in either repo.** The kit ships POSIX shell only.
  - **Phase 1 in debrief-future**: zero new deps.
- **X. Security** — **PASS**. Threat surface enumerated:
  - **GitHub PAT (user-supplied)**: stored client-side in `localStorage` (unchanged from #242); never sent to any non-GitHub origin; never logged. The standalone app's `SECURITY.md` (if added by kit) and the in-app PAT entry UI both state this.
  - **`GITHUB_TOKEN` in workflows**: workflows declare minimum required `permissions:` at workflow level (`contents: write` for `gh-pages`, `pull-requests: write` for sticky-comment, `pages: read` only where needed). No workflow runs with default-broad token.
  - **Third-party actions**: `JamesIves/github-pages-deploy-action@v4` pinned to a commit SHA (per Q17 / IX.2). No other third-party actions added.
  - **Workflow injection**: PR-triggered workflows do not use `pull_request_target` against the PR head ref; preview-deploy uses `pull_request` (read-only checkout of head) and a separate `workflow_run`-triggered job for the `gh-pages` write — the standard pattern that prevents fork-PR token exfiltration.
  - **Secrets in repo**: none committed. `.env*` gitignored in the standalone template; the kit refuses to copy any `.env*` file it finds in the source tree.
- **XI. Internationalisation** — **[N/A]** _No new user-facing strings; existing app strings unchanged by this extraction._
- **XII. Community Engagement** — **PASS**. The standalone repo is public (per FR-029). Per-PR preview URLs (posted as a sticky comment on each PR by the kit's workflow) ARE the XII.2 beta-preview surface — reviewers can click a link, exercise the change, and leave feedback without local setup. Production deploy at the canonical `https://<org>.github.io/<repo>/` is publicly browseable. No additional community surface (forums, discussion boards, mailing lists) introduced by this feature.
- **XIII. Contribution Standards** — **PASS**. The feature decomposes into three reviewable PRs, each independently green:
  - **PR-1 (debrief-future, Phase 1)**: introduces `defaults.ts` seam + minimal call-site edits + unit test for the export contract. CI must pass (lint + typecheck + Vitest + Playwright). Independently revertable.
  - **PR-2 (the kit itself, also in debrief-future)**: lands `specs/249-.../extraction-kit/` (scripts + templates + tests + README + PHASE3-RUNBOOK). CI passes the new `kit-test` job. No runtime impact on debrief-future.
  - **PR-3 (debrief-future, Phase 3 cutover)**: deletes `apps/backlog-navigator/`, removes its CI references, lands ADR-031 and the issues.md entry. Opened only after the standalone repo is live and verified green. Reviewable in a single sitting (~50 lines net, plus deletions).
  - **In the standalone repo**: the kit's first push is a single initial commit followed by the workflow PR(s) it generates; same standards apply.

  No force-pushes to shared branches; conventional commit messages; descriptive PR bodies linking back to issue #249.
- **XIV. Pre-Release Freedom** — **[N/A unless triggered]** _v4.0.0 not yet released; breaking changes permitted in spirit but this feature introduces none._
- **XV. Strict Type Safety** — **PASS**.
  - `apps/backlog-navigator/tsconfig.json` keeps `strict: true` (unchanged).
  - New module `apps/backlog-navigator/src/defaults.ts` exports:
    ```ts
    export interface RepoCoords { readonly owner: string; readonly repo: string; }
    export interface LandingState { /* exact shape lifted from current inline default */ }
    export const defaultRepo: RepoCoords;
    export const defaultLandingState: LandingState;
    ```
    — no `any`, no `unknown` escapes, no `as` casts. The unit test from Article VI checks that no other symbols are exported.
  - Call sites that previously inlined `{ owner: 'debrief', repo: 'debrief-future' }` now import `defaultRepo`. No new untyped values introduced.
  - The kit's TypeScript files (if any) are not added in Phase 1 — the kit is POSIX shell + JSON only, so no TS surface to type.

**Initial gate result**: **PASS**. Articles I, II, III, IV, XI, XIV are N/A for this feature (rationale recorded above and in the skeleton). All applicable articles (V, VI, VII, VIII, IX, X, XII, XIII, XV) pass with the framing captured per question.

---

## Project Structure

### Documentation (this feature)

```text
specs/249-extract-backlog-navigator/
├── plan.md              # This file
├── research.md          # Phase 0 output — kit-design decisions + #248 lessons distilled
├── data-model.md        # Phase 1 output — defaults.ts shape, kit-config.json shape, PR-comment sentinel format
├── quickstart.md        # Phase 1 output — operator runbook (links to PHASE3-RUNBOOK.md inside the kit)
├── contracts/           # Phase 1 output — CLI contract for extract.sh + bootstrap-new-repo.sh; workflow event contracts
├── checklists/
│   └── requirements.md  # Spec-quality checklist (already created by /speckit.specify)
├── evidence/
│   └── opening-context.md  # Cached opener for the feature post (Phase 2 of /speckit.plan)
├── extraction-kit/      # Deliverable from this feature — scripts, workflows, templates, docs
└── tasks.md             # Generated later by /speckit.tasks
```

### Source Code (repository root)

For this feature the "source" is a mix of (a) `apps/backlog-navigator/src/defaults.ts` + minimal call-site edits, (b) the new `extraction-kit/` tree under `specs/249-.../`, and (c) a Phase-3 deletion. Concrete file impact per phase:

```text
# Phase 1 (in debrief-future, this PR's scope already touches these)
apps/backlog-navigator/
├── src/
│   ├── defaults.ts            # NEW — typed defaults module
│   └── ...                    # MODIFIED — replace literals with reads from defaults.ts
├── package.json               # MODIFIED — add packageManager: "pnpm@X.Y.Z"
└── ...

docs/extraction-audit/backlog-navigator/
└── coupling-inventory.md      # NEW — Phase 0 artefact

# Phase 2 (deliverable, lives under spec dir until handed off)
specs/249-extract-backlog-navigator/extraction-kit/
├── README.md
├── PHASE3-RUNBOOK.md
├── kit-config.json
├── scripts/{extract.sh, bootstrap-new-repo.sh}
├── workflows/{ci.yml, deploy.yml, pr-preview.yml, pr-preview-cleanup.yml, live.yml?}
├── templates/{README.md, CONFIGURATION.md, SECURITY.md, .eslintrc.cjs, tsconfig.json, tsconfig.node.json, .gitignore, specs-dummy/}
└── docs/{lessons-from-248.md, why-no-patch-03.md}

# Phase 3 (in debrief-future, separate PR)
apps/backlog-navigator/      # DELETED
docs/                        # MODIFIED — references repointed
CLAUDE.md                    # MODIFIED — references repointed
.github/                     # MODIFIED — per-PR review-app comment retargeted
```

**Structure Decision**: three-region structure tracking the three phases.

- **Region A (Phase 1, in `apps/backlog-navigator/`)**: additive seam — one new `src/defaults.ts` module, edited call sites that previously inlined repo coords, plus `packageManager` pin in `package.json`. Existing test suites move with the code; no test rewrites.
- **Region B (Phase 2, the kit at `specs/249-extract-backlog-navigator/extraction-kit/`)**: scripts + workflow templates + repo-template files + docs. POSIX shell only; no runtime code. Lives under the spec dir until reused for a future extraction — not promoted to `tools/` or `scripts/` because it is a feature-scoped artefact, not core infra.
- **Region C (Phase 3, the cutover deletion)**: `apps/backlog-navigator/` is removed; cross-references in `docs/`, `CLAUDE.md`, and `.github/` are repointed at the standalone repo's URL.
- **Phase 0 evidence**: `docs/extraction-audit/backlog-navigator/coupling-inventory.md` is the only Phase-0 deliverable that lives outside `specs/249-.../` (kept under `docs/` so it's discoverable for any future similar audit).

---

## Media Components

**[N/A — backend / infrastructure feature]**

This feature does not add or change any visual component in the running backlog-navigator UI; it extracts the app to a standalone repo and stands up CI / hosting. No Storybook stories apply.

---

## Storybook E2E Testing

**[N/A — no interactive UI components added or changed]**

Existing Storybook stories in `apps/backlog-navigator/` (if any) are carried by the subtree split as-is; this feature does not modify them. Their tests run inside the standalone repo's own CI from Phase 2 onwards; debrief-future stops running them at Phase 3.

---

## Web-Shell E2E Testing

**[N/A — no extension workflow changes]**

Backlog-navigator is a standalone SPA, not a panel inside the VS Code extension or web-shell. The Playwright tests that matter (in-process `mock-github.ts` route mock) live inside the app's own suite and run in the standalone repo's CI from Phase 2 onwards. The web-shell is not involved.

---

## Complexity Tracking

> Fill only if Constitution Check has violations that must be justified.

**None.** No constitution violations introduced. The single dependency addition (`JamesIves/github-pages-deploy-action@v4`) is fully justified inline in Article IX above (alternative considered: `actions/deploy-pages@v4` — rejected because it cannot publish per-directory previews alongside production). Recording it here would be duplicative.

---

## Notes on the skeleton

- 23 TBD slots, grouped: Q1 summary; Q2–Q10 technical context; Q11–Q21 constitution-check rows; Q22 project structure; Q23 complexity tracking.
- Once all TBDs are resolved, the post-design Constitution Check re-runs, then Phase 0 (research.md), Phase 1 (data-model / contracts / quickstart), Phase 1.5 (media components — already N/A), and Phase 2 (cached opener) proceed in order.
- Sections explicitly ruled **[N/A]** in the skeleton (Media Components, Storybook E2E, Web-Shell E2E, II, IV, XI, XIV) will not be re-opened unless a TBD answer surfaces a reason to.
