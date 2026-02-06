# Feature Specification: Tool API Integration

**Feature Branch**: `052-tool-api-integration`
**Created**: 2026-02-06
**Status**: Draft
**Input**: User description: "In PR #179 we defined some initial tools, produce a plan for implementing the tools in JS / Python, and integrating the tool-calls into apps/vs-code and apps/web-shell. Since both UIs use the Layers Toolbar (with dynamic tool selection) both tool backends should follow a common API. IIRC that's via the tool library producing a tool-list (in JSON), and UI logic selecting suitable tools."

## Clarifications

### Session 2026-02-06

- Q: How does web-shell execute tools given it is hosted on GitHub Pages with no Python backend? → A: Web-shell only offers tools that have TypeScript implementations. It is a static site — no server-side execution available.
- Q: Where do tool definitions come from? → A: Each language provides its own set of tool definitions. They do not come from the central language-agnostic specifications. Both language toolsets produce a tool-list in the same JSON format (the common API contract).
- Q: Will tools always be implemented in both languages? → A: Initially yes (for migrated legacy tools), but tools will eventually diverge to Python-only, authored by analysts and scientists. The Python tool library self-generates the tool-list (via annotations or a custom endpoint). The web-shell's tool set will be limited to tools with TypeScript implementations.
- Q: Where should selection requirements (input kinds, min/max counts) live in tool metadata? → A: Selection requirements are encoded within MCP tool metadata — using the standard inputSchema and annotations fields. The tool-list IS the MCP tools/list response. This ensures future MCP clients automatically discover tools, and the Layers Toolbar reads the same MCP metadata for filtering. Domain-specific fields (e.g., feature kind=TRACK) use MCP annotations.
- Q: How much should this feature cover tool authoring by analysts/scientists? → A: Scope limited to registration mechanics — the decorator auto-generates a valid MCP tool entry. A dedicated tool authoring guide and onboarding experience is a separate future feature.
- Q: Should the ToolHarness Storybook fixtures add feature kinds (CONTACT, ZONE) beyond what the implemented tools require? → A: No. Keep the harness focused on feature kinds needed by implemented tools. Add CONTACT/ZONE when a tool that requires them is implemented.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover Available Tools from the Tool Library (Priority: P1)

An analyst opens either the VS Code extension or the web-shell application. The application queries the tool library and receives a list of all registered tools as structured data (JSON). Each tool entry includes its name, description, version, category, and the selection requirements it needs (e.g., "requires 2 tracks" or "requires 1 track and 1 contact"). The Layers Toolbar's Run dropdown is populated from this list.

**Why this priority**: Without a functioning tool-list, neither UI can offer any tools to the user. This is the foundation that all tool execution depends on. Both apps must be able to discover what tools are available before they can present or run any of them.

**Independent Test**: Can be fully tested by starting the tool library service, requesting the tool-list, and verifying it returns a valid JSON payload listing all registered tools with complete metadata. No UI is required — the tool-list response can be validated against a schema.

**Acceptance Scenarios**:

1. **Given** the tool library has 4 registered tools (set-track-color, apply-symbol-style, label-interval, symbol-interval), **When** any client requests the tool-list, **Then** it receives a JSON response containing all 4 tools with name, description, version, category, and selection requirements for each
2. **Given** a tool requires exactly 2 track features as input, **When** the tool-list is returned, **Then** that tool's entry includes selection requirements specifying kind=TRACK, min=2, max=2
3. **Given** a new tool is registered in the library, **When** the tool-list is requested again, **Then** the new tool appears in the response without requiring UI changes

---

### User Story 2 - Context-Sensitive Tool Filtering in Both UIs (Priority: P1)

An analyst selects features in the map or feature list (e.g., two tracks). Both the VS Code extension and the web-shell application use the tool-list combined with the current selection to determine which tools are applicable. The Layers Toolbar Run dropdown shows applicable tools as enabled and inapplicable tools as disabled (or hidden), with explanations of why a tool is unavailable.

