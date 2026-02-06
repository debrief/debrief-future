# Tasks: Tool API Integration (#052)

**Input**: Design documents from `/specs/052-tool-api-integration/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Golden example tests and cross-language parity tests are REQUIRED (FR-011, FR-012, US4).

---

## Evidence Requirements

**Evidence Directory**: `specs/052-tool-api-integration/evidence/`
**Media Directory**: `specs/052-tool-api-integration/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest + vitest results with pass/fail counts | After all tests pass |
| usage-example.md | End-to-end tool discovery → execution demo | After execution pipeline works |
| tool-list-response.json | Sample MCP tools/list response with annotations | After US1 complete |
| golden-example-samples.json | Input/output pair from cross-language parity test | After US4 complete |

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

**Purpose**: Create directory structure and package scaffolding for new tool modules

- [x] T001 Create Python tool package init `services/calc/debrief_calc/tools/track/styling/__init__.py`
- [x] T002 [P] Create Python test package init `services/calc/tests/tools/track/styling/__init__.py`
- [x] T003 [P] Create evidence directory `specs/052-tool-api-integration/evidence/`

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Core types, models, and adapters that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Add `to_mcp_tool()` method on Tool model with ContextType→SelectionRequirement mapping `services/calc/debrief_calc/models.py`
- [x] T005 [P] Add MCPToolDefinition TypeScript interface `apps/vscode/src/types/tool.ts`
- [x] T006 [P] Create shared MCP → ToolMatchService adapter `shared/components/src/ToolMatch/mcpAdapter.ts`
- [x] T007 [test] Unit test for `to_mcp_tool()` — verify all ContextType mappings (SINGLE→max:1, MULTI→min:1 per kind, REGION→kind:REGION, NONE→empty) `services/calc/tests/test_models_mcp.py`
- [x] T008 [P][test] Unit test for shared MCP adapter — verify MCPToolDefinition→Tool mapping `shared/components/src/ToolMatch/__tests__/mcpAdapter.test.ts`

**Checkpoint**: Foundation types established — user story phases can now begin

---

## Phase 3: User Story 1 — Discover Available Tools (Priority: P1) MVP

**Goal**: Both UIs can query the tool library and receive a complete tool-list as structured JSON with name, description, version, category, and selection requirements.

**Independent Test**: Start the Python calc service, call MCP `tools/list`, verify the response contains all 4 tools with correct annotations matching the tool-list contract.

### Tests for User Story 1

- [ ] T009 [test] Contract test: MCP tools/list response matches contract schema `services/calc/tests/mcp/test_tool_list_contract.py`
- [ ] T010 [P][test] Integration test: tools/list returns all registered tools with debrief annotations `services/calc/tests/mcp/test_server_tools_list.py`

### Implementation for User Story 1

- [ ] T011 Update MCP server `@server.list_tools()` to call `to_mcp_tool()` and emit annotations `services/calc/debrief_calc/mcp/server.py`
- [ ] T012 [P] Create TypeScript tool definition stubs in barrel file (toolDefinition constants, execute stubs) `apps/vscode/src/tools/track/styling/index.ts`
- [ ] T013 Verify tool-list includes all 4 tools: set-track-color, apply-symbol-style, label-interval, symbol-interval

**Checkpoint**: Tool discovery works — MCP tools/list returns complete tool metadata

---

## Phase 4: User Story 2 — Context-Sensitive Tool Filtering (Priority: P1)

**Goal**: Both UIs use the tool-list combined with current selection to determine which tools are applicable. The Layers Toolbar Run dropdown shows applicable tools enabled and inapplicable tools disabled with explanations.

**Independent Test**: Provide a mock MCP tool-list and mock selection states, verify the shared ToolMatchService correctly identifies matching and non-matching tools.

### Tests for User Story 2

- [ ] T014 [test] Test ToolMatchService with MCP-adapted tool definitions — verify filtering by kind and count `shared/components/src/ToolMatch/__tests__/mcpToolMatch.test.ts`
- [ ] T015 [P][test] Test CalcService returns adapted Tool[] from MCP tools/list `apps/vscode/src/services/__tests__/calcService.test.ts`

### Implementation for User Story 2

- [ ] T016 Create mcpToolAdapter — convert MCP tool definitions to ToolMatchService input `apps/vscode/src/services/mcpToolAdapter.ts`
- [ ] T017 Evolve CalcService.listTools() to use MCP tools/list via adapter `apps/vscode/src/services/calcService.ts`
- [ ] T018 Verify both UIs show same enabled/disabled tools for identical selection states

**Checkpoint**: Tool filtering works — Layers Toolbar correctly enables/disables tools based on selection

---

## Phase 5: User Story 4 — Tool Implementations Match Golden Examples (Priority: P2)

**Goal**: All 4 migrated tools implemented in both Python and TypeScript, each producing output matching golden I/O examples within floating-point tolerance (1e-9).

**Independent Test**: Run each implementation against golden example fixtures and compare outputs. Cross-language parity verified by running both implementations against the same inputs.

