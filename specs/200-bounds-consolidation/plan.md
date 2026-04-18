# Implementation Plan: Consolidate bounds utilities into `@debrief/utils`

**Branch**: `200-bounds-consolidation` | **Date**: 2026-04-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/200-bounds-consolidation/spec.md`

## Summary

Delete `apps/vscode/src/utils/bounds.ts` (161 LOC) and the byte-identical `apps/vscode/tests/unit/bounds.test.ts`. Lift the vscode copy's `if (!feature.geometry) continue;` null-guard into the canonical `shared/utils/src/bounds.ts`. Widen `calculateBounds`'s parameter to a minimal structural type that accepts both the narrow `GeoJSONFeature` (current shape) and the wider `SafeFeature` (as used in `mapPanel.ts`), without introducing casts at the call site. Switch `apps/vscode/src/webview/mapPanel.ts` to import `calculateBounds` / `mergeBounds` from `@debrief/utils`. Add two additive unit tests in `shared/utils/tests/bounds.test.ts` to lock in the null-geometry skip behaviour. No algorithmic change, no schema change, no new dependency — purely a duplication-removal refactor gated by the monorepo's full CI (`task verify`).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode — per Constitution Article XV and `CLAUDE.md`)
**Primary Dependencies**: `@debrief/utils` workspace package (existing); no new runtime dependencies
**Storage**: N/A (pure in-memory geometry reduction)
**Testing**: Vitest for the shared/utils unit tests; the VS Code E2E suite (`tests/e2e/`) exercises the `mapPanel.ts` call site indirectly through the existing "open plot" workflow
**Target Platform**: All TypeScript consumers in the monorepo — VS Code extension host + webview, web-shell, shared components. The code runs in both Node (extension host, tests) and browser (webview) environments.
**Project Type**: Monorepo — pnpm workspaces. Change touches `shared/utils/` (producer) and `apps/vscode/` (consumer).
**Performance Goals**: No change to existing performance envelope. `calculateBounds` is a single-pass O(total coordinates) reduction; widening the parameter type has zero runtime cost (types are erased).
**Constraints**: (a) No new `any`/`as` casts or eslint suppressions introduced at the call site (Constitution Article XV, spec SC-007). (b) Bit-for-bit identical output for any `GeoJSONFeature[]` whose features all have non-null geometry (spec FR-008). (c) `task verify` passes on the refactor branch (spec FR-010, SC-005).
**Scale/Scope**: Scope is bounded — 2 files deleted, 1 file modified in `shared/utils/src/`, 1 file modified in `shared/utils/tests/`, 1 file modified in `apps/vscode/src/webview/`. Expected net reduction: ≥140 LOC of production source (spec SC-004).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Relevant principle | Compliance |
|---------|--------------------|------------|
| I. Defence-Grade Reliability | No silent failures; reproducibility | **PASS** — the refactor removes a latent throw-on-null-geometry path that the shared copy would hit if any `SafeFeature[]` consumer adopted it. Output is deterministic and identical for non-null inputs. |
| II. Schema Integrity | Schema is the contract | **N/A** — no schema changes. |
| III. Data Sovereignty | Provenance; local data | **N/A** — no data transformation, no storage. |
| IV. Architectural Boundaries | Services never touch UI | **PASS** — `@debrief/utils` is a pure utility package. `calculateBounds` returns a tuple; zero UI coupling. |
| V. Extensibility | Fail-safe loading | **N/A** — not an extension surface. |
| VI. Testing | Unit tests required | **PASS** — 2 additive unit tests added for null-geometry skip. All pre-existing tests preserved (FR-009). |
| VII. Test-Driven AI Collaboration | Tests before implementation | **PASS** — the two new test cases (null-geometry skip, undefined-geometry skip, mixed-array) are authored first, run red against the current shared copy, then the null-guard is lifted to make them green. |
| VIII. Documentation | Specs before code; ADRs for significant decisions | **PASS** — spec.md exists; this plan documents the widening decision. The call site reconciliation choice (Option A vs B from spec FR-003) is resolved in `research.md`. No new ADR required — this is a localised refactor, not an architectural change. |
| IX. Dependencies | Minimal, vetted | **PASS** — no new dependencies. |
| X. Security | No secrets | **N/A**. |
| XI. Internationalisation | I18N | **N/A** — no user-facing strings. |
| XII. Community Engagement | Planning post | **PASS** — planning-post.md + linkedin-planning.md produced by Phase 2. |
| XIII. Contribution Standards | Atomic commits; CI gated | **PASS** — single logical change per commit; `task verify` gate (FR-010). |
| XIV. Pre-Release Freedom | Breaking changes permitted | **N/A** — this refactor is *non-breaking* at the public API surface; the widened parameter type is a superset of the current signature. |
| XV. Strict Type Safety | No `any`; narrow at boundaries | **PASS** — widened parameter uses `unknown` for `coordinates` (allowed — `unknown` is the safe counterpart to `any`). Narrowing happens inside `extractCoordinates` at each geometry-type case, as it already does today. No new `any`, no new casts at the call site. |

**Result**: **PASS** — proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/200-bounds-consolidation/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (/speckit.specify output)
├── research.md          # Phase 0 output — widening decision + alternatives
├── data-model.md        # Phase 1 output — type-surface diff (no new entities)
├── quickstart.md        # Phase 1 output — how to verify the refactor locally
├── contracts/
│   └── calculateBounds.signature.md   # Widened function signature "contract"
├── checklists/
│   └── requirements.md  # From /speckit.specify
└── media/
    ├── planning-post.md       # Phase 2 output
    └── linkedin-planning.md   # Phase 2 output
```

