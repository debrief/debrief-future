# Tasks: debrief-stac

**Input**: Design documents from `/specs/001-debrief-stac/`
**Prerequisites**: spec.md (required), ARCHITECTURE.md, tracer-delivery-plan.md
**Dependencies**: Stage 0 (Schemas) MUST be complete

**Tests**: Included per SC-006 requirement (>90% code coverage)

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Service location**: `services/stac/`
- **Package**: `debrief_stac`
- **Source**: `services/stac/src/debrief_stac/`
- **Tests**: `services/stac/tests/`

---

## Phase 1: Setup (Project Infrastructure)

**Purpose**: Initialize debrief-stac service with proper Python packaging

- [x] T001 Create service directory structure at services/stac/
- [x] T002 Initialize pyproject.toml with uv workspace configuration at services/stac/pyproject.toml
- [x] T003 [P] Create package __init__.py with version info at services/stac/src/debrief_stac/__init__.py
- [x] T004 [P] Configure pytest and test structure at services/stac/tests/conftest.py
- [x] T005 Add debrief-stac to root uv workspace in pyproject.toml
- [x] T006 [P] Create py.typed marker for type hints at services/stac/src/debrief_stac/py.typed

**Checkpoint**: Package installable via `uv pip install -e services/stac`

---

## Phase 2: Foundational (Core Types & Exceptions)

**Purpose**: Define STAC-specific types and error handling that all user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Define PlotMetadata Pydantic model at services/stac/src/debrief_stac/models.py
- [x] T008 Define STAC-specific exceptions (CatalogExistsError, PlotNotFoundError, etc.) at services/stac/src/debrief_stac/exceptions.py
- [x] T009 [P] Create type aliases for STAC structures at services/stac/src/debrief_stac/types.py
- [x] T010 [P] Create shared fixtures for tests (temp directories, sample metadata) at services/stac/tests/fixtures.py

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 1 - Create Local STAC Catalog (Priority: P1)

**Goal**: Analyst creates a new local STAC catalog at a specified directory path

**Independent Test**: Call `create_catalog(path)`, verify directory contains valid `catalog.json` with correct STAC structure

### Tests for User Story 1

> **Write tests FIRST, ensure they FAIL before implementation**

- [x] T011 [P] [US1] Unit test for create_catalog success case at services/stac/tests/test_catalog.py
- [x] T012 [P] [US1] Unit test for create_catalog with existing catalog (should fail) at services/stac/tests/test_catalog.py
- [x] T013 [P] [US1] Unit test for create_catalog permission error at services/stac/tests/test_catalog.py

### Implementation for User Story 1

- [x] T014 [US1] Implement create_catalog() function at services/stac/src/debrief_stac/catalog.py
- [x] T015 [US1] Add STAC catalog.json generation with correct spec version at services/stac/src/debrief_stac/catalog.py
- [x] T016 [US1] Add validation for directory existence and permissions at services/stac/src/debrief_stac/catalog.py
- [x] T017 [US1] Add open_catalog() function to load existing catalog at services/stac/src/debrief_stac/catalog.py

**Checkpoint**: Can create and open local STAC catalogs

---

## Phase 4: User Story 2 - Create Plot (STAC Item) (Priority: P1)

**Goal**: Analyst creates a new plot (STAC Item) within an existing catalog

**Independent Test**: Call `create_plot(catalog, metadata)`, verify STAC Item JSON is valid and linked from catalog

### Tests for User Story 2

- [x] T018 [P] [US2] Unit test for create_plot with valid metadata at services/stac/tests/test_plot.py
- [x] T019 [P] [US2] Unit test for create_plot updates catalog links at services/stac/tests/test_plot.py
- [x] T020 [P] [US2] Unit test for create_plot with title and description at services/stac/tests/test_plot.py

### Implementation for User Story 2

- [x] T021 [US2] Implement create_plot() function at services/stac/src/debrief_stac/plot.py
- [x] T022 [US2] Generate STAC Item structure with properties from PlotMetadata at services/stac/src/debrief_stac/plot.py
- [x] T023 [US2] Update catalog links to include new plot at services/stac/src/debrief_stac/plot.py
- [x] T024 [US2] Create plot directory with item.json at services/stac/src/debrief_stac/plot.py

**Checkpoint**: Can create plots within catalogs

---

## Phase 5: User Story 3 - Read Plot (Priority: P1)

**Goal**: Service retrieves a plot by ID, returning full STAC Item with properties and assets

**Independent Test**: Create plot, then call `read_plot(catalog, plot_id)`, verify returned data matches

### Tests for User Story 3

- [x] T025 [P] [US3] Unit test for read_plot returns complete STAC Item at services/stac/tests/test_plot.py
- [x] T026 [P] [US3] Unit test for read_plot with non-existent ID raises NotFoundError at services/stac/tests/test_plot.py
- [x] T027 [P] [US3] Unit test for read_plot includes asset hrefs at services/stac/tests/test_plot.py

