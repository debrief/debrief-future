# Feature Specification: debrief-calc — Context-Sensitive Analysis Tools

**Feature Branch**: `005-debrief-calc`
**Created**: 2026-01-14
**Status**: Draft
**Input**: User description: "Stage-5 debrief-calc: Context-sensitive analysis tools for maritime tactical analysis platform"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover Available Tools for Selection (Priority: P1)

As an analyst working with maritime track data, I need to discover which analysis tools are available for my current selection so that I can choose the appropriate calculation to perform.

**Why this priority**: Tool discovery is the foundation of the analysis workflow. Without knowing what tools are available for a given selection context, users cannot proceed with any analysis. This enables the entire feature set.

**Independent Test**: Can be fully tested by selecting track data and querying the registry. Delivers immediate value by showing users their analysis options.

**Acceptance Scenarios**:

1. **Given** a user has selected a single track, **When** they query available tools, **Then** they receive a list of tools that operate on single-track selections
2. **Given** a user has selected multiple tracks, **When** they query available tools, **Then** they receive a list of tools that operate on multi-track selections
3. **Given** a user has selected a geographic region, **When** they query available tools, **Then** they receive a list of tools that operate on regional analysis
4. **Given** a user has no selection, **When** they query available tools, **Then** they receive an empty list or tools that operate without selection context
5. **Given** a user has selected features of a specific kind (e.g., "track", "zone"), **When** they query available tools, **Then** only tools that accept that feature kind are returned

---

### User Story 2 - Execute Analysis Tool on Selection (Priority: P1)

As an analyst, I need to execute an analysis tool on my current selection and receive results as valid GeoJSON features that can be displayed and further analyzed.

**Why this priority**: Tool execution is the core value proposition. Once users can discover tools, they must be able to run them. This is co-priority with discovery as neither is useful without the other.

**Independent Test**: Can be fully tested by selecting data, invoking a tool, and validating the GeoJSON output. Delivers analysis results that can be visualized.

**Acceptance Scenarios**:

1. **Given** a user has selected appropriate data for a tool, **When** they execute the tool, **Then** they receive results as valid GeoJSON features with the appropriate `kind` attribute set
2. **Given** a user executes a tool requiring two tracks, **When** both tracks are selected, **Then** the tool executes successfully and returns comparison results with the output kind specified by the tool
3. **Given** a user executes a tool, **When** the tool completes, **Then** provenance information is included indicating the source data and tool used
4. **Given** a user executes a tool with invalid selection context, **When** the tool is invoked, **Then** they receive a clear error message explaining the mismatch
5. **Given** a user executes a tool on features of an incompatible kind, **When** the tool validates input, **Then** they receive an error indicating the kind mismatch

---

### User Story 3 - Access Tools via Remote Protocol (Priority: P2)

As a system integrator, I need to invoke analysis tools remotely via MCP (Model Context Protocol) so that frontends and other services can access calculations without direct library integration.

**Why this priority**: MCP integration enables the architectural goal of thick services with thin frontends. While core functionality works without it, remote access unlocks VS Code extension and other client integrations.

**Independent Test**: Can be fully tested by sending MCP requests and validating responses. Delivers remote tool invocation capability.

**Acceptance Scenarios**:

1. **Given** the MCP service is running, **When** a client requests available tools, **Then** the service returns tool metadata including selection context requirements
2. **Given** a client sends a valid tool execution request via MCP, **When** the request includes proper selection context, **Then** the tool executes and returns GeoJSON results
3. **Given** a client sends an invalid request, **When** parameters are missing or malformed, **Then** the service returns appropriate error information

---

### User Story 4 - View Tool Metadata and Parameters (Priority: P3)

As an analyst, I need to understand what parameters a tool accepts and what outputs it produces so that I can use it correctly and interpret results.

**Why this priority**: Metadata enhances usability but is not required for basic tool operation. Users can discover and execute tools without detailed documentation.

**Independent Test**: Can be tested by querying tool metadata and verifying completeness. Delivers self-documenting tool information.

**Acceptance Scenarios**:

1. **Given** a user queries a specific tool, **When** they request metadata, **Then** they receive the tool's name, description, required selection context, accepted input kinds, output kind, and output format
2. **Given** a tool has configurable parameters, **When** a user queries metadata, **Then** parameter names, types, and default values are included
3. **Given** an LLM Supervisor queries tool metadata, **When** it needs to determine applicable tools, **Then** the accepted input kinds and output kind are available for decision-making

