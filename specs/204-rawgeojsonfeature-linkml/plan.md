# Implementation Plan: Schema-Rooted Raw GeoJSON Feature Type

**Branch**: `204-rawgeojsonfeature-linkml` | **Date**: 2026-04-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/204-rawgeojsonfeature-linkml/spec.md`

## Summary

Consolidate the two drifted hand-typed `GeoJSONFeature` interfaces (`shared/utils/src/types.ts` + `services/session-state/src/types/results.ts`), the paired hand-typed `GeoJSONFeatureCollection`, and the `dict[str, Any]` alias pair in `services/stac/src/debrief_stac/types.py` (Article XV violation) into **one** schema-rooted pair generated from LinkML. Introduce two new LinkML classes in `shared/schemas/src/linkml/raw-geojson.yaml` — `RawGeoJSONFeature` and `RawGeoJSONFeatureCollection`. The `geometry` slot is an `any_of` **discriminated** union over the seven existing geometry classes in `geojson.yaml` (`GeoJSONPoint`, `GeoJSONEmptyPoint`, `GeoJSONLineString`, `GeoJSONPolygon`, `GeoJSONMultiPoint`, `GeoJSONMultiLineString`, `GeoJSONMultiPolygon`) — **no new `RawGeoJSONGeometry` class** (review decision 11A). Add `designates_type: true` to each geometry class's `type` slot so Pydantic treats the union as discriminated (review decision 13A — ~6× Pydantic validation speedup; 10 000-feature bench budget ≤ 500 ms). Remove the existing under-specified `GeoJSONFeature`/`GeoJSONGeometry` stubs in `session-state.yaml`, regenerate Pydantic + TypeScript + JSON Schema via the existing `scripts/generate.py` pipeline, migrate ~22 TypeScript consumer files and 3 Python files to the new names. Null-geometry payloads are converted to `GeoJSONEmptyPoint { type: "Point", coordinates: [] }` at the two ingress boundaries — `services/io/src/debrief_io/parser.py` (REP import) and `services/stac/src/debrief_stac/features.py` (STAC load) — **not** by making `geometry` nullable (review decision 5-alt). This deletes the silent-drop guard at `apps/vscode/src/webview/mapPanel.ts:1199` (Article I.3 violation). Past the parse boundary, consumers trust the static type — no re-validation (review decision 14A). Record the rationale in `docs/project_notes/decisions.md`. No runtime behaviour changes at non-ingress sites — this is a schema-level consolidation plus one defensive conversion rule at ingress.

## Technical Context

**Language/Version**: Python 3.11 (schema source, Pydantic generation, fixtures), TypeScript 5.x (generated types, consumer apps + shared packages)
**Primary Dependencies**: LinkML ≥ 1.7.0 (`gen-pydantic`, `gen-typescript`, `gen-json-schema`), Pydantic v2, existing `@debrief/schemas` package, existing `shared/schemas/scripts/generate.py` post-processor
**Storage**: N/A — no persistence format changes
**Testing**: `pytest` (schema adherence: `shared/schemas/tests/test_golden.py`, `test_roundtrip.py`, `test_schema_compare.py`, new geojson-raw fixtures), `vitest` (consumer tests unchanged), `pnpm exec tsc --noEmit` via `Makefile` target `test-typescript` (generated TS compiles cleanly), Playwright E2E unchanged (type-only migration does not alter webview behaviour)
**Target Platform**: Cross-platform dev (Linux, macOS, Windows); CI runs on Ubuntu via the existing `task verify` pipeline described in `CLAUDE.md`
**Project Type**: Monorepo (pnpm workspace for TypeScript + uv workspace for Python). Touches `shared/schemas/` (source), `shared/utils/`, `shared/components/`, `services/session-state/`, `services/stac/`, `apps/vscode/`, `apps/loader/`, `apps/web-shell/`
**Performance Goals**: N/A — schema consolidation. Build/CI time delta expected to be within noise (±0 s) since no generator behaviour changes.
**Constraints**:
- **Single atomic PR** — schema edit, regen diff, and consumer migration reviewed together (SC-009)
- **Zero new `any`/`as` casts** at migration sites (SC-003)
- **Byte-identical round-trip** for 3 canonical fixtures (SC-008)
- **Constitution Article II (Schema Integrity)** is the driver — no backsliding allowed; every generator output must be checked in and consistent with its source
**Scale/Scope**: 3 new LinkML classes, 2 existing LinkML classes removed/merged, ~24 TypeScript files migrated, 2 Python files migrated (services/stac types + fixtures), 1 ADR entry, 3+ new schema fixtures (valid string-id / integer-id / null-properties, invalid missing-geometry / wrong-type)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Relevance | Status | Notes |
|---------|-----------|--------|-------|
| I. Defence-Grade Reliability | Indirect | ✅ Pass | No runtime / offline / failure-mode changes. Pure type consolidation. |
| II. Schema Integrity | **Direct driver** | ✅ Pass — uphold | This feature exists to eliminate hand-written drift and restore single-source-of-truth. Adherence tests extended. |
| III. Data Sovereignty | N/A | ✅ Pass | No provenance, storage, or export changes. |
| IV. Architectural Boundaries | N/A | ✅ Pass | No service/UI boundary shifts. |
| V. Extensibility | Indirect | ✅ Pass | Contrib extensions already consume `@debrief/schemas`; migration only changes names and improves rigor. |
| VI. Testing | **Direct** | ✅ Pass | New schema fixtures added; round-trip tests extended. CI `task verify` must stay green. |
| VII. Test-Driven AI Collaboration | **Direct** | ✅ Pass | Spec + checklist + contract fixtures exist before code. Completion measured against SC-001…SC-010. |
| VIII. Documentation | **Direct** | ✅ Pass | ADR entry in `docs/project_notes/decisions.md` is required (FR-019). Generated TS carries a schema-sourced docstring (FR-008). |
| IX. Dependencies | N/A | ✅ Pass | No new dependencies. |
| X. Security | N/A | ✅ Pass | No secrets, no network. |
| XI. Internationalisation | N/A | ✅ Pass | No user-facing strings. |
| XII. Community Engagement | Indirect | ✅ Pass | Covered by the standard planning-post + LinkedIn summary generated by this command. |
| XIII. Contribution Standards | **Direct** | ✅ Pass | Atomic PR, review required, CI must pass. |
| XIV. Pre-Release Freedom | Enabling | ✅ Pass | Pre-v4.0.0 — breaking type renames are permitted without a deprecation period. Removing the old generated `GeoJSONFeature` interface is permitted here. |
| XV. Strict Type Safety | **Direct driver** | ✅ Pass — uphold | We replace hand-typed boundary types (some using `unknown`, some using typed-arrays) with generated types. `any` is forbidden in generated output; the new `RawGeoJSONFeature` keeps `properties` narrowed via the chosen LinkML mechanism rather than raw `any`. |

**Outcome**: No violations. No entries required in the Complexity Tracking table.

**Post-design re-check (2026-04-20, after research + data-model + contracts + quickstart)**: All 15 articles remain ✅ Pass. Research §2 formally documents why LinkML's `range: Any` → Pydantic `Any` / TypeScript `Record<string, unknown>` is Article-XV-compliant (schema-sourced, generated code at a well-specified RFC 7946 boundary, not hand-authored). No new dependencies added. No scope creep. Contracts in `contracts/linkml-classes.md` enumerate exact YAML + generator outputs, keeping Article II (Schema Integrity) auditable. The plan remains coherent with the spec; no revisions required.

**Post-review re-check (2026-04-21, after `/speckit.review` Phases 5A–5D and Summary)**: All 15 articles remain ✅ Pass after threading the six locked review decisions (5-alt, 10A, 11A, 12A, 13A, 14A). Article I.3 is now *stronger* than before: the ingress null-geometry → `GeoJSONEmptyPoint` conversion (5-alt) plus the removal of the `mapPanel.ts:1199` silent-drop guard (14A) converts a latent silent-failure mode into an explicit, tested conversion. Article II is also *stronger*: the `designates_type: true` extension on each geometry class's `type` slot (13A) brings the existing geometry union into full schema-discriminated form, closing a gap between LinkML source and Pydantic runtime validation. Article XV remains uphold — no new `any`/`Any` in authored code; the schema-generated `Any` continues to map to `unknown` in TS. Article VI.3 gains one new integration test (`test-null-geometry-no-drop.spec.ts`, review 10A) and one new micro-benchmark (`test_designates_type_perf.py`, review 13A). No new Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/204-rawgeojsonfeature-linkml/
├── plan.md                 # This file
├── research.md             # Phase 0: LinkML mechanism choices + consumer inventory
├── data-model.md           # Phase 1: the three new LinkML classes in abstract form
├── quickstart.md           # Phase 1: migration recipe for consumers (before/after)
├── contracts/
│   └── linkml-classes.md   # Phase 1: the exact LinkML YAML additions + expected generator outputs
├── checklists/
│   └── requirements.md     # From /speckit.start
├── media/
│   ├── planning-post.md    # Phase 2
│   └── linkedin-planning.md # Phase 2
└── spec.md                 # From /speckit.specify
```