### Source Code (repository root)

```text
shared/utils/
├── src/
│   ├── bounds.ts                   # MODIFIED — null-guard lifted in; param widened
│   └── types.ts                    # UNCHANGED — GeoJSONFeature, SafeFeature, Bounds live here
├── tests/
│   └── bounds.test.ts              # MODIFIED — 2 additive tests for null-geometry skip
└── package.json                    # UNCHANGED — @debrief/utils

apps/vscode/
├── src/
│   ├── utils/
│   │   └── bounds.ts               # DELETED
│   └── webview/
│       └── mapPanel.ts             # MODIFIED — import from '@debrief/utils'
└── tests/
    └── unit/
        └── bounds.test.ts          # DELETED

# Verified out of scope but surfaced in research.md:
shared/components/src/utils/bounds.ts   # UNTOUCHED — third, distinct implementation
                                         # (DebriefFeature-typed, spatial filter helpers).
                                         # NOT a duplicate of the two above.
```

**Structure Decision**: Canonical implementation lives in `shared/utils/src/bounds.ts` and is consumed through the `@debrief/utils` package export (already wired in `shared/utils/src/index.ts`). No new directory, no new module; this is a classic "promote the local copy upstream" refactor.

## Media Components

**None — tech-debt / infrastructure feature.** This refactor has no visual component, no new Storybook story, and no UI change. Every existing component (including `MapView`, which has its own distinct `bounds.ts` in `shared/components/`) continues to render identically.

**Inclusion Criteria Applied**:
- [ ] New visual component — **No.**
- [ ] Significant visual change — **No.**
- [ ] Interactive demo adds narrative value — **No.**

## Storybook E2E Testing

**None — no interactive UI components.**

## VS Code Webview E2E Testing

**None — no extension workflow changes.**

The only VS Code-side change is the import path in `apps/vscode/src/webview/mapPanel.ts`. The existing "open plot" E2E flows exercise the `calculateBounds` call path and will automatically validate behavioural parity when they run as part of `task verify`. The spec's SC-006 (no uncaught exception with null-geometry features) is covered at the unit level in the new `shared/utils/tests/bounds.test.ts` cases; a fresh webview E2E dedicated to a single data-shape edge case would be disproportionate to the refactor.

## Complexity Tracking

**No violations — section intentionally empty.** The plan introduces no new abstractions, no new packages, no new test infrastructure. Complexity is strictly reduced (161 LOC deleted, < 5 LOC added).
