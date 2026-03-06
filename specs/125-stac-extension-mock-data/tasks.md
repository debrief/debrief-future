# Tasks: STAC Extension Spec + Mock Data Fixtures

**Input**: Design documents from `/specs/125-stac-extension-mock-data/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/
**Review findings incorporated**: Issues 1A, 3A, 5A, 7A, 10A, 11A, 12A from /speckit.review

---

## Evidence Requirements

**Evidence Directory**: `specs/125-stac-extension-mock-data/evidence/`
**Media Directory**: `specs/125-stac-extension-mock-data/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest results: schema validation, fixture validation, round-trip | After all tests pass |
| usage-example.md | Python + TypeScript code loading and filtering fixtures | After fixtures generated |
| round-trip-evidence.md | Python → JSON → TypeScript → JSON proof | After LinkML integration complete |
| validation-output.txt | Full pytest output showing 100 fixtures validate | After fixture generation |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | Created during /speckit.plan |
| media/linkedin-planning.md | LinkedIn summary for planning | Created during /speckit.plan |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Purpose**: Create directories and initialize project structure

- [ ] T001 Create fixture directory structure `shared/schemas/fixtures/stac-browser/`
- [ ] T002 [P] Create evidence directory `specs/125-stac-extension-mock-data/evidence/`

---

## Phase 2: Foundation — LinkML Schema Module (Blocking)

**Purpose**: The LinkML schema is the single source of truth (Constitution Article II). All downstream work — fixture generation, validation tests, TypeScript types — depends on this schema existing and generating correctly.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T003 [US-ALL] Create LinkML schema module `shared/schemas/src/linkml/stac-extension.yaml`
  - Define `StacExtensionProperties` class with 6 properties under `debrief:` namespace
  - `debrief:vessel_classes`: string[] with pattern `^[a-z0-9-]+(/[a-z0-9-]+){0,3}$` (4 levels per review issue 11A)
  - `debrief:tags`: string[] (trimmed, no duplicates)
  - `debrief:feature_tags`: string[] (trimmed, no duplicates)
  - `debrief:author`: string (optional)
  - `debrief:track_names`: string[] (trimmed, no duplicates)
  - `debrief:nationalities`: string[] with pattern `^[A-Z]{2}$` (ISO alpha-2 per review issue 5A)
  - All properties optional
  - Use `slot_uri: debrief:propertyname` per existing tool-result.yaml pattern
  - Use prefix `debrief: https://debrief.info/schemas/` (NOT `https://debrief.com/` — see review domain mismatch note)
- [ ] T004 [US-ALL] Add stac-extension import to root schema `shared/schemas/src/linkml/debrief.yaml`
- [ ] T005 [US-ALL] Run schema generation and verify output `shared/schemas/scripts/generate.py`
  - Pydantic model generates with correct types (no `Any`)
  - TypeScript types generate with correct property names
  - JSON Schema generates with regex patterns
  - Existing tests still pass (`uv run pytest` in shared/schemas)

**Checkpoint**: LinkML schema generates valid Pydantic + TypeScript + JSON Schema. Existing tests pass.

---

## Phase 3: User Story 1 — Extension Property Contract (Priority: P1)

**Goal**: Deliver a formal, documented contract specifying extension property names, types, and constraints that all E08 downstream components can reference.

**Independent Test**: Load a fixture item.json and confirm all extension properties are present, correctly named, and conform to documented types.

### Tests for User Story 1

- [ ] T006 [test] [US1] Write golden fixture validation tests `shared/schemas/tests/test_stac_extension.py`
  - Test valid fixture passes Pydantic model validation
  - Test all 6 extension properties are correctly typed
  - Test no conflict with existing STAC core properties
- [ ] T007 [P][test] [US1] Write invalid fixture tests `shared/schemas/tests/test_stac_extension.py`
  - Test uppercase vessel_classes path fails (e.g., `SURFACE/WARSHIP`)
  - Test non-alpha-2 nationality fails (e.g., `Great Britain`)
  - Test duplicate tags fail (`["ASW", "ASW"]`)
  - Test empty string in array fails (`["", "training"]`)
  - Test vessel_classes path with 5+ segments fails

### Implementation for User Story 1

