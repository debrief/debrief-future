# Tasks: Schema-Rooted Raw GeoJSON Feature Type

**Input**: Design documents from `specs/204-rawgeojsonfeature-linkml/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/linkml-classes.md, quickstart.md

**Tests**: Tests are INCLUDED. The review phase locked three explicit test-creation decisions (10A unit + E2E for null→EmptyPoint conversion; 12A session-state tests sweep + ENTITY_MAP; 13A 10 000-feature perf bench). Schema adherence tests (golden, round-trip, schema-compare) are mandatory per Article II.2.

**Organization**: Tasks are grouped by user story (US1 = P1 canonical type exists, US2 = P2 duplicate deletion, US3 = P3 guard rails) so each can be delivered as an independent increment within the single atomic PR (SC-009).

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, the shipped blog post, and the ADR.

**Evidence Directory**: `specs/204-rawgeojsonfeature-linkml/evidence/`
**Media Directory**: `specs/204-rawgeojsonfeature-linkml/media/`

### Feature-type classification

This is a **Schema Change** feature (per the Quality Rubric). Required evidence:
- Round-trip proof: Python → JSON → TypeScript → JSON → Python byte-identical for 3 canonical fixtures (SC-008)
- Plus the mandatory test-summary and usage-example

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | Full CI pass/fail counts from `task verify`, with YAML front matter (feature, captured_at, git_sha, tests_passed/failed/skipped, coverage_pct) | After all tests pass |
| `evidence/usage-example.md` | Minimal TS + Python code snippet showing import + consumption of `RawGeoJSONFeature` | After Phase 4 complete |
| `evidence/round-trip-evidence.md` | 3-fixture round-trip table (Python validate → dump → TS parse → stringify → Python validate); byte-identical column | After T020 green |
| `evidence/grep-before-after.txt` | `rg -nw "interface GeoJSONFeature" shared/ services/ apps/` on main vs on PR branch; shows zero hits on PR branch (SC-001, SC-002) | After Phase 4 complete |
| `evidence/perf-bench.txt` | Output of `uv run pytest shared/schemas/tests/test_designates_type_perf.py -v`; must show wall-clock < 500 ms for 10 000-feature validation (review 13A) | After T019 green |
| `evidence/null-geometry-e2e-trace.zip` | Playwright trace from `test-null-geometry-no-drop.spec.ts` showing null-geometry feature surviving import (review 10A) | After T055 green |
| `evidence/ci-pipeline.txt` | `task verify` full output on the final commit | Before PR creation |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | Blog post announcing the feature (including Article I.3 story beat) | During `/speckit.plan` (already done) |
| `media/linkedin-planning.md` | LinkedIn summary for planning | During `/speckit.plan` (already done) |
| `media/shipped-post.md` | Blog post celebrating completion; includes the grep-before-after + perf-bench numbers | During Polish phase |
| `media/linkedin-shipped.md` | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with all evidence attached | Final task (T067) |
| Blog PR | PR in debrief.github.io with shipped-post | Triggered by `/speckit.pr` |

---

## Phase 1: Setup

**Purpose**: Verify the baseline is green before the consolidation begins, and create the directory scaffolding for fixtures + evidence. No code changes in this phase.

- [ ] T001 Verify baseline is green on branch `claude/start-speckit-204-fdXfS` — run `task verify` and confirm lint + typecheck + all existing tests pass. Halt and investigate any pre-existing failure before proceeding. No file.
- [ ] T002 [P] Create fixture scaffolding directory tree `shared/schemas/fixtures/raw-geojson/valid/geometry/`
- [ ] T003 [P] Create fixture scaffolding directory tree `shared/schemas/fixtures/raw-geojson/invalid/`
- [ ] T004 [P] Create evidence directory `specs/204-rawgeojsonfeature-linkml/evidence/`

**Checkpoint**: Baseline green, directories exist. Ready for schema-source edits.

---

## Phase 2: Foundational (Schema source + regen pipeline)

**Purpose**: Establish the schema source and the generated artefacts. Every user story below depends on this being complete and green.

**⚠️ CRITICAL**: No user story work (US1/US2/US3) can begin until this phase passes `uv run pytest shared/schemas/tests/` + `pnpm --filter @debrief/schemas build`.

### Schema source edits

- [ ] T005 Add `designates_type: true` to the `type` slot of each of the 7 geometry classes (`GeoJSONPoint`, `GeoJSONEmptyPoint`, `GeoJSONLineString`, `GeoJSONPolygon`, `GeoJSONMultiPoint`, `GeoJSONMultiLineString`, `GeoJSONMultiPolygon`) in `shared/schemas/src/linkml/geojson.yaml` — review 13A. Annotation is additive; payload acceptance is unchanged.
- [ ] T006 Create new LinkML submodule `shared/schemas/src/linkml/raw-geojson.yaml` with `RawGeoJSONFeature` + `RawGeoJSONFeatureCollection` classes. `RawGeoJSONFeature.geometry` is an `any_of` union over the 7 geometry classes (review 11A). Include description blocks that render as parse-boundary docstrings (FR-008).
- [ ] T007 Add `raw-geojson` to the `imports:` list in `shared/schemas/src/linkml/debrief.yaml` (alphabetically before `session-state` per contracts/linkml-classes.md §2)
- [ ] T008 Delete the thin `GeoJSONFeature` class (lines 270-286) and `GeoJSONGeometry` class (lines 262-268) from `shared/schemas/src/linkml/session-state.yaml`; update `ResultsSlice.result_layers.range` from `GeoJSONFeature` to `RawGeoJSONFeature` — FR-007

### Generator post-processor

- [ ] T009 Add two string-replacement entries to `generate_typescript()` in `shared/schemas/scripts/generate.py`: (1) `RawGeoJSONFeature.id` → `id?: string | number`; (2) `RawGeoJSONFeature.properties` → `properties?: Record<string, unknown> | null`. Plus a defensive third entry that expands a single-alternative `geometry: GeoJSONPoint` into the full 7-class union if `gen-typescript` collapses the union. See contracts/linkml-classes.md §5.

### Regenerate derived artefacts

- [ ] T010 Run `cd shared/schemas && make generate` (or the Taskfile.yml equivalent); commit every regenerated file under `shared/schemas/src/generated/python/`, `shared/schemas/src/generated/typescript/`, and `shared/schemas/src/generated/json-schema/` as part of the same commit group — FR-011
- [ ] T011 [P] Verify generated Pydantic output in `shared/schemas/src/generated/python/debrief_schemas/__init__.py`: `RawGeoJSONFeature` exists with `type: Literal["Feature"]`, `id: Optional[Union[str, int]]`, a discriminated `Annotated[Union[...], Field(discriminator="type")]` geometry slot, `properties: Optional[Any]`. `RawGeoJSONGeometry` MUST NOT exist.
- [ ] T012 [P] Verify generated TypeScript output in `shared/schemas/src/generated/typescript/types.ts`: `RawGeoJSONFeature` exists with `type: "Feature"`, `id?: string | number`, `geometry: GeoJSONPoint | GeoJSONEmptyPoint | GeoJSONLineString | GeoJSONPolygon | GeoJSONMultiPoint | GeoJSONMultiLineString | GeoJSONMultiPolygon`, `properties?: Record<string, unknown> | null`. No `RawGeoJSONGeometry` type.
- [ ] T013 [P] Verify generated JSON Schema in `shared/schemas/src/generated/json-schema/debrief.schema.json`: `RawGeoJSONFeature` entry has `"geometry": {"oneOf": [...]}` over 7 `$ref`s, `"id": {"anyOf": [...]}`, `"required": ["type", "geometry"]`.

**Checkpoint**: Schema source is authoritative, generated artefacts are consistent, the three-language round-trip is structurally possible. User stories can now proceed.

---

## Phase 3: User Story 1 — Single schema-rooted parse-boundary type (Priority: P1)

**Goal**: A developer importing `RawGeoJSONFeature` from `@debrief/schemas` (TS) or `debrief_schemas` (Python) gets a schema-rooted type whose shape matches RFC 7946 §3.2 — optional string-or-integer `id`, required discriminated-union geometry, optional nullable `properties`. All schema adherence tests + the perf micro-bench pass.

**Independent Test**: `uv run pytest shared/schemas/tests/ -v` green on the new class; `pnpm exec tsc --noEmit shared/schemas/tests/typescript-usage.ts` green; a developer writing `import { RawGeoJSONFeature } from '@debrief/schemas'` in a scratch file compiles cleanly.

### Fixtures for User Story 1

Covers the 5 feature-level valid + 7 per-geometry valid + 5 invalid fixtures specified in contracts/linkml-classes.md §6.

- [ ] T014 [P] [US1] Create valid feature-level fixtures (5 files): `shared/schemas/fixtures/raw-geojson/valid/feature-string-id.json`, `feature-integer-id.json`, `feature-no-id.json`, `collection-empty.json`, `collection-mixed-ids.json`
- [ ] T015 [P] [US1] Create valid geometry fixtures (7 files — review 11A): `shared/schemas/fixtures/raw-geojson/valid/geometry/point.json`, `empty-point.json`, `linestring.json`, `polygon.json`, `multipoint.json`, `multilinestring.json`, `multipolygon.json`
- [ ] T016 [P] [US1] Create invalid fixtures (5 files): `shared/schemas/fixtures/raw-geojson/invalid/wrong-type.json`, `missing-geometry.json`, `numeric-type.json`, `id-boolean.json`, `unknown-geometry-type.json` (review 11A)

### Test harness extensions for User Story 1

- [ ] T017 [US1][test] Extend `ENTITY_MAP` in `shared/schemas/tests/test_golden.py` with entries for `RawGeoJSONFeature` and `RawGeoJSONFeatureCollection` — explicit task per review 12A; do not rely on drive-by detection.
- [ ] T018 [US1][test] Extend `shared/schemas/tests/test_roundtrip.py` to exercise 3 canonical fixtures (`feature-string-id`, `feature-integer-id`, `collection-mixed-ids`) through the Python → JSON → TypeScript → JSON → Python cycle — SC-008.
- [ ] T019 [US1][test] Extend `shared/schemas/tests/test_schema_compare.py` loop to include `RawGeoJSONFeature` and `RawGeoJSONFeatureCollection` — assert LinkML-generated JSON Schema is deep-equal to Pydantic `.model_json_schema()` output.
- [ ] T020 [P][US1][test] Edit `shared/schemas/tests/typescript-usage.ts` to import `RawGeoJSONFeature` and assert the presence of `id?: string | number`, `properties?: Record<string, unknown> | null`, and the 7-class geometry union via a `satisfies` check.
- [ ] T021 [US1][test] Create new perf micro-bench `shared/schemas/tests/test_designates_type_perf.py` — generate a 10 000-feature `RawGeoJSONFeatureCollection` by sampling from `valid/geometry/*`, validate via `model_validate`, assert wall-clock ≤ 500 ms (review 13A).

### Verify schema adherence is green

- [ ] T022 [US1][test] Run `uv run pytest shared/schemas/tests/` — every new + existing test must pass. Capture output for evidence.

**Checkpoint**: User Story 1 complete — the canonical schema-rooted type exists, all adherence tests green, the perf budget met. The three-language round-trip is proven. Downstream consumer migration (US2) can begin.

---

## Phase 4: User Story 2 — Clean deletion of drifted hand-typed duplicates (Priority: P2)

**Goal**: Every consumer of the deleted hand-typed `GeoJSONFeature`/`GeoJSONFeatureCollection` imports the generated `RawGeoJSONFeature`/`RawGeoJSONFeatureCollection` instead. The Python `dict[str, Any]` alias in `services/stac` is gone. The null-geometry silent-drop at `mapPanel.ts:1199` is gone, replaced by ingress coercion. CI (`task verify`) stays green.

**Independent Test**: `rg -nw "interface GeoJSONFeature" shared/ services/ apps/` returns zero hits (SC-001); `rg -nw "GeoJSONFeature: TypeAlias" services/` returns zero hits (SC-002); `task verify` green.

### Python ingress — services/stac + services/io (review 5-alt, 14A)

- [ ] T023 [US2] Delete `GeoJSONFeature: TypeAlias = dict[str, Any]` and `GeoJSONFeatureCollection: TypeAlias = dict[str, Any]` from `services/stac/src/debrief_stac/types.py`; Article XV fix (FR-FR-SC-003).
- [ ] T024 [US2] Add `_coerce_null_geometry(feature: dict) -> dict` shim to `services/io/src/debrief_io/parser.py` per quickstart.md §2b; apply it to every feature immediately before `RawGeoJSONFeatureCollection.model_validate(...)`. Import `RawGeoJSONFeatureCollection` from `debrief_schemas`.
- [ ] T025 [US2] Add the same `_coerce_null_geometry` shim to `services/stac/src/debrief_stac/features.py` ingress; import `RawGeoJSONFeatureCollection` from `debrief_schemas`.
- [ ] T026 [US2] Update `services/stac/tests/fixtures.py` imports to source from `debrief_schemas`.

### Python ingress unit tests (review 10A)

- [ ] T027 [P][US2][test] Create `services/io/tests/test_parser_null_geometry.py` — build a minimal REP byte string containing a null-geometry row, parse via `parser.parse(...)`, assert the resulting feature has `geometry.type == "Point"` and `len(geometry.coordinates) == 0`. Asserts no drop.
- [ ] T028 [P][US2][test] Add matching null-geometry coercion test to `services/stac/tests/test_features_null_geometry.py` covering the STAC ingress path.
- [ ] T029 [US2][test] Run `uv run pytest services/io services/stac` — all Python ingress tests green.

### TypeScript — shared types layer

- [ ] T030 [US2] Delete hand-typed `interface GeoJSONFeature` and `interface GeoJSONFeatureCollection` blocks from `shared/utils/src/types.ts`. Keep `SafeFeature`, `SafeGeometry`, `SafeFeatureCollection` untouched — out of scope (spec).
- [ ] T031 [US2] Remove the two re-exports from `shared/utils/src/index.ts` (`export type { GeoJSONFeature, GeoJSONFeatureCollection } from './types'`).
- [ ] T032 [P][US2] Update `shared/utils/src/bounds.ts` to import `RawGeoJSONFeature` from `@debrief/schemas`.
- [ ] T033 [P][US2] Update `shared/utils/tests/bounds.test.ts` import source.
- [ ] T034 [US2] Delete hand-typed `interface GeoJSONFeature` from `services/session-state/src/types/results.ts`; replace with `export type { RawGeoJSONFeature as GeoJSONFeature } from '@debrief/schemas'` (in-package alias kept for minimal ripple; follow-up to rename at API boundary tracked separately).
- [ ] T035 [US2] Update `services/session-state/src/store/slices/results.ts` import source to the new re-export path.

### TypeScript — session-state tests sweep (review 12A)

- [ ] T036 [US2][test] Run `pnpm --filter @debrief/session-state test` — every existing test must pass unchanged. Capture output as evidence of zero behavioural change.

### TypeScript — shared/components

- [ ] T037 [US2] Update `shared/components/src/ExerciseListView/types.ts` re-exports to point at `RawGeoJSONFeature`/`RawGeoJSONFeatureCollection` from `@debrief/schemas`.
- [ ] T038 [P][US2] Update `shared/components/src/ExerciseListView/utils.ts` import source
- [ ] T039 [P][US2] Update `shared/components/src/ExerciseListView/utils.test.ts` import source
- [ ] T040 [P][US2] Update `shared/components/src/ExerciseListView/SpatialThumbnail.test.tsx` import source
- [ ] T041 [P][US2] Update `shared/components/src/ExerciseListView/ExerciseListView.stories.tsx` import source
- [ ] T042 [P][US2] Update `shared/components/src/ExerciseListView/__fixtures__/mockData.ts` import source

### TypeScript — apps/vscode (includes silent-drop guard removal — review 14A)

- [ ] T043 [US2] Remove the `export type { SafeFeature as GeoJSONFeature } from '@debrief/utils'` alias from `apps/vscode/src/types/import.ts`; decide per call-site which consumers use `RawGeoJSONFeature` (from `@debrief/schemas`) and which use `SafeFeature` directly — FR-017.
- [ ] T044 [US2] Edit `apps/vscode/src/webview/mapPanel.ts:1199` — delete the `if (!f.geometry) { return []; }` silent-drop guard; replace the `flatMap` with `map`; update the typed feature parameter to `RawGeoJSONFeature` from `@debrief/schemas`. Past-ingress guarantee: geometry is always one of the 7 classes (review 5-alt/14A).
- [ ] T045 [P][US2] Update `apps/vscode/src/commands/importRep.ts` import source
- [ ] T046 [P][US2] Update `apps/vscode/src/services/ioService.ts` import source
- [ ] T047 [P][US2] Update `apps/vscode/src/services/stacService.ts` import source (verify it references the type; if not, skip)

### TypeScript — apps/loader

- [ ] T048 [US2] Update `apps/loader/src/renderer/types/results.ts` re-export chain
- [ ] T049 [P][US2] Update `apps/loader/src/main/ipc/stac.ts` import source
- [ ] T050 [P][US2] Update `apps/loader/src/main/ipc/io.ts` import source

### TypeScript — apps/web-shell

- [ ] T051 [P][US2] Update `apps/web-shell/src/tools/region/analysis/areaSummary.ts` import source
- [ ] T052 [P][US2] Update `apps/web-shell/src/tools/shape/manipulation/moveShape.ts` import source
- [ ] T053 [P][US2] Update `apps/web-shell/src/tools/track/analysis/rangeBearing.ts` import source
- [ ] T054 [P][US2] Update `apps/web-shell/src/tools/track/analysis/trackStats.ts` import source

### Typecheck gate

- [ ] T055 [US2] Run `pnpm -r typecheck` — every TypeScript workspace compiles cleanly. Zero `as any` or `@ts-expect-error` introductions at migration sites — SC-003.
- [ ] T056 [US2] Run `uv run pyright` — Python strict typecheck green.

### VS Code Webview E2E — null-geometry no-drop (review 10A)

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip or omit Playwright E2E tasks because you think browsers can't be installed. The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Full details: `docs/project_notes/playwright-installation-research.md`.

- [ ] T057 [US2][test] Create E2E fixture REP file at `tests/e2e/fixtures/null-geometry.rep` — 2 tracks, one with a null-geometry row.
- [ ] T058 [US2][test] Create Playwright spec `tests/e2e/test-null-geometry-no-drop.spec.ts` — open the fixture via the VS Code command palette, assert the layer count matches the fixture's feature count (no drop), assert one layer renders with `geometry.type === "Point"` and `coordinates.length === 0`.
- [ ] T059 [US2][test] Add any new page-object selectors needed for the null-geometry assertion under `tests/e2e/models/`.
- [ ] T060 [US2][test] Run webview E2E: `xvfb-run --auto-servernum npx playwright test --config tests/e2e/playwright.config.ts test-null-geometry-no-drop`. Capture the trace bundle as evidence.

**Checkpoint**: Consumer migration complete, `task verify` green, the silent-drop guard is dead, the null-geometry E2E passes. US3 guard rails can follow.

---

## Phase 5: User Story 3 — Guard rails prevent reintroduction (Priority: P3)

**Goal**: A future contributor who reaches for "just a loose GeoJSON Feature type" is redirected by (a) a prominent parse-boundary docstring on the generated `RawGeoJSONFeature` type, and (b) an ADR entry in `docs/project_notes/decisions.md` that the memory-aware review protocol surfaces.

**Independent Test**: Inspect `shared/schemas/src/generated/typescript/types.ts` — the `RawGeoJSONFeature` declaration is preceded by a non-empty docstring naming it as a parse-boundary type and pointing to `DebriefFeature` narrowing (FR-008, SC-010). Inspect `docs/project_notes/decisions.md` — an ADR entry exists with today's date, naming the three deleted duplicates, the two new classes, the `designates_type` relaxation, and the 14A validation-boundary rule.

### Docstring propagation

- [ ] T061 [US3] Verify the `RawGeoJSONFeature` LinkML `description:` block in `shared/schemas/src/linkml/raw-geojson.yaml` (authored in T006) explicitly (a) names it as a parse-boundary type, (b) directs the reader to narrow to `DebriefFeature` past the boundary, (c) references the existing `isDebriefFeature` / `isTrackFeature` type guards in `@debrief/schemas/unions.ts`. If the description is insufficient, edit and re-run `make generate`.
- [ ] T062 [US3] Inspect generated artefacts to confirm the docstring propagates: `shared/schemas/src/generated/typescript/types.ts` and `shared/schemas/src/generated/python/debrief_schemas/__init__.py` both carry the parse-boundary docstring on `RawGeoJSONFeature`. SC-010.

### ADR entry

- [ ] T063 [US3] Append a dated ADR entry to `docs/project_notes/decisions.md` with the next free ADR number. Required content: (a) names the three deleted hand-typed duplicates (`shared/utils` interface, `services/session-state` interface, `services/stac` `dict[str, Any]` alias); (b) names the two new classes (`RawGeoJSONFeature`, `RawGeoJSONFeatureCollection`); (c) explicitly documents the narrow relaxation of the spec's Out-of-Scope list for the `designates_type: true` additive annotation on `geojson.yaml` geometry classes (review 13A); (d) records the 14A one-validation-per-ingress-boundary rule so future reviewers can point to it; (e) links to `specs/204-rawgeojsonfeature-linkml/spec.md`. FR-019, SC-007.

**Checkpoint**: All three user stories complete. Guard rails in place. Ready for evidence capture + PR.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full CI pass, evidence collection for the Schema Change feature type, media announcement content, and PR creation.

### Final verification

- [ ] T064 Run `task verify` on the final commit — full CI parity. Capture stdout/stderr to `specs/204-rawgeojsonfeature-linkml/evidence/ci-pipeline.txt`. Zero failures attributable to the migration — SC-005.

### Evidence Collection (REQUIRED)

- [ ] T065 Capture test summary using template `.specify/templates/evidence/test-summary-template.md` in `specs/204-rawgeojsonfeature-linkml/evidence/test-summary.md`. YAML front matter MUST include `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`. Body describes: extended schema-adherence coverage (7 + 5 + 5 fixtures), null-geometry coercion unit tests, null-geometry Playwright E2E, session-state behaviour-unchanged sweep, 10 000-feature perf bench result.
- [ ] T066 Create usage demonstration in `specs/204-rawgeojsonfeature-linkml/evidence/usage-example.md` — minimal code snippets (Python + TypeScript) showing `import` + consumption of `RawGeoJSONFeature`, covering the three id-shape variants (string, integer, absent) and the null-properties case.
- [ ] T067 [P] Create round-trip proof in `specs/204-rawgeojsonfeature-linkml/evidence/round-trip-evidence.md` — table of the 3 canonical fixtures with the column sequence [Python validate → dump | TS parse → stringify | Python re-validate | byte-identical? ✓] showing all ✓ (SC-008). Embed the `test_roundtrip.py` output inline.
- [ ] T068 [P] Capture grep-before-after evidence in `specs/204-rawgeojsonfeature-linkml/evidence/grep-before-after.txt` — run `rg -nw "interface GeoJSONFeature" shared/ services/ apps/` and `rg -nw "GeoJSONFeature: TypeAlias" services/` twice: once on `main`, once on the PR branch. PR-branch output MUST be empty (SC-001, SC-002).
- [ ] T069 [P] Capture perf-bench output in `specs/204-rawgeojsonfeature-linkml/evidence/perf-bench.txt` — `uv run pytest shared/schemas/tests/test_designates_type_perf.py -v -s` with the wall-clock line visible. Must show ≤ 500 ms (review 13A).
- [ ] T070 [P] Copy the Playwright trace bundle (from T060) to `specs/204-rawgeojsonfeature-linkml/evidence/null-geometry-e2e-trace.zip` so reviewers can replay the no-drop assertion.

### Media Content

- [ ] T071 Create shipped blog post at `specs/204-rawgeojsonfeature-linkml/media/shipped-post.md`. Spawn the Content Specialist via the Task tool (subagent_type `general-purpose`, reading `.claude/agents/media/content.md`) and supply: feature name, goal from spec.md, key accomplishments (3 constitutional articles addressed, perf number, E2E coverage), screenshots not applicable (Schema Change feature), lessons learned (review phase surfaced Article I.3 silent-drop that the spec missed). Follow the Shipped Post template.
- [ ] T072 [P] Create LinkedIn shipped summary at `specs/204-rawgeojsonfeature-linkml/media/linkedin-shipped.md` — 150-200 words, strong hook (before/after grep numbers), link to shipped-post.md.

### PR Creation

- [ ] T073 Create PR and publish blog: run `/speckit.pr`

**Task T073 must run last. It depends on ALL tasks T001-T072 being complete: evidence directory populated, shipped + LinkedIn drafts ready, `task verify` green on the tip commit. `/speckit.pr` creates the feature PR in debrief-future and a cross-repo PR to debrief.github.io with the shipped post.**

---

## Dependencies

### Phase order

- **Phase 1 (Setup)** — no dependencies; T001 must pass before any code changes.
- **Phase 2 (Foundational)** — blocks Phases 3, 4, 5. Every user story depends on the schema source and generated artefacts being coherent.
- **Phase 3 (US1, P1)** — depends on Phase 2. Delivers the canonical type + all adherence tests + the perf bench.
- **Phase 4 (US2, P2)** — depends on Phase 3 (the new type must exist before consumers can migrate to it).
- **Phase 5 (US3, P3)** — depends on Phase 2 for the docstring propagation, and on Phase 4 completing so the ADR can name what was deleted.
- **Phase 6 (Polish)** — depends on Phase 5. Evidence captures final state; PR task must run last.

### Within-phase task ordering

- **Phase 2**: T005 + T006 + T007 + T008 (schema edits) must complete before T009 (generate.py edit) before T010 (regen) before T011-T013 (artefact verification). Fixture directories T002/T003 can happen in parallel with schema edits.
- **Phase 3**: Fixtures T014-T016 can run in parallel; test-harness edits T017-T021 can start once fixtures exist; T022 (final pytest run) waits on all of them.
- **Phase 4**: Python ingress (T023-T029) is independent of TypeScript migration (T030+). Within TypeScript, the shared/utils deletion (T030-T033) must precede consumer-file updates (T034+) because those consumers import from `@debrief/utils`. The session-state sweep T036 waits on T034-T035. Component files T038-T042 can run in parallel once T037 is done. apps/vscode file edits T044-T047 are mostly parallel; T044 is the intentional silent-drop removal and should land as a single atomic edit. E2E tests T057-T060 wait on all consumer migration.
- **Phase 5**: T061 → T062 (docstring flow); T063 (ADR) can run in parallel with docstring verification.
- **Phase 6**: T064 must pass before evidence collection T065-T070 begins. Media tasks T071-T072 can run in parallel. T073 waits on everything.

### Parallel opportunities

| Batch | Tasks | Rationale |
|-------|-------|-----------|
| Phase 1 | T002, T003, T004 | Three independent `mkdir` operations |
| Phase 2 artefact verify | T011, T012, T013 | Read-only inspection of three separate generated files |
| Phase 3 fixture creation | T014, T015, T016 | Three independent fixture directories |
| Phase 3 typescript-usage.ts | T020 | Independent of the Python test-harness extensions |
| Phase 4 Python ingress tests | T027, T028 | Independent test files in different services |
| Phase 4 shared/utils consumer refresh | T032, T033 | Two files; neither imports the other |
| Phase 4 shared/components migration | T038, T039, T040, T041, T042 | 5 sibling files all importing from `@debrief/schemas` |
| Phase 4 apps/vscode file updates | T045, T046, T047 | 3 independent files, post-T044 |
| Phase 4 apps/loader IPC | T049, T050 | 2 sibling files |
| Phase 4 apps/web-shell tools | T051, T052, T053, T054 | 4 sibling files, zero interdependencies |
| Phase 6 evidence capture | T067, T068, T069, T070 | 4 different output files, each reads a different source |
| Phase 6 media | T072 (parallel with T071) | LinkedIn summary is independent of the blog post draft |

---

## Implementation Strategy

### Incremental delivery (single atomic PR per SC-009)

Although this work ships as one atomic PR, the phases provide natural commit boundaries inside it so reviewers can follow the logic step-by-step:

1. **Commits 1-4** (Phase 2 Foundational): schema source edits + generator post-processor + regenerated artefacts. A single logical unit. `task verify` green on the generated artefacts alone proves the schema side.
2. **Commits 5-6** (Phase 3): fixtures + extended schema adherence tests + perf bench. The green pytest run here is the contract that the new type IS the authoritative one before consumers touch it.
3. **Commits 7-11** (Phase 4): consumer migration in dependency order — Python ingress first (services land the coercion shim), then shared/utils/types cleanup, then shared/components, then apps/vscode (including the silent-drop removal commit — flagged explicitly so reviewers see the Article I.3 resolution), then apps/loader + apps/web-shell, finally the E2E spec + Playwright trace.
4. **Commit 12** (Phase 5): ADR + docstring propagation check.
5. **Commit 13** (Phase 6): evidence + media drafts.
6. **PR creation** (T073): opens the feature PR and the cross-repo blog PR.

### Risk-mitigation ordering

- **Ingress coercion shim before `mapPanel.ts` silent-drop removal**: T024/T025 MUST land before T044. If the order is reversed, the CI run between those tasks could drop features at import without the guard, exposing Article I.3 regression even inside the PR sequence.
- **Generator post-processor before regen**: T009 before T010. If regen runs without the new string-replacements, the TS output loses `id?: string | number` and `properties?: Record<string, unknown> | null`, which cascades into compile errors across every consumer.
- **Fixture creation before test-harness extensions**: T014-T016 before T017-T021. A pytest run that can't find the fixture files fails fast with the wrong kind of error.
- **`designates_type` before perf bench**: T005 is in Phase 2, T021 is in Phase 3. If T021 runs without T005 having landed, the 10 000-feature validation costs ~3 s and the bench reports a false regression.

### Parallel-team strategy

- **One-developer execution** (expected): work phases in order, parallelising the [P] batches within each phase. Total effort ~1-2 days.
- **Two-developer execution** (optional): after Phase 2 is green, Developer A takes Phase 3 + the Python ingress half of Phase 4 (T023-T029); Developer B takes the TypeScript consumer half of Phase 4 (T030-T054). They meet at T055-T060 (typecheck + E2E).

### Rollback plan

If the migration uncovers a blocking issue (e.g., a generator-emitted Pydantic union that fails Pydantic v2 discriminator validation on payload edge cases), revert the branch commit-by-commit back to the Phase 2 boundary. The schema source is then authoritative but disconnected from consumers — a non-user-visible intermediate state that still satisfies `task verify` because the old duplicates are also still intact at that commit. No users are affected because the branch has not been merged.

---

## Notes

- Every [P] task in the same phase operates on a different file; they can be launched concurrently via the Task tool or handled as a parallel batch in a single session.
- Evidence artefacts are the contract between this feature and the reviewer; T065-T070 are non-optional.
- The PR task T073 runs `/speckit.pr`, which creates both the feature PR in `debrief-future` and a blog-post PR in `debrief.github.io`. Both URLs are reported back.
- Avoid `--no-verify`: if a pre-commit hook fails, investigate — the hook set runs ruff/eslint/typecheck inline.
- The single-PR constraint (SC-009) means rebasing or splitting mid-stream is not an option; keep commits linear.
