# Implementation Plan: Extract spec-navigator into a Standalone Repository

**Branch**: `claude/bold-noether-wWKle` (active feature: `248-extract-spec-navigator`) | **Date**: 2026-05-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/248-extract-spec-navigator/spec.md`

## Summary

Extract `apps/spec-navigator/` from the debrief-future monorepo into a standalone GitHub repository (`debrief/spec-navigator`) so the app can be reused by any project that follows speckit conventions. The work is sequenced in three phases:

1. **Phase 1 (this repo)** — replace the handful of hardcoded debrief literals by threading defaults through the existing `useFeature.ts` `ApiOptions` seam and parameterising the three vendor strings in `strings.ts`. No new configuration entity, no new module under `src/config/`, no JSON Schema, no Zod boundary — the existing seams already exist; the work is to use them. Today's user experience is preserved byte-for-byte under the default values.
2. **Phase 2 (new repo)** — perform a history-preserving `git subtree split` to lift the app into its own repository, stand up CI (lint/typecheck/Vitest/Playwright with bundled fixtures by default + opt-in `LIVE_GITHUB=1` mode), and publish to GitHub Pages. The hosted SPA accepts **both** URL contracts: legacy `?pr=<n>` (the shape `spec-navigator-comment.yml` has always emitted) and new `?repo=<org>/<name>&branch=<branch>` (added for non-debrief consumers). The legacy shape resolves through the existing PR-to-branch flow.
3. **Phase 3 (this repo)** — delete `apps/spec-navigator/` and its three dedicated workflows (`spec-navigator-preview.yml`, `spec-navigator-publish.yml`); update `spec-navigator-comment.yml` to point at the hosted GitHub Pages URL while continuing to emit `?pr=<n>` (the comment template can be flipped to `?repo=&branch=` independently, later); remove spec-navigator references from `ci.yml`; record an ADR. Note: `heroku.yml`, `app.json`, and `Dockerfile.preview` contain **no** spec-navigator references today (verified) and are not touched. There are **no** spec-navigator-only root devDeps to drop (verified — every root devDep is shared with at least one other workspace).

The resolved decisions from `/speckit.clarify`: GitHub Pages hosting (FR-015), bundled fixtures by default with opt-in live mode behind a PAT (FR-017). FR-016 (`specFormatVersion`) is **deferred** — re-introduced when a second consumer materialises (see backlog #255).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, per Article XV), React 18.x — unchanged from current `apps/spec-navigator/`
**Primary Dependencies**: Vite 5.x (build), `react-markdown` + `remark-gfm` + `rehype-slug` + `rehype-autolink-headings` + `rehype-highlight` + `highlight.js` (artefact rendering), Zod ^3.22.0 (GitHub REST boundary — existing usage, unchanged), `ulid` (existing — IDs); no new runtime deps introduced by the extraction
**Storage**: `localStorage` for the PAT envelope (existing pattern, unchanged). No persistence of debrief domain data; this is a viewer SPA
**Testing**: Vitest (unit), Playwright ^1.58.0 + `@axe-core/playwright` (E2E + a11y), `@sparticuz/chromium` (bundled Chromium for cloud sessions)
**Target Platform**: Static SPA on modern evergreen browsers (Chromium, Firefox, Safari current); deployed to GitHub Pages. Note: ADR-030 (vite-plugin-pwa) is owned by the **Backlog Navigator** (#244), not spec-navigator; spec-navigator carries no PWA commitment
**Project Type**: Web (static SPA) — but the *feature* is a cross-repository migration, so the structure section below documents both the current (this repo) and target (new repo) layouts
**Performance Goals**: No regression from current spec-navigator baseline
**Constraints**: GitHub anonymous-mode rate-limit aware (60 req/hr unauth, 5000 req/hr authenticated); a contributor with no debrief-issued credentials must produce a green local test run
**Scale/Scope**: Single static SPA, ~3–4k LOC. Migration touches ~3 production files + 3 dedicated GitHub Actions workflows + 1 shared workflow (`ci.yml`) + a small set of docs in this repo, plus complete CI/hosting setup in the new repo

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Applies? | Status | Notes |
|---|---|---|---|
| I. Defence-Grade Reliability | Yes | ✅ Pass | Offline behaviour preserved by carrying ADR-030 (vite-plugin-pwa) into the new repo. No new cloud dependency in core path; GitHub Pages is the *delivery* surface, not a runtime dependency for already-loaded sessions. |
| II. Schema Integrity | Yes | ✅ Pass | No new LinkML schemas. No new application-config schema either — defaults are passed as values through the existing typed `ApiOptions` seam in `useFeature.ts`; no JSON Schema or Zod boundary added (decision 2A). |
| III. Data Sovereignty | Yes | ✅ Pass | No telemetry added; PAT stays in `localStorage`; no provenance changes (the app is a viewer, not a transformer). |
| IV. Architectural Boundaries | Yes | ✅ Pass | spec-navigator is a frontend; it persists only the existing PAT envelope via the existing pattern. No new write paths introduced. The configuration seam is read-only at runtime. |
| V. Extensibility | Yes | ✅ Pass | Extensibility is provided by the existing `ApiOptions` defaults plus the URL-query-string consumer-selection model. `specFormatVersion` is deferred (decision 3A) — re-introduced when a second consumer's format diverges (backlog #255). |
| VI. Testing | Yes | ✅ Pass | All FRs have acceptance scenarios. New repo CI covers lint/typecheck/Vitest/Playwright with bundled fixtures (default) and opt-in live mode. |
| VII. Test-Driven AI Collaboration | Yes | ✅ Pass | Acceptance scenarios in spec are executable tests; `requirements.md` checklist is the spec-quality gate. |
| VIII. Documentation | Yes | ✅ Pass | Spec exists; ADR-031 (extraction) to be created (FR-023); new repo README required (FR-014). |
| IX. Dependencies | Yes | ✅ Pass | Root `devDependencies` are unchanged (verified — no entry is spec-navigator-only; every root devDep is shared with at least one other workspace). New repo introduces no runtime deps beyond what's already in `apps/spec-navigator/package.json`. |
| X. Security | Yes | ✅ Pass | PAT secret explicitly out of code; new-repo CI uses GitHub Actions secrets with read-only public scopes; no debrief-issued credential needed for local contributor builds (FR-013, FR-017). |
| XI. Internationalisation | Partial | ✅ Pass | No new user-facing strings introduced. Existing strings move with the source unchanged; externalisation surface is preserved. |
| XII. Community Engagement | Yes | ✅ Pass | New repo is public; supports the reuse goal. |
| XIII. Contribution Standards | Yes | ✅ Pass | Each phase lands as a separate atomic PR; CI gates apply in both repos. |
| XIV. Pre-Release Freedom | Yes | ✅ Pass | Pre-v4.0.0 — extraction is a permitted breaking change to repo layout. |
| XV. Strict Type Safety | Yes | ✅ Pass | TypeScript strict mode already enabled in `apps/spec-navigator/tsconfig.json` and carried forward. The existing `ApiOptions` type stays the boundary; URL-query-string parsing returns a typed object validated by the boundary parser already in place. No new untyped surface introduced. |

**Gate result**: ✅ PASS — no violations to track in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/248-extract-spec-navigator/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (Configuration defaults, URL contract)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── hosted-url.md               # Query-string contract for the hosted instance (legacy ?pr= + new ?repo=&branch=)
│   └── ci-surface.md               # New-repo CI inputs/outputs/secrets
├── checklists/
│   └── requirements.md  # Spec-quality checklist (already complete)
└── evidence/
    └── opening-context.md  # Cached opener for the eventual blog post
```