- [ ] T008 [US1] Create valid golden fixture file `shared/schemas/fixtures/stac-browser/valid/extension-basic.json`
  - Complete STAC item with all 6 extension properties populated
  - Use the example-item.json from contracts/ as starting point
  - Add `stac_extensions` array with extension URI
- [ ] T009 [P] [US1] Create invalid golden fixture files `shared/schemas/fixtures/stac-browser/invalid/`
  - `invalid-uppercase-vessel.json` — uppercase vessel_classes path
  - `invalid-nationality-name.json` — non-alpha-2 nationality
  - `invalid-duplicate-tags.json` — duplicate entries in tags array
  - `invalid-empty-string.json` — empty string in array
- [ ] T010 [US1] Run tests and verify valid passes, invalid fails
- [ ] T011 [US1] Delete hand-written JSON Schema (per review issue 1A) — remove `specs/125-stac-extension-mock-data/contracts/stac-extension-schema.json`

**Checkpoint**: Extension contract is machine-enforceable via LinkML-generated schema. Valid fixtures pass, invalid fixtures fail.

---

## Phase 4: User Story 2 — Mock Data Fixtures (Priority: P2)

**Goal**: Generate 100 realistic STAC item.json fixtures covering variety in vessel classes, tags, authors, durations, geographic extents, time ranges, and nationalities.

**Independent Test**: Load all 100 fixtures, verify count, filter by each property type, confirm non-empty results with realistic selectivity (5-80% per filter).

### Tests for User Story 2

- [ ] T012 [test] [US2] Write fixture distribution tests `shared/schemas/tests/test_stac_extension.py`
  - Test exactly 100 items load successfully
  - Test all items validate against Pydantic model
  - Test at least 5 distinct vessel classes represented
  - Test at least 6 distinct nationalities (alpha-2 codes)
  - Test at least 10 distinct authors
  - Test geographic extents span 4+ regions
  - Test all 5 duration buckets represented
  - Test selectivity: each single-property filter returns 5-80% of items
  - Test edge cases: at least 3 zero-track items, at least 3 items with 5+ tracks
  - Test at least 3 single-timestamp items (no start/end datetime)

### Implementation for User Story 2

- [ ] T013 [US2] Create vessel taxonomy reference file `shared/schemas/fixtures/stac-browser/vessel-taxonomy.json`
  - 4-level hierarchy: domain > role > class > type (per review issue 11A)
  - Add `unknown` root node (per review issue 7A)
  - 2 domains (surface, subsurface) + unknown
  - 19 leaf types + unknown = 20 total
- [ ] T014 [US2] Write deterministic fixture generator script `shared/schemas/scripts/generate-stac-fixtures.py`
  - Seeded RNG for reproducibility (Constitution Article I.4)
  - Read vessel taxonomy from vessel-taxonomy.json
  - Generate 100 items with distributions from data-model.md:
    - Duration buckets: <6H ~15, <24H ~25, <72H ~30, <10D ~20, >10D ~10
    - Geographic regions: N.Atlantic ~30, Med ~25, Indo-Pacific ~20, Arctic ~10, S.Atlantic ~10, Indian Ocean ~5
    - Nationalities: ISO alpha-2 codes only (GB, US, FR, DE, NO, SE, etc.)
    - 10-12 distinct authors, 15-20 distinct tags
    - Track counts: 0 tracks ~5, 1-2 ~30, 3-4 ~40, 5+ ~25
    - Year range: 2020-2026
  - Include named edge cases: empty-plot, multi-nation, single-point, long-duration, dense-tracks
  - Each item gets own directory: `exercise-NNN/item.json`
  - Generate realistic exercise names, descriptions, coordinates
  - Set `stac_extensions` to include extension URI
  - Include valid `links` (root, parent, self) and `assets` (data GeoJSON reference)
- [ ] T015 [US2] Create root STAC catalog `shared/schemas/fixtures/stac-browser/catalog.json`
  - Links to all 100 exercise item.json files
  - Valid STAC 1.0.0 catalog structure
- [ ] T016 [US2] Run generator and commit output fixtures
- [ ] T017 [US2] Run distribution tests — verify all acceptance criteria pass

