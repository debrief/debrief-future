# Tasks: LinkML Per-Platform Override Fields

**Input**: Design documents from `/specs/181-linkml-platform-overrides/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

---

## Evidence Requirements

**Evidence Directory**: `specs/181-linkml-platform-overrides/evidence/`
**Media Directory**: `specs/181-linkml-platform-overrides/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest + vitest results across schema, service, and component tests | After all tests pass |
| usage-example.md | Python + TypeScript code showing PlatformRecord validation | After type generation complete |
| round-trip-evidence.md | Python -> JSON -> TypeScript -> JSON round-trip proof for new types | After round-trip tests pass |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan (done) |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan (done) |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Purpose**: Branch hygiene and schema infrastructure preparation

- [ ] T001 Verify branch 181-linkml-platform-overrides is up to date with main
- [ ] T002 Verify `make generate` runs successfully in `shared/schemas/` before any changes (baseline)

---

## Phase 2: Foundation — Schema Changes (Blocking)

**Purpose**: LinkML source-of-truth changes that MUST be complete before any generated types, fixtures, or consumer code can be updated.

**CRITICAL**: No downstream work (Phases 3-7) can begin until this phase is complete.

### Move VesselDomainEnum

- [ ] T003 Move VesselDomainEnum from stac-extension.yaml to common.yaml `shared/schemas/src/linkml/common.yaml`
- [ ] T004 Remove VesselDomainEnum from stac-extension.yaml and add `common` import `shared/schemas/src/linkml/stac-extension.yaml`

### Add Override Fields to TrackProperties

- [ ] T005 Add six optional override fields (display_name, nationality, vessel_class, vessel_type, vessel_role, domain) to TrackProperties `shared/schemas/src/linkml/geojson.yaml`

### Add PlatformRecord and Replace Flat Fields

- [ ] T006 Define PlatformRecord class with id (required), name, nationality, vessel_class, vessel_type, vessel_role, domain (all optional) `shared/schemas/src/linkml/stac-extension.yaml`
- [ ] T007 Add platforms field (optional, multivalued PlatformRecord) to StacExtensionProperties `shared/schemas/src/linkml/stac-extension.yaml`
- [ ] T008 Remove vessel_classes, nationalities, track_names from StacExtensionProperties `shared/schemas/src/linkml/stac-extension.yaml`
- [ ] T009 Add platforms field (optional, multivalued PlatformRecord) to StacItemSummary `shared/schemas/src/linkml/stac-extension.yaml`
- [ ] T010 Remove vessel_classes, nationalities, track_names from StacItemSummary `shared/schemas/src/linkml/stac-extension.yaml`

### Regenerate Types

- [ ] T011 Run `make generate` to regenerate Pydantic, TypeScript, and JSON Schema from updated LinkML `shared/schemas/Makefile`
- [ ] T012 Verify generated Pydantic model includes TrackProperties override fields and PlatformRecord `shared/schemas/src/generated/python/debrief_schemas/__init__.py`
- [ ] T013 Verify generated TypeScript types include TrackProperties override fields and PlatformRecord `shared/schemas/src/generated/typescript/types.ts`

**Checkpoint**: Schema source of truth updated, types regenerated. Generated types will have new fields and missing old fields — consumer code will not compile yet.

---

## Phase 3: User Story 1 — Schema Declares Per-Platform Override Fields (Priority: P1)

**Goal**: Validate that the six new optional fields on TrackProperties work correctly via golden fixtures.

**Independent Test**: Run `uv run pytest tests/test_golden.py -v` in `shared/schemas/` — new valid fixtures pass, new invalid fixtures fail, existing fixtures still pass.

### Implementation

