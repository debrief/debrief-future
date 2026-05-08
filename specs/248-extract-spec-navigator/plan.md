# Implementation Plan: Extract spec-navigator into a Standalone Repository

**Branch**: `claude/bold-noether-wWKle` (active feature: `248-extract-spec-navigator`) | **Date**: 2026-05-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/248-extract-spec-navigator/spec.md`

## Summary

Extract `apps/spec-navigator/` from the debrief-future monorepo into a standalone GitHub repository (`debrief/spec-navigator`) so the app can be reused by any project that follows speckit conventions. The work is sequenced in three phases:

1. **Phase 1 (this repo)** — introduce a configuration seam that replaces every hardcoded debrief literal with a value read from a single config object, while preserving today's user experience under the default configuration.
2. **Phase 2 (new repo)** — perform a history-preserving `git subtree split` to lift the app into its own repository, stand up CI (lint/typecheck/Vitest/Playwright with bundled fixtures by default + opt-in `LIVE_GITHUB=1` mode), and publish to GitHub Pages with target-repo selection via URL query string.
3. **Phase 3 (this repo)** — delete `apps/spec-navigator/`, point the Heroku review-app comment at the hosted GitHub Pages URL with a `?repo=...&branch=...` query string, drop the spec-navigator-only root devDeps and Playwright step, and record an ADR.

The resolved decisions from `/speckit.clarify`: GitHub Pages hosting (FR-015), SemVer'd consumer-declared `specFormatVersion` field (FR-016), bundled fixtures by default with opt-in live mode behind a PAT (FR-017).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, per Article XV), React 18.x — unchanged from current `apps/spec-navigator/`
**Primary Dependencies**: Vite 5.x (build), `react-markdown` + `remark-gfm` + `rehype-slug` + `rehype-autolink-headings` + `rehype-highlight` + `highlight.js` (artefact rendering), Zod ^3.22.0 (GitHub REST boundary + config validation), `ulid` (existing — IDs); no new runtime deps introduced by the extraction
**Storage**: `localStorage` for the PAT envelope (existing pattern, unchanged). No persistence of debrief domain data; this is a viewer SPA
**Testing**: Vitest (unit), Playwright ^1.58.0 + `@axe-core/playwright` (E2E + a11y), `@sparticuz/chromium` (bundled Chromium for cloud sessions)
**Target Platform**: Static SPA on modern evergreen browsers (Chromium, Firefox, Safari current); deployed to GitHub Pages; service worker per ADR-030 for offline behaviour
**Project Type**: Web (static SPA) — but the *feature* is a cross-repository migration, so the structure section below documents both the current (this repo) and target (new repo) layouts
**Performance Goals**: No regression from current spec-navigator baseline. Existing Lighthouse PWA budget continues to be honoured by the new repo's CI (ADR-030 commitment carries over)
**Constraints**: Offline-first via service worker; GitHub anonymous-mode rate-limit aware (60 req/hr unauth, 5000 req/hr authenticated); a contributor with no debrief-issued credentials must produce a green local test run
**Scale/Scope**: Single static SPA, ~3–4k LOC. Migration touches ~7 hardcoded literals + 4 GitHub Actions workflows + 5 docs/config files in this repo, plus complete CI/hosting setup in the new repo

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Applies? | Status | Notes |
|---|---|---|---|
| I. Defence-Grade Reliability | Yes | ✅ Pass | Offline behaviour preserved by carrying ADR-030 (vite-plugin-pwa) into the new repo. No new cloud dependency in core path; GitHub Pages is the *delivery* surface, not a runtime dependency for already-loaded sessions. |
| II. Schema Integrity | Partial | ✅ Pass | No new LinkML schemas. The `Configuration` and `specFormatVersion` artefacts are application-config concerns, not domain schemas. JSON Schema for the configuration is hand-authored under `/contracts/` and validated via Zod at the boundary (Article XV.5). |
| III. Data Sovereignty | Yes | ✅ Pass | No telemetry added; PAT stays in `localStorage`; no provenance changes (the app is a viewer, not a transformer). |
| IV. Architectural Boundaries | Yes | ✅ Pass | spec-navigator is a frontend; it persists only the existing PAT envelope via the existing pattern. No new write paths introduced. The configuration seam is read-only at runtime. |
| V. Extensibility | Yes | ✅ Pass | The configuration seam IS the extensibility mechanism: any speckit-conformant repository can be a consumer. SemVer'd `specFormatVersion` provides the compatibility contract. |
| VI. Testing | Yes | ✅ Pass | All FRs have acceptance scenarios. New repo CI covers lint/typecheck/Vitest/Playwright with bundled fixtures (default) and opt-in live mode. |
| VII. Test-Driven AI Collaboration | Yes | ✅ Pass | Acceptance scenarios in spec are executable tests; `requirements.md` checklist is the spec-quality gate. |
| VIII. Documentation | Yes | ✅ Pass | Spec exists; ADR-031 (extraction) to be created (FR-023); new repo README required (FR-014). |
| IX. Dependencies | Yes | ✅ Pass | Net **decrease** in dependencies for this repo (root devDeps used only by spec-navigator removed in Phase 3). New repo introduces no runtime deps beyond what's already in `apps/spec-navigator/package.json`. |
| X. Security | Yes | ✅ Pass | PAT secret explicitly out of code; new-repo CI uses GitHub Actions secrets with read-only public scopes; no debrief-issued credential needed for local contributor builds (FR-013, FR-017). |
| XI. Internationalisation | Partial | ✅ Pass | No new user-facing strings introduced. Existing strings move with the source unchanged; externalisation surface is preserved. |
| XII. Community Engagement | Yes | ✅ Pass | New repo is public; supports the reuse goal. |
| XIII. Contribution Standards | Yes | ✅ Pass | Each phase lands as a separate atomic PR; CI gates apply in both repos. |
| XIV. Pre-Release Freedom | Yes | ✅ Pass | Pre-v4.0.0 — extraction is a permitted breaking change to repo layout. |
| XV. Strict Type Safety | Yes | ✅ Pass | TypeScript strict mode already enabled in `apps/spec-navigator/tsconfig.json` and carried forward. Configuration types are declared explicitly; Zod validates the config at the boundary so no `any` leaks into application code (XV.5). |

**Gate result**: ✅ PASS — no violations to track in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/248-extract-spec-navigator/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (Configuration, SpecFormatVersion, URL contract)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── configuration.schema.json   # Application configuration schema
│   ├── hosted-url.md               # Query-string contract for the hosted instance
│   ├── spec-format-version.md      # Where/how consumers declare their format version
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
├── src/                         # Hardcoded "debrief", "debrief-future" literals scattered (audit: 7 occurrences)
├── e2e/                         # Playwright suite assumes debrief specs as fixtures
├── public/
└── package.json                 # No workspace deps; clean for extraction

.github/workflows/               # 4 workflows reference apps/spec-navigator/ paths/jobs
heroku.yml, app.json             # Reference spec-navigator preview build
CLAUDE.md                        # "Before Pushing" Step 4 includes spec-navigator Playwright

# After Phase 1 (still in this repo):
apps/spec-navigator/
├── src/
│   ├── config/                  # NEW: configuration seam
│   │   ├── schema.ts            # Zod schema for Configuration
│   │   ├── default.ts           # Debrief-default configuration (preserves current behaviour)
│   │   └── load.ts              # Resolution (build-env > query-string > default)
│   └── ...                      # Hardcoded literals replaced by config reads
└── ...

# After Phase 3 (cutover):
# apps/spec-navigator/ deleted entirely
# .github/workflows/*.yml — spec-navigator jobs removed
# heroku.yml, app.json — spec-navigator preview entry removed
# CLAUDE.md — Step 4 trimmed; review-app comment template links to hosted URL
# docs/project_notes/decisions.md — ADR-031 added (extraction)
# package.json (root) — devDeps used only by spec-navigator removed if no other consumer

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
├── .lighthouseci/               # NEW: Lighthouse CI budget (carries over ADR-030 commitment)
├── README.md                    # NEW: configuration, deployment, contribution
├── CONFIGURATION.md             # NEW: how adopters configure for their repo
├── docs/adr/
│   └── 0001-vite-plugin-pwa.md  # Re-stated from debrief-future ADR-030
└── package.json                 # Same deps as apps/spec-navigator/package.json (no @debrief/* deps to begin with)
```