**Why this priority**: Tool filtering is co-equal with tool discovery — without it, users see tools they cannot run, leading to confusion and errors. This story makes the tool-list useful by connecting it to selection state.

**Independent Test**: Can be tested by providing a mock tool-list and a mock selection state, then verifying the filtering logic correctly identifies which tools match. Testable with unit tests against the filtering logic alone.

**Acceptance Scenarios**:

1. **Given** the analyst selects 2 tracks and the tool-list includes "range-bearing" (requires 2 tracks), **When** the Layers Toolbar evaluates available tools, **Then** "range-bearing" appears as enabled in the Run dropdown
2. **Given** the analyst selects 1 track and the tool-list includes "range-bearing" (requires 2 tracks), **When** the Layers Toolbar evaluates available tools, **Then** "range-bearing" appears as disabled with an explanation such as "Requires 2 tracks, 1 selected"
3. **Given** the same tool-list and the same selection, **When** viewed in VS Code and in the web-shell, **Then** both UIs show the same set of enabled/disabled tools

---

### User Story 3 - Execute a Tool and Receive Results (Priority: P2)

An analyst selects features matching a tool's requirements, chooses a tool from the Run dropdown, and triggers execution. The tool library runs the selected tool against the provided features and returns a structured result (ToolResponse). The result includes the transformed or derived features, provenance metadata (which tool produced the result, from which inputs, at what time), and a human-readable label.

**Why this priority**: Execution is the primary value delivery — analysts use tools to perform analysis. It depends on discovery (P1) and filtering (P1) being in place, but without execution the system delivers no analytical capability.

**Independent Test**: Can be tested end-to-end by providing input features to a specific tool and verifying the output matches the golden example. Can also be tested via the UI by running a tool and confirming the result layer appears.

**Acceptance Scenarios**:

1. **Given** 2 track features selected and "range-bearing" tool chosen, **When** the analyst clicks Run, **Then** the tool library executes the tool and returns a ToolResponse containing the calculated range and bearing data
2. **Given** a successful tool execution, **When** the result is returned, **Then** it includes provenance metadata identifying the tool name, version, input feature IDs, and execution timestamp
3. **Given** the tool execution fails (e.g., invalid input geometry), **When** the error is returned, **Then** it includes a user-facing error message and an error category

---

### User Story 4 - Tool Implementations Match Golden Examples (Priority: P2)

A developer implements one of the 4 initial migrated tools. Both the Python implementation (for the calc service) and the TypeScript implementation (for in-browser web-shell use) must produce outputs that match the golden I/O examples captured from the legacy Java implementation. When both implementations pass verification against all golden examples, the tool is considered migration-complete. (Future Python-only tools need only pass Python golden-example verification.)

**Why this priority**: Behavioral equivalence with the legacy system is a core requirement. Without golden-example verification, there is no confidence that migrated tools produce correct results.

**Independent Test**: Can be tested by running each implementation (Python and TypeScript independently) against every golden example for that tool and comparing outputs with floating-point tolerance.

**Acceptance Scenarios**:

1. **Given** the set-track-color tool specification and its golden examples, **When** the Python implementation processes the basic input, **Then** the output matches the expected golden output within floating-point tolerance (1e-9)
2. **Given** the same tool specification, **When** the TypeScript implementation processes the same input, **Then** it produces the same output as the Python implementation
3. **Given** a tool with 3 golden examples (basic, edge, complex), **When** both implementations are verified, **Then** all 6 test cases (3 examples x 2 languages) pass

---

### User Story 5 - Web-Shell Uses the Same Tool-List Contract as VS Code (Priority: P3)

A developer building the web-shell application integrates tool execution using the same tool-list JSON schema and ToolResponse contract used by the VS Code extension. The web-shell's Layers Toolbar receives tools from the TypeScript tool library's tool-list, filters them by selection using the shared matching logic, and executes them in-browser. The web-shell's tool set is limited to tools with TypeScript implementations, but the UX (toolbar, filtering, result display) is identical.