### Source Code

This is a cross-repository migration. The before/after picture:

```text
# === debrief-future (this repo) ===

# Before Phase 1 — current state:
apps/spec-navigator/
├── src/                         # ~3 production files contain debrief literals (useFeature.ts ApiOptions defaults + strings.ts vendor strings)
├── e2e/                         # Playwright suite assumes debrief specs as fixtures
├── public/
└── package.json                 # No workspace deps; clean for extraction

.github/workflows/               # 3 dedicated (spec-navigator-{preview,publish,comment}.yml) + 1 shared (ci.yml — 2 refs)
heroku.yml, app.json,            # NO spec-navigator references (verified). Untouched.
Dockerfile.preview               # NO spec-navigator references (verified). Untouched.
CLAUDE.md                        # "Before Pushing" Step 4 includes spec-navigator Playwright

# After Phase 1 (still in this repo):
apps/spec-navigator/
├── src/
│   ├── api/useFeature.ts        # ApiOptions defaults parameterised through existing seam (was hardcoded)
│   ├── strings.ts               # 3 vendor strings parameterised (was hardcoded)
│   └── ...                      # No new modules. No src/config/ directory.
└── ...

# After Phase 3 (cutover):
# apps/spec-navigator/ deleted entirely
# .github/workflows/spec-navigator-preview.yml — deleted
# .github/workflows/spec-navigator-publish.yml — deleted
# .github/workflows/spec-navigator-comment.yml — kept; URL points at hosted instance (still emits ?pr=<n>)
# .github/workflows/ci.yml — spec-navigator references removed (2 occurrences)
# heroku.yml, app.json, Dockerfile.preview — UNCHANGED (no references existed)
# package.json (root) — UNCHANGED (no spec-navigator-only devDeps existed)
# CLAUDE.md — Step 4 trimmed; review-app comment template note updated
# docs/project_notes/decisions.md — ADR-031 added (extraction)

# === debrief/spec-navigator (new repo, created in Phase 2) ===
spec-navigator/
├── src/                         # Subtree-split from apps/spec-navigator/src/
├── e2e/                         # Subtree-split + bundled fixtures added
│   ├── fixtures/                # NEW: HTTP-recorded GitHub responses for default mode
│   └── ...
├── public/
├── .github/workflows/
│   ├── ci.yml                   # NEW: lint + typecheck + vitest + playwright (bundled fixtures)
│   ├── live.yml                 # NEW: nightly + on-main live-GitHub mode (LIVE_GITHUB=1, secret PAT)
│   └── deploy.yml               # NEW: build + publish to GitHub Pages on merge-to-main
├── README.md                    # NEW: configuration, deployment, contribution
├── CONFIGURATION.md             # NEW: how adopters configure for their repo (ApiOptions defaults + URL params)
└── package.json                 # Same deps as apps/spec-navigator/package.json (no @debrief/* deps to begin with)
```