### Implementation for User Story 3

- [x] T028 [US3] Implement read_plot() function at services/stac/src/debrief_stac/plot.py
- [x] T029 [US3] Add plot ID resolution from catalog links at services/stac/src/debrief_stac/plot.py
- [x] T030 [US3] Load and validate STAC Item JSON at services/stac/src/debrief_stac/plot.py

**Checkpoint**: Can read plots by ID from catalog

---

## Phase 6: User Story 4 - Add Features to Plot (Priority: P1)

**Goal**: Loader service adds GeoJSON features to an existing plot's FeatureCollection asset

**Independent Test**: Create plot, add features via `add_features()`, read plot, verify features in GeoJSON asset

### Tests for User Story 4

- [x] T031 [P] [US4] Unit test for add_features creates FeatureCollection asset at services/stac/tests/test_features.py
- [x] T032 [P] [US4] Unit test for add_features appends to existing FeatureCollection at services/stac/tests/test_features.py
- [x] T033 [P] [US4] Unit test for add_features updates plot bbox at services/stac/tests/test_features.py
- [x] T034 [P] [US4] Unit test for add_features validates against Pydantic models at services/stac/tests/test_features.py

### Implementation for User Story 4

- [x] T035 [US4] Implement add_features() function at services/stac/src/debrief_stac/features.py
- [x] T036 [US4] Create FeatureCollection asset with role "data" at services/stac/src/debrief_stac/features.py
- [x] T037 [US4] Implement feature appending to existing FeatureCollection at services/stac/src/debrief_stac/features.py
- [x] T038 [US4] Implement bbox calculation from feature geometries at services/stac/src/debrief_stac/features.py
- [x] T039 [US4] Update STAC Item bbox and datetime range at services/stac/src/debrief_stac/features.py
- [x] T040 [US4] Validate features using generated Pydantic models (TrackFeature, ReferenceLocation) at services/stac/src/debrief_stac/features.py

**Checkpoint**: Can add validated GeoJSON features to plots

---

## Phase 7: User Story 5 - Add Source Asset to Plot (Priority: P2)

**Goal**: Loader service copies source file to assets directory with provenance metadata

**Independent Test**: Add asset via `add_asset()`, verify file copied and referenced in STAC Item

### Tests for User Story 5

- [ ] T041 [P] [US5] Unit test for add_asset copies file to assets directory at services/stac/tests/test_assets.py
- [ ] T042 [P] [US5] Unit test for add_asset creates STAC asset reference at services/stac/tests/test_assets.py
- [ ] T043 [P] [US5] Unit test for add_asset records provenance metadata at services/stac/tests/test_assets.py

### Implementation for User Story 5

- [ ] T044 [US5] Implement add_asset() function at services/stac/src/debrief_stac/assets.py
- [ ] T045 [US5] Copy source file to plot's assets directory at services/stac/src/debrief_stac/assets.py
- [ ] T046 [US5] Create STAC asset entry with role "source" and media type at services/stac/src/debrief_stac/assets.py
- [ ] T047 [US5] Record provenance metadata (source path, load timestamp, tool version) at services/stac/src/debrief_stac/assets.py
- [ ] T048 [US5] Update STAC Item assets dictionary at services/stac/src/debrief_stac/assets.py

**Checkpoint**: Can add source files with provenance tracking

---

## Phase 8: User Story 6 - List Catalog Contents (Priority: P2)

**Goal**: User browses catalog to see available plots with summary information

**Independent Test**: Create catalog with 3 plots, call `list_plots()`, verify all 3 returned with summary

### Tests for User Story 6

- [ ] T049 [P] [US6] Unit test for list_plots returns all plots at services/stac/tests/test_catalog.py
- [ ] T050 [P] [US6] Unit test for list_plots with empty catalog at services/stac/tests/test_catalog.py
- [ ] T051 [P] [US6] Unit test for list_plots sorts by datetime descending at services/stac/tests/test_catalog.py

### Implementation for User Story 6

- [ ] T052 [US6] Implement list_plots() function at services/stac/src/debrief_stac/catalog.py
- [ ] T053 [US6] Extract plot summaries (ID, title, datetime, feature count) at services/stac/src/debrief_stac/catalog.py
- [ ] T054 [US6] Implement datetime-descending sort at services/stac/src/debrief_stac/catalog.py

**Checkpoint**: Can browse catalog contents

---

## Phase 9: User Story 7 - MCP Tool Exposure (Priority: P2)

**Goal**: All core operations exposed as MCP tools for VS Code extension and AI orchestration

**Independent Test**: Start MCP server, call tools via MCP client, verify same results as direct Python

