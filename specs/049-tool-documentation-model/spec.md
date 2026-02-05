# Feature Specification: Language-Neutral Tool Documentation Model

**Feature Branch**: `049-tool-documentation-model`
**Created**: 2026-02-05
**Status**: Draft
**Input**: User description: "Create a language-neutral tool documentation model for consistency between Python and TypeScript implementations"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Tool Specification from Template (Priority: P1)

A developer needs to document a new tool that will be implemented in both Python and TypeScript. They use the standard template to create a specification that precisely defines the tool's behavior, ensuring both implementations will behave identically.

**Why this priority**: The template is the foundation for all tool specifications. Without it, no other tools can be documented consistently.

**Independent Test**: Can be fully tested by creating a new tool spec using the template and verifying it contains all required sections with appropriate content.

**Acceptance Scenarios**:

1. **Given** the template exists at `shared/tools/TEMPLATE.md`, **When** a developer copies it for a new tool, **Then** all 9 required sections are present (Metadata, MCP, Inputs, Outputs, Algorithm, Edge Cases, Examples, Changelog, References)
2. **Given** a developer has created a new tool spec, **When** they fill in the Algorithm section with pseudocode, **Then** the specification is unambiguous enough for independent implementation in any language
3. **Given** a developer creates a spec with semver versioning, **When** they name the file, **Then** the filename follows the pattern `[tool-name].[major].[minor].md` (e.g., `set-track-color.1.0.md`)

---

### User Story 2 - Validate Implementation Against Golden Examples (Priority: P1)

A developer implementing a tool in Python or TypeScript needs to verify their implementation produces correct outputs. They run their implementation against the golden input/output example pairs and compare results.

**Why this priority**: Golden examples are the source of truth for testing. Without them, there's no way to verify implementations behave consistently.

**Independent Test**: Can be fully tested by running any implementation against the golden examples and verifying outputs match exactly.

**Acceptance Scenarios**:

1. **Given** golden examples exist as `[tool-name].[example-name].input.json` and `[tool-name].[example-name].output.json`, **When** a Python implementation processes the input, **Then** the output matches the expected output exactly
2. **Given** the same golden examples, **When** a TypeScript implementation processes the input, **Then** the output matches the expected output exactly (same as Python)
3. **Given** an implementation produces different output than the golden example, **When** the test runs, **Then** it fails with a clear diff showing the discrepancy

---

### User Story 3 - Link Implementation to Specification (Priority: P2)

A developer implementing a tool wants to formally link their code to the specification it implements. They use a decorator (Python) or annotation (TypeScript) to reference the spec path and version.

**Why this priority**: Implementation linkage ensures traceability between code and specification, but implementations can exist without it initially.

**Independent Test**: Can be fully tested by adding a decorator to a Python function and verifying it references the correct spec.

**Acceptance Scenarios**:

1. **Given** a Python tool implementation, **When** the developer adds `@tool_spec("track/styling/set-track-color.1.0")`, **Then** the decorator validates the spec path exists
2. **Given** the spec path in the decorator doesn't exist, **When** the code is executed or linted, **Then** an error is raised indicating the missing spec
3. **Given** a decorated tool function, **When** introspection is performed, **Then** the spec path and version are accessible programmatically

---

### User Story 4 - Discover Tools by Category (Priority: P2)

A developer or MCP client wants to find all available tools in a specific category. They browse the hierarchical folder structure to discover tools organized by domain.

**Why this priority**: Discoverability becomes important as the tool library grows, but initial tools can be found manually.

**Independent Test**: Can be fully tested by navigating to a category folder and listing all tool specs within it.

**Acceptance Scenarios**:

1. **Given** tools are organized in `shared/tools/[category]/[subcategory]/`, **When** a developer browses `shared/tools/track/styling/`, **Then** they see all track styling tools (e.g., set-track-color, apply-symbol-style, label-interval, symbol-interval)
2. **Given** an MCP client queries for available tools, **When** it reads the Metadata section of each spec, **Then** it can build a categorized tool catalog

---

### User Story 5 - Provide Tool Description for MCP/LLM (Priority: P3)

An LLM (Claude) using MCP to invoke tools needs human-readable descriptions optimized for AI understanding. The dedicated MCP section in each spec provides these descriptions.