**Why this priority**: The common tool-list schema is the key abstraction that avoids UI duplication. Once the schema is defined (P1) and execution wired for VS Code (P2), applying the same pattern to web-shell is incremental.

**Independent Test**: Can be tested by loading the web-shell with a test dataset, selecting features, and running a tool — verifying the result uses the same ToolResponse structure as VS Code and the tool-list entries match the shared schema.

**Acceptance Scenarios**:

1. **Given** the web-shell application is loaded with a plot, **When** the Layers Toolbar requests the tool-list from the TypeScript tool library, **Then** it receives entries in the same JSON schema as the Python tool library produces for VS Code
2. **Given** the analyst runs "set-track-color" on a track in the web-shell, **When** the result is returned, **Then** it has the same ToolResponse structure as when the same tool runs via the Python service in VS Code
3. **Given** a tool exists only as a Python implementation (no TypeScript), **When** the web-shell requests its tool-list, **Then** that tool does NOT appear in the web-shell's available tools

---

### Edge Cases

- What happens when the tool library is unavailable or fails to respond? Both UIs should show the Run dropdown as disabled with a message indicating tool services are unavailable.
- What happens when a tool execution takes longer than expected? The UI should show a loading/progress indicator and allow cancellation.
- What happens when a tool returns results that reference feature IDs not present in the current plot? The result should still be displayable, with missing references noted in the provenance.
- How does the system handle tools that require parameters beyond feature selection (e.g., a colour value, a distance threshold)? Tool metadata includes parameter definitions, and the UI presents appropriate input controls before execution.
- What happens when Python and TypeScript implementations produce different results for the same input? The verification process flags this as a failure and both results are available for comparison.
- What happens when the selection changes while a tool is executing? The in-flight execution should complete normally; the selection state at the time of invocation is what matters.

## Requirements *(mandatory)*

### Functional Requirements

#### Tool Library & Common API

- **FR-001**: System MUST provide a single tool library that both UIs consume via the same contract
- **FR-002**: The tool library MUST expose the tool-list via MCP's standard tool listing mechanism. Each tool entry includes name, description, input schema, and MCP annotations carrying selection requirements and category.
- **FR-003**: Each tool's MCP annotations MUST include selection requirements specifying the kind of features needed (e.g., TRACK, CONTACT, ZONE), minimum count, and optional maximum count. This enables the Layers Toolbar to filter tools by current selection without custom metadata endpoints.
- **FR-004**: The tool library MUST support tool registration so that new tools become available to all consumers without requiring consumer-side changes
- **FR-005**: The tool execution contract MUST accept a tool identifier, a set of input features (as GeoJSON), and optional parameters, and return a ToolResponse
- **FR-006**: The ToolResponse MUST include the result content (features or artifacts), provenance metadata (tool name, version, input sources, timestamp), and a human-readable label
- **FR-007**: Error responses MUST include a user-facing error message and an error category (e.g., invalid_input, execution_error, timeout)

#### Tool Implementation (Python & TypeScript)

- **FR-008**: The 4 initial migrated tools MUST have both a Python implementation and a TypeScript implementation. New tools created after migration MAY be Python-only.
- **FR-009**: Python implementations MUST be consumable by the calc service (for VS Code execution via MCP)
- **FR-010**: TypeScript implementations MUST be usable by the web-shell application for in-browser execution (the web-shell is a static site with no server-side backend)
- **FR-011**: For tools that exist in both languages, both implementations MUST produce identical results for identical inputs, within floating-point tolerance (1e-9)
- **FR-012**: Both implementations MUST pass all golden example tests for the tool before being considered complete

#### Tool Definition Ownership

