# Feature Specification: Tool Migration Workflow for Legacy Debrief

**Feature Branch**: `050-tool-migration-workflow`
**Created**: 2026-02-05
**Status**: Draft
**Input**: User description: "Add tool migration workflow for Legacy Debrief - Create a workflow with four slash commands (/tool.discover, /tool.spec, /tool.implement, /tool.verify) and four supporting agents for systematically migrating tools from Legacy Debrief (Java/Eclipse RCP) to Future Debrief. Builds on feature 049 (language-neutral tool documentation model). Include Java harness template for capturing golden I/O."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover Migrateable Tools (Priority: P1)

A developer working on Future Debrief wants to understand which tools exist in the Legacy Debrief Java codebase and which are candidates for migration. They invoke `/tool.discover` pointing at the legacy source directory, and receive an inventory report listing all identified tools with their complexity and migration readiness.

**Why this priority**: Discovery is the essential first step in any migration. Without knowing what tools exist, developers cannot plan or prioritize migration work. This provides the foundation for all subsequent workflow steps.

**Independent Test**: Can be fully tested by pointing at sample Java source files and verifying the inventory report correctly identifies tool classes, their purposes, and migration complexity estimates.

**Acceptance Scenarios**:

1. **Given** a path to Legacy Debrief Java source, **When** developer runs `/tool.discover`, **Then** system produces an inventory report listing all identified tools with name, category, and brief description
2. **Given** a previously generated discovery report, **When** developer views it, **Then** they can identify which tools are migration candidates and their relative complexity
3. **Given** Legacy source with multiple tool categories (analysis, styling, measurement), **When** discovery runs, **Then** tools are organized by category in the report

---

### User Story 2 - Create Language-Neutral Tool Specification (Priority: P1)

A developer has identified a specific tool to migrate (e.g., "set-track-color") and wants to create a language-neutral specification. They invoke `/tool.spec set-track-color`, provide golden I/O examples captured from the Java implementation, and receive a complete specification following the TEMPLATE.md format established in feature 049.

**Why this priority**: Tool specifications are the contract between legacy and new implementations. Without specs, there's no way to ensure behavioral equivalence. This is co-equal with discovery as the foundation of migration.

**Independent Test**: Can be tested by creating a spec for a sample tool and verifying it contains all 9 required sections from TEMPLATE.md with accurate algorithm pseudocode.

**Acceptance Scenarios**:

1. **Given** a tool name and access to legacy Java source, **When** developer runs `/tool.spec {tool-name}`, **Then** system generates a specification file in `shared/tools/{category}/{tool-name}.1.0.md`
2. **Given** golden I/O JSON files provided by developer, **When** spec generation completes, **Then** the Examples section references these files with correct paths
3. **Given** complex algorithm logic in Java source, **When** spec is generated, **Then** Algorithm section contains language-neutral pseudocode that accurately describes the logic

---

### User Story 3 - Implement Tool from Specification (Priority: P2)

A developer has a completed tool specification and wants to generate Python and TypeScript implementations. They invoke `/tool.implement set-track-color` and receive working code in both languages that follows the specification's algorithm and passes the golden examples.

**Why this priority**: Implementation is valuable only after specifications exist. Having automated implementation generation significantly accelerates migration throughput while ensuring consistency.

**Independent Test**: Can be tested by implementing a spec and running the generated code against golden examples to verify output matches expected results.

**Acceptance Scenarios**:

1. **Given** a complete tool specification, **When** developer runs `/tool.implement {tool-name}`, **Then** system generates Python implementation in `services/debrief-calc/`
2. **Given** a complete tool specification, **When** developer runs `/tool.implement {tool-name}`, **Then** system generates TypeScript implementation in `apps/vscode/`
3. **Given** golden examples in the spec, **When** implementations are generated, **Then** they include test files that exercise each golden example

---

### User Story 4 - Verify Implementation Correctness (Priority: P2)

A developer has generated implementations and wants to verify they produce identical results to the legacy tool. They invoke `/tool.verify set-track-color` and receive a verification report comparing Python, TypeScript, and expected outputs.

**Why this priority**: Verification ensures behavioral equivalence, which is the entire point of migration. However, it requires implementations to exist first.

**Independent Test**: Can be tested by running verification against implementations with known correct and incorrect outputs to verify the report accurately identifies matches and mismatches.

**Acceptance Scenarios**:

1. **Given** Python and TypeScript implementations and golden examples, **When** developer runs `/tool.verify {tool-name}`, **Then** system produces a report showing pass/fail for each example
2. **Given** implementations that produce incorrect output, **When** verification runs, **Then** report clearly identifies which outputs differ and shows expected vs actual values
3. **Given** all implementations pass, **When** verification completes, **Then** report shows overall PASS status suitable for migration sign-off

---

### User Story 5 - Capture Golden I/O from Running Java (Priority: P3)

A developer needs to capture input/output pairs from the running Legacy Debrief Java application for use as golden examples. They use the provided Java harness template to wrap a tool, run it with sample data, and export JSON files matching the expected naming convention.

**Why this priority**: Golden I/O capture requires the legacy application to be available and runnable. This is a manual step that supports the workflow but is not automatable by the agents.

**Independent Test**: Can be tested by using the harness template to capture I/O from a sample Java tool and verifying the output JSON files conform to the expected schema and naming convention.

**Acceptance Scenarios**:

1. **Given** the Java harness template, **When** developer integrates it with a legacy tool, **Then** they can capture input/output as JSON files
2. **Given** captured JSON files, **When** they are placed in `shared/tools/{category}/`, **Then** they follow the naming convention `{tool-name}.{example-name}.{input|output}.json`
3. **Given** captured output files, **When** compared to GeoJSON schemas, **Then** they validate successfully against the schema

---

### Edge Cases

- What happens when legacy Java source cannot be found at the specified path?
- How does the system handle tools with no clear algorithmic logic (UI-only tools)?
- What happens when golden examples are missing or malformed?
- How does verification handle floating-point precision differences between Java, Python, and TypeScript?
- What happens when a tool has dependencies on other legacy tools not yet migrated?

## Requirements *(mandatory)*

### Functional Requirements

#### Discovery Command

- **FR-001**: System MUST provide a `/tool.discover` command that accepts a path to Java source code
- **FR-002**: System MUST identify tool classes by analyzing Java source patterns (e.g., classes implementing tool interfaces, annotations, naming conventions)
- **FR-003**: System MUST produce an inventory report in Markdown format listing all discovered tools
- **FR-004**: Inventory report MUST include tool name, category, brief description, and estimated migration complexity for each tool

#### Specification Command

- **FR-005**: System MUST provide a `/tool.spec {tool-name}` command that generates a language-neutral specification
- **FR-006**: Generated specifications MUST follow the TEMPLATE.md format from feature 049 with all 9 required sections
- **FR-007**: System MUST extract algorithm logic from Java source and convert to language-neutral pseudocode
- **FR-008**: System MUST support referencing golden I/O files provided by the developer

#### Implementation Command

- **FR-009**: System MUST provide a `/tool.implement {tool-name}` command that generates implementations from a specification
- **FR-010**: System MUST generate Python implementation compatible with the debrief-calc service structure
- **FR-011**: System MUST generate TypeScript implementation compatible with the VS Code extension structure
- **FR-012**: Generated implementations MUST include test files exercising golden examples

#### Verification Command

- **FR-013**: System MUST provide a `/tool.verify {tool-name}` command that validates implementations against specifications
- **FR-014**: Verification MUST run all golden examples through Python and TypeScript implementations
- **FR-015**: Verification MUST compare outputs against expected results and report pass/fail status
- **FR-016**: Verification report MUST show specific differences when outputs do not match

#### Supporting Agents

- **FR-017**: System MUST provide a `legacy-tool-analyst` agent that can read and analyze Java source code
- **FR-018**: System MUST provide a `tool-spec-author` agent that writes specifications following TEMPLATE.md
- **FR-019**: System MUST provide a `tool-implementer` agent that generates Python and TypeScript code from specs
- **FR-020**: System MUST provide a `golden-example-validator` agent that compares implementation outputs to expected results

#### Java Harness

- **FR-021**: System MUST provide a Java harness template for capturing tool I/O
- **FR-022**: Java harness MUST serialize inputs and outputs to JSON format
- **FR-023**: Java harness output MUST conform to the project's GeoJSON schemas
- **FR-024**: Java harness MUST produce files following naming convention `{tool-name}.{example-name}.{input|output}.json`

### Key Entities

- **Tool Inventory**: Collection of discovered tools with metadata (name, category, description, complexity)
- **Tool Specification**: Language-neutral document describing a tool's behavior (follows TEMPLATE.md structure)
- **Golden Example**: Input/output JSON pair that defines expected tool behavior
- **Verification Report**: Summary of implementation testing showing pass/fail status per example
- **Migration Workflow**: The four-command sequence (discover → spec → implement → verify) for migrating a tool

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can discover all tools in a legacy Java codebase within one command invocation
- **SC-002**: Tool specifications generated by `/tool.spec` pass validation against TEMPLATE.md structure (all 9 sections present)
- **SC-003**: Implementations generated by `/tool.implement` compile/parse without errors in their respective languages
- **SC-004**: At least one legacy tool is successfully migrated end-to-end using the complete workflow (discover → spec → implement → verify) as validation
- **SC-005**: Verification reports clearly indicate pass/fail status with specific difference details for failures
- **SC-006**: Golden examples captured via Java harness validate successfully against GeoJSON schemas
- **SC-007**: The complete workflow can be executed by a developer unfamiliar with the legacy codebase using only the command documentation

## Dependencies

- **Feature 049**: Language-neutral tool documentation model (TEMPLATE.md, `@tool_spec` decorator) - **COMPLETE**
- **Existing Schemas**: GeoJSON schemas in `shared/schemas/` for validation
- **Legacy Debrief Source**: Access to Java source code (not bundled, provided by developer)

## Assumptions

- Developers have access to Legacy Debrief Java source code for discovery and analysis
- Developers can run the Legacy Debrief application to capture golden I/O (required for Java harness)
- Tools follow recognizable patterns in the Java codebase (interface implementations, naming conventions, or annotations)
- Golden I/O can be represented as JSON (tools operating on non-serializable data are out of scope)
- Floating-point comparison in verification uses a reasonable epsilon tolerance (1e-9) for cross-language consistency

## Out of Scope

- Automatic execution of Legacy Debrief Java code (requires manual developer involvement)
- Migration of UI-only tools without algorithmic logic
- Full migration of all legacy tools (this feature validates the workflow with one tool)
- Runtime Java integration beyond the harness template
- Automatic detection of tool dependencies (developer must identify these)

## Related

- Feature 049: Language-neutral tool documentation model
- `shared/tools/TEMPLATE.md`: Template for tool specifications
- `services/debrief-tools/`: Python `@tool_spec` decorator
- `docs/ideas/050-tool-migration-workflow.md`: Original idea document
