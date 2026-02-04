# Feature Specification: Document MCP Tool Returns

**Feature Branch**: `041-document-tool-returns`
**Created**: 2026-02-04
**Status**: Draft
**Input**: User description: "041 document tool returns"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Understands Tool Output (Priority: P1)

A developer integrating with Debrief MCP tools needs to understand what data format a tool returns before calling it. They consult the tool's documentation to see the return schema, example responses, and field descriptions, enabling them to correctly parse and use the tool output.

**Why this priority**: Core value proposition - developers cannot effectively use tools without knowing what they return. This blocks all integration work.

**Independent Test**: Can be fully tested by presenting documentation to a new developer and measuring whether they can correctly predict the structure of a tool's response without running the tool.

**Acceptance Scenarios**:

1. **Given** a developer wants to use the `run_tool` MCP tool, **When** they access the tool documentation, **Then** they see a complete description of the response structure including all fields, types, and annotations.
2. **Given** a developer reads the documentation for an artifact-returning tool, **When** they review the return schema, **Then** they understand that artifacts include `debrief:href` and how to retrieve the referenced file.
3. **Given** a developer encounters an unfamiliar `debrief:resultType` value, **When** they consult the documentation, **Then** they find an explanation of the hierarchical type system and how to handle unknown subtypes.

---

### User Story 2 - Developer Handles Errors Correctly (Priority: P1)

A developer building an integration needs to handle error cases gracefully. They consult the error documentation to understand error response structure, error categories, and appropriate recovery actions for each category.

**Why this priority**: Error handling is essential for robust integrations. Poor error handling leads to confusing user experiences and support burden.

**Independent Test**: Can be fully tested by presenting error documentation to a developer and verifying they can implement correct error handling for all documented error categories.

**Acceptance Scenarios**:

1. **Given** a tool returns an error response, **When** the developer consults the error documentation, **Then** they find the error structure with `debrief:errorCategory` and understand what each category means.
2. **Given** an `invalid_input` error occurs, **When** the developer reads the documentation, **Then** they understand how to extract `debrief:affectedFeatures` to report which inputs caused the failure.
3. **Given** a new error category is encountered, **When** the developer checks the documentation, **Then** they find guidance on graceful degradation for unknown error categories.

---

### User Story 3 - Developer Finds Tool-Specific Examples (Priority: P2)

A developer working with a specific tool (e.g., CPA calculation, track smoothing) needs concrete examples of that tool's inputs and outputs. They find tool-specific documentation with realistic example requests and responses.

**Why this priority**: Examples accelerate understanding and reduce trial-and-error. Less critical than schema documentation but significantly improves developer experience.

**Independent Test**: Can be fully tested by asking a developer to implement a tool call using only the example documentation and measuring success rate and time to completion.

**Acceptance Scenarios**:

1. **Given** a developer wants to call the bearing calculation tool, **When** they access its documentation, **Then** they find at least one complete request/response example with realistic data.
2. **Given** a tool can return multiple result types, **When** the developer reviews examples, **Then** they see an example for each possible result type the tool can produce.
3. **Given** an analysis tool has optional parameters, **When** the developer reads the documentation, **Then** they see examples both with and without optional parameters.

---

### User Story 4 - Developer Discovers Available Tools (Priority: P3)

A developer new to the Debrief MCP ecosystem wants to explore what tools are available. They access a tools overview that lists all tools organized by service, with brief descriptions of each tool's purpose and return type category.

**Why this priority**: Discovery improves adoption but developers can also use `list_tools()` programmatically. Documentation provides better context than raw tool listing.

**Independent Test**: Can be fully tested by presenting the tools overview to a new developer and measuring whether they can identify the correct tool for a given analysis task.

**Acceptance Scenarios**:

1. **Given** a developer opens the tools documentation, **When** they view the overview page, **Then** they see all MCP tools grouped by service (calc, stac, session-state).
2. **Given** a developer needs to find tools that create new features, **When** they scan the overview, **Then** result type indicators help them identify tools returning `addition` type results.
3. **Given** a developer wants analysis tools, **When** they browse the debrief-calc section, **Then** they see each tool with a one-line description and link to detailed documentation.