**Structure Decision**: Two-repo target layout. This repo retains its monorepo shape minus `apps/spec-navigator/`; the new repo is a single-package static SPA. The configuration seam (`src/config/`) introduced in Phase 1 is the only structural change to the existing codebase before extraction; it survives the subtree split intact.

## Media Components

None — backend/infrastructure feature. The migration explicitly preserves the existing UI unchanged (FR-024); no new components, no story changes, nothing visually demonstrable beyond "the same app, hosted elsewhere."

## Storybook E2E Testing

None — no interactive UI components added or modified.

## Web-Shell E2E Testing

None — no extension workflow changes. spec-navigator is a standalone SPA with no VS Code extension surface.

## Complexity Tracking

No constitutional violations to track. The migration is a strict simplification of this repo (fewer apps, lighter CI, fewer root devDeps) and a clean spin-out of the new repo with no inherited complexity.

## Post-Design Constitution Re-Check

Re-evaluated after Phase 0 (research.md) and Phase 1 (data-model.md, contracts/, quickstart.md). No new violations introduced by design choices:

- The configuration seam (R-002, R-008) honours Article XV by validating untrusted input through Zod at the boundary; application code consumes a fully-typed `Configuration`.
- The query-string URL contract (R-003, contracts/hosted-url.md) explicitly forbids credentials in the URL, honouring Article X.
- The bundled-fixture E2E pattern (R-004) honours Article I (offline-by-default contributor experience).
- The `specFormatVersion` contract (R-005) is application-level; LinkML domain-schema rules under Article II remain unchanged.
- No new runtime dependencies introduced anywhere; net dependency surface in this repo decreases at Phase 3 (Article IX).

Gate result: ✅ PASS (re-confirmed). Plan is ready for `/speckit.tasks`.
