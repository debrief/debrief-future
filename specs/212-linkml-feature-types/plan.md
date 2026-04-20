# Implementation Plan: Replace hand-written `SafeFeature` / `GeoJSONFeature` with LinkML-generated equivalents

**Branch**: `212-linkml-feature-types` (authored on harness branch `claude/start-speckit-212-o7QNg`) | **Date**: 2026-04-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/212-linkml-feature-types/spec.md`

## Summary

Replace five hand-written TypeScript feature types (`SafeFeature`, `SafeFeatureCollection`, `SafeGeometry`, `GeoJSONFeature`, `GeoJSONFeatureCollection` in `shared/utils/src/types.ts`) plus one drifted copy in `services/session-state/src/types/results.ts` with one LinkML-generated boundary-feature class (plus its supporting loose-geometry and feature-collection classes). Subsumes backlog item #204. Pure Article II compliance refactor: no user-visible behaviour changes; zero new `as`-casts at call sites; every in-tree consumer migrates to `import type { ... } from '@debrief/schemas'`. The existing strict `GeoJSONFeature` class in `session-state.yaml#270` is widened in-place to become the canonical boundary class, so `ResultsSlice.result_layers` continues to reference the same named class — now with a compatible shape. Expected diff: ~80 lines added to LinkML `geojson.yaml` / `session-state.yaml`, regenerated outputs in `shared/schemas/src/generated/`, ~60 lines removed from hand-written types, ~30 consumer files with one-line import-path changes.

## Technical Context

**Language/Version**: Python 3.11 (LinkML tooling, Pydantic, generator), TypeScript 5.x (consumer code, generator output)
**Primary Dependencies**: LinkML >= 1.7.0 (`gen-pydantic`, `gen-typescript`, `gen-json-schema`), Pydantic v2 (generated Python models), `@debrief/schemas` (workspace package consuming the generated TS), no new third-party dependencies
**Storage**: N/A (type definitions only; no runtime data model change)
**Testing**: pytest (schema-adherence tests under `shared/schemas/tests/`), vitest (TS consumer tests), Playwright E2E (`apps/web-shell/` + `apps/spec-navigator/`), round-trip Python ↔ JSON ↔ TypeScript ↔ JSON ↔ Python golden-fixture tests, structural-comparison tests (LinkML-generated JSON Schema vs Pydantic-generated JSON Schema)
**Target Platform**: Same as whole monorepo — browser (VS Code webview, web-shell), Node (VS Code extension host, loader), Python services. This feature touches type definitions only; every platform sees the same change.
**Project Type**: Monorepo with pnpm workspaces (TypeScript) + uv workspaces (Python). See `CLAUDE.md` "Planned Repository Structure".
**Performance Goals**: N/A — compile-time-only change. Type erasure means zero runtime impact. CI `task verify` wall-clock MUST NOT regress by more than noise.
**Constraints**: (1) behaviour parity — `task verify` must be green with zero new errors or warnings; (2) no new `as`-casts at call sites (FR-009); (3) zero hand-written `SafeFeature` / `GeoJSONFeature` interfaces outside LinkML schema source + `generated/` (SC-001); (4) schema round-trip tests MUST cover the boundary-feature shape (FR-012)
**Scale/Scope**: ~30 consumer files across 6 packages (`apps/vscode`, `apps/loader`, `apps/web-shell`, `shared/components`, `shared/utils`, `services/session-state`, `services/stac`); 1 LinkML file edited (`geojson.yaml` for the new classes + `session-state.yaml` to retire the drifted `GeoJSONFeature` definition); 1 regen pipeline run; ~50 lines deleted from `types.ts` + ~10 from `session-state/results.ts`; ~80 lines added to LinkML

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Applicable? | Compliance | Notes |
|---------|-------------|------------|-------|
| **I — Defence-Grade Reliability** | ❌ N/A | — | No runtime behaviour changes; no silent-failure surface introduced. Compile-time-only refactor. |
| **II — Schema Integrity** | ✅ **Core motivator** | **Closes violation** | Article II.1 (single source of truth) is *the reason this feature exists*. Deleting five hand-written schema-adjacent types and replacing with one LinkML-generated class is literally the corrective action. Article II.2 (schema tests mandatory) is covered by FR-012 / SC-005 adding golden-fixture, round-trip, and structural-comparison tests for the new boundary class. |
| **III — Data Sovereignty** | ❌ N/A | — | No provenance, persistence, or data-flow change. |
| **IV — Architectural Boundaries** | ❌ N/A | — | Pure type definition; no service ↔ frontend boundary touched. |
| **V — Extensibility** | ❌ N/A | — | Not an extension point. |
| **VI — Testing** | ✅ Applicable | ✅ Pass | FR-011 requires `task verify` green. FR-012 adds schema-adherence tests. SC-005 + SC-008 cover unit + manual smoke. No new code without tests. |
| **VII — Test-Driven AI Collaboration** | ✅ Applicable | ✅ Pass | Acceptance scenarios in spec are grep-verifiable or CI-verifiable. SC-001 / SC-002 are scriptable one-liners (see `quickstart.md`). Definition of done is measurable. |
| **VIII — Documentation** | ✅ Applicable | ✅ Pass | Specs-before-code: this spec (committed) precedes implementation. Generated type carries a documentation comment (FR-008 / SC-009). `CHANGELOG.md` entry added in implementation. |
| **IX — Dependencies** | ✅ Applicable | ✅ Pass | **Zero new dependencies.** LinkML, Pydantic, `gen-typescript`, `gen-pydantic` are all already in the repo. No external lib is introduced by the type consolidation. |
| **X — Security** | ❌ N/A | — | No secret handling; no network surface. |
| **XI — Internationalisation** | ❌ N/A | — | No user-facing strings. |
| **XII — Community Engagement** | ✅ Applicable | ✅ Pass | Planning post drafted in Phase 2 (media/planning-post.md). Spec visible in-repo for feedback. |
| **XIII — Contribution Standards** | ✅ Applicable | ✅ Pass | Atomic commits throughout this PR. CI gate required. |
| **XIV — Pre-Release Freedom** | ✅ Applicable | ✅ Pass | Article XIV.4 "Strict on import, fail fast" aligns with FR-009 (no new loose casts at boundaries — the generated type *is* the fail-fast shape at the boundary). Article XIV.5 "Fix the data, never relax the schema" is consistent with widening the existing `GeoJSONFeature` LinkML class to be honest about the shapes it has always silently accepted at runtime — we are aligning the schema to reality, not relaxing it. |
| **XV — Strict Type Safety** | ✅ **Core motivator** | ✅ Pass | Article XV.1 (explicit types everywhere): no regression. XV.2 (no `any`): the generated type permits `unknown` for coordinates (already used by `SafeFeature`), not `any`; this is per-spec and was already the pattern. XV.4 (schema types are canonical): *closed by this work*. XV.5 (type boundaries are explicit): the generated boundary class *is* the explicit gate. XV.7 (type assertions): FR-009 limits new `as` tokens to data-entry boundaries only. |