- **FR-023**: Each language's tool library MUST independently generate its own tool definitions (tool-list entries). Tool definitions are NOT derived from the central language-agnostic specifications.
- **FR-024**: Python tool definitions MUST be auto-generated from code annotations (e.g., decorators or metadata on tool functions). Analysts and scientists authoring new tools MUST NOT need to maintain a separate tool definition file.
- **FR-025**: TypeScript tool definitions MUST be generated from the TypeScript tool implementations, following the same tool-list schema as the Python side.
- **FR-026**: Both language libraries MUST produce tool-list entries conforming to MCP's tool definition format (name, description, inputSchema, annotations), so that the Layers Toolbar can consume either language's tool-list with identical UI logic and any MCP client can discover the tools.

#### Context-Sensitive Tool Matching

- **FR-013**: Both UIs MUST use the selection requirements from the tool-list to determine which tools are applicable to the current selection
- **FR-014**: The tool matching logic MUST be shared (not duplicated) between VS Code and web-shell
- **FR-015**: When a tool's requirements are not met by the current selection, the UI MUST show the tool as unavailable with a human-readable explanation

#### UI Integration

- **FR-016**: The VS Code extension's Layers Toolbar Run dropdown MUST be populated from the common tool-list
- **FR-017**: The web-shell's Layers Toolbar Run dropdown MUST be populated from the same common tool-list
- **FR-018**: Both UIs MUST display tool execution results as result layers in their respective layer panels
- **FR-019**: Tool parameters (beyond feature selection) MUST be presented as input controls before execution begins

#### Provenance & Traceability

- **FR-020**: Every tool execution result MUST record which tool (name + version) produced it
- **FR-021**: Every tool execution result MUST record which input features were used
- **FR-022**: Provenance metadata MUST be included in any persisted results (e.g., STAC items)

### Key Entities

- **Tool**: A registered analysis or manipulation operation with metadata (name, version, category, description) and selection requirements defining what input features it needs
- **Tool-List**: The set of available tools exposed via MCP's standard tool listing. Each language (Python, TypeScript) generates its own tool-list independently, but all entries conform to MCP's tool definition format. VS Code consumes the Python tool-list; web-shell consumes the TypeScript tool-list.
- **Selection Requirement**: A constraint on a tool expressed in MCP annotations, specifying the kind of features required (e.g., TRACK), a minimum count, and an optional maximum count. Standard MCP clients see the tool but only Debrief-aware UIs interpret the selection requirements.
- **ToolResponse**: The standard output envelope from tool execution, containing result content items with provenance annotations
- **Provenance**: Lineage metadata recording which tool produced a result, from which inputs, with which parameters, and when
- **Tool Parameter**: A configurable input beyond feature selection (e.g., a colour value, a threshold) with type, default value, and constraints
- **Golden Example**: A matched pair of input/output JSON files that define the expected behaviour of a tool, used for verification

## User Interface Flow

### Decision Analysis

- **Primary Goal**: The analyst wants to run an analysis or manipulation tool on selected features in their plot
- **Key Decision(s)**:
  1. Which features to select as input (tracks, contacts, zones, etc.)
  2. Which tool to run from the available options
  3. What parameter values to provide (if the tool requires configuration beyond selection)
- **Decision Inputs**: The Layers Toolbar Run dropdown shows only tools matching the current selection, organised by category (Analysis, Styling, etc.). Each tool shows its name, and disabled tools show why they are unavailable. Parameter inputs show defaults and constraints.

### Screen Progression

| Step | Screen/State           | User Action                              | Result                                                                                |
|------|------------------------|------------------------------------------|---------------------------------------------------------------------------------------|
| 1    | Features loaded in map | Analyst selects 2 tracks in feature list | Selection state updates; Layers Toolbar evaluates tool availability                   |
| 2    | Toolbar shows Run      | Analyst clicks Run dropdown              | Dropdown shows categories with available tools enabled and unavailable tools greyed    |
| 3    | Tool selected          | Analyst clicks "Range Bearing"           | If tool needs parameters, parameter input appears; otherwise execution begins          |
| 4    | Parameters shown       | Analyst sets values and confirms          | Tool execution begins; loading indicator appears on Run button                         |
| 5    | Execution complete     | Result returned                          | Result layer appears in Layers panel; yellow halo on Associated Files if result stored |

