# Implementation Plan: Extract backlog-navigator into a Standalone Repository

**Branch**: `claude/backlog-navigator-spec-PO00f` (active feature: `249-extract-backlog-navigator`) | **Date**: 2026-05-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/249-extract-backlog-navigator/spec.md`

## Summary

Extract `apps/backlog-navigator/` from the debrief-future monorepo into a
standalone GitHub repository (recommended slug `deepbluecltd/backlog-navigator`,
parameterised via `--destination` flag) so the app can be reused by any project
that maintains a `BACKLOG.md`. The work is sequenced in three phases — the same
**shape** as #248 (spec-navigator extraction), with the **kit revised** based on
twelve concrete lessons from #248's hand-off:

1. **Phase 0 (this repo)** — produce `docs/extraction-audit/backlog-navigator/coupling-inventory.md`. Enumerate every hardcoded debrief literal in `apps/backlog-navigator/src/`, every `@debrief/*` workspace import, every shared monorepo-infrastructure dep. The audit's findings determine which extraction-kit patches are needed and is the input to Phase 1 (FR-001).
2. **Phase 1 (this repo)** — introduce the configuration seam. Edit `src/github/api.ts` (two consts → env-driven), extend `src/strings.ts` (one host const), create a small `src/defaults.ts` for PWA manifest fields, env-drive the `vite.config.ts` manifest reads, inline-copy `@debrief/components/hooks/useIsMobile` into `src/hooks/useIsMobile.ts` (R-007 — backlog-nav's single workspace dep, **not present** in #248), and **add `"packageManager": "pnpm@..."` to `apps/backlog-navigator/package.json`** (FR-010 — the single most preventable failure mode from #248). Default values reproduce today's experience byte-for-byte.
3. **Phase 2 (new repo)** — perform a history-preserving `git subtree split`, regenerate `pnpm-lock.yaml` (#248 Lesson 1), stand up CI from day one with: `ci.yml` (lint/typecheck/vitest/playwright via in-process route mock), `lighthouse.yml` (PWA budget per ADR-030 — carried with the app), `deploy.yml` (main → `gh-pages` root via `JamesIves/github-pages-deploy-action@v4` with `clean-exclude: previews/`), **`pr-preview.yml`** (PR → `gh-pages/previews/pr-<n>/` + sticky comment), **`pr-preview-cleanup.yml`** (closed PR → rm preview folder), and a bundled dummy `BACKLOG.md` + linked spec dirs so previews render at the default URL. `live.yml` is shipped as an optional template, NOT enabled by default (FR-019, #248 Lesson 12).
4. **Phase 3 (this repo)** — delete `apps/backlog-navigator/` and the three dedicated workflows (`backlog-navigator-{preview,publish,lighthouse}.yml`); update `backlog-navigator-comment.yml` to point at the hosted instance (continues to emit `?pr=<n>` thanks to the R-014 compat shim); remove backlog-navigator refs from `ci.yml`; **remove `@lhci/cli` from root `devDependencies`** (verified only consumed by the deleted Lighthouse workflow); add ADR-032 and update ADR-030 with the owner-moved annotation (unlike ADR-031 for #248, ADR-030 is *about* this app and needs the explicit transfer).

The destination slug is operator-supplied (`--destination <org>/<repo>`), not hardcoded. The kit's templates use `{{ORG}}`, `{{REPO}}`, `{{HOST}}` placeholders; `bootstrap-new-repo.sh` substitutes (#248 Lessons 3, 7).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, per Article XV), React 18.x — unchanged from current `apps/backlog-navigator/`
**Primary Dependencies**: Vite 5.x (build), `vite-plugin-pwa` ^0.20 (PWA — ADR-030 commitment), `react-markdown` + `remark-gfm` (Description rendering), `@tanstack/react-virtual` (virtualised lists), `diff` (jsdiff — raw-diff toggle), `Zod` ^3.22.0 (GitHub REST + PWA manifest boundaries), `workbox-window` (SW registration); devDeps include `@playwright/test`, `@axe-core/playwright`, `@sparticuz/chromium`, Vitest, `@testing-library/react`, `@testing-library/dom`, `jsdom`. **One new local file** (`src/hooks/useIsMobile.ts` inlined from `@debrief/components`, R-007). No new external runtime dependencies introduced.
**Storage**: `localStorage` for the PAT envelope and per-edit staging (existing pattern, unchanged). No persistence of debrief domain data; this is a viewer/editor SPA.
**Testing**: Vitest (unit), Playwright ^1.58.0 + `@axe-core/playwright` (E2E + a11y) with `@sparticuz/chromium` (bundled chromium for cloud sessions); Lighthouse CI (`@lhci/cli@0.13.0`) for the PWA budget.
**Target Platform**: Static SPA on modern evergreen browsers (Chromium, Firefox, Safari current); deployed to GitHub Pages on the `gh-pages` branch (R-003).
**Project Type**: Web (static SPA + PWA). The *feature* is a cross-repository migration, so the structure section below documents both the current (this repo) and target (new repo) layouts.
**Performance Goals**: No regression from current backlog-navigator baseline. Lighthouse-PWA budget (installable-manifest, service-worker, viewport, document-title) carried unchanged via `.lighthouserc.json` (ADR-030).
**Constraints**: GitHub anonymous-mode rate-limit aware; a contributor with no debrief-issued credentials must produce a green local test run (FR-013); per-PR previews and main deploys MUST coexist on the same Pages site (FR-014); the kit's first push MUST succeed without manual rework (no missing lockfile, no missing `packageManager`, no hardcoded destination — #248 Lessons 1, 2, 3).
**Scale/Scope**: Single static SPA, ~3–4k LOC under `apps/backlog-navigator/src/`. Migration touches a small set of production files (the audit determines the exact list; pre-audit scan: `src/github/api.ts`, `vite.config.ts`, `src/strings.ts`, plus one new `src/defaults.ts` and one new `src/hooks/useIsMobile.ts`) + `package.json` + complete CI/hosting setup in the new repo.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Applies? | Status | Notes |
|---|---|---|---|
| I. Defence-Grade Reliability | Yes | ✅ Pass | Offline behaviour preserved by carrying ADR-030 (vite-plugin-pwa) into the new repo. PWA installable + offline app shell + update prompt all carried. GitHub Pages is delivery surface, not a runtime dependency for already-loaded sessions. |
| II. Schema Integrity | Yes | ✅ Pass | No new LinkML schemas. No new application-config schema — defaults flow as values through existing modules; PWA manifest is Zod-validated by existing `src/pwa/manifestSchema.ts` (Article XV); GitHub REST is Zod-validated by existing `src/github/schemas.ts`. |
| III. Data Sovereignty | Yes | ✅ Pass | No telemetry added; PAT stays in `localStorage`; no provenance changes (the app is a viewer/editor of `BACKLOG.md`, not a domain-data transformer). |
| IV. Architectural Boundaries | Yes | ✅ Pass | backlog-navigator is a frontend; it persists only the existing localStorage envelopes via the existing pattern. No new write paths introduced. The configuration seam is read-only at runtime. (IV.4 not implicated — no persistence-host abstraction surface changes.) |
| V. Extensibility | Yes | ✅ Pass | Extensibility provided by the parameterised defaults + URL-query-string consumer-selection model (R-014). Third-party adopters can fork the kit and rehost without modifying source. |
| VI. Testing | Yes | ✅ Pass | All FRs have acceptance scenarios. New repo CI covers lint/typecheck/Vitest/Playwright (in-process route mock per R-006) plus Lighthouse PWA budget. Live mode optional (FR-019). |
| VII. Test-Driven AI Collaboration | Yes | ✅ Pass | Acceptance scenarios in spec are executable tests; the kit's `extract.sh` includes a smoke-test step (`pnpm install && pnpm test && pnpm build` before pushing — R-010) that *is* a verifiable definition-of-done for the extraction step itself. |
| VIII. Documentation | Yes | ✅ Pass | Spec exists; ADR-032 (extraction) to be created in Phase 3; ADR-030 (PWA tooling) to receive owner-moved annotation in Phase 3; new repo README required (templates ship with `{{ORG}}`/`{{REPO}}`/`{{HOST}}` placeholders, R-012). |
| IX. Dependencies | Yes | ✅ Pass | No new external runtime deps introduced. `useIsMobile` is *moved* (inline-copy) rather than depended on (R-007). After Phase 3, root `@lhci/cli` devDep is **removed** (verified — only consumed by the deleted Lighthouse workflow). Net dependency count *decreases* in debrief-future. |
| X. Security | Yes | ✅ Pass | PAT explicitly out of code; new-repo CI uses default `GITHUB_TOKEN` for Pages writes; no debrief-issued credential needed for local contributor builds (FR-013); optional `live.yml` uses a fine-grained read-only PAT, owned by service identity if enabled (R-015). The GitHub-App-authorization gap (#248 Lesson 9) is called out in prereqs (R-011). |
| XI. Internationalisation | Partial | ✅ Pass | No new user-facing strings introduced. Existing strings table in `src/strings.ts` moves with the source unchanged; i18n-readiness preserved. |
| XII. Community Engagement | Yes | ✅ Pass | New repo is public; per-PR previews with sticky comments make in-flight UI changes visible to non-technical reviewers (R-004 — *better* than #248 on this axis, where previews were a post-hoc add-on). |
| XIII. Contribution Standards | Yes | ✅ Pass | Each phase lands as a separate atomic PR; CI gates apply in both repos. |
| XIV. Pre-Release Freedom | Yes | ✅ Pass | Pre-v4.0.0 — extraction is a permitted breaking change to repo layout. |
| XV. Strict Type Safety | Yes | ✅ Pass | TypeScript strict mode already enabled in `apps/backlog-navigator/tsconfig.json` and carried forward. The existing `defaults.ts`/`api.ts`/`strings.ts` typed surfaces stay the boundary; URL-query-string parsing returns a typed object validated by the existing parser. No new untyped surface introduced. PWA manifest remains Zod-validated. |

**Gate result**: ✅ PASS — no violations to track in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/249-extract-backlog-navigator/
├── plan.md              # This file
├── research.md          # Phase 0 output (R-001 through R-015)
├── data-model.md        # Phase 1 output (defaults surfaces, URL contract)
├── quickstart.md        # Phase 1 output (Phase 0 → 1 → 2 → 3 runbook)
├── contracts/           # Phase 1 output
│   ├── hosted-url.md             # Query-string contract (accepts both ?pr= and ?repo=&branch=)
│   └── ci-surface.md             # New-repo workflows: ci, lighthouse, deploy, pr-preview, pr-preview-cleanup, optional live
├── evidence/
│   └── opening-context.md  # Cached opener for the eventual blog post (Phase 2 of this command)
└── extraction-kit/      # Output of /speckit.tasks + implementation (NOT produced by /speckit.plan); see research.md §R-012
    ├── README.md, PHASE3-RUNBOOK.md
    ├── scripts/{extract.sh, bootstrap-new-repo.sh}
    ├── workflows/{ci.yml, lighthouse.yml, deploy.yml, pr-preview.yml, pr-preview-cleanup.yml, live.yml.template}
    ├── templates/{README.md, CONFIGURATION.md, SECURITY.md, .eslintrc.cjs, tsconfig.json, tsconfig.node.json, .gitignore, specs-dummy/}
    └── docs/{lessons-from-248.md, why-no-patch-03.md}
```

The `extraction-kit/` directory is intentionally listed even though it is
**not** produced by `/speckit.plan` — it is the output of `/speckit.tasks`
(and subsequent implementation). Listing it here documents the eventual
shape the spec dir will reach by Phase 2 completion (per spec §"Recommended
Extraction Kit Contents").

### Source Code

This is a cross-repository migration. The before/after picture:

```text
# === debrief-future (this repo) ===

# Before Phase 1 — current state:
apps/backlog-navigator/
├── src/
│   ├── App.tsx                                # imports @debrief/components/hooks/useIsMobile (R-007)
│   ├── github/api.ts                          # DEFAULT_OWNER='debrief', DEFAULT_REPO='debrief-future' inline (audit-target)
│   ├── strings.ts                             # centralised string table — extension point for `host`
│   ├── state/, editors/, components/, parser/, format/, pwa/, types.ts
│   └── ...
├── e2e/                                       # Playwright suite with in-process mock-github.ts
├── public/
├── vite.config.ts                             # PWA manifest fields inline + VITE_BASE_URL default '/debrief-future/backlog-navigator/'
├── .lighthouserc.json                         # PWA budget config — ADR-030
├── package.json                               # Workspace deps: @debrief/components; NO packageManager field (audit-target)
├── playwright.config.ts, vitest.config.ts, tsconfig*.json
└── README.md

.github/workflows/                             # 4 dedicated (backlog-navigator-{preview,publish,comment,lighthouse}.yml) + 2 refs in ci.yml (lines 143-144)
heroku.yml, app.json, Dockerfile.preview       # NO backlog-navigator references (verified, but audit re-confirms)
CLAUDE.md                                      # "Before Pushing" Step 4 includes the backlog-navigator Playwright command
package.json (root)                            # @lhci/cli is backlog-navigator-only (verified)

# After Phase 1 (still in this repo):
apps/backlog-navigator/
├── src/
│   ├── App.tsx                                # imports ../hooks/useIsMobile (local copy)
│   ├── defaults.ts                            # NEW — exports build-time defaults (PWA manifest, host)
│   ├── hooks/useIsMobile.ts                   # NEW — inlined from @debrief/components with provenance comment
│   ├── github/api.ts                          # DEFAULT_OWNER/REPO now env-driven via import.meta.env.VITE_DEFAULT_OWNER/REPO
│   ├── strings.ts                             # adds `host` exported const, env-driven
│   └── ...                                    # else unchanged
├── vite.config.ts                             # PWA manifest reads from process.env.VITE_* with debrief fallbacks
├── package.json                               # adds "packageManager": "pnpm@10.33.0" (FR-010)
└── ...                                        # else unchanged

# After Phase 3 (cutover):
# apps/backlog-navigator/ deleted entirely
# .github/workflows/backlog-navigator-preview.yml      — deleted
# .github/workflows/backlog-navigator-publish.yml     — deleted
# .github/workflows/backlog-navigator-lighthouse.yml  — deleted
# .github/workflows/backlog-navigator-comment.yml     — kept; URL points at hosted instance (continues to emit ?pr=<n>)
# .github/workflows/ci.yml                            — backlog-navigator references removed (lines 143-144)
# heroku.yml, app.json, Dockerfile.preview            — UNCHANGED (no refs existed; audit re-confirms)
# package.json (root)                                 — @lhci/cli removed from devDependencies
# CLAUDE.md                                           — "Before Pushing" Step 4 trimmed; review-app comment template note updated; recent changes appended
# docs/project_notes/decisions.md                     — ADR-032 added (extraction); ADR-030 amended with owner-moved annotation

# === <org>/<repo> (new repo, created in Phase 2) ===
<repo>/
├── src/                                       # Subtree-split from apps/backlog-navigator/src/
│   ├── App.tsx, defaults.ts, hooks/useIsMobile.ts (inlined),
│   ├── github/api.ts (env-driven), strings.ts (env-driven),
│   ├── pwa/, parser/, format/, editors/, components/, state/, types.ts
├── e2e/                                       # Subtree-split — in-process mock-github.ts retained
├── public/                                    # PWA icons (icon-192.png, icon-512.png)
├── specs/<NNN>-<name>/                        # Bundled dummy spec dirs (for preview/default-URL rendering — R-005)
├── BACKLOG.md                                 # Bundled dummy condensed BACKLOG (rendered by default URL — R-005)
├── .lighthouserc.json                         # Unchanged from debrief-future
├── .github/workflows/
│   ├── ci.yml                                 # NEW — lint/typecheck/vitest/playwright(in-process)
│   ├── lighthouse.yml                         # NEW — PWA budget (ADR-030 carried)
│   ├── deploy.yml                             # NEW — main → gh-pages root via JamesIves action + clean-exclude: previews/
│   ├── pr-preview.yml                         # NEW — PR → gh-pages/previews/pr-<n>/ + sticky comment
│   └── pr-preview-cleanup.yml                 # NEW — closed PR → rm previews/pr-<n>/
├── README.md, CONFIGURATION.md, SECURITY.md   # NEW — placeholder-substituted from kit
├── .eslintrc.cjs, tsconfig.json, tsconfig.node.json  # NEW — drop-in standalone configs (no monorepo refs)
├── .gitignore                                 # NEW — playwright-report/, test-results/, .chromium-path
├── pnpm-lock.yaml                             # NEW — regenerated by extract.sh (R-010)
└── package.json                               # @debrief/components dep removed (useIsMobile inlined); packageManager field present
```

**Structure Decision**: Two-repo target layout. This repo retains its monorepo shape minus `apps/backlog-navigator/` and three of its four dedicated workflows (the fourth — `backlog-navigator-comment.yml` — stays, with the URL host swapped). The new repo is a single-package static SPA + PWA with a complete CI/preview/deploy/Lighthouse pipeline from the first push. Phase 1's only structural changes are (a) creating two new small files in `apps/backlog-navigator/src/` (`defaults.ts`, `hooks/useIsMobile.ts`), (b) editing a small set of existing files to use the new seams, and (c) the `packageManager` field. Those edits + new files survive the subtree split intact.

## Media Components

None — backend/infrastructure feature. The migration explicitly preserves the
existing UI byte-for-byte (FR-024 via #248 FR-024 carryover); no new components,
no story changes, nothing visually demonstrable beyond "the same app, hosted
elsewhere, with per-PR previews now available."

(Note: this *is* a release-worthy event for the Backlog Navigator user
community — but the storytelling surface is the hosting move, the per-PR
preview pipeline, and the lessons-applied kit, not a UI change.)

## Storybook E2E Testing

None — no interactive UI components added or modified.

## Web-Shell E2E Testing

None — no extension workflow changes. backlog-navigator is a standalone SPA
with no VS Code extension surface.

## Complexity Tracking

No constitutional violations to track. The migration is a strict
simplification of this repo (one fewer app, three fewer dedicated workflows,
one fewer root devDep — `@lhci/cli`) and a clean spin-out of the new repo
with no inherited complexity. Two design decisions explicitly *added*
scope vs #248 — per-PR preview workflows (R-004) and inlined-copy of
`useIsMobile` (R-007) — both are justified by lessons learned (#248
Lesson 8) and by the workspace dep that didn't exist in #248. Neither
introduces a new abstraction; both are mechanical additions to the kit.

## Post-Design Constitution Re-Check

Re-evaluated after Phase 0 (research.md) and Phase 1 (data-model.md,
contracts/hosted-url.md, contracts/ci-surface.md, quickstart.md). No new
violations introduced by design choices:

- **R-002** (defaults via existing module + new `defaults.ts`) keeps the
  existing typed seams authoritative; no new boundary, no new validator
  (Article XV). FR-010's `packageManager` field is a `package.json`
  metadata addition with no semantic side effects.
- **R-003** (gh-pages branch + JamesIves deploy action) does not introduce
  any new runtime dependency in the SPA itself; the deploy mechanism is a
  CI concern (Article I — no impact on offline behaviour of loaded sessions;
  Article IX — no runtime dep change).
- **R-004 / R-005** (per-PR preview workflows + bundled dummy dataset) are
  pure additions to the kit; they do not introduce new SPA code paths or
  runtime dependencies.
- **R-006** (in-process Playwright route mock only; drop patch 03)
  honours Article IX (minimal deps) and Article I (offline-by-default
  contributor experience).
- **R-007** (inline-copy `useIsMobile`) adds one small file to the SPA but
  *removes* a workspace dependency on the monorepo, which is a net
  simplification post-extraction. The hook surface is unchanged; the
  Zod-validated typed surface is unchanged.
- **R-008** (Lighthouse carried) preserves ADR-030's PWA budget commitment
  in the new repo (Article I — offline PWA).
- **R-009, R-011, R-012** (kit revisions: destination flag, GitHub App
  prereq, drop-in templates) reduce operator friction without affecting
  the SPA's design.
- **R-010** (lockfile regen) is a kit concern; does not affect the SPA.
- **R-013** (cutover) is a structural delete + a single CI-config edit;
  no new constitutional surface.
- **R-014** (legacy `?pr=` shim) keeps Article X (no credentials in URL)
  and Article V (extensibility — third-party consumers via `?repo=&branch=`).
- **R-015** (`live.yml` deferred / optional) is consistent with FR-019
  and Article IX (minimal deps).

Gate result: ✅ PASS (re-confirmed). Plan is ready for `/speckit.tasks`.