- [ ] T014 [P] Create valid fixture: TrackFeature with all six override fields populated `shared/schemas/src/fixtures/valid/track-feature-platform-overrides-01.json`
- [ ] T015 [P] Create valid fixture: TrackFeature with partial overrides (display_name only) `shared/schemas/src/fixtures/valid/track-feature-platform-overrides-minimal-01.json`
- [ ] T016 [P] Create invalid fixture: TrackFeature with three-letter nationality code `shared/schemas/src/fixtures/invalid/track-feature-invalid-nationality.json`
- [ ] T017 [P] Create invalid fixture: TrackFeature with domain value outside VesselDomainEnum `shared/schemas/src/fixtures/invalid/track-feature-invalid-domain.json`
- [ ] T018 Run golden fixture tests to verify new TrackFeature fixtures pass/fail correctly `shared/schemas/tests/test_golden.py`

**Checkpoint**: TrackProperties override fields validated via golden fixtures.

---

## Phase 4: User Story 2 — Flat Aggregates Replaced by Structured Platform Array (Priority: P1)

**Goal**: Validate that `debrief:platforms` works in STAC extension fixtures and the old flat fields are gone.

**Independent Test**: Run `uv run pytest tests/test_stac_extension.py -v` in `shared/schemas/` — all STAC extension tests pass with platforms format.

### STAC Extension Fixtures

- [ ] T019 [P] Create valid fixture: StacExtensionProperties with fully-populated platforms array `shared/schemas/fixtures/stac-browser/valid/extension-platforms-full.json`
- [ ] T020 [P] Create valid fixture: StacExtensionProperties with sparse platform record (id only) `shared/schemas/fixtures/stac-browser/valid/extension-platforms-sparse.json`
- [ ] T021 [P] Create invalid fixture: PlatformRecord with three-letter nationality `shared/schemas/fixtures/stac-browser/invalid/invalid-platform-nationality.json`
- [ ] T022 Update extension-basic.json: replace flat fields with platforms array `shared/schemas/fixtures/stac-browser/valid/extension-basic.json`
- [ ] T023 [P] Update extension-partial-path.json: replace flat fields with platforms array `shared/schemas/fixtures/stac-browser/valid/extension-partial-path.json`
- [ ] T024 [P] Update extension-empty-arrays.json: replace flat fields with empty platforms array `shared/schemas/fixtures/stac-browser/valid/extension-empty-arrays.json`
- [ ] T025 Update invalid-uppercase-vessel.json: repurpose for platforms[].vessel_class uppercase test `shared/schemas/fixtures/stac-browser/invalid/invalid-uppercase-vessel.json`

### Exercise Fixture Regeneration

- [ ] T026 Update exercise fixture generation script to produce debrief:platforms instead of flat aggregate fields `shared/schemas/scripts/generate-stac-fixtures.py`
- [ ] T027 Regenerate all 100 exercise fixtures with debrief:platforms format `shared/schemas/fixtures/stac-browser/`

### STAC Extension Test Updates

- [ ] T028 Update test_stac_extension.py: remove flat-field assertions, add platforms validation and round-trip tests `shared/schemas/tests/test_stac_extension.py`
- [ ] T029 Run STAC extension tests to verify all pass `shared/schemas/tests/test_stac_extension.py`

**Checkpoint**: All STAC extension fixtures use platforms format, no flat aggregate fields remain in fixtures or schema.

---

## Phase 5: User Story 3 — Consumer Code Migrated to Platforms (Priority: P1)

**Goal**: All TypeScript and Python consumer code compiles and passes tests using `platforms` instead of removed flat fields.

**Independent Test**: Run `task verify` — lint, typecheck, and all tests pass with zero failures.

### TypeScript Type Definitions

- [ ] T030 Update StacBrowserItem: replace vesselClasses, nationalities, trackNames with platforms array `apps/vscode/src/types/stac.ts`
- [ ] T031 [P] Update CatalogOverviewItem: replace flat fields with platforms array `shared/components/src/filter-engine/types.ts`
- [ ] T032 [P] Update ExerciseListView types: replace flat fields with platforms `shared/components/src/ExerciseListView/types.ts`
- [ ] T033 [P] Update CatalogItem message type: replace flat fields with platforms `apps/vscode/src/webview/messages.ts`

### TypeScript Services and Data Layer