### UI States

- **Empty State**: No tools available — Run button is disabled with tooltip "No tools registered" (occurs when tool library is unreachable or empty)
- **Loading State**: While tool-list is being fetched, Run button shows a loading spinner; during tool execution, Run button shows progress indicator
- **Error State**: If tool execution fails, a notification appears with the user-facing error message from the ToolResponse; the Run dropdown returns to its default state
- **Success State**: Result layer appears in the Layers panel with the tool's label; yellow halo animation on the Associated Files button if the result was persisted

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 4 existing tool specifications (set-track-color, apply-symbol-style, label-interval, symbol-interval) have both Python and TypeScript implementations that pass all golden example tests
- **SC-002**: Both VS Code and web-shell can request the tool-list and receive identical JSON responses listing all registered tools
- **SC-003**: An analyst can execute a tool from the Layers Toolbar in VS Code and see a result layer within 5 seconds of clicking Run (for tools operating on typical datasets of under 1000 features)
- **SC-004**: An analyst can execute the same tool from the Layers Toolbar in the web-shell and receive the same result
- **SC-005**: Adding a new tool to the library (registering a new implementation) causes it to appear in both UIs' tool-lists without any UI code changes
- **SC-006**: 100% of tool execution results include complete provenance metadata (tool name, version, input sources, timestamp)
- **SC-007**: The tool matching logic is exercised by a shared test suite that both UIs reference, confirming identical filtering behaviour

## Dependencies

- **Feature 045** (Layers Toolbar): Provides the Layers Toolbar component with Run dropdown, which this feature populates with tools
- **Feature 049** (Tool Documentation Model): Provides the language-neutral tool specification template (TEMPLATE.md) and `@tool_spec` decorator
- **Feature 050** (Tool Migration Workflow): Provides the slash commands (/tool.implement, /tool.verify) and agents for generating and validating implementations
- **Feature 038** (Context Tool Offering): Provides the ToolMatchService and tools tree provider pattern in VS Code

## Assumptions

- The Layers Toolbar (feature 045) is available as a shared component usable by both VS Code and web-shell
- Tool specifications in shared/tools/ are stable and follow TEMPLATE.md (feature 049)
- The web-shell is a static site hosted on GitHub Pages — it executes only TypeScript tool implementations in-browser and has no access to a Python backend
- The VS Code extension uses the Python calc service for tool execution (via MCP)
- The tool-list uses MCP's standard tool definition format as the common contract — each language generates tool-list entries independently using MCP conventions (name, description, inputSchema, annotations)
- Floating-point tolerance of 1e-9 is sufficient for cross-language equivalence in the initial migrated tools
- Analysts and scientists will author new tools in Python only; the TypeScript tool set will eventually consist only of the initial migrated tools unless further TypeScript implementations are added

## Out of Scope

- Migration of additional tools beyond the 4 already specified (that work is driven by the tool library SRD separately)
- Drag-drop or wizard-based tool invocation (requires new UX mechanisms not yet designed)
- Tool chaining or pipeline execution (running one tool's output as another's input automatically)
- Server-side execution for web-shell (it is a static GitHub Pages site with no backend)
- Real-time collaboration on tool results between multiple users
- Tool marketplace or third-party tool installation
- Tool authoring guide, onboarding experience, or documentation for analysts/scientists writing new tools (separate feature)

## Related

- Feature 038: Context Tool Offering — ToolMatchService, tools tree provider
- Feature 045: Layers Toolbar — Run dropdown, yellow halo, category menus
- Feature 049: Tool Documentation Model — TEMPLATE.md, @tool_spec decorator
- Feature 050: Tool Migration Workflow — /tool.implement, /tool.verify slash commands
- Tool Library SRD: docs/tool-migration/TOOL-LIBRARY-SRD.md — governs spec production
- Existing tool specs: shared/tools/track/styling/ (4 tools specified)