---

### User Story 5 - Verify and Use Tools via Command Line (Priority: P2)

As a developer or power user, I need to discover and execute analysis tools via a command-line interface so that I can verify implementations, automate workflows, and work without a graphical interface.

**Why this priority**: The CLI enables verification of debrief-calc before the VS Code extension (Stage 6) exists. It also serves power users and automation pipelines as an enduring capability.

**Independent Test**: Can be fully tested by running CLI commands against fixture files or STAC catalog items. Delivers tool access without UI dependency.

**Acceptance Scenarios**:

1. **Given** a user has GeoJSON fixture files, **When** they run `debrief-cli tools list --input track.geojson`, **Then** they see tools applicable to that input's kind
2. **Given** a user wants to run a tool, **When** they execute `debrief-cli tools run track-stats --input track.geojson`, **Then** valid GeoJSON is output to stdout
3. **Given** a user has items in a STAC catalog, **When** they run `debrief-cli tools run range-bearing --store my-catalog --item track-001 --item track-002`, **Then** the tool executes using catalog data
4. **Given** a user wants machine-readable output, **When** they add `--json` to any command, **Then** output is valid JSON parseable by standard tools
5. **Given** a user wants to validate GeoJSON, **When** they run `debrief-cli validate track.geojson`, **Then** they receive pass/fail with details
6. **Given** a tool execution fails, **When** the CLI exits, **Then** the exit code reflects the failure type (2=invalid args, 3=validation failed, 4=execution failed, 5=store not found)

---

### Edge Cases

- What happens when a tool execution takes longer than expected? (Tool execution should complete within reasonable time; no cancellation mechanism required for initial release)
- How does the system handle invalid GeoJSON in source data? (Tools should validate input and return descriptive errors)
- What happens when selection context changes during tool execution? (Execution uses snapshot of selection at invocation time)
- How does the system handle tools with no applicable selection? (Return clear error indicating no valid context)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a tool registry that catalogs all available analysis tools
- **FR-002**: System MUST support querying tools by selection context type (single track, multiple tracks, point selection, regional analysis)
- **FR-003**: System MUST execute tools based on the provided selection context and return results
- **FR-004**: System MUST serialize all tool outputs as valid GeoJSON features conforming to the project's GeoJSON profile
- **FR-005**: System MUST include provenance information in tool outputs indicating source data and transformation applied
- **FR-006**: System MUST validate tool inputs against required selection context before execution
- **FR-007**: System MUST expose tools via MCP protocol following patterns established in mcp-common
- **FR-008**: System MUST implement at least 3 representative tools demonstrating diverse selection contexts
- **FR-009**: System MUST return descriptive error messages when tool execution fails or context is invalid
- **FR-010**: System MUST expose tool metadata including name, description, selection requirements, and parameter definitions
- **FR-011**: Tool definitions MUST specify which feature kinds they accept as input (e.g., "track", "zone", "point")
- **FR-012**: Tool definitions MUST specify the feature kind of their output, enabling downstream systems to determine rendering and business logic
- **FR-013**: System MUST filter available tools based on the `kind` attribute of selected features
- **FR-014**: All tool outputs MUST include the appropriate `kind` attribute in feature.properties as specified by the tool definition

#### CLI Requirements (debrief-cli package)

- **FR-015**: CLI MUST provide `tools list` command to discover available tools, optionally filtered by input file or STAC item
- **FR-016**: CLI MUST provide `tools run <tool-name>` command to execute tools with input from files (`--input`) or STAC items (`--store`/`--item`)
- **FR-017**: CLI MUST provide `tools describe <tool-name>` command to show tool metadata including accepted kinds and parameters
- **FR-018**: CLI MUST provide `validate` command to check GeoJSON against project schemas
- **FR-019**: CLI MUST provide `catalog` commands (`stores`, `list`, `get`) to browse STAC catalogs
- **FR-020**: CLI MUST output to stdout by default; users redirect to files as needed
- **FR-021**: CLI MUST support `--json` flag on all commands for machine-readable output
- **FR-022**: CLI MUST use exit codes to indicate outcome (0=success, 2=invalid args, 3=validation failed, 4=execution failed, 5=store not found)
- **FR-023**: CLI MUST discover STAC stores via XDG config file location (consistent with debrief-config)

