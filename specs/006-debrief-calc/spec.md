# Feature Specification: debrief-calc - Context-Sensitive Analysis Tools

**Feature Branch**: `006-debrief-calc`
**Created**: 2026-01-14
**Status**: Draft
**Input**: User description: "Stage-5 debrief-calc: Context-sensitive analysis tools with tool metadata schema, 3-4 representative tools across selection contexts, tool registry and discovery by context, and MCP wrapper"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tool Discovery by Selection Context (Priority: P1)

As an analyst with selected data (e.g., a track segment, multiple tracks, or a time period), I want to discover which analysis tools are available for my current selection context, so that I can understand what operations I can perform on my data.

**Why this priority**: Tool discovery is the foundational capability - users cannot use analysis tools if they cannot find them. This enables all subsequent tool execution workflows.

**Independent Test**: Can be fully tested by querying the registry with different selection contexts and verifying appropriate tools are returned for each context type.

**Acceptance Scenarios**:

1. **Given** a single track segment is selected, **When** I query available tools, **Then** I receive a list of tools applicable to single-track analysis (e.g., calculate speed statistics, identify maneuvers)
2. **Given** multiple tracks are selected, **When** I query available tools, **Then** I receive tools applicable to multi-track analysis (e.g., calculate range between tracks, identify closest point of approach)
3. **Given** no data is selected, **When** I query available tools, **Then** I receive an empty list or only global tools that don't require selection

---

### User Story 2 - Tool Execution with GeoJSON Result (Priority: P1)

As an analyst, I want to execute an analysis tool on my selected data and receive the result as GeoJSON features, so that the results can be displayed on the map and integrated with existing plot data.

**Why this priority**: Execution is the core value proposition - without execution, tool discovery is meaningless. Returns results in GeoJSON format for seamless integration with existing visualization infrastructure.

**Independent Test**: Can be fully tested by executing a tool with valid input and verifying the output conforms to GeoJSON schema with appropriate feature properties.

**Acceptance Scenarios**:

1. **Given** a valid tool and appropriate selection, **When** I execute the tool, **Then** I receive a GeoJSON FeatureCollection containing the analysis results
2. **Given** a tool requiring track data, **When** I execute with valid track features, **Then** the result includes provenance linking to input features
3. **Given** a tool execution that fails validation, **When** the tool cannot process the input, **Then** I receive a clear error message explaining why execution failed

---

### User Story 3 - Tool Metadata Inspection (Priority: P2)

As an analyst, I want to inspect a tool's metadata before execution, so that I understand what inputs it requires, what outputs it produces, and what parameters I can configure.

**Why this priority**: Understanding tool capabilities reduces errors and improves user confidence. Not strictly required for basic workflow but significantly improves usability.

**Independent Test**: Can be fully tested by retrieving metadata for any registered tool and verifying all required fields are present and accurate.

**Acceptance Scenarios**:

1. **Given** a registered tool, **When** I request its metadata, **Then** I receive description, required input types, output types, and configurable parameters
2. **Given** a tool with optional parameters, **When** I inspect metadata, **Then** I see parameter names, types, defaults, and validation constraints

---

### User Story 4 - MCP Integration for External Clients (Priority: P2)

As a frontend application (VS Code extension, Electron app), I want to access analysis tools via MCP protocol, so that I can integrate analysis capabilities without direct Python dependencies.

**Why this priority**: MCP integration enables the frontend applications defined in later stages to access analysis tools. Essential for the overall system architecture but depends on core functionality being complete.

**Independent Test**: Can be fully tested by connecting an MCP client to the service and performing tool discovery and execution through the protocol.

**Acceptance Scenarios**:

1. **Given** the MCP server is running, **When** an MCP client connects and requests available tools, **Then** the client receives the tool listing in MCP-compatible format
2. **Given** an MCP client, **When** executing a tool through MCP, **Then** the result is returned as a proper MCP response with GeoJSON payload

---

### Edge Cases

- What happens when a tool is requested for an unsupported selection context?
  - System returns an empty tool list or error indicating no applicable tools
- How does the system handle tool execution with malformed input data?
  - System validates input against tool's declared requirements and returns descriptive validation error
- What happens if a tool produces no results (e.g., no closest approach found in time window)?
  - System returns an empty FeatureCollection with metadata explaining the null result
- How are tool execution errors (e.g., numerical computation failures) reported?
  - System catches exceptions and returns structured error response with error type and message

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a tool registry that maintains metadata for all available analysis tools
- **FR-002**: System MUST support querying tools by selection context (single track, multiple tracks, time period, point, area)
- **FR-003**: Each tool MUST declare its applicable selection contexts in its metadata
- **FR-004**: System MUST execute tools and return results as validated GeoJSON FeatureCollections
- **FR-005**: Tool execution results MUST include provenance information linking outputs to inputs
- **FR-006**: System MUST validate tool inputs against declared requirements before execution
- **FR-007**: System MUST provide at least 3 representative tools demonstrating different selection contexts:
  - Single-track tool (e.g., speed/course statistics or maneuver detection)
  - Multi-track tool (e.g., range calculation or closest point of approach)
  - Time-period tool (e.g., aggregate statistics over time window)
- **FR-008**: System MUST expose tool registry and execution via MCP wrapper using shared mcp-common infrastructure
- **FR-009**: Tool metadata MUST include: unique identifier, human-readable name, description, applicable contexts, input requirements, output description, and configurable parameters
- **FR-010**: System MUST return structured error responses when tool execution fails, including error type and user-friendly message

### Key Entities

- **Tool**: An analysis operation that can be performed on selected data. Has metadata (identifier, name, description, contexts, parameters) and execution logic.
- **Selection Context**: The type of data currently selected by the user. Categories include: single-track, multi-track, time-period, point, area, and global (no selection required).
- **Tool Parameter**: A configurable input for tool execution. Has name, type, default value, and validation constraints.
- **Tool Result**: The output of tool execution. Contains GeoJSON features with analysis results and provenance metadata.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can query available tools for any supported selection context and receive results in under 500 milliseconds
- **SC-002**: Tool execution for standard operations (e.g., calculate distance, detect maneuvers) completes within 2 seconds for datasets up to 10,000 track points
- **SC-003**: All tool execution results conform to the project's GeoJSON schema and pass validation
- **SC-004**: 100% of implemented tools are discoverable via MCP interface and executable by MCP clients
- **SC-005**: Analysis results include traceable provenance linking each output feature to its source inputs
- **SC-006**: Error scenarios return informative messages that allow users to understand and correct the issue

## Assumptions

- The tool metadata schema is defined in Stage 0 (schemas) and this stage implements the runtime registry using those definitions
- Selection contexts align with the selection model to be implemented in VS Code extension (Stage 6)
- GeoJSON output format follows the project's established GeoJSON profile from schemas
- MCP wrapper follows patterns established in debrief-stac and debrief-io services
- Tool parameters use simple types (string, number, boolean) that can be represented in JSON

## Dependencies

- **debrief-schemas** (Stage 0): Tool metadata schema definitions, GeoJSON profile
- **mcp-common**: Shared MCP wrapper infrastructure for exposing service via MCP protocol
