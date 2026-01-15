# Tasks: debrief-calc — Context-Sensitive Analysis Tools

**Input**: Design documents from `/specs/005-debrief-calc/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**User Stories** (from spec.md):
- US1: Discover Available Tools (P1) 🎯 MVP
- US2: Execute Analysis Tool (P1) 🎯 MVP
- US3: Access Tools via MCP (P2)
- US4: View Tool Metadata (P3)
- US5: Verify and Use Tools via CLI (P2)

---

## Evidence Requirements

**Evidence Directory**: `specs/005-debrief-calc/evidence/`

### Minimum Evidence

1. **Test Summary** (`evidence/test-summary.md`):
   - Total tests: passed/failed/skipped
   - Coverage for both debrief-calc and debrief-cli packages

2. **Usage Example** (`evidence/usage-example.md`):
   - CLI session demonstrating tool discovery and execution
   - Python API usage example

3. **Feature-Specific Evidence**:
   - CLI demo showing `tools list`, `tools run`, `validate` commands
   - Sample GeoJSON output with provenance
   - MCP request/response samples

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and directory structure

- [x] T001 Create services/calc/ directory structure per plan.md
- [x] T002 Create services/cli/ directory structure per plan.md
- [x] T003 [P] Create pyproject.toml for debrief-calc package in services/calc/
- [x] T004 [P] Create pyproject.toml for debrief-cli package in services/cli/
- [x] T005 Create tests/calc/ and tests/cli/ directory structure
- [x] T006 [P] Create GeoJSON test fixtures in tests/calc/fixtures/ (track-single.geojson, tracks-pair.geojson, zone-region.geojson)

**Checkpoint**: Project scaffolding complete, ready for foundation work

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Create ContextType enum in services/calc/models.py (SINGLE, MULTI, REGION, NONE)
- [x] T008 Create SelectionContext model in services/calc/models.py with type, features, and kind filtering
- [x] T009 [P] Create ToolParameter model in services/calc/models.py with name, type, default, required, description
- [x] T010 [P] Create Provenance model in services/calc/models.py with tool, version, timestamp, sources, parameters
- [x] T011 Create Tool model in services/calc/models.py with metadata, context_type, input_kinds, output_kind, parameters, handler
- [x] T012 Create ToolResult model in services/calc/models.py with tool, success, features, error, duration_ms, provenance
- [x] T013 Create ToolError model in services/calc/models.py with code, message, details
- [x] T014 Create exception hierarchy in services/calc/exceptions.py (DebriefCalcError base, ToolNotFoundError, InvalidContextError, KindMismatchError, ValidationError, ExecutionError)
- [x] T015 Create validation.py with validate_geojson() and validate_tool_output() functions
- [x] T016 Write unit tests for all models in tests/calc/test_models.py
- [x] T017 Write unit tests for exceptions in tests/calc/test_exceptions.py

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 - Discover Available Tools (Priority: P1) 🎯 MVP

**Goal**: Users can query available tools based on selection context and feature kind

**Independent Test**: Select track data, query registry, verify filtered tool list

### Implementation for User Story 1

- [x] T018 [US1] Create registry.py with ToolRegistry class and @tool() decorator
- [x] T019 [US1] Implement ToolRegistry.register() for tool registration
- [x] T020 [US1] Implement ToolRegistry.find_tools() filtering by context_type
- [x] T021 [US1] Implement ToolRegistry.find_tools() filtering by feature kinds
- [x] T022 [US1] Implement ToolRegistry.get_tool() to retrieve single tool by name
- [x] T023 [US1] Implement ToolRegistry.list_all() to return all registered tools
- [x] T024 [US1] Export public API in services/calc/__init__.py (registry, models)
- [x] T025 [US1] Write unit tests for registry in tests/calc/test_registry.py

**Checkpoint**: Tool discovery works — can query tools by context and kind

---

## Phase 4: User Story 2 - Execute Analysis Tool (Priority: P1) 🎯 MVP

**Goal**: Execute tools on selections and receive valid GeoJSON with provenance

**Independent Test**: Select track, run track-stats, validate GeoJSON output with provenance

### Implementation for User Story 2

- [x] T026 [US2] Create executor.py with run() function accepting tool_name, features, params
- [x] T027 [US2] Implement input validation in executor (context type, kind compatibility)
- [x] T028 [US2] Implement provenance.py with create_provenance() function
- [x] T029 [US2] Implement output validation ensuring kind attribute is set
- [x] T030 [US2] Implement error handling returning ToolResult with error details
- [x] T031 [P] [US2] Create tools/track_stats.py — single track analysis tool
- [x] T032 [P] [US2] Create tools/range_bearing.py — two-track comparison tool
- [x] T033 [P] [US2] Create tools/area_summary.py — regional analysis tool
- [x] T034 [US2] Create tools/__init__.py to auto-register built-in tools
- [x] T035 [US2] Write unit tests for executor in tests/calc/test_executor.py
- [x] T036 [US2] Write unit tests for provenance in tests/calc/test_provenance.py
- [x] T037 [P] [US2] Write unit tests for track_stats in tests/calc/tools/test_track_stats.py
- [x] T038 [P] [US2] Write unit tests for range_bearing in tests/calc/tools/test_range_bearing.py
- [x] T039 [P] [US2] Write unit tests for area_summary in tests/calc/tools/test_area_summary.py

**Checkpoint**: Tool execution works — can run tools and get valid GeoJSON results

---

## Phase 5: User Story 5 - Verify and Use Tools via CLI (Priority: P2)

**Goal**: CLI enables verification and power user workflows before VS Code extension exists

**Independent Test**: Run `debrief-cli tools list`, `debrief-cli tools run track-stats --input fixture.geojson`

**Note**: Implementing CLI before MCP because it enables verification of debrief-calc implementation

### Implementation for User Story 5

- [x] T040 [US5] Create services/cli/main.py with Click app entry point
- [x] T041 [US5] Create services/cli/output.py with OutputFormatter for human/JSON output
- [x] T042 [US5] Implement global --json flag handling
- [x] T043 [US5] Create services/cli/tools.py with `tools` command group
- [x] T044 [US5] Implement `tools list` command with --input and --store/--item options
- [x] T045 [US5] Implement `tools describe <tool>` command
- [x] T046 [US5] Implement `tools run <tool>` command with --input, --store/--item, --param options
- [x] T047 [US5] Create services/cli/validate.py with `validate` command
- [x] T048 [US5] Create services/cli/catalog.py with `catalog` command group
- [x] T049 [US5] Implement `catalog stores` command
- [x] T050 [US5] Implement `catalog list --store <name>` command
- [x] T051 [US5] Implement `catalog get --store <name> --item <id>` command
- [x] T052 [US5] Implement exit codes per spec (0, 2, 3, 4, 5)
- [x] T053 [US5] Add --help text for all commands and subcommands
- [x] T054 [US5] Write tests for tools commands in tests/cli/test_tools_commands.py
- [x] T055 [US5] Write tests for validate command in tests/cli/test_validate_command.py
- [x] T056 [US5] Write tests for catalog commands in tests/cli/test_catalog_commands.py

**Checkpoint**: CLI verification complete — all debrief-calc features testable via command line

---

## Phase 6: User Story 3 - Access Tools via MCP (Priority: P2)

**Goal**: Remote clients can discover and execute tools via Model Context Protocol

**Independent Test**: Send MCP request for tool list, verify response matches direct API

### Implementation for User Story 3

- [x] T057 [US3] Create services/calc/mcp/__init__.py
- [x] T058 [US3] Create services/calc/mcp/server.py with MCP server setup
- [x] T059 [US3] Implement `list_tools` MCP tool per contracts/mcp-tools.md
- [x] T060 [US3] Implement `describe_tool` MCP tool per contracts/mcp-tools.md
- [x] T061 [US3] Implement `run_tool` MCP tool per contracts/mcp-tools.md
- [x] T062 [US3] Implement MCP error codes (TOOL_NOT_FOUND, INVALID_CONTEXT, KIND_MISMATCH, EXECUTION_FAILED)
- [x] T063 [US3] Write integration tests for MCP server in tests/calc/test_mcp.py

**Checkpoint**: MCP integration complete — remote tool access works

---

## Phase 7: User Story 4 - View Tool Metadata (Priority: P3)

**Goal**: Users can access complete tool documentation including parameters and outputs

**Independent Test**: Query tool metadata, verify all fields present

### Implementation for User Story 4

- [x] T064 [US4] Enhance Tool model with detailed parameter introspection
- [x] T065 [US4] Implement ToolRegistry.describe() returning complete metadata
- [x] T066 [US4] Add parameter documentation to all built-in tools
- [x] T067 [US4] Write tests for metadata completeness in tests/calc/test_metadata.py

**Checkpoint**: Tool metadata complete — self-documenting tools

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final quality improvements and evidence collection

- [x] T068 Run all tests and verify 100% pass rate
- [x] T069 Validate quickstart.md examples work as documented
- [x] T070 Code cleanup and docstring completion
- [x] T071 Verify all tool outputs include kind attribute (SC-008)
- [x] T072 Verify tool discovery filters correctly by kind (SC-009)

### Evidence Collection (REQUIRED)

- [x] T073 Create evidence directory: specs/005-debrief-calc/evidence/
- [x] T074 Capture test summary in evidence/test-summary.md (pass/fail counts, coverage)
- [x] T075 Record CLI usage demo in evidence/cli-demo.txt
- [x] T076 Capture sample GeoJSON output with provenance in evidence/sample-output.geojson
- [x] T077 Record Python API usage example in evidence/python-example.md

### Media Content

- [x] T078 Update planning-post.md to shipped-post.md with implementation results
- [x] T079 Update linkedin-planning.md to linkedin-shipped.md

### Final Steps

- [ ] T080 Run `/speckit.pr` to create pull request with evidence

**Checkpoint**: Evidence collected — ready for PR creation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — can run in parallel with Phase 4
- **Phase 4 (US2)**: Depends on Phase 2, partially on Phase 3 (registry)
- **Phase 5 (US5)**: Depends on Phase 3 + 4 (needs working calc library)
- **Phase 6 (US3)**: Depends on Phase 3 + 4 (MCP wraps core functionality)
- **Phase 7 (US4)**: Depends on Phase 3 (builds on registry)
- **Phase 8 (Polish)**: Depends on all user stories

### User Story Dependencies

- **US1 (P1)**: Foundation only — no other story dependencies
- **US2 (P1)**: Foundation + US1 registry — can mostly parallelize with US1
- **US5 (P2)**: US1 + US2 complete — CLI tests the calc library
- **US3 (P2)**: US1 + US2 complete — MCP wraps the calc library
- **US4 (P3)**: US1 complete — extends registry metadata

### Parallel Opportunities

Within Phase 2 (Foundation):
```
T009 [P] ToolParameter model
T010 [P] Provenance model
```

Within Phase 4 (US2):
```
T031 [P] track_stats.py
T032 [P] range_bearing.py
T033 [P] area_summary.py
```

Within Phase 4 (US2) tests:
```
T037 [P] test_track_stats.py
T038 [P] test_range_bearing.py
T039 [P] test_area_summary.py
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation
3. Complete Phase 3: US1 (Discovery)
4. Complete Phase 4: US2 (Execution)
5. **VALIDATE**: Run built-in tools, verify GeoJSON output

### Verification via CLI (US5)

1. After MVP, implement Phase 5: CLI
2. Verify all calc features via command line
3. **VALIDATE**: `debrief-cli tools run track-stats --input fixture.geojson`

### Remote Access (US3 + US4)

1. Complete Phase 6: MCP Integration
2. Complete Phase 7: Enhanced Metadata
3. **VALIDATE**: MCP requests return identical results to direct API

---

## Notes

- [P] tasks = different files, no dependencies
- [USx] label maps task to specific user story
- Commit after each phase or logical group
- Tests are included per VI.2 (services require tests)
- Evidence is required for PR creation
- Two packages: debrief-calc (services/calc/) and debrief-cli (services/cli/)