**Gate result**: ✅ **PASS — no violations, no complexity tracking entries required.** Article II (schema integrity) and Article XV (strict type safety) are the two articles this feature *actively upholds*; every other applicable article is satisfied via standard mechanisms (CI gate, docs, commits, zero new deps).

## Project Structure

### Documentation (this feature)

```text
specs/212-linkml-feature-types/
├── spec.md              # Feature spec (committed)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output — the LinkML class definitions
├── quickstart.md        # Phase 1 output — verify-the-migration one-liners
├── contracts/
│   └── boundary-feature-schema.md   # Phase 1 output — class contract + documentation rule
├── checklists/
│   └── requirements.md  # Spec-quality checklist (committed)
├── media/
│   ├── planning-post.md    # Phase 2 output — blog planning announcement
│   └── linkedin-planning.md # Phase 2 output — LinkedIn summary
└── tasks.md             # (NOT created by /speckit.plan — comes from /speckit.tasks)
```

### Source Code (repository root)

```text
shared/schemas/
├── src/
│   ├── linkml/
│   │   ├── geojson.yaml          # +70 lines: add RawGeoJSONFeature, RawGeoJSONGeometry, RawGeoJSONFeatureCollection
│   │   └── session-state.yaml    # ±15 lines: widen or delete in-line GeoJSONFeature class (FR-014); re-point ResultsSlice.result_layers if needed
│   └── generated/
│       ├── typescript/
│       │   ├── types.ts          # regenerated from LinkML (not hand-edited)
│       │   └── unions.ts         # (untouched — DebriefFeature union is out of scope)
│       └── python/
│           └── debrief_schemas/  # regenerated from LinkML
├── tests/
│   ├── fixtures/
│   │   └── raw-geojson-feature/  # NEW — golden fixtures for boundary-feature shape
│   │       ├── valid/
│   │       │   ├── with-nullable-geometry.json
│   │       │   ├── with-numeric-id.json
│   │       │   └── minimal.json
│   │       └── invalid/
│   │           └── missing-type.json
│   ├── test_roundtrip.py         # ± a few lines: add round-trip coverage for the new class
│   └── test_adherence.py         # ± a few lines: structural comparison for the new class

shared/utils/src/
├── types.ts                       # −50 lines: DELETE GeoJSONFeature, GeoJSONFeatureCollection, SafeGeometry, SafeFeature, SafeFeatureCollection
├── index.ts                       # ± a few lines: remove the re-exports of the deleted types
└── bounds.ts                      # UNCHANGED if FR-010's structural-subtyping assumption holds

services/session-state/src/
├── types/results.ts               # −10 lines: DELETE hand-written GeoJSONFeature copy; import from @debrief/schemas instead
└── store/slices/results.ts        # ± a few lines: import path change only

apps/vscode/src/                   # ~15 consumer files — all import-path-only changes
├── commands/openPlot.ts
├── commands/importRep.ts
├── services/calcService.ts
├── services/ioService.ts
├── services/stacService.ts
├── tools/reference/classification/pointInZoneClassifier.ts
├── types/import.ts
├── types/tool.ts
├── webview/mapPanel.ts
├── webview/messages.ts
└── extension.ts

apps/loader/src/                   # ~4 consumer files — import-path-only
├── main/ipc/io.ts
├── main/ipc/stac.ts
└── renderer/types/results.ts

apps/web-shell/src/                # ~6 consumer files — import-path-only
├── App.tsx
├── mocks/calcService.ts
├── services/toolService.ts
├── tools/region/analysis/areaSummary.ts
├── tools/shape/manipulation/moveShape.ts
├── tools/track/analysis/rangeBearing.ts
└── tools/track/analysis/trackStats.ts

shared/components/src/
└── ExerciseListView/              # ~5 files (types.ts, utils.ts, mockData.ts, tests) — import-path-only
```