**Checkpoint**: 100 fixture items committed, all validate, distribution tests pass. Ready for Storybook consumption.

---

## Phase 5: User Story 3 — Schema Integration (Priority: P3)

**Goal**: Ensure LinkML-generated models (Pydantic, TypeScript) correctly validate all 100 fixtures and maintain round-trip fidelity.

**Independent Test**: Generate models from LinkML, validate all fixtures against Pydantic model, verify TypeScript types include all property names.

### Tests for User Story 3

- [ ] T018 [test] [US3] Write round-trip test for extension properties `shared/schemas/tests/test_stac_extension.py`
  - Serialize fixture extension properties to JSON via Pydantic
  - Deserialize back to Pydantic model
  - Assert equality (field-by-field comparison)
- [ ] T019 [P][test] [US3] Write schema comparison test `shared/schemas/tests/test_stac_extension.py`
  - Verify generated JSON Schema includes all 6 extension properties
  - Verify regex patterns match specification
  - Verify existing schema tests still pass after import

### Implementation for User Story 3

- [ ] T020 [US3] Validate all 100 fixtures against generated Pydantic model `shared/schemas/tests/test_stac_extension.py`
  - Parametrized test: load each fixture, extract extension properties, validate
  - Report any fixtures that fail with specific error
- [ ] T021 [US3] Verify TypeScript types include extension properties
  - Check generated `types.ts` contains `StacExtensionProperties` type
  - All 6 properties present with correct types
- [ ] T022 [US3] Run full test suite to confirm no regressions
  - `uv run pytest` in shared/schemas
  - `pnpm -r typecheck` for TypeScript

**Checkpoint**: Schema generates correctly, all fixtures validate, no regressions. Round-trip proof captured.

---

## Phase 6: User Story 4 — Duration Decision Documentation (Priority: P4)

**Goal**: Document the duration representation decision with rationale, ensuring downstream filter components (#126) know whether to compute or read duration.

**Independent Test**: Review research.md R3 section and verify it explicitly answers "stored or computed?" with rationale.

### Implementation for User Story 4

- [ ] T023 [US4] Verify duration decision is documented in research.md R3
  - Confirm decision: computed from `start_datetime` and `end_datetime` at query time
  - Confirm rationale is clear (avoids redundancy, avoids staleness)
  - Confirm fixture items do NOT include a stored duration property
- [ ] T024 [US4] Verify fixtures with single-timestamp items handle duration correctly
  - Items with only `datetime` (no start/end) → duration is zero/undefined
  - At least 3 such fixtures exist (from edge case requirements)

**Checkpoint**: Duration decision documented and demonstrated in fixtures.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Fix documentation to reflect review findings, collect evidence, create media content.

### Review Finding Corrections

- [ ] T025 Update spec.md: change "3 levels" to "4 levels" throughout `specs/125-stac-extension-mock-data/spec.md`
  - FR-004: "at least 4 levels (domain > role > class > type)"
  - SC-006: "at least 4 levels and 20 leaf-node vessel types" (19 + unknown)
- [ ] T026 [P] Update research.md R4: change "Three-level hierarchy" to "Four-level hierarchy" `specs/125-stac-extension-mock-data/research.md`
- [ ] T027 [P] Update data-model.md: fix taxonomy description and add `unknown` node `specs/125-stac-extension-mock-data/data-model.md`
  - Change "3 levels" to "4 levels: domain > role > class > type"
  - Add `unknown` root node to taxonomy tree
  - Update total: "3 domains, 8 roles, 20 leaf types"
  - Update regex from `{0,2}` to `{0,3}`
- [ ] T028 [P] Update plan.md: fix "19-type" references to "20-type" `specs/125-stac-extension-mock-data/plan.md`
- [ ] T029 Add backlog entry for plot-save extension property population `BACKLOG.md`
  - Description: "Update plot-save to populate STAC extension properties (debrief:vessel_classes, tags, author, track_names, nationalities) in item.json on save"
  - Depends on: #125
  - Category: Enhancement
  - Epic: E08

### Evidence Collection (REQUIRED)

- [ ] T030 Capture test summary using template `specs/125-stac-extension-mock-data/evidence/test-summary.md`
  - Use `.specify/templates/evidence/test-summary-template.md`
  - Include YAML front matter with git_sha, captured_at, test counts
- [ ] T031 Create usage demonstration `specs/125-stac-extension-mock-data/evidence/usage-example.md`
  - Python: load fixture, validate with Pydantic, filter by vessel class
  - TypeScript: load fixture, access typed properties
- [ ] T032 [P] Capture round-trip proof `specs/125-stac-extension-mock-data/evidence/round-trip-evidence.md`
  - Python Pydantic → JSON → Python Pydantic round-trip for extension properties
- [ ] T033 [P] Capture validation output `specs/125-stac-extension-mock-data/evidence/validation-output.txt`
  - Full pytest output showing all 100 fixtures validate

### Media Content

- [ ] T034 Create shipped blog post `specs/125-stac-extension-mock-data/media/shipped-post.md`
- [ ] T035 [P] Create LinkedIn shipped summary `specs/125-stac-extension-mock-data/media/linkedin-shipped.md`

### Quickstart Validation

- [ ] T036 Validate quickstart.md code examples still work `specs/125-stac-extension-mock-data/quickstart.md`

### PR Creation

- [ ] T037 Create PR and publish blog: run /speckit.pr

**Task T037 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1 Contract)**: Depends on Phase 2 — can run after schema generates
- **Phase 4 (US2 Fixtures)**: Depends on Phase 2 — can run in parallel with Phase 3
- **Phase 5 (US3 Integration)**: Depends on Phase 3 AND Phase 4 — needs both schema and fixtures
- **Phase 6 (US4 Duration)**: Depends on Phase 4 — needs fixtures to verify
- **Phase 7 (Polish)**: Depends on all previous phases