- [ ] T034 Update stacService.ts: read debrief:platforms from STAC item properties, map to camelCase platforms on StacBrowserItem `apps/vscode/src/services/stacService.ts`
- [ ] T035 [P] Update catalogOverviewPanel.ts: map platforms to message format `apps/vscode/src/panels/catalogOverviewPanel.ts`
- [ ] T036 [P] Update web-shell App.tsx: transform platforms to CatalogOverviewItem format `apps/web-shell/src/App.tsx`

### Filter Engine Migration

- [ ] T037 Update matchers.ts: match on platforms[].vessel_class and platforms[].nationality instead of flat arrays `shared/components/src/filter-engine/matchers.ts`
- [ ] T038 [P] Update cql2-json.ts: update STAC property name mappings for platforms `shared/components/src/filter-engine/cql2-json.ts`
- [ ] T039 Update useDistinctValues.ts: derive distinct nationalities, vessel classes, track names from platforms array `shared/components/src/FilterBar/useDistinctValues.ts`
- [ ] T040 [P] Update useTaxonomyMatchCounts.ts: iterate platforms[].vessel_class for counting `shared/components/src/FilterBar/useTaxonomyMatchCounts.ts`
- [ ] T041 [P] Update ExerciseListItemRow.tsx: derive vessel classes from platforms for display `shared/components/src/ExerciseListView/ExerciseListItemRow.tsx`

### Python Consumer Migration

- [ ] T042 Update collection.py: aggregate summaries from platforms array instead of flat fields `services/stac/src/debrief_stac/collection.py`
- [ ] T043 [P] Update models.py: CatalogSummaries uses platforms structure `services/stac/src/debrief_stac/models.py`
- [ ] T044 Update enrich-legacy-catalog.py: write debrief:platforms instead of flat aggregate properties `scripts/enrich-legacy-catalog.py`

### Mock Data and Stories

- [ ] T045 [P] Update web-shell mock stacService: use platforms in mock data `apps/web-shell/src/mocks/stacService.ts`
- [ ] T046 [P] Update StacBrowser stories: use platforms in mock items `shared/components/src/StacBrowser/StacBrowser.stories.tsx`
- [ ] T047 [P] Update FilterBar stories: use platforms in mock items `shared/components/src/FilterBar/FilterBar.stories.tsx`
- [ ] T048 [P] Update SavedFilters stories: use platforms in mock items `shared/components/src/FilterBar/SavedFilters.stories.tsx`
- [ ] T049 [P] Update TimelineView stories: use platforms in mock items `shared/components/src/TimelineView/TimelineView.stories.tsx`
- [ ] T050 [P] Update catalogOverview.tsx webview: derive display values from platforms `apps/vscode/src/webview/web/catalogOverview.tsx`

### Test Updates

- [ ] T051 [P] Update filter engine matchers.test.ts: mock data and assertions use platforms `shared/components/src/filter-engine/__tests__/matchers.test.ts`
- [ ] T052 [P] Update cql2-json.test.ts: property name assertions `shared/components/src/filter-engine/__tests__/cql2-json.test.ts`
- [ ] T053 [P] Update filter engine fixtures.ts: mock item builder uses platforms `shared/components/src/filter-engine/__tests__/fixtures.ts`
- [ ] T054 [P] Update useBrowserFilter.test.ts: mock items use platforms `shared/components/src/StacBrowser/__tests__/useBrowserFilter.test.ts`
- [ ] T055 [P] Update useDistinctValues.test.ts: mock data and assertions `shared/components/src/FilterBar/__tests__/useDistinctValues.test.ts`
- [ ] T056 [P] Update useTaxonomyMatchCounts.test.ts: mock data and assertions `shared/components/src/FilterBar/__tests__/useTaxonomyMatchCounts.test.ts`
- [ ] T057 [P] Update ExerciseListView test: mock data uses platforms `shared/components/src/ExerciseListView/ExerciseListView.test.tsx`
- [ ] T058 [P] Update ExerciseListView mockData.ts: fixtures use platforms `shared/components/src/ExerciseListView/__fixtures__/mockData.ts`
- [ ] T059 [P] Update timeline-helpers.test.ts: mock items use platforms `shared/components/src/utils/__tests__/timeline-helpers.test.ts`
- [ ] T060 [P] Update stacTreeProvider.test.ts: mock data uses platforms `apps/vscode/tests/unit/stacTreeProvider.test.ts`
- [ ] T061 [P] Update messages.test.ts: mock data uses platforms `apps/vscode/src/webview/messages.test.ts`
- [ ] T062 Update test_collection.py: summary assertions use platforms `services/stac/tests/test_collection.py`

