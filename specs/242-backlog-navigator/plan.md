# Implementation Plan: Backlog Navigator

**Branch**: `242-backlog-navigator` | **Date**: 2026-05-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/242-backlog-navigator/spec.md`

## Summary

A new static SPA at `apps/backlog-navigator/`, mirroring `apps/spec-navigator/`'s deployment shape (Vite + React 18 strict TypeScript, GitHub PAT in `localStorage`, GitHub Pages preview deployments, Playwright + axe E2E), that renders `BACKLOG.md` as a sortable / filterable / group-by-epic interactive table, supports context-sensitive editing of every column with per-edit undo and `localStorage`-staged pending edits, and exposes a deliberate **Push Changes** dialog that synthesises a single commit + PR (or an additional commit on an in-flight PR via `?pr=NNN`). A dry-run mode renders the full dialog without producing GitHub side-effects, enabling per-PR preview deployments to smoke-test the full UX. The feature also lands an additive schema refactor on `BACKLOG.md`: three new columns (`Epic`, `Created`, `Updated`), a one-shot Python backfill of `Created` / `Updated` from git history, and an Epics-table normalisation (every ID `E##`; Status column is the sole completion source; Items count rendered, not maintained).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, per Article XV); Python 3.11 (one-shot backfill script only — no runtime Python).
**Primary Dependencies**: React 18.x, Vite 5.x, Zod ^3.22.0 (GitHub REST boundary validation, mirrors spec-navigator), `react-markdown` + `remark-gfm` (Description cell rendering), `diff` (jsdiff, ^5 — unified-diff synthesis for the raw-diff toggle), `@playwright/test` + `@axe-core/playwright` (E2E + a11y), Vitest (unit). **No new runtime dependencies for table behaviour** — sort/filter/group is implemented in-app over plain `<table>` + `useMemo` (TanStack react-table considered and rejected, see research.md).
**Storage**: Browser `localStorage` for pending edits and PAT (same key namespace conventions as `apps/spec-navigator/src/github/auth.ts`). The source of truth is `BACKLOG.md` in the git repository — read via GitHub Contents API, written via Contents API + Pulls API.
**Testing**: Vitest (unit — markdown table parser, edit synthesis, diff rendering, summary builder), Playwright (E2E — full browse/edit/dry-run round-trip, PR-mode deep link, axe a11y assertions). Cloud-friendly Playwright via `@sparticuz/chromium` (mirrors spec-navigator's `run-playwright.mjs`).
**Target Platform**: Modern evergreen browsers (Chrome 120+, Firefox 120+, Safari 17+). Static-host deploy via the existing GitHub Pages pipeline used by spec-navigator (`spec-navigator-preview.yml` / `spec-navigator-publish.yml` / `spec-navigator-comment.yml` are the mirror templates).
**Project Type**: Web — single-page app, no backend.
**Performance Goals**: First meaningful paint < 1s on the GH-Pages preview URL; sort / filter / group-by re-render < 100ms at 500 items (well above today's ~230). No virtualisation needed at this scale.
**Constraints**: Online-only by design (the navigator is a developer-facing tool that talks to GitHub; this does NOT violate Article I's offline-by-default, which scopes to *core platform analysis functionality* — see Constitution Check). Strict TypeScript, no `any`. No telemetry. PAT redacted from all log paths and error messages (Article X). User-facing strings externalised to a `strings.ts` module (Article XI), matching spec-navigator.
**Scale/Scope**: ~230 backlog items today, planning headroom to ~500. ~12 epics. Ten or fewer pending edits per push session in typical use. Staging payload < 100KB even in pathological cases.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Status | Notes |
|---------|--------|-------|
| **I. Defence-Grade Reliability** | PASS (with explicit scope justification) | The navigator is a developer-facing internal tool that edits a development artefact (`BACKLOG.md`) via GitHub. It is NOT part of the core platform analysis path. The "offline by default" rule applies to features users run on classified/airgapped systems; this navigator runs from a developer's browser with internet access. The platform's core analysis functionality remains offline-capable as before. No silent failures: every push surfaces success (PR URL) or actionable error; staged edits are never silently dropped (FR-024). |
| **II. Schema Integrity** | N/A | `BACKLOG.md` is a markdown table convention, not a domain data model. No LinkML schema is added or modified. |
| **III. Data Sovereignty** | PASS | Provenance: every edit lands as a git commit + PR with attribution to the PAT owner. PAT is local-only (`localStorage`), never transmitted except in `Authorization` headers to api.github.com. No telemetry. No external calls beyond GitHub. |
| **IV. Architectural Boundaries** | PASS | No services involved (no Python service layer to bypass). Frontend talks directly to an external API (GitHub) — same pattern as spec-navigator. There is no domain data here for a service to mediate. |
| **V. Extensibility** | N/A | Internal developer tool, not a user-platform extension surface. |
| **VI. Testing** | PASS | Vitest unit tests for parser, serialiser, edit-application, summary builder, diff rendering. Playwright E2E for browse, edit, dry-run round-trip, PR-mode deep link. axe a11y assertions. CI gates per Article XV. |
| **VII. Test-Driven AI Collaboration** | PASS | All FRs have testable acceptance scenarios; `quickstart.md` provides golden-path verification steps. |
| **VIII. Documentation** | PASS | This plan + spec + research + data-model + contracts + quickstart. README.md in `apps/backlog-navigator/` mirrors spec-navigator's. ADR for the structural decision (mirror of spec-navigator pattern) referenced in research.md. |
| **IX. Dependencies** | PASS | Reuses every dep already in the spec-navigator package.json. ONE new runtime dep: `diff` (jsdiff, ^5) — small, mature, MIT-licensed, single-purpose unified-diff synthesis. ZERO new dev dependencies. TanStack react-table considered and rejected as gold-plating at current scale (see research.md). |
| **X. Security** | PASS | PAT in `localStorage`, `Authorization` headers only, never logged, never interpolated into thrown error strings (mirrors `apps/spec-navigator/src/github/auth.ts`). No secrets in code. The navigator's `repo`-scope warning surfaces missing-scope errors before any write attempt (FR-028). |
| **XI. Internationalisation** | PASS | All user-facing strings live in `src/strings.ts` (mirrors spec-navigator). Date input uses native `<input type="date">` which is locale-aware. Numeric ID input uses native `<input type="number">`. |
| **XII. Community Engagement** | PASS | Per-PR preview-deployment pipeline (FR-032) makes every iteration of the navigator publicly viewable on GH Pages with a PR comment carrying the URL; mirrors spec-navigator's beta-preview pattern. |
| **XIII. Contribution Standards** | PASS | Atomic commits per phase (parser → state → UI → editing → push → dry-run → backfill → preview-deploy). PR review required (no direct commits to `main`). CI green before merge. |
| **XIV. Pre-Release Freedom** | N/A — leveraged | Pre-v4.0.0; the schema refactor of `BACKLOG.md` (additive columns + Epics normalisation) takes advantage of this. |
| **XV. Strict Type Safety** | PASS | `tsconfig.json` enables `strict: true` (mirrors spec-navigator). Zero `any` in production code. Zod validates the GitHub REST boundary. The markdown-table parser narrows to a typed `BacklogDocument` model immediately at the boundary. CI runs `pnpm --filter @debrief/backlog-navigator typecheck`. |

**Gate result**: All articles pass. No violations require justification in Complexity Tracking. Article I is the only article requiring an explicit scope clarification (developer-tool vs. core-platform), and that clarification is documented above.

## Project Structure

### Documentation (this feature)

```text
specs/242-backlog-navigator/
├── plan.md                                # This file
├── spec.md                                # Feature specification
├── research.md                            # Phase 0 — open questions resolved
├── data-model.md                          # Phase 1 — entity model + state shape
├── contracts/                             # Phase 1
│   ├── github-api.md                      # GitHub REST endpoints used
│   ├── localstorage-schema.md             # localStorage key + JSON shape contract
│   └── backlog-md-format.md               # Markdown table format contract (post-refactor)
├── quickstart.md                          # Phase 1 — how to run + manual verify
├── checklists/
│   └── requirements.md                    # Spec quality checklist (already passing)
└── evidence/                              # Captured during /speckit.implement
    └── opening-context.md                 # Phase 2 — cached blog opener
```

### Source Code (repository root)

```text
apps/
└── backlog-navigator/                     # NEW — mirrors apps/spec-navigator/ shape
    ├── README.md
    ├── e2e/                               # Playwright tests
    │   ├── browse.spec.ts                 # Story 1: sort, filter, group-by, expand
    │   ├── edit.spec.ts                   # Story 2: per-column edit controls + staging
    │   ├── push-dryrun.spec.ts            # Story 2 + FR-029..031 dry-run round-trip
    │   ├── pr-mode.spec.ts                # Story 3: ?pr=NNN deep link
    │   └── a11y.spec.ts                   # axe-core assertions on each main view
    ├── index.html
    ├── package.json
    ├── playwright.config.ts
    ├── run-playwright.mjs                 # Cloud-friendly Playwright via @sparticuz/chromium
    ├── src/
    │   ├── App.tsx                        # Top-level shell, mode detection (live / pr / dry-run)
    │   ├── main.tsx
    │   ├── strings.ts                     # i18n-ready user-facing strings (Article XI)
    │   ├── types.ts                       # Branded ID types, status enum, edit shape
    │   ├── parser/
    │   │   ├── parseBacklog.ts            # BACKLOG.md → BacklogDocument (typed model)
    │   │   ├── serializeBacklog.ts        # BacklogDocument → BACKLOG.md (round-trip stable)
    │   │   └── __tests__/
    │   │       ├── parseBacklog.test.ts   # Golden-fixture round-trip tests
    │   │       └── fixtures/              # Snapshots of real BACKLOG.md rows
    │   ├── state/
    │   │   ├── store.ts                   # React-context store: doc, pending edits, view state
    │   │   ├── pendingEdits.ts            # Edit application + per-edit undo
    │   │   ├── persistence.ts             # localStorage read/write + size-cap warning
    │   │   └── __tests__/
    │   ├── github/
    │   │   ├── auth.ts                    # PAT get/set/clear (mirrors spec-navigator)
    │   │   ├── api.ts                     # Read file, get PR, create branch, commit, open PR
    │   │   ├── schemas.ts                 # Zod schemas for REST responses
    │   │   └── __tests__/
    │   ├── format/
    │   │   ├── diff.ts                    # Unified-diff synthesis via jsdiff
    │   │   ├── summary.ts                 # Structured edit summary ("3 status changes…")
    │   │   └── __tests__/
    │   ├── components/
    │   │   ├── ItemsTable.tsx             # Sortable/filterable/groupable table shell
    │   │   ├── ItemRow.tsx                # Single row + per-cell edit dispatch
    │   │   ├── DescriptionCell.tsx        # Markdown render + truncate/expand chevron
    │   │   ├── EpicGroupHeader.tsx        # done/total + progress bar for group-by view
    │   │   ├── FilterBar.tsx              # Free-text + structured-filter dropdowns
    │   │   ├── SortControls.tsx           # Column-header sort toggles
    │   │   ├── editors/                   # Context-sensitive edit controls
    │   │   │   ├── StatusDropdown.tsx
    │   │   │   ├── ScorePicker.tsx        # 1/3/5
    │   │   │   ├── ComplexityDropdown.tsx
    │   │   │   ├── EpicPicker.tsx
    │   │   │   ├── CategoryComboBox.tsx
    │   │   │   ├── DateInput.tsx
    │   │   │   ├── DescriptionTextarea.tsx
    │   │   │   └── IdInput.tsx            # With collision warning
    │   │   ├── PendingFooter.tsx          # "N pending edits → Push Changes"
    │   │   ├── PushDialog.tsx             # Title, body, summary, raw-diff toggle, confirm
    │   │   ├── PRModeBanner.tsx           # ?pr=NNN indicator
    │   │   └── DryRunBanner.tsx           # Preview-mode indicator (FR-030)
    │   └── styles/
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    └── vitest.config.ts

scripts/
└── backfill-backlog-dates.py              # NEW — one-shot Created/Updated derivation
                                           # from git log; written and run once during refactor.

.github/workflows/                         # NEW workflows mirror spec-navigator-*
├── backlog-navigator-preview.yml          # Per-PR GH Pages deploy (dry-run mode default)
├── backlog-navigator-comment.yml          # Auto-comments PR with preview URL
└── backlog-navigator-publish.yml          # Main-branch deploy to /backlog-navigator/

BACKLOG.md                                  # MODIFIED — additive columns + Epics normalisation
```

**Structure Decision**: Mirror `apps/spec-navigator/`'s entire layout. The two apps are siblings — same toolchain, same auth pattern, same deployment pipeline, same testing setup. Differences are scoped to the additional editing + staging + push surfaces, plus the markdown-table parser/serialiser. The Heroku Review Apps pipeline (code-server preview) is NOT touched; this app rides the GitHub-Pages preview pipeline established for spec-navigator (per the existing `spec-navigator-preview.yml` precedent — see research.md §4 for the corrected understanding of "preview deployments" in this repo).

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|

**Inclusion Criteria Applied**:
- [ ] New visual component
- [ ] Significant visual change
- [ ] Interactive demo adds narrative value

**Bundleability Verified**:
- [ ] Stories exist in Storybook
- [ ] Components render standalone (no app context required)
- [ ] Reasonable bundle size expected (< 500KB)

None — `apps/backlog-navigator/` is a standalone SPA, not a library of `shared/components/` Storybook stories. The navigator's own components are app-internal. The richest demo of the feature *is* the per-PR preview deployment URL itself (FR-032), which the blog post can link to for an interactive smoke test against the version of `BACKLOG.md` in that PR.

## Storybook E2E Testing

None — no Storybook stories. Component-level interaction tests live in the app's own Vitest suite; full-flow tests live in `apps/backlog-navigator/e2e/` and are run via `node run-playwright.mjs` (cloud) or `pnpm --filter @debrief/backlog-navigator test:e2e` (local).

## Web-Shell E2E Testing

None — the navigator does not touch the web-shell, the VS Code extension, or any maritime-analysis workflow. All E2E tests live in `apps/backlog-navigator/e2e/`.

## Complexity Tracking

No constitutional violations require justification. The plan uses zero new abstraction layers beyond what spec-navigator already established as the project pattern.