> **Note**: US4 is implemented before US3 because tool execution (US3) requires working tool implementations.

### Python Tool Implementations

- [ ] T019 [P] Implement set-track-color `services/calc/debrief_calc/tools/track/styling/set_track_color.py`
- [ ] T020 [P] Implement apply-symbol-style `services/calc/debrief_calc/tools/track/styling/apply_symbol_style.py`
- [ ] T021 [P] Implement label-interval `services/calc/debrief_calc/tools/track/styling/label_interval.py`
- [ ] T022 [P] Implement symbol-interval `services/calc/debrief_calc/tools/track/styling/symbol_interval.py`

### Python Golden Example Tests

- [ ] T023 [P][test] Golden example tests for set-track-color `services/calc/tests/tools/track/styling/test_set_track_color.py`
- [ ] T024 [P][test] Golden example tests for apply-symbol-style `services/calc/tests/tools/track/styling/test_apply_symbol_style.py`
- [ ] T025 [P][test] Golden example tests for label-interval `services/calc/tests/tools/track/styling/test_label_interval.py`
- [ ] T026 [P][test] Golden example tests for symbol-interval `services/calc/tests/tools/track/styling/test_symbol_interval.py`

### TypeScript Tool Implementations

- [ ] T027 [P] Implement setTrackColor `apps/vscode/src/tools/track/styling/setTrackColor.ts`
- [ ] T028 [P] Implement applySymbolStyle `apps/vscode/src/tools/track/styling/applySymbolStyle.ts`
- [ ] T029 [P] Implement labelInterval `apps/vscode/src/tools/track/styling/labelInterval.ts`
- [ ] T030 [P] Implement symbolInterval `apps/vscode/src/tools/track/styling/symbolInterval.ts`

### TypeScript Golden Example Tests

- [ ] T031 [P][test] Golden example tests for setTrackColor `apps/vscode/src/tools/track/styling/__tests__/setTrackColor.test.ts`
- [ ] T032 [P][test] Golden example tests for applySymbolStyle `apps/vscode/src/tools/track/styling/__tests__/applySymbolStyle.test.ts`
- [ ] T033 [P][test] Golden example tests for labelInterval `apps/vscode/src/tools/track/styling/__tests__/labelInterval.test.ts`
- [ ] T034 [P][test] Golden example tests for symbolInterval `apps/vscode/src/tools/track/styling/__tests__/symbolInterval.test.ts`

### Cross-Language Parity

- [ ] T035 [test] Cross-language parity verification: both implementations produce identical output for all golden examples `services/calc/tests/tools/track/styling/test_cross_language_parity.py`

**Checkpoint**: All 4 tools pass golden example tests in both languages, cross-language parity verified

---

## Phase 6: User Story 3 — Execute a Tool and Receive Results (Priority: P2)

**Goal**: Analyst selects features, chooses a tool from the Run dropdown, triggers execution, and receives a structured ToolResponse with results, provenance, and human-readable label.

**Independent Test**: Call MCP `tools/call` with valid features and parameters, verify the response includes correct content items, provenance metadata (tool name, version, sources, timestamp), and labels.

### Tests for User Story 3

- [ ] T036 [test] Integration test: MCP tools/call executes tool and returns ToolResponse with provenance `services/calc/tests/mcp/test_server_tools_call.py`
- [ ] T037 [P][test] Test error handling: invalid input returns ToolErrorResponse with category and message `services/calc/tests/mcp/test_server_tools_call_errors.py`

### Implementation for User Story 3

- [ ] T038 Verify MCP tools/call handler delegates to executor for new styling tools `services/calc/debrief_calc/mcp/server.py`
- [ ] T039 Verify provenance metadata attached to all tool results (tool name, version, sources, timestamp) `services/calc/debrief_calc/result_builder.py`
- [ ] T040 Wire VS Code executeTool to handle styling tool results as mutation layers `apps/vscode/src/services/calcService.ts`

**Checkpoint**: End-to-end tool execution works — features selected, tool run, result layer displayed with provenance

---

## Phase 7: User Story 5 — Web-Shell Uses Same Contract as VS Code (Priority: P3)

**Goal**: Web-shell integrates tool execution using the same tool-list schema and ToolResponse contract. TypeScript tool registry feeds the Layers Toolbar, tools execute in-browser, and Python-only tools are excluded.

**Independent Test**: Load web-shell with a test dataset, select features, run a tool, verify the result uses the same ToolResponse structure and that Python-only tools do not appear.

### Tests for User Story 5

- [ ] T041 [test] Verify web-shell tool-list contains only TypeScript-implemented tools `apps/web-shell/src/services/__tests__/toolService.test.ts`
- [ ] T042 [P][test] Verify web-shell ToolResponse structure matches VS Code format `apps/web-shell/src/services/__tests__/toolResponse.test.ts`

### Implementation for User Story 5