---

### Edge Cases

- What happens when documentation references a deprecated tool? Deprecated tools are clearly marked with deprecation notices and migration guidance.
- How does documentation handle organization-specific tool extensions? Extension points are documented, with examples showing how contrib tools follow the same patterns.
- What happens when a tool's return type changes between versions? Version compatibility notes are included when breaking changes occur.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Documentation MUST describe the four result top-types (mutation, addition, deletion, artifact) with complete field specifications for each.
- **FR-002**: Documentation MUST include the complete annotation schema showing required annotations (`debrief:resultType`, `debrief:sourceFeatures`, `debrief:label`) and type-specific annotations.
- **FR-003**: Documentation MUST explain the hierarchical type system with examples showing how `mutation/track/smoothed` can be matched at different depths.
- **FR-004**: Documentation MUST describe the error response structure including all standard error categories (`invalid_input`, `algorithm_failure`, `resource_not_found`).
- **FR-005**: Documentation MUST provide at least one complete request/response example for each MCP tool exposed by debrief-calc, debrief-stac, and session-state services.
- **FR-006**: Documentation MUST include JSON Schema definitions for tool return types that can be used for validation.
- **FR-007**: Documentation MUST be organized with a clear hierarchy: overview, per-service sections, and per-tool pages.
- **FR-008**: Documentation MUST include guidance on graceful degradation when encountering unknown result subtypes or error categories.
- **FR-009**: Documentation MUST describe provenance fields (`properties.prov`) that appear on persisted results.
- **FR-010**: Each tool's documentation MUST specify which result types that tool can produce.
- **FR-011**: Documentation MUST be kept in version control alongside the tool implementations to maintain synchronization.
- **FR-012**: Documentation MUST follow a consistent template structure across all tools for predictability.

### Key Entities

- **MCP Tool**: A callable function exposed via Model Context Protocol, with defined inputs and outputs.
- **Tool Return**: The structured response from an MCP tool, containing content items with annotations.
- **Result Type**: Classification of tool output into mutation, addition, deletion, or artifact categories.
- **Annotation**: Metadata attached to return content providing provenance, type, and labeling information.
- **Error Response**: Structured error information with category, message, and affected feature references.
- **Documentation Page**: A markdown or structured document describing a tool's return format and examples.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can correctly predict tool return structure from documentation alone, verified by testing with 3+ developers achieving 90%+ accuracy on return structure prediction tests.
- **SC-002**: Time for a new developer to implement their first successful tool integration reduces by 50% compared to using only code inspection.
- **SC-003**: 100% of MCP tools across all three services (calc, stac, session-state) have complete return documentation following the standard template.
- **SC-004**: Documentation includes examples covering all four result types (mutation, addition, deletion, artifact) with at least one realistic example each.
- **SC-005**: Support questions about tool return formats decrease by 75% after documentation is published.
- **SC-006**: Documentation validation tests pass, confirming all JSON Schema definitions match actual tool outputs.

## Assumptions

- Documentation will be written in Markdown format, consistent with existing project documentation.
- Documentation lives in the repository alongside code (likely in `docs/` or `specs/` directories).
- The existing tool result architecture (result_types.py, result_builder.py) is stable and serves as the source of truth.
- Developers have basic familiarity with MCP protocol concepts.
- The three services (debrief-calc, debrief-stac, session-state) represent the complete set of MCP tool providers.

## Dependencies

- Depends on stable tool result architecture from spec 041-document-tool-results.
- Requires access to all current MCP tool implementations to document their specific return formats.
- Schema definitions (LinkML/JSON Schema) should inform documentation structure.

## Scope Boundaries

**In Scope**:
- Return value documentation for all MCP tools
- JSON Schema definitions for return types
- Example request/response pairs
- Error handling documentation
- Tools overview and discovery documentation

**Out of Scope**:
- Tool input parameter documentation (may be separate effort)
- Tutorial or getting-started guides
- API client library documentation
- Video or interactive documentation formats