**Structure Decision**: Two-repo target layout. This repo retains its monorepo shape minus `apps/spec-navigator/`; the new repo is a single-package static SPA. Phase 1's only structural change is parameterising the existing `ApiOptions` defaults and `strings.ts` constants — no new module boundaries. Those edits survive the subtree split intact.

## Media Components

None — backend/infrastructure feature. The migration explicitly preserves the existing UI unchanged (FR-024); no new components, no story changes, nothing visually demonstrable beyond "the same app, hosted elsewhere."

## Storybook E2E Testing

None — no interactive UI components added or modified.

## Web-Shell E2E Testing

None — no extension workflow changes. spec-navigator is a standalone SPA with no VS Code extension surface.

## Complexity Tracking

No constitutional violations to track. The migration is a strict simplification of this repo (one fewer app, three fewer dedicated workflows) and a clean spin-out of the new repo with no inherited complexity. Decision 2A explicitly rejected the proposed `Configuration` entity / `src/config/` module / JSON Schema / Zod boundary in favour of using the seams that already exist.

## Post-Design Constitution Re-Check

Re-evaluated after Phase 0 (research.md) and Phase 1 (data-model.md, contracts/, quickstart.md). No new violations introduced by design choices:

- The defaults-through-`ApiOptions` approach (R-002) keeps the existing typed seam authoritative; no new boundary, no new validator (Article XV).
- The query-string URL contract (R-003, contracts/hosted-url.md) explicitly forbids credentials in the URL and accepts both legacy `?pr=` and new `?repo=&branch=` forms (decision 1A), honouring Article X.
- The bundled-fixture E2E pattern (R-004) honours Article I (offline-by-default contributor experience).
- `specFormatVersion` is deferred (decision 3A); when re-introduced in a future spec, Article II review applies then.
- No new runtime dependencies introduced anywhere; root devDeps surface unchanged (Article IX).

Gate result: ✅ PASS (re-confirmed). Plan is ready for `/speckit.tasks`.