### Key Entities

- **Tool**: An analysis operation that accepts selection context and returns GeoJSON results. Has metadata (name, description, version), selection context requirements, accepted input kinds, output kind, configurable parameters, and output specification.
- **Tool Registry**: A catalog of available tools that supports queries by selection context type and feature kind. Enables tool discovery based on what the user has selected.
- **Selection Context**: The user's current data selection that determines which tools are applicable. Types include single track, multiple tracks, point selection, and regional bounds. Each selected feature has a `kind` attribute that further constrains applicable tools.
- **Tool Result**: The output of a tool execution, serialized as GeoJSON features with provenance metadata and the appropriate `kind` attribute set in feature.properties.
- **Tool Metadata**: Descriptive information about a tool including its name, purpose, required inputs, accepted input kinds, output kind, parameters, and expected outputs.
- **Feature Kind**: A discriminator attribute (`kind`) in feature.properties that identifies the type of feature (e.g., "track", "zone", "bearing", "range-ring"). Used by tools to declare compatibility and by other systems (rendering, tree views, LLM Supervisor) to determine appropriate handling.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can discover applicable tools for any valid selection context within 1 second
- **SC-002**: Tool execution completes and returns valid GeoJSON results for standard analysis operations
- **SC-003**: 100% of tool outputs pass GeoJSON validation against the project's schema
- **SC-004**: All tool results include complete provenance information (source data references, tool identifier, execution timestamp)
- **SC-005**: At least 3 representative tools are available demonstrating single-track, multi-track, and regional analysis contexts
- **SC-006**: Remote clients can discover and execute tools via MCP with identical results to direct invocation
- **SC-007**: Invalid tool invocations return descriptive error messages that identify the specific problem
- **SC-008**: 100% of tool outputs include a valid `kind` attribute that matches the tool's declared output kind
- **SC-009**: Tool discovery correctly filters results based on selected feature kinds (no tools shown for incompatible kinds)

#### CLI Success Criteria

- **SC-010**: All debrief-calc acceptance scenarios (SC-001 through SC-009) can be verified via CLI commands
- **SC-011**: CLI JSON output is valid and parseable by standard tools (jq, Python json module)
- **SC-012**: CLI exit codes accurately reflect operation outcomes for scripting use
- **SC-013**: CLI help text (`--help`) is available for all commands and subcommands

## Assumptions

- Tool metadata schema has been defined in Stage 0 (schemas) and is available for use
- GeoJSON profile from Stage 0 defines the valid structure for tool outputs, including the `kind` attribute in feature.properties
- The `kind` attribute is a required field in feature.properties that differentiates feature types
- A defined set of valid `kind` values exists in the schema (e.g., "track", "zone", "point", "bearing", "range-ring")
- MCP patterns from mcp-common provide the foundation for remote tool access
- Selection context types align with those used in the frontend applications (VS Code extension, Loader)
- Initial release focuses on synchronous tool execution; async/background execution is out of scope
- Tool parameter validation uses the schemas infrastructure from Stage 0
- Future LLM Supervisor integration will use tool kind metadata for automated tool selection

## Dependencies

- **Stage 0 (000-schemas)**: Tool metadata schema and GeoJSON profile must exist
- **mcp-common**: Shared MCP utilities for service exposure
- Selection context definitions must align with frontend implementations

### CLI Package Dependencies

The `debrief-cli` package integrates multiple services:
- **debrief-calc**: Tool registry and execution (this spec)
- **debrief-io**: File format parsing for input files
- **debrief-stac**: Catalog access for `--store`/`--item` input
- **debrief-schemas**: Validation for `validate` command
- **debrief-config**: XDG config location for store discovery

## Out of Scope

- Asynchronous or background tool execution
- Tool execution cancellation
- Custom tool development by end users
- Tool versioning and migration
- Performance optimization for very large datasets
- Tool execution quotas or rate limiting

### CLI Out of Scope (Initial Release)

- Stdin input (files and STAC refs only)
- Interactive mode / REPL
- Configuration file for CLI preferences
- Shell completions (bash, zsh, fish)
- Progress bars for long operations
- Remote MCP server connection (CLI uses local libraries directly)

## Clarifications

### Session 2026-01-15

- Q: CLI output file handling → A: Output to stdout by default; users redirect to files
- Q: STAC store discovery → A: Config file at XDG location (consistent with debrief-config)