### Tests for User Story 7

- [ ] T055 [P] [US7] Unit test for MCP tool registration at services/stac/tests/test_mcp.py
- [ ] T056 [P] [US7] Unit test for create_catalog MCP tool at services/stac/tests/test_mcp.py
- [ ] T057 [P] [US7] Unit test for MCP error responses with validation details at services/stac/tests/test_mcp.py

### Implementation for User Story 7

- [ ] T058 [US7] Create MCP server scaffold using mcp-common at services/stac/src/debrief_stac/mcp_server.py
- [ ] T059 [US7] Expose create_catalog as MCP tool at services/stac/src/debrief_stac/mcp_server.py
- [ ] T060 [US7] Expose create_plot as MCP tool at services/stac/src/debrief_stac/mcp_server.py
- [ ] T061 [US7] Expose read_plot as MCP tool at services/stac/src/debrief_stac/mcp_server.py
- [ ] T062 [US7] Expose add_features as MCP tool at services/stac/src/debrief_stac/mcp_server.py
- [ ] T063 [US7] Expose add_asset as MCP tool at services/stac/src/debrief_stac/mcp_server.py
- [ ] T064 [US7] Expose list_plots as MCP tool at services/stac/src/debrief_stac/mcp_server.py
- [ ] T065 [US7] Document MCP tool input/output schemas at services/stac/src/debrief_stac/mcp_server.py

**Checkpoint**: All operations accessible via MCP

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Integration testing, documentation, and quality assurance

- [ ] T066 [P] Integration test: full workflow (create catalog → create plot → add features → add asset → read) at services/stac/tests/test_integration.py
- [ ] T067 [P] Add docstrings to all public functions
- [ ] T068 [P] Create README.md with usage examples at services/stac/README.md
- [ ] T069 Run coverage report, ensure >90% coverage
- [ ] T070 [P] Add type hints throughout codebase
- [ ] T071 Validate STAC output against stac-validator at services/stac/tests/test_stac_validation.py

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - US1-US4 (P1): Core functionality, implement in order
  - US5-US7 (P2): Can proceed after US4 complete
- **Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (Create Catalog)**: Foundation only - no story dependencies
- **US2 (Create Plot)**: Requires US1 (needs catalog to create plot in)
- **US3 (Read Plot)**: Requires US2 (needs plot to read)
- **US4 (Add Features)**: Requires US2 (needs plot to add to)
- **US5 (Add Asset)**: Requires US2 (needs plot to add to)
- **US6 (List Plots)**: Requires US1 (needs catalog to list)
- **US7 (MCP)**: Requires US1-US6 (wraps all operations)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Implementation follows test definitions
- Validate story checkpoint before proceeding

### Parallel Opportunities

**Within Phase 1 (Setup):**
```
T003, T004, T006 can run in parallel
```

**Within Phase 2 (Foundational):**
```
T009, T010 can run in parallel
```

**Within User Stories (test writing):**
All test tasks within a phase marked [P] can run in parallel

**Cross-Story (after Foundational):**
- US5 and US6 can run in parallel (both only need catalog/plot basics)

---

## Parallel Example: User Story 4

```bash
# Launch all tests for User Story 4 together:
Task: "Unit test for add_features creates FeatureCollection asset at services/stac/tests/test_features.py"
Task: "Unit test for add_features appends to existing FeatureCollection at services/stac/tests/test_features.py"
Task: "Unit test for add_features updates plot bbox at services/stac/tests/test_features.py"
Task: "Unit test for add_features validates against Pydantic models at services/stac/tests/test_features.py"
```

---

## Implementation Strategy

### MVP First (User Stories 1-4 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (Create Catalog)
4. Complete Phase 4: US2 (Create Plot)
5. Complete Phase 5: US3 (Read Plot)
6. Complete Phase 6: US4 (Add Features)
7. **STOP and VALIDATE**: Full data workflow works

**Exit Criteria (MVP)**: Can programmatically create a local STAC catalog with a plot Item containing GeoJSON features.

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1-US4 → Core data operations (MVP!)
3. Add US5 → Provenance tracking
4. Add US6 → Catalog browsing
5. Add US7 → MCP integration
6. Polish → Production ready

### Key Files

| File | Purpose |
|------|---------|
| `catalog.py` | Catalog operations (create, open, list) |
| `plot.py` | Plot/STAC Item operations (create, read) |
| `features.py` | Feature management (add, bbox calculation) |
| `assets.py` | Asset management (copy, provenance) |
| `models.py` | PlotMetadata and internal types |
| `exceptions.py` | Domain-specific errors |
| `mcp_server.py` | MCP tool wrappers |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Uses generated Pydantic models from Stage 0 (`debrief_schemas`)
- All STAC output should pass `stac-validator`