- [ ] T043 Create web-shell tool service with TypeScript tool registry and direct execute() `apps/web-shell/src/services/toolService.ts`
- [ ] T044 Wire web-shell Layers Toolbar to use toolService for tool-list and execution `apps/web-shell/src/`
- [ ] T045 Verify Python-only tools (track-stats, range-bearing, area-summary) do NOT appear in web-shell tool-list

**Checkpoint**: Web-shell provides identical tool UX for TypeScript-implemented tools; Python-only tools correctly excluded

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, and PR creation

### Evidence Collection

- [ ] T046 Capture test results in `specs/052-tool-api-integration/evidence/test-summary.md`
- [ ] T047 Create usage demonstration in `specs/052-tool-api-integration/evidence/usage-example.md`
- [ ] T048 [P] Capture MCP tools/list response sample in `specs/052-tool-api-integration/evidence/tool-list-response.json`
- [ ] T049 [P] Capture golden example I/O samples in `specs/052-tool-api-integration/evidence/golden-example-samples.json`

### Media Content

- [ ] T050 Create shipped blog post in `specs/052-tool-api-integration/media/shipped-post.md`
- [ ] T051 [P] Create LinkedIn shipped summary in `specs/052-tool-api-integration/media/linkedin-shipped.md`

### PR Creation

- [ ] T052 Create PR and publish blog: run /speckit.pr

**Task T052 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 Discovery (Phase 3)**: Depends on Foundation (to_mcp_tool method, MCPToolDefinition type)
- **US2 Filtering (Phase 4)**: Depends on Foundation (MCP adapter); integrates with US1 (needs tools/list)
- **US4 Implementations (Phase 5)**: Depends on Foundation (tool registration); independent of US1/US2
- **US3 Execution (Phase 6)**: Depends on US4 (needs working tool implementations) and US1 (tools/list)
- **US5 Web-Shell (Phase 7)**: Depends on US4 (TypeScript implementations) and US2 (filtering logic)
- **Polish (Phase 8)**: Depends on all story phases being complete

### User Story Dependencies

- **US1 (P1)**: Foundation only — can start immediately after Phase 2
- **US2 (P1)**: Foundation + US1 — needs tools/list to feed ToolMatchService
- **US4 (P2)**: Foundation only — can run in PARALLEL with US1 and US2
- **US3 (P2)**: US1 + US4 — needs both discovery infrastructure and working implementations
- **US5 (P3)**: US2 + US4 — needs filtering logic and TypeScript implementations

### Within Each User Story

- Test tasks (where present) should be written alongside implementation
- Models/types before services
- Services before UI wiring
- All [P] tasks within a phase can run in parallel

### Parallel Opportunities

- Foundation: T005 (Python model) || T006 (TS type) || T007 (shared adapter) — all independent files
- US4: All 4 Python implementations can run in parallel (T019-T022), all 4 TypeScript implementations can run in parallel (T027-T030)
- US1 and US4 can run in parallel after Foundation completes (they don't depend on each other)
- All golden example tests within a language can run in parallel

---

## Parallel Example: User Story 4 (Implementations)

```bash
# All Python tools can be implemented in parallel:
Task T019: "Implement set-track-color (Python)"
Task T020: "Implement apply-symbol-style (Python)"
Task T021: "Implement label-interval (Python)"
Task T022: "Implement symbol-interval (Python)"

# All Python golden tests can run in parallel:
Task T023: "Golden tests for set-track-color (Python)"
Task T024: "Golden tests for apply-symbol-style (Python)"
Task T025: "Golden tests for label-interval (Python)"
Task T026: "Golden tests for symbol-interval (Python)"

# All TypeScript tools can be implemented in parallel:
Task T027: "Implement setTrackColor (TypeScript)"
Task T028: "Implement applySymbolStyle (TypeScript)"
Task T029: "Implement labelInterval (TypeScript)"
Task T030: "Implement symbolInterval (TypeScript)"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation (CRITICAL — blocks all stories)
3. Complete Phase 3: US1 — Tool Discovery
4. Complete Phase 4: US2 — Tool Filtering
5. **STOP and VALIDATE**: Verify tool-list works and filtering is correct with stub tools
6. The Layers Toolbar now shows tools (with stubs) — validates the integration architecture

### Incremental Delivery

1. Setup + Foundation → Core types ready
2. US1 (Discovery) → Tool-list works with stubs → Validate
3. US2 (Filtering) → Selection-aware toolbar → Validate
4. US4 (Implementations) → Real tools with golden example verification → Validate
5. US3 (Execution) → End-to-end tool execution in VS Code → Validate
6. US5 (Web-Shell) → Parity with VS Code for TypeScript tools → Validate
7. Polish → Evidence, media, PR

### Critical Path

```
Foundation → US1 (Discovery) → US3 (Execution)
                                      ↑
Foundation → US4 (Implementations) ───┘
Foundation → US1 → US2 (Filtering) → US5 (Web-Shell)
                                          ↑
Foundation → US4 (Implementations) ──────┘
```