### Source Code (repository root)

This feature touches existing paths only — no new packages or directories are created.

```text
shared/schemas/
├── src/
│   ├── linkml/
│   │   ├── geojson.yaml            # Leave narrow geometry classes as-is
│   │   ├── session-state.yaml      # REMOVE thin GeoJSONFeature + GeoJSONGeometry; point ResultsSlice.result_layers at the new class
│   │   ├── geojson.yaml            # EDIT: add designates_type: true to each geometry type slot (review 13A)
│   │   ├── raw-geojson.yaml        # NEW: RawGeoJSONFeature + RawGeoJSONFeatureCollection (geometry is any_of union of 7 existing classes — no new RawGeoJSONGeometry)
│   │   └── debrief.yaml            # Master — import new submodule
│   └── generated/                  # Fully regenerated
│       ├── python/debrief_schemas/__init__.py     # new Pydantic models appear; old ones removed
│       ├── typescript/types.ts                     # new TS interfaces appear; old ones removed
│       └── json-schema/debrief.schema.json         # new definitions appear
├── scripts/generate.py             # EDIT: add 2 string-replacement entries for `id: string | number` and `properties: Record<string, unknown> | null` (see research.md §5)
├── fixtures/
│   └── raw-geojson/                # NEW: valid/ (5 feature-level + 7 per-geometry-type) + invalid/ (4 feature-level + 1 unknown-geometry-type)
└── tests/
    ├── test_golden.py              # EXTENDED: ENTITY_MAP extended with RawGeoJSONFeature + RawGeoJSONFeatureCollection (review 12A explicit task)
    ├── test_roundtrip.py           # EXTENDED: Python → JSON → TS JSON-parse → Python cycle for 3 canonical fixtures
    ├── test_schema_compare.py      # EXTENDED: include RawGeoJSONFeature in loop
    ├── test_designates_type_perf.py # NEW: 10 000-feature collection bench — Pydantic validation ≤ 500 ms (review 13A)
    └── typescript-usage.ts         # EDIT: assert `id?: string | number` and `properties?: Record<string, unknown> | null` on `RawGeoJSONFeature`

shared/utils/src/
├── types.ts                        # REMOVE hand-typed GeoJSONFeature + GeoJSONFeatureCollection; keep SafeFeature et al unchanged
└── index.ts                        # Drop the GeoJSONFeature / GeoJSONFeatureCollection re-exports

services/session-state/src/
├── types/results.ts                # REMOVE hand-typed GeoJSONFeature; import RawGeoJSONFeature from @debrief/schemas
└── store/slices/results.ts         # Update import; no behavioural change

services/stac/src/debrief_stac/
├── types.py                        # DELETE `GeoJSONFeature: TypeAlias = dict[str, Any]` + collection alias — Article XV fix
└── features.py                     # EDIT: null-geometry → GeoJSONEmptyPoint conversion at ingress (review 5-alt); import source swap

services/io/src/debrief_io/
└── parser.py                       # EDIT: null-geometry → GeoJSONEmptyPoint conversion at ingress (review 5-alt)

apps/vscode/src/
├── types/import.ts                 # REMOVE `export type { SafeFeature as GeoJSONFeature }`; update consumers to the correct canonical import
├── commands/importRep.ts           # Update import source
├── services/ioService.ts           # Update import source
├── services/stacService.ts         # Update import source (if referenced; verify during migration)
└── webview/mapPanel.ts             # DELETE silent-drop guard at line 1199 (`if (!f.geometry) return []`); trust static type (review 14A). Update import source.

apps/loader/src/
├── renderer/types/results.ts       # Update import
├── main/ipc/stac.ts                # Update import
└── main/ipc/io.ts                  # Update import

apps/web-shell/src/
├── App.tsx                         # Update import
├── mocks/calcService.ts            # (already uses SafeFeature — verify no GeoJSONFeature leaks)
└── tools/{region,shape,track}/…   # Update imports in the 4 tool files currently importing GeoJSONFeature from @debrief/utils

shared/components/src/
└── ExerciseListView/
    ├── types.ts                    # Change re-exports to point at RawGeoJSONFeature / RawGeoJSONFeatureCollection
    ├── utils.ts                    # Update import source
    ├── utils.test.ts               # Update import source
    ├── SpatialThumbnail.test.tsx   # Update import source
    ├── ExerciseListView.stories.tsx # Update import source
    └── __fixtures__/mockData.ts    # Update import source

docs/project_notes/
└── decisions.md                    # APPEND dated ADR entry naming deleted interfaces + new classes + rationale
```