### User Story Dependencies

- **US1 (Contract)**: Depends on Foundation only — first to complete
- **US2 (Fixtures)**: Depends on Foundation only — can run parallel with US1
- **US3 (Integration)**: Depends on US1 + US2 — validates everything together
- **US4 (Duration)**: Depends on US2 — verifies fixture duration handling

### Parallel Opportunities

- T002 can run parallel with T001 (setup)
- T006/T007 can run parallel (valid/invalid tests)
- T008/T009 can run parallel (valid/invalid fixtures)
- Phase 3 and Phase 4 can run in parallel after Foundation
- T025/T026/T027/T028 can run parallel (doc updates)
- T032/T033 can run parallel with T030/T031 (evidence collection)
- T034/T035 can run parallel (media content)

---

## Parallel Example: Phase 3 + Phase 4

```bash
# After Phase 2 (Foundation) completes, launch both in parallel:

# Stream 1: US1 — Contract validation
Task: T006 Write golden fixture validation tests
Task: T007 Write invalid fixture tests (parallel with T006)
Task: T008 Create valid golden fixture
Task: T009 Create invalid golden fixtures (parallel with T008)
Task: T010 Run tests
Task: T011 Delete hand-written JSON Schema

# Stream 2: US2 — Fixture generation (can run simultaneously)
Task: T012 Write distribution tests
Task: T013 Create vessel taxonomy
Task: T014 Write fixture generator
Task: T015 Create root catalog
Task: T016 Run generator
Task: T017 Run distribution tests
```

---

## Implementation Strategy

### Incremental Delivery

1. Complete Setup + Foundation → Schema generates, existing tests pass
2. Add US1 (Contract) → Valid/invalid fixtures prove schema enforcement
3. Add US2 (Fixtures) → 100 items generated, distribution verified
4. Add US3 (Integration) → Round-trip proof, full regression check
5. Add US4 (Duration) → Decision documented, fixtures demonstrate it
6. Polish → Docs fixed, evidence captured, PR created
7. Each story adds value without breaking previous stories

### Key Implementation Notes

- LinkML schema module is the foundation — get it right before generating fixtures
- Fixture generator is deterministic (seeded RNG) — committed output is the gold standard
- Review findings (4 levels, alpha-2 nationalities, `unknown` node) must be incorporated during implementation, not deferred
- The hand-written JSON Schema in `contracts/` is deleted during Phase 3 (T011) per review decision 1A

---

## Notes

- [P] tasks = different files, no dependencies
- [US#] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