**Structure Decision**: No new packages, no new directory layout. This feature lives entirely within the existing `shared/schemas/` LinkML-source + generator pipeline and sweeps consumer code across the existing monorepo. The change is **broad but shallow**: many files touched (~30), each with a minimal, mechanical edit (import-path change + occasional small type-narrowing at boundaries where the generated shape differs). No directory is created, renamed, or restructured. Regeneration of `shared/schemas/src/generated/{typescript,python}/` is a by-product of `task codegen` (or whatever the repo's existing regen command is — research.md confirms).

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|

**None — backend/infrastructure feature.** This is a pure schema + type-system refactor with zero user-visible changes. No Storybook stories are affected; no new visual components are introduced; no existing component's visual behaviour changes. The shipped-post demo surface for this feature is a **before/after code snippet** (hand-written interface → `import type { ... } from '@debrief/schemas'`) and a **CI screenshot** showing `task verify` green — not an interactive component.

**Inclusion Criteria Applied**:
- [ ] New visual component — NO
- [ ] Significant visual change — NO
- [ ] Interactive demo adds narrative value — NO (a bundled Storybook component would not add value over a code diff + verify screenshot)

## Storybook E2E Testing

**None — no interactive UI components.** No `.stories.tsx` is added or changed by this feature. Existing Storybook stories continue to pass the regular Storybook build step; the regen outputs new TypeScript types, but Storybook consumes them the same way as before.

## VS Code Webview E2E Testing

**None — no extension workflow changes.** The VS Code extension's behaviour is unchanged; only the compile-time types its code imports are re-sourced. Existing webview E2E tests continue to pass (behaviour parity, FR-013) and function as the regression gate for this migration. No new E2E test is needed because every user-visible VS Code workflow already has coverage and those suites re-run on CI.

## Complexity Tracking

> No complexity-tracking entries required — Constitution Check passes cleanly with zero violations.

This feature *removes* complexity (five hand-written interfaces collapsed into one generated class) rather than adding it. The single judgement call — whether to widen the existing `GeoJSONFeature` LinkML class in-place or add a new class with `ResultsSlice` re-pointed — is resolved in `research.md` (Phase 0) before implementation begins, so no runtime complexity is introduced from ambiguity.
