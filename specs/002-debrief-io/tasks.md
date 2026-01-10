# Tasks: debrief-io

**Input**: Design documents from `/specs/002-debrief-io/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/python-api.md
**Tests**: Required (Constitution VI.2, >90% coverage target)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

Project structure: `services/io/` (Python library in uv workspace)

---

## Phase 1: Setup (Project Infrastructure)

**Purpose**: Create package structure and configure build tools

- [X] T001 Create directory structure `services/io/src/debrief_io/` and `services/io/tests/`
- [X] T002 Create `services/io/pyproject.toml` with uv workspace config, dependencies (pydantic, debrief-schemas), and dev dependencies (pytest, pytest-cov)
- [X] T003 [P] Create `services/io/src/debrief_io/__init__.py` with package exports
- [X] T004 [P] Create `services/io/src/debrief_io/py.typed` marker file
- [X] T005 [P] Create `services/io/tests/conftest.py` with shared fixtures
- [X] T006 [P] Copy REP fixtures from `specs/002-debrief-io/fixtures/valid/` to `services/io/tests/fixtures/valid/`
- [X] T007 Update root `pyproject.toml` to include `services/io` in workspace members

---

## Phase 2: Foundational (Core Types & Base Classes)

**Purpose**: Define core types and exceptions that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 Create `services/io/src/debrief_io/exceptions.py` with ParseError, UnsupportedFormatError, ValidationError
- [X] T009 [P] Create `services/io/src/debrief_io/models.py` with ParseResult, ParseWarning, HandlerInfo Pydantic models
- [X] T010 [P] Create `services/io/src/debrief_io/types.py` with type aliases (FilePath, Feature, HandlerClass)
- [X] T011 Create `services/io/src/debrief_io/handlers/__init__.py` package init
- [X] T012 Create `services/io/src/debrief_io/handlers/base.py` with abstract BaseHandler class

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Parse REP File to GeoJSON (Priority: P1) 🎯 MVP

**Goal**: Parse REP files to validated TrackFeature and ReferenceLocation GeoJSON features

**Independent Test**: `parse_rep(boat2.rep)` returns list of TrackFeature objects with correct platform IDs and positions

### Tests for User Story 1

- [X] T013 [P] [US1] Create `services/io/tests/test_rep_handler.py` with tests for REP parsing (track positions, reference locations, DMS coordinate conversion)
- [X] T014 [P] [US1] Create `services/io/tests/fixtures/invalid/` with malformed REP samples for error testing

### Implementation for User Story 1

- [X] T015 [US1] Implement DMS coordinate parsing in `services/io/src/debrief_io/handlers/rep.py` (DD MM SS.SS H format)
- [X] T016 [US1] Implement timestamp parsing in `services/io/src/debrief_io/handlers/rep.py` (YYMMDD HHMMSS.SSS format)
- [X] T017 [US1] Implement track position record parsing in `services/io/src/debrief_io/handlers/rep.py`
- [ ] T018 [US1] Implement reference location (;TEXT:, ;CIRCLE:) parsing in `services/io/src/debrief_io/handlers/rep.py`
- [X] T019 [US1] Implement track grouping (group positions by track name) in `services/io/src/debrief_io/handlers/rep.py`
- [X] T020 [US1] Build TrackFeature GeoJSON from grouped positions in `services/io/src/debrief_io/handlers/rep.py`
- [ ] T021 [US1] Build ReferenceLocation GeoJSON from parsed shapes in `services/io/src/debrief_io/handlers/rep.py`
- [X] T022 [US1] Implement REPHandler.parse() returning ParseResult in `services/io/src/debrief_io/handlers/rep.py`
- [X] T023 [US1] Create `services/io/src/debrief_io/parser.py` with parse_rep() convenience function
- [X] T024 [US1] Implement encoding detection (UTF-8/Latin-1 fallback) in `services/io/src/debrief_io/parser.py`

**Checkpoint**: Can parse boat1.rep and boat2.rep to valid TrackFeature GeoJSON

---

## Phase 4: User Story 2 - Validate Parsed Features (Priority: P1)

**Goal**: All features validated against Stage 0 Pydantic models; invalid data produces clear errors with line numbers

**Independent Test**: Parse malformed REP → receive ValidationError with line number and field name

### Tests for User Story 2

- [ ] T025 [P] [US2] Create `services/io/tests/test_validation.py` with tests for coordinate validation, timestamp validation, missing fields
- [X] T026 [P] [US2] Add invalid coordinate fixtures to `services/io/tests/fixtures/invalid/`

### Implementation for User Story 2

- [X] T027 [US2] Add coordinate range validation (-180 to 180 lon, -90 to 90 lat) in `services/io/src/debrief_io/handlers/rep.py`
- [X] T028 [US2] Add timestamp validation with line number tracking in `services/io/src/debrief_io/handlers/rep.py`
- [X] T029 [US2] Implement warning collection for recoverable errors (INVALID_COORD, UNKNOWN_RECORD) in `services/io/src/debrief_io/handlers/rep.py`
- [ ] T030 [US2] Validate parsed features against debrief_schemas Pydantic models in `services/io/src/debrief_io/handlers/rep.py`
- [ ] T031 [US2] Wrap Pydantic ValidationError with line context in `services/io/src/debrief_io/exceptions.py`

**Checkpoint**: Parse errors include line numbers; all valid REP produces valid GeoJSON

---

## Phase 5: User Story 3 - Parse Sensor Contacts (Priority: P2)

**Goal**: Extract sensor contact data from REP files with parent track references

**Independent Test**: Parse REP with sensor detections → SensorContact features with correct bearing, timestamp, parent track

### Tests for User Story 3

- [ ] T032 [P] [US3] Create sensor contact fixtures in `services/io/tests/fixtures/valid/sensor_contacts.rep`
- [ ] T033 [P] [US3] Add sensor contact tests to `services/io/tests/test_rep_handler.py`

### Implementation for User Story 3

- [ ] T034 [US3] Parse sensor contact records in `services/io/src/debrief_io/handlers/rep.py`
- [ ] T035 [US3] Link sensor contacts to parent tracks by track name in `services/io/src/debrief_io/handlers/rep.py`
- [ ] T036 [US3] Build SensorContact GeoJSON features in `services/io/src/debrief_io/handlers/rep.py`

**Checkpoint**: Sensor contacts parsed with parent track references

---

## Phase 6: User Story 4 - Handler Discovery and Registration (Priority: P2)

**Goal**: Extensible handler registry supporting multiple file formats

**Independent Test**: Register custom handler → parse file with that extension → custom handler processes file

### Tests for User Story 4

- [X] T037 [P] [US4] Create `services/io/tests/test_registry.py` with tests for register, get, list, unregister handlers
- [X] T038 [P] [US4] Add tests for UnsupportedFormatError on unknown extensions

### Implementation for User Story 4

- [X] T039 [US4] Implement handler registry in `services/io/src/debrief_io/registry.py` with register_handler(), get_handler(), list_handlers(), unregister_handler()
- [X] T040 [US4] Register REPHandler for .rep extension in `services/io/src/debrief_io/__init__.py`
- [X] T041 [US4] Implement main parse() function using registry in `services/io/src/debrief_io/parser.py`
- [X] T042 [US4] Raise UnsupportedFormatError for unknown extensions in `services/io/src/debrief_io/parser.py`

**Checkpoint**: `parse(file.rep)` auto-selects REPHandler; unknown extension raises UnsupportedFormatError

---

## Phase 7: User Story 5 - MCP Tool Exposure (Priority: P2)

**Goal**: Parse operation exposed via MCP tools for loader app integration

**Independent Test**: Start MCP server → call parse_file tool → receive same GeoJSON as direct Python call

### Tests for User Story 5

- [ ] T043 [P] [US5] Create `services/io/tests/test_mcp.py` with tests for parse_file and list_handlers MCP tools

### Implementation for User Story 5

- [ ] T044 [US5] Create `services/io/src/debrief_io/mcp_server.py` with FastMCP server setup
- [ ] T045 [US5] Implement parse_file MCP tool in `services/io/src/debrief_io/mcp_server.py`
- [ ] T046 [US5] Implement list_handlers MCP tool in `services/io/src/debrief_io/mcp_server.py`
- [ ] T047 [US5] Add mcp as optional dependency in `services/io/pyproject.toml`

**Checkpoint**: MCP tools return same results as Python API

---

## Phase 8: Polish & Integration

**Purpose**: Integration testing, documentation, coverage verification

- [X] T048 Create `services/io/tests/test_parser.py` with tests for main parse() entry point
- [ ] T049 [P] Create `services/io/tests/test_integration.py` with end-to-end workflow test (parse → validate → verify structure)
- [ ] T050 [P] Add tests for encoding edge cases (Latin-1 files) in `services/io/tests/test_rep_handler.py`
- [ ] T051 [P] Add tests for truncated/malformed files in `services/io/tests/test_rep_handler.py`
- [X] T052 Create `services/io/README.md` with usage documentation
- [X] T053 Export public API in `services/io/src/debrief_io/__init__.py` (parse, parse_rep, register_handler, etc.)
- [ ] T054 Run pytest with coverage, verify >90% coverage
- [X] T055 Run ruff check and fix any lint errors
- [ ] T056 Validate quickstart.md examples work correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase
  - US1 and US2 are both P1, should be done before P2 stories
  - US3, US4, US5 can proceed in parallel after US1+US2
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (Parse REP)**: Can start after Foundational - No other story dependencies
- **US2 (Validation)**: Can start after Foundational - Validates US1 output but independently testable
- **US3 (Sensor Contacts)**: Depends on US1 parsing infrastructure
- **US4 (Handler Registry)**: Can start after Foundational - Independent
- **US5 (MCP Tools)**: Depends on US4 (uses registry) and US1 (parse function)

### Parallel Opportunities

Within each phase, tasks marked [P] can run in parallel:
- Phase 1: T003, T004, T005, T006 (different files)
- Phase 2: T009, T010 (different files)
- Phase 3: T013, T014 (test files)
- Phase 4: T025, T026 (test files)
- Phase 5: T032, T033 (test files)
- Phase 6: T037, T038 (test files)
- Phase 7: T043 (test file)
- Phase 8: T049, T050, T051 (test files)

---

## Parallel Example: User Story 1

```bash
# Launch tests in parallel first:
Task: "Create services/io/tests/test_rep_handler.py with tests for REP parsing"
Task: "Create services/io/tests/fixtures/invalid/ with malformed REP samples"

# Then implement sequentially (dependencies within story):
# T015-T016: Parsing utilities
# T017-T21: Record type parsing
# T022-T24: Handler and convenience functions
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 - Parse REP
4. Complete Phase 4: US2 - Validation
5. **STOP and VALIDATE**: Parse boat1.rep, boat2.rep successfully
6. Can demonstrate REP → GeoJSON pipeline

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 + US2 → Parse validated REP files (MVP!)
3. Add US3 → Sensor contacts support
4. Add US4 → Multi-format extensibility
5. Add US5 → MCP integration for loader app
6. Polish → Production ready

### Suggested MVP Scope

**MVP = Phase 1 + Phase 2 + Phase 3 + Phase 4**

This delivers:
- Parse REP files to GeoJSON
- Validated TrackFeature and ReferenceLocation output
- Error messages with line numbers
- ~28 tasks, core functionality complete

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Each user story is independently completable and testable
- Test files created before implementation (TDD approach)
- Commit after each task or logical group
- Constitution VI.2 requires >90% test coverage