**Why this priority**: MCP integration enhances the developer experience but tools function without it initially.

**Independent Test**: Can be fully tested by extracting the MCP section from a spec and verifying it contains LLM-optimized descriptions.

**Acceptance Scenarios**:

1. **Given** a tool spec with an MCP section, **When** an MCP client reads it, **Then** it finds a concise description optimized for LLM understanding
2. **Given** the MCP section describes parameters, **When** Claude reads it, **Then** it understands what inputs to provide and what outputs to expect

---

### Edge Cases

- What happens when a spec file has invalid semver in the filename? The system should reject it with a clear error message.
- How does the system handle a golden example with malformed JSON? The test framework should fail fast with a parse error indicating the problematic file.
- What happens when multiple versions of the same tool exist? The implementation decorator specifies which version it targets; multiple versions can coexist.
- How are deprecated tool versions handled? The Metadata section includes a `status` field that can be set to `deprecated` with a pointer to the replacement.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a template file at `shared/tools/TEMPLATE.md` containing all 9 required sections
- **FR-002**: System MUST support hierarchical folder organization at `shared/tools/[category]/[subcategory]/`
- **FR-003**: Tool specifications MUST use semver versioning in filenames (e.g., `set-track-color.1.0.md`)
- **FR-004**: Each specification MUST include an Algorithm section with unambiguous pseudocode
- **FR-005**: System MUST support golden examples as JSON file pairs: `[tool-name].[example-name].input.json` and `[tool-name].[example-name].output.json`
- **FR-006**: Golden examples MUST reside in the same directory as their corresponding spec or in a `fixtures/` subdirectory
- **FR-007**: Python implementation linkage MUST be provided via `@tool_spec(path)` decorator
- **FR-008**: The decorator MUST validate that the referenced spec path exists
- **FR-009**: The Metadata section MUST include: name, version, category, status (draft/stable/deprecated)
- **FR-010**: The MCP section MUST include LLM-optimized descriptions for tool discovery
- **FR-011**: Tool inputs MUST reference existing GeoJSON feature schemas (no new schemas needed)
- **FR-012**: Tool outputs MUST reference existing ToolResults schemas
- **FR-013**: System MUST include initial specifications for four track/styling tools: set-track-color, apply-symbol-style, label-interval, symbol-interval

### Key Entities

- **Tool Specification**: A markdown document defining a tool's complete behavior including metadata, inputs, outputs, algorithm, and examples
- **Golden Example**: A pair of JSON files (input and output) that define correct behavior for a specific test case
- **Tool Category**: A hierarchical folder path organizing tools by domain (e.g., `track/styling/`)
- **Implementation Decorator**: A Python decorator that links code to its specification and validates the reference

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Template file exists at `shared/tools/TEMPLATE.md` with all 9 sections documented and exemplified
- **SC-002**: Four initial tool specifications exist in `shared/tools/track/styling/` with complete content
- **SC-003**: Each initial tool has at least one golden example input/output pair
- **SC-004**: Python `@tool_spec` decorator is implemented and validates spec path existence
- **SC-005**: Two independent implementations (Python and TypeScript) of the same tool produce identical outputs when given identical inputs from golden examples
- **SC-006**: A developer unfamiliar with the system can create a new tool spec in under 30 minutes using only the template and existing examples
- **SC-007**: All golden examples use existing GeoJSON feature schemas for inputs and ToolResults schemas for outputs

## Assumptions

- The `shared/tools/` directory will be created as a new top-level folder parallel to `shared/schemas/`
- TypeScript annotation infrastructure for `@tool_spec` equivalent is out of scope for this feature (Python only)
- The four initial tools (set-track-color, apply-symbol-style, label-interval, symbol-interval) do not require actual implementation - only specifications and golden examples
- CI integration for automated cross-implementation testing is out of scope
- Migration of existing tools to this model is out of scope

## Dependencies

- Existing GeoJSON feature schemas in `shared/schemas/`
- Existing ToolResults schemas
- Python decorator infrastructure (standard library sufficient)

## Out of Scope

- Actual Python/TypeScript implementations of the initial tools
- CI integration for cross-implementation testing
- Migration of existing tools to the new model
- TypeScript annotation infrastructure (future feature)