### Verification

- [ ] T063 Run `task verify` — lint, typecheck, and all tests must pass with zero failures

**Checkpoint**: All consumer code migrated. Zero references to removed flat fields in source code. `task verify` passes.

---

## Phase 6: User Story 4 — Regenerated Types Match Schema (Priority: P2)

**Goal**: Confirm generated types are correct and round-trip tests pass.

**Independent Test**: Run round-trip tests: `uv run pytest tests/test_roundtrip.py -v` in `shared/schemas/`.

- [ ] T064 Verify TrackProperties round-trip: Python -> JSON -> Python with override fields `shared/schemas/tests/test_roundtrip.py`
- [ ] T065 [P] Verify PlatformRecord round-trip: Python -> JSON -> Python `shared/schemas/tests/test_roundtrip.py`
- [ ] T066 [P] Verify StacExtensionProperties round-trip with platforms array `shared/schemas/tests/test_stac_extension.py`
- [ ] T067 Run full schema test suite: `uv run pytest tests/ -v` in shared/schemas `shared/schemas/tests/`

**Checkpoint**: All round-trip tests pass, types are verified cross-language.

---

## Phase 7: User Story 5 — Golden Fixtures Updated (Priority: P2)

**Goal**: Complete fixture coverage confirmed — all valid pass, all invalid fail, no old-format fixtures remain.

**Independent Test**: Run `uv run pytest tests/test_golden.py tests/test_stac_extension.py -v` in `shared/schemas/`.

- [ ] T068 Verify all 100 exercise fixtures pass validation with platforms format `shared/schemas/tests/test_stac_extension.py`
- [ ] T069 Verify no fixture files contain debrief:vessel_classes, debrief:nationalities, or debrief:track_names
- [ ] T070 Run complete schema test suite one final time: `uv run pytest tests/ -v`

**Checkpoint**: All fixtures conform to updated schema. Full test suite green.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, evidence collection, media content, and PR creation.

### Final Verification

- [ ] T071 Run `task verify` (lint + typecheck + test) — must pass with zero failures
- [ ] T072 Grep source code for residual references to removed fields (vessel_classes, nationalities, track_names on STAC types) — confirm zero in non-documentation files

### Evidence Collection

- [ ] T073 Capture test results using template (.specify/templates/evidence/test-summary-template.md) `specs/181-linkml-platform-overrides/evidence/test-summary.md`
- [ ] T074 Create usage demonstration showing PlatformRecord validation in Python and TypeScript `specs/181-linkml-platform-overrides/evidence/usage-example.md`
- [ ] T075 [P] Capture round-trip proof (Python -> JSON -> TypeScript -> JSON) `specs/181-linkml-platform-overrides/evidence/round-trip-evidence.md`

### Media Content

- [ ] T076 Create shipped blog post `specs/181-linkml-platform-overrides/media/shipped-post.md`
- [ ] T077 [P] Create LinkedIn shipped summary `specs/181-linkml-platform-overrides/media/linkedin-shipped.md`

### PR Creation

- [ ] T078 Create PR and publish blog: run /speckit.pr

