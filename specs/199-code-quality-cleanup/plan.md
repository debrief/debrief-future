# Implementation Plan: Code-Quality Cleanup — Small-Bucket Consolidation

**Branch**: `199-code-quality-cleanup` | **Date**: 2026-04-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/199-code-quality-cleanup/spec.md`

## Summary

Ship five low-risk code-quality follow-ups from the PR #465 review as a single bundled PR: (a) document residual VS Code view↔service type-only cycles in `decisions.md`, (b) collapse `LogTimelineProps` + `LogByFeatureProps` onto the existing `LogPanelProps`, (c) delete the orphaned `shared/components/diff/` sub-package, (d) add a minimal `knip.json` at the repo root that ignores `specs/**` **plus pin `knip` as a root devDependency so the report is reproducible**, (e) resolve the `plotName` placeholder in `apps/loader/src/renderer/hooks/useLoadWorkflow.ts` by looking up the display name from the already-fetched plot list **and add a vitest that fails if this regresses**, plus promote the three surviving non-speckit TODOs to GitHub issues **with a pre-push guard that forbids shipping literal `TODO(#NNN)` placeholder strings**. No runtime behaviour changes, no schema edits, no Python edits, no cross-package API changes beyond the LogPanel prop-type rename.

**Post-review amendments (2026-04-18)**: `/speckit.review` surfaced three silent-failure risks (knip version drift, TODO-placeholder shipping, plotName regression). All three are pulled in-scope as FR-019 / FR-020 / FR-021; no deferred BACKLOG items.

## Technical Context

**Language/Version**: TypeScript 5.x (existing monorepo — no new languages, no Python edits)
**Primary Dependencies**: pnpm workspace, `@debrief/components` (LogPanel), `knip` (introduced via `pnpm dlx`), existing ESLint / pyright / ruff toolchain (unchanged)
**Storage**: N/A — no runtime data touched
**Testing**: vitest (`@debrief/components` LogPanel stories + unit tests), Playwright E2E (`web-shell`, `spec-navigator`), pyright + pytest (must continue to pass after the refactor — no Python files touched here)
**Target Platform**: Cross-platform (Linux, macOS, Windows) — existing monorepo, no platform-specific changes
**Project Type**: Monorepo cleanup — modifies files across `shared/components/`, `apps/loader/`, `apps/vscode/`, `docs/`, and repo root
**Performance Goals**: N/A — cleanup has no runtime component
**Constraints**: `task verify` must pass with no new failures; no changes to generated schema output; the LogPanel prop-type rename is the only public API-surface change and must be mirrored in every in-repo consumer
**Scale/Scope**: ~17–28 files modified after post-review amendments: 4 LogPanel files, 1 useLoadWorkflow hook, **1 new `apps/loader/tests/unit/useLoadWorkflow.test.ts` vitest file**, 1 decisions.md entry, 1 new `knip.json`, **root `package.json` (add pinned knip devDep)**, 1 deleted sub-package tree, 3 TODO replacements. Two new GitHub issues filed (third already tracked as `#137`). Expected diff stat: still well under 500 lines net.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---|---|---|---|
| II. Schema Integrity | Single source of truth | **PASS** | No schema changes. LogPanel prop merge collapses two drifted internal types onto one canonical interface — supports the principle. |
| IV. Architectural Boundaries | Services never touch UI | **PASS** | Documents (not eliminates) accepted type-only cycles inside the VS Code extension frontend; no service↔UI line is crossed. |
| VI. Testing | CI MUST pass | **PASS** | Full `task verify` (lint + typecheck + unit + Playwright) required before merge. LogPanel rename verified by existing vitest + Storybook stories. |
| VIII. Documentation | Architecture decisions recorded | **PASS** | New `decisions.md` entry directly strengthens the principle by recording the accepted-cycle trade-off. |
| XIII. Contribution Standards | Atomic commits, CI green | **PASS** | Bundle is five small, independently-verifiable sub-changes delivered in one PR — size justified by Complexity Tracking below. |
| XV. Strict Type Safety | Explicit types everywhere | **PASS** | No introduction of `any`/`Any`. LogPanel consumers switch from two near-identical interfaces to one fully-typed `LogPanelProps`. |
| I. Defence-Grade Reliability | Reproducibility (I.4), No silent failures (I.3) | **PASS** (post-review) | FR-019 (pin knip) closes the reproducibility gap; FR-020 (pre-push grep) + FR-021 (vitest for plotName) close the two silent-failure gaps surfaced by `/speckit.review`. |
| IX. Dependencies | Pinned versions | **PASS** (post-review) | FR-019 adds `knip` as a pinned root devDependency; no un-pinned `pnpm dlx knip@latest` invocation survives in the shipped config. |

**Post-Phase 1 Re-check**: All gates remain PASS. No constitutional deviations; see Complexity Tracking for the single non-issue (bundled-PR size) that is explicitly sanctioned by the source idea and BACKLOG.md #199. The `/speckit.review` pass (2026-04-18) added three in-scope guard rails (FR-019/020/021) that strengthen Articles I.3, I.4, VI, and IX.

## Project Structure

### Documentation (this feature)

```text
specs/199-code-quality-cleanup/
├── plan.md              # This file
├── research.md          # Phase 0 output — decisions on knip config shape, LogPanelProps canonical location, TODO-to-issue process, cycle-entry format
├── data-model.md        # Phase 1 output — the single "entity" is the decisions.md record shape + the consolidated LogPanelProps fields (already exists)
├── quickstart.md        # Phase 1 output — reproducible verification steps (knip diff, LogPanel rename grep, diff/ removal, plotName e2e, TODO audit)
├── contracts/
│   └── README.md        # Phase 1 output — exact file-level contracts for each of the five sub-changes
├── checklists/
│   └── requirements.md  # Specification quality checklist (already present from /speckit.specify)
└── media/
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

This feature modifies existing files and deletes one sub-package. No new production directories are created. Key modification targets:

```text
# Documentation
docs/project_notes/decisions.md                     # Add ADR-019 (or next free ADR number) — type-only cycles accepted

# LogPanel prop consolidation (@debrief/components)
shared/components/src/LogPanel/types.ts             # Remove LogTimelineProps + LogByFeatureProps; keep LogPanelProps as canonical
shared/components/src/LogPanel/LogTimeline.tsx      # import { LogPanelProps } — update two references
shared/components/src/LogPanel/LogByFeature.tsx     # import { LogPanelProps } — update two references
shared/components/src/LogPanel/index.ts             # Remove two exports
shared/components/src/index.ts                      # Remove two re-exports

# diff/ sub-package removal
shared/components/diff/                             # DELETE entire directory (package.json, src/, tests/, tsconfig.json, vitest.config.ts)

# knip configuration (new file at repo root)
knip.json                                           # NEW — minimal config with `"ignore": ["specs/**"]`

# Loader plot-name fix
apps/loader/src/renderer/hooks/useLoadWorkflow.ts   # Resolve plotName from plot list instead of using existingPlotId placeholder
apps/loader/tests/unit/useLoadWorkflow.test.ts      # NEW — vitest asserting plotName === display name for existing-plot branch (FR-021)

# In-source TODO → GitHub issue references
apps/loader/src/main/ipc/config.ts                                  # Line 158 — replace TODO with TODO(#NNN)
apps/loader/src/renderer/components/StoreSelector/index.tsx         # Line 4 — replace TODO with TODO(#NNN)
apps/vscode/src/services/stacService.ts                             # Line ~1119 — already tagged TODO(#137) (no work needed — just audit)

# Reproducibility guard (post-review)
package.json                                                        # Add `knip` pinned entry to devDependencies (FR-019)
```

**Structure Decision**: No new project structure. All five sub-changes target existing locations. The only new file at repo root is `knip.json`; the only deleted tree is `shared/components/diff/`. All other changes are edits to existing files.

## Media Components

None — backend/infrastructure cleanup feature. The only UI-adjacent change (LogPanel prop rename) is invisible to users and is covered by existing LogPanel Storybook stories — no new stories are created.

## Storybook E2E Testing

None - no interactive UI components created or modified beyond the prop-type rename, which is verified by existing LogPanel vitest unit tests and existing Storybook stories (the rename must leave all of them passing without story-file changes beyond the type import).

## VS Code Webview E2E Testing

None - no extension workflow changes. The existing VS Code E2E suite must continue to pass after the refactor (verified by `task verify`). The `decisions.md` cycle entry is a documentation-only change with no runtime footprint.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Bundled PR (5 independent sub-changes) | BACKLOG.md #199 explicitly sanctions this bundling: each sub-change is too small to justify a dedicated spec/PR and they share the same profile (pure TS/doc/config edits, independent footprints). Shipping one PR keeps reviewer overhead low. | Five separate PRs would triple CI minutes and reviewer context-switch cost for unchanged total risk. Two PRs (LogPanel-rename + everything-else) would lose the "one clean-up PR" narrative the backlog item is built around. |
