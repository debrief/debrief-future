# Implementation Plan: Consolidate spatial types in LinkML + lat/lon ↔ GeoJSON converters

**Branch**: `203-spatial-types-linkml` | **Date**: 2026-04-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/203-spatial-types-linkml/spec.md`

## Summary

Eliminate three duplicated TypeScript spatial/temporal type declarations (`Coordinate`, `ViewportPolygon`, `TimeFilter`) by making the LinkML schema the single source of truth and introducing `toGeoJSONCoord` / `fromGeoJSONCoord` helpers in `@debrief/utils` to confine tuple-form handling to a narrow GeoJSON/Leaflet boundary. Canonical shape is the object form `{ longitude, latitude }`. `TimeFilter` is aligned with Review Decision 5C (nullable epoch milliseconds). `ViewportPolygon` gains an optional `zoom` attribute matching runtime usage. Persisted state is handled via a silent in-place migration with a version bump.

**Technical approach**: One LinkML-source patch (two class edits); regenerate Pydantic + TS + JSON Schema; delete one duplicate file and the duplicate declarations in session-state; move validators to `@debrief/utils`; add two pure converter helpers with unit tests; add a targeted rehydration migration with a persistence-version bump; update every call site that currently imports from the duplicates.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, per Constitution Article XV); Python 3.11 (generated Pydantic only — no hand-authored Python touched by this feature).
**Primary Dependencies**: LinkML ≥ 1.7.0 (schema source and generators); `gen-pydantic`, `gen-typescript`, `gen-json-schema`; Pydantic v2 (generated models); no new runtime dependencies.
**Storage**: Session-state persistence layer (`services/session-state/src/persistence/`) — localStorage in web-shell, VS Code workspace state in the extension. This feature bumps the persistence schema version by 1.
**Testing**: Vitest (TypeScript unit tests in `@debrief/utils` and `@debrief/components`); existing schema adherence suite (`uv run pytest shared/schemas/` + `pnpm --filter @debrief/schemas test`); existing Playwright E2E suites must continue to pass; manual smoke tests with screenshot evidence under `specs/203-spatial-types-linkml/evidence/`.
**Target Platform**: Monorepo — shared TS packages, web-shell SPA, VS Code extension. No platform-specific code.
**Project Type**: Monorepo refactor (single project — Option 1 below).
**Performance Goals**: Preserve existing hot-path behaviour. Specifically, `TimeFilter` updates during time-slider drag must continue to use plain numeric fields (per Review Decision 5C); no regression in slider responsiveness. Converter helpers are O(1).
**Constraints**: Schema adherence tests must pass; `task verify` must pass end-to-end; no new runtime dependencies; no user-visible behaviour change to map rendering, viewport restore, or time filtering.
**Scale/Scope**: ~70 lines of duplicated declarations deleted; ~100 lines of converters + validators + migration added (net shrink plus a measurable increase in type safety). Touches `shared/schemas/src/linkml/session-state.yaml`, `shared/utils/src/`, `services/session-state/src/types/`, `services/session-state/src/persistence/`, `shared/components/src/utils/spatial-types.ts` (deletion), and every file that imports the three types from the duplicate sources.

## Constitution Check

*Re-check required after Phase 1 design. Results apply to the plan as drafted; any scope changes below must re-evaluate.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default; no silent failures | ✅ Pass | Refactor preserves offline behaviour; migration logs on detection; validators return `false` rather than throw so callers control failure mode. |
| II. Schema Integrity | LinkML is single source of truth; adherence tests mandatory | ✅ Pass (load-bearing) | This is the central purpose of the feature — removing duplicates and making LinkML canonical. Round-trip + structural + golden-fixture tests all run on the regenerated artefacts. |
| III. Data Sovereignty | Provenance; source preservation; data local | ✅ Pass | No persistence, provenance, or data-flow change other than the shape migration. |
| IV. Architectural Boundaries | Services never touch UI; frontends never persist | ✅ Pass | Converter helpers and validators live in `@debrief/utils`, a pure utility package; no UI code in services; session-state persistence layer already owns hydration. |
| V. Extensibility | Extensions schema-compliant; fail-safe loading | ✅ Pass | Contrib extensions that consume these types pick up the new shape via the regenerated `@debrief/schemas` package. No extension contract change beyond the documented shape. |
| VI. Testing | Schema tests gate all merges; CI must pass | ✅ Pass | Schema adherence tests updated and run; converter/validator unit tests added; Playwright E2E suites must continue to pass. |
| VII. Test-Driven AI Collaboration | Tests before implementation | ✅ Pass | Converter, validator, and migration contracts in `contracts/*.md` define test-shaped acceptance criteria before implementation. |
| VIII. Documentation | Specs before code | ✅ Pass | spec.md + research.md + data-model.md + contracts/ complete before tasks.md / implementation. |
| IX. Dependencies | Minimal, vetted, pinned | ✅ Pass | Zero new runtime dependencies. |
| X. Security | No secrets; classification awareness | ✅ Pass | No change in secret handling or network posture. |
| XI. Internationalisation | User strings externalisable | ✅ Pass | No new user-facing strings. The rehydration migration is silent. |
| XII. Community Engagement | Public by default; previews | ✅ Pass | Feature lands in a PR with a Heroku preview; media content produced per template (see Phase 2). |
| XIII. Contribution Standards | Atomic commits; PR review; CI | ✅ Pass | Planned as a single feature PR with commits organised by phase. |
| XIV. Pre-Release Freedom | Breaking changes permitted pre-v4.0.0 | ✅ Pass (relied upon) | `TimeFilter` schema shape change and the persistence-format bump are permitted under this article. Documented in research.md (R-002, R-003). |
| XV. Strict Type Safety | No `any`/`Any`; strict mode; CI enforces | ✅ Pass (reinforces) | Feature removes a source of structural drift; no new `any`/`Any` introduced; converter and validator signatures use canonical generated types. |

**Result**: All gates pass. No violations to justify; `Complexity Tracking` is empty.

## Project Structure

### Documentation (this feature)

```text
specs/203-spatial-types-linkml/
├── plan.md                        # This file
├── research.md                    # Phase 0 — 3 NEEDS CLARIFICATION resolved (R-001..R-008)
├── data-model.md                  # Phase 1 — canonical shapes, validation rules, relationships
├── quickstart.md                  # Phase 1 — build/verify/smoke-test recipe
├── contracts/
│   ├── README.md                  # What "contracts" means for a type refactor
│   ├── linkml-diff.md             # Exact LinkML source patch (ViewportPolygon + TimeFilter)
│   ├── converter-contracts.md     # toGeoJSONCoord / fromGeoJSONCoord signatures + tests
│   ├── validator-contracts.md     # validateCoordinate / validateViewportPolygon / calculateViewportCenter
│   └── persistence-migration.md   # Tuple-form rehydration migration + version bump
├── checklists/
│   └── requirements.md            # Spec quality checklist (passing)
├── spec.md                        # Feature specification (NEEDS CLARIFICATION resolved)
└── tasks.md                       # Phase 2 — created by /speckit.tasks (NOT by this command)
```

### Source Code (repository root)

```text
shared/
├── schemas/
│   └── src/linkml/
│       └── session-state.yaml              # EDIT: ViewportPolygon (+ zoom), TimeFilter (range→integer)
│
├── utils/
│   └── src/
│       ├── spatial-converters.ts           # NEW: toGeoJSONCoord, fromGeoJSONCoord
│       ├── spatial-validators.ts           # NEW (move): validateCoordinate, validateViewportPolygon,
│       │                                   #            calculateViewportCenter
│       ├── index.ts                        # EDIT: re-export new modules
│       └── __tests__/
│           ├── spatial-converters.test.ts  # NEW: round-trip + axis-order assertions
│           └── spatial-validators.test.ts  # NEW (move): behaviour equivalence to current
│
└── components/
    └── src/utils/
        └── spatial-types.ts                # DELETE: duplicate declarations

services/
└── session-state/
    └── src/
        ├── types/
        │   ├── spatial.ts                  # EDIT: remove Coordinate/ViewportPolygon/validators;
        │   │                               #       import from @debrief/schemas and @debrief/utils
        │   └── temporal.ts                 # EDIT: remove TimeFilter; import from @debrief/schemas
        └── persistence/
            └── (rehydrate code)            # EDIT: add migrateSpatialTuples + version bump

apps/
├── vscode/                                 # AUDIT: any file importing Coordinate/ViewportPolygon/
│                                           #        TimeFilter from the duplicates must re-target
│                                           #        to @debrief/schemas; any hand-rolled tuple
│                                           #        conversions in those files replaced with helpers
└── web-shell/                              # AUDIT: same as above
```

**Structure Decision**: Option 1 (single project / monorepo refactor). This is a cross-cutting change within the existing monorepo; no new packages, no new apps. Changes are surgical and concentrated in the files listed above.

## Media Components

None — backend/infrastructure feature. This is a schema and type refactor with no new visual components or Storybook stories. Existing Storybook stories for `MapView`, `FilterBar`, etc. continue to render unchanged; they are not re-bundled for this feature's blog post.

## Storybook E2E Testing

None — no interactive UI components added or changed. Existing Storybook E2E tests must continue to pass as a regression guard (covered by CI).

## VS Code Webview E2E Testing

None — no extension workflow changes. Existing VS Code webview E2E tests must continue to pass as a regression guard (covered by CI). Smoke tests in the VS Code extension (FR-019) are manual with screenshot evidence, not automated for this feature.

## Complexity Tracking

*Empty — Constitution Check has no violations to justify.*

## Next Step

Run `/speckit.tasks` to generate the phased task breakdown in `tasks.md`.