**Task T078 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 — BLOCKS all downstream phases
- **Phase 3 (US1 — Override Fields)**: Depends on Phase 2 (needs regenerated types)
- **Phase 4 (US2 — Platforms Array)**: Depends on Phase 2 (needs regenerated types); can run in parallel with Phase 3
- **Phase 5 (US3 — Consumer Migration)**: Depends on Phase 2 (needs regenerated types); can run in parallel with Phases 3-4 but benefits from fixture patterns established there
- **Phase 6 (US4 — Round-Trip Verification)**: Depends on Phase 2; can start after T011 (type generation)
- **Phase 7 (US5 — Fixture Completeness)**: Depends on Phases 3, 4 (all fixtures must exist)
- **Phase 8 (Polish)**: Depends on ALL prior phases

### User Story Dependencies

- **US1 (Override Fields)** and **US2 (Platforms Array)**: Independent — can proceed in parallel after Phase 2
- **US3 (Consumer Migration)**: Independent of US1/US2 at the code level (uses generated types directly), but practically benefits from running after fixture phases to validate
- **US4 (Round-Trip)**: Verification only — depends on types being generated (Phase 2)
- **US5 (Fixture Completeness)**: Depends on US1 + US2 (all fixtures must be created/updated first)

### Within Phase 5 (Consumer Migration)

- Type definitions (T030-T033) FIRST — these define the interfaces
- Services + filter engine (T034-T041) NEXT — depend on updated types
- Python consumers (T042-T044) can run in parallel with TypeScript services
- Mock data + stories (T045-T050) can run in parallel with services
- Tests (T051-T062) should update after their corresponding source files
- Final verification (T063) LAST

### Parallel Opportunities

- Phase 3 and Phase 4 can run in parallel (different fixture sets)
- Within Phase 4: T019-T025 are all independent fixture files — fully parallel
- Within Phase 5: T030-T033 (type defs) are parallel; T045-T050 (mocks/stories) are parallel; T051-T062 (tests) are parallel
- Phase 6 can start as soon as Phase 2 completes
- T074 and T075 (evidence) can run in parallel
- T076 and T077 (media) can run in parallel

---

## Parallel Example: Phase 5 Consumer Migration

```bash
# Step 1: Update all type definitions in parallel
T030: Update StacBrowserItem types
T031: Update CatalogOverviewItem types
T032: Update ExerciseListView types
T033: Update CatalogItem message type

# Step 2: Update services + filter engine (after types)
T034: Update stacService.ts
T035: Update catalogOverviewPanel.ts  (parallel)
T036: Update web-shell App.tsx  (parallel)
T037: Update matchers.ts
T038: Update cql2-json.ts  (parallel)
T039: Update useDistinctValues.ts
T040: Update useTaxonomyMatchCounts.ts  (parallel)
T041: Update ExerciseListItemRow.tsx  (parallel)

# Step 3: Python consumers (parallel with Step 2)
T042: Update collection.py
T043: Update models.py  (parallel)
T044: Update enrich-legacy-catalog.py

# Step 4: All mocks, stories, and tests (parallel batch)
T045-T062: All marked [P], can run in parallel

# Step 5: Final verification
T063: task verify
```

---

## Implementation Strategy

### Incremental Delivery

1. **Phase 2** (Foundation) → Schema is the source of truth — get this right first
2. **Phases 3-4** (Fixtures) → Validate the schema works via golden fixtures
3. **Phase 5** (Consumer Migration) → Propagate schema changes through the codebase
4. **Phase 6** (Round-Trip) → Prove cross-language consistency
5. **Phase 7** (Completeness) → Final sweep confirming no old-format data remains
6. **Phase 8** (Polish) → Evidence, media, PR

### Key Principle

The schema is the source of truth. Change it first (Phase 2), validate it with fixtures (Phases 3-4), then make everything else conform (Phase 5+). Never change consumer code before the schema is finalized.

---

## Notes

- [P] tasks = different files, no dependencies — safe to run in parallel
- All 100 exercise fixtures are script-generated — update the script then regenerate, don't hand-edit
- The `vessel_classes` root key in `shared/data/platform-registry.json` is the **registry's own structure** — it is NOT being renamed or removed
- Constitution Article XIV (Pre-Release Freedom) permits the breaking schema change
- Run `/speckit.pr` (T078) after all tasks complete to create PR with evidence