**Structure Decision**: Monorepo — no new packages introduced. All edits are localised within existing pnpm + uv workspaces following the shape `shared/schemas` (source) → regenerated artefacts → consumer imports. Schema source is extracted into a new submodule file `raw-geojson.yaml` rather than being added to `session-state.yaml`, because the raw types are a cross-cutting boundary concern rather than state-slice territory and this keeps ownership clean for future edits.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| — | — | — | — |

**Inclusion Criteria Applied**:
- [ ] New visual component
- [ ] Significant visual change
- [ ] Interactive demo adds narrative value

**Bundleability Verified**:
- [ ] Stories exist in Storybook
- [ ] Components render standalone (no app context required)
- [ ] Reasonable bundle size expected (< 500KB)

**None — backend/infrastructure feature.** This is a LinkML schema addition + TypeScript/Python type consolidation. There are no new user-facing components, no visual changes, and no interactive demos. Existing components (e.g., `ExerciseListView`) merely update their imports; their rendered output and Storybook stories are structurally unchanged.

## Storybook E2E Testing

**None — no interactive UI components.** The migration does not change component behaviour or add new UI. Existing component tests (including `ExerciseListView` and its Storybook-driven snapshots) continue to run as part of `pnpm test` and `pnpm --filter @debrief/web-shell test`, and will catch any accidental breakage from the import-source change.

