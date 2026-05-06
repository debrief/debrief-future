# Implementation Plan: `@debrief/hooks` Workspace Package Extraction

**Branch**: `246-hooks-workspace-package` | **Date**: 2026-05-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/246-hooks-workspace-package/spec.md`

## Summary

Lift UI-agnostic React hooks (today: only `useIsMobile`) out of `@debrief/components` into a new dependency-light pnpm workspace package, `@debrief/hooks`, located at `shared/hooks/`. The new package declares React as its only runtime peer dependency and pulls **zero** Debrief workspace packages or heavy UI libraries (Leaflet, Vega, react-leaflet, MapView/FilterBar/FeatureList component trees). The two existing in-monorepo consumers — `apps/web-shell` and `apps/backlog-navigator` — are rewired to import from `@debrief/hooks`. `@debrief/components` keeps a one-release-cycle deprecation shim that re-exports `useIsMobile` from the new package, so any out-of-monorepo consumer (none known today) is not surprised. The package's README codifies the inclusion/exclusion rule: "UI-agnostic, dependency-light React hooks; no Debrief-component imports; works in SSR / jsdom" — making the boundary defensible for future contributors and future hooks (`useReducedMotion`, `useOnlineStatus`, `useFocusVisible`).

The package is modelled on `@debrief/utils`: pure-`tsc` build (no Vite needed), Vitest with jsdom for tests, no Storybook, no Playwright. That keeps the new package's devDependency surface minimal — exactly the point of having it exist.

**Trigger gate**: This work is explicitly trigger-gated by FR-012 / Assumption A-001 in the spec — implementation should only proceed when a third in-monorepo consumer (e.g. `spec-navigator` going mobile, `apps/loader`) is in flight, **or** a second framework-agnostic hook needs a home. The plan assumes the trigger has fired; if `/speckit.tasks` runs and no third consumer is identified, the recommendation is to defer rather than execute speculatively.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, per Article XV); React 18.x peer dependency.
**Primary Dependencies**: React 18.x (peer only). devDeps: `typescript ^5.3.0`, `vitest ^1.0.0`, `jsdom ^24.0.0`, `@testing-library/react ^14.0.0`, `@types/react ^18.2.0`, ESLint + `@typescript-eslint/*` matching the rest of the monorepo. No new runtime deps anywhere in the repo.
**Storage**: N/A (no persistence; this is a code-organisation change).
**Testing**: Vitest with `environment: 'jsdom'` for DOM-aware hook tests; matchMedia is hand-stubbed inside each test (the canonical pattern already used in `apps/backlog-navigator/src/test-setup.ts`). No Playwright — no UI surface.
**Target Platform**: Browser (DOM) and SSR/Node-test (jsdom, happy-dom). Hooks must guard `typeof window === 'undefined'`, matching the current `useIsMobile` implementation.
**Project Type**: TypeScript monorepo workspace package (single new package; two consumer rewires).
**Performance Goals**: No runtime performance change. Bundle-size goal: a fresh consumer that depends only on `@debrief/hooks` resolves zero references to Leaflet, Vega, MapView, FilterBar, FeatureList — verified by inspecting the resolved module graph.
**Constraints**: (a) Zero new runtime deps in the monorepo. (b) No behavioural change in either existing consumer at the mobile breakpoint. (c) `task verify` (lint + typecheck + Vitest + Playwright E2E for `web-shell` and `spec-navigator`) passes with no new exclusions, ignored rules, or skipped tests. (d) Strict TypeScript; no `any`.
**Scale/Scope**: One new workspace package (~1 hook file, ~1 index, ~1 README, ~1 test file, ~50–80 LOC of source). Two consumer rewires (`apps/web-shell`, `apps/backlog-navigator` — three import sites total). One deprecation shim in `@debrief/components`. Estimate: ~1 dev-day, matching the backlog item.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Clause | Compliance |
|---------|--------|------------|
| I. Defence-Grade Reliability | Offline by default; no silent failures | ✅ Hooks only read browser-stdlib (`window.matchMedia`); `useIsMobile` already guards SSR. No network. |
| I.4 | Reproducibility | ✅ Pure TypeScript move; deterministic build; pinned deps. |
| II. Schema Integrity | LinkML single source of truth | ✅ N/A — feature does not touch schemas. |
| III. Data Sovereignty | Provenance, source preservation | ✅ N/A — no data transformation. |
| IV. Architectural Boundaries | Services/frontends/persistence | ✅ N/A — this is a frontend-side library extraction. No persistence introduced. |
| V. Extensibility | Fail-safe loading, schema compliance, no vendor lock-in | ✅ Standard pnpm workspace mechanics; no new vendor surface. |
| VI. Testing | Service tests, integration tests, CI green | ✅ New unit tests for `useIsMobile` cover SSR fallback, initial-match read, breakpoint-cross event, custom breakpoint, listener cleanup. CI `task verify` must remain green. |
| VII. Test-Driven AI Collaboration | Tests before implementation | ✅ Tests are written before/with the move (Phase 1 contract: hook test file is part of the package skeleton). |
| VIII. Documentation | Specs before code; ADRs for significant choices | ✅ Spec exists; README in the new package codifies inclusion/exclusion rule (FR-008). One ADR entry in `docs/project_notes/decisions.md` records the package boundary decision. |
| IX. Dependencies | Minimal, vetted, pinned, no lock-in | ✅ Zero new runtime deps. devDeps re-use versions already in the monorepo. |
| X. Security | No secrets, classification-aware | ✅ N/A. |
| XI. Internationalisation | I18N from start | ✅ N/A — no user-facing strings. |
| XII. Community Engagement | Public, beta previews, feedback | ✅ Standard PR review path; this is internal restructuring with no user-facing surface. |
| XIII. Contribution Standards | Atomic commits, PR review, CI green | ✅ Plan delivers as a single PR with focused commits (skeleton, migration, deprecation shim, docs). |
| XIV. Pre-Release Freedom | Breaking changes permitted pre-v4.0.0 | ✅ Deprecation shim is a courtesy, not a constitutional obligation. |
| XV. Strict Type Safety | Explicit types, no `any`, strict mode | ✅ New package extends `tsconfig.base.json` (strict + `noUncheckedIndexedAccess`). No `any` introduced. |

**Result**: PASS — no violations. No entries needed in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/246-hooks-workspace-package/
├── plan.md                         # This file (/speckit.plan command output)
├── spec.md                         # /speckit.specify output
├── research.md                     # Phase 0 output (/speckit.plan)
├── data-model.md                   # Phase 1 output (/speckit.plan)
├── quickstart.md                   # Phase 1 output (/speckit.plan)
├── contracts/                      # Phase 1 output — package & migration contracts
│   ├── package-contract.md         # Public API + dependency-shape contract for @debrief/hooks
│   └── migration-contract.md       # Per-file consumer rewire contract (web-shell, backlog-navigator)
├── checklists/
│   └── requirements.md             # /speckit.specify quality checklist
├── evidence/
│   └── opening-context.md          # Cached opener for the eventual feature post
└── tasks.md                        # /speckit.tasks output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
shared/
├── hooks/                          # NEW workspace package — @debrief/hooks
│   ├── src/
│   │   ├── index.ts                # Barrel: export { useIsMobile }
│   │   └── useIsMobile.ts          # Moved verbatim from shared/components/src/hooks/
│   ├── tests/
│   │   └── useIsMobile.test.tsx    # NEW — covers SSR, initial match, breakpoint cross, custom bp, cleanup
│   ├── README.md                   # NEW — scope, inclusion/exclusion rules, examples
│   ├── package.json                # NEW — { name: "@debrief/hooks", peerDeps: { react: ^18.2.0 } }
│   ├── tsconfig.json               # Mirrors shared/utils/tsconfig.json (extends tsconfig.base.json)
│   └── vitest.config.ts            # environment: 'jsdom'
├── components/
│   └── src/
│       ├── index.ts                # MODIFIED — `useIsMobile` re-export switched to come from @debrief/hooks (deprecation shim)
│       └── hooks/
│           └── useIsMobile.ts      # DELETED (or replaced with a one-line re-export shim during transition)
└── ... (other shared/* unchanged)

apps/
├── web-shell/
│   ├── package.json                # MODIFIED — add "@debrief/hooks": "workspace:*"
│   └── src/App.tsx                 # MODIFIED — import { useIsMobile } from '@debrief/hooks'
└── backlog-navigator/
    ├── package.json                # MODIFIED — add "@debrief/hooks": "workspace:*"
    └── src/
        ├── App.tsx                 # MODIFIED — import { useIsMobile } from '@debrief/hooks'
        ├── editors/
        │   └── EditorOverlayProvider.tsx   # MODIFIED — same import rewire
        └── test-setup.ts           # MODIFIED — comment text updated to point at @debrief/hooks (matchMedia stub unchanged)

docs/
└── project_notes/
    └── decisions.md                # MODIFIED — append ADR entry for @debrief/hooks package boundary

CLAUDE.md                           # MODIFIED — Active Technologies entry for 246 (new workspace package)
```

**Structure Decision**: New workspace package `shared/hooks/` modelled exactly on `shared/utils/` — pure-`tsc` build (no Vite, no Storybook, no Playwright); Vitest with jsdom for hook tests; React 18 as peer dependency only. The pnpm workspace globs (`shared/*`, `apps/*`, `services/*` per `pnpm-workspace.yaml`) already include `shared/hooks/`, so no workspace-config change is needed. The migration is a single PR delivering all four parts atomically: (1) new package skeleton + tests, (2) consumer rewires, (3) `@debrief/components` deprecation shim, (4) docs (README, ADR, agent context).

## Media Components

None — backend/infrastructure feature. No new visual components, no Storybook stories, no UI changes for end users. The hook's behaviour at the mobile breakpoint is unchanged by design (FR-006).

## Storybook E2E Testing

None — no interactive UI components. The existing Storybook stories that depend on `@debrief/components` (and therefore on the deprecation re-export) keep working unchanged because the re-export keeps `useIsMobile` importable from `@debrief/components` for the duration of the deprecation window.

## Web-Shell E2E Testing

None — no extension workflow changes. The migration is invisible to web-shell users; the breakpoint logic is byte-for-byte identical (the file is moved, not rewritten). The existing Playwright suite for `apps/web-shell` (run via `node run-playwright.mjs`) is sufficient regression coverage; it must remain green on the migration branch (FR-005, SC-003) but no new tests are added.

If the trigger consumer (the third app justifying this extraction) introduces its own user-facing UI that uses `useIsMobile`, that consumer's spec — not this one — owns the corresponding workflow E2E.

## Complexity Tracking

No constitutional violations to justify; this section is intentionally empty.