## VS Code Webview E2E Testing

Review decision 10A requires one new Playwright spec to guard the null-geometry → `GeoJSONEmptyPoint` conversion at ingress. The existing map-panel silent-drop guard at `mapPanel.ts:1199` is being REMOVED (review 14A trust-static-type rule) — the new spec confirms that removing the drop does not regress Article I.3 (No silent failures) because the ingress conversion has already coerced any null-geometry features into a renderable `GeoJSONEmptyPoint`.

| Workflow | Panels Involved | Key Selectors | Interactions |
|----------|----------------|---------------|--------------|
| Import REP file with a null-geometry feature | Activity Panel, Map Panel | `.activity-panel`, `.leaflet-container`, `[data-testid="layer-list-item"]` | Open REP via command palette → assert layer count == fixture feature count (no drop) → assert the null-geometry feature is rendered with `geometry.type === "Point"` and `coordinates.length === 0` |

**Testing Strategy**:
- [x] Import workflow works end-to-end in code-server
- [x] Webview content accessible via `frameLocator` chaining
- [x] Page objects updated only if the null-geometry assertion needs a new selector
- [x] Screenshots captured: pre-import catalog + post-import catalog side-by-side as evidence

**Test File Location**: `tests/e2e/test-null-geometry-no-drop.spec.ts`

**Infrastructure**: Existing E2E runner. New fixture REP file at `tests/e2e/fixtures/null-geometry.rep` (2 tracks, one with a null-geometry entry); this fixture also feeds the per-ingress unit test in `services/io/tests/test_parser_null_geometry.py`. All other `apps/vscode/` edits are import-source substitutions; the existing `tests/e2e/*.spec.ts` continue to pass unchanged as part of the CI gate.

## Complexity Tracking

*No entries — Constitution Check passes cleanly with no violations.*
