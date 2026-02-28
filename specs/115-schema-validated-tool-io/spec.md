# Feature Specification: Enforce Schema-Validated Tool Inputs and Outputs

**Feature Branch**: `115-schema-validated-tool-io`
**Created**: 2026-02-28
**Status**: Draft
**Input**: User description: "Enforce schema-validated tool inputs and outputs (ADR-008)"
**Related**: [ADR-008](../../docs/project_notes/decisions.md#adr-008-schema-validated-tool-inputs-and-outputs-2026-02-27)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Schema Catches Field Mismatch Before Deployment (Priority: P1)

A tool developer modifies the `apply-symbol-style` tool to write a marker property to a new field name. Because the tool's output is validated against the shared schema, the system immediately rejects the output with a clear error identifying the incorrect field. The developer corrects the field name before the change ever reaches a user, preventing a silent rendering bug where symbols would fail to appear on the map.

**Why this priority**: This is the exact class of bug that motivated ADR-008 — the `apply-symbol-style` tool wrote to `style.point.shape` while the renderer read from `default_position_style.symbol`. Schema validation at the tool boundary catches these mismatches at development time instead of in production.

**Independent Test**: Can be tested by running any tool with an intentionally incorrect output field name and verifying the system reports a validation error.

**Acceptance Scenarios**:

1. **Given** a tool that produces output with a field name not defined in the schema, **When** the tool executes, **Then** the system rejects the output with an error identifying the invalid field
2. **Given** a tool that produces output with all fields matching the schema, **When** the tool executes, **Then** the output passes validation and is returned normally
3. **Given** a tool that writes a property value of the wrong type (e.g., string where number expected), **When** the tool executes, **Then** the system rejects the output with a type mismatch error

---

### User Story 2 - Enum Parameters Validated From Single Source of Truth (Priority: P2)

An analyst selects a track and runs the `apply-symbol-style` tool, providing `"hexagon"` as the symbol shape. The system rejects the request immediately with a clear message listing the valid symbol shapes — which come directly from the shared schema definition. When a new symbol shape (e.g., `"star"`) is later added to the schema, all tools that accept symbol shapes automatically recognise the new value without any tool code changes.

**Why this priority**: Eliminates the current pattern where each tool hardcodes its own set of valid enum values (e.g., `valid_symbols = {"circle", "square", ...}`), which drift out of sync with the schema and with each other.

**Independent Test**: Can be tested by invoking a tool with an invalid enum value and verifying rejection, then adding a new value to the schema and verifying automatic acceptance.

**Acceptance Scenarios**:

1. **Given** a tool that accepts an enum parameter (e.g., symbol shape), **When** a user provides a value not in the schema-defined enum, **Then** the system rejects the request with a message listing valid values
2. **Given** a new enum value added to the schema, **When** a user provides that value to a tool, **Then** the tool accepts it without any tool-level code change
3. **Given** a tool with an enum parameter, **When** the tool's parameter definition is inspected, **Then** the valid values match exactly those defined in the shared schema

---

### User Story 3 - Input Features Validated at Service Boundary (Priority: P2)

A developer building a new frontend sends a malformed feature to the `track-stats` tool — the feature is missing the required `positions` array within its properties. The system rejects the input at the service boundary with a clear validation error identifying the missing field, rather than allowing the tool to process the incomplete data and produce an incorrect or confusing result.

**Why this priority**: Input validation prevents tools from operating on invalid data, which currently produces cryptic runtime errors deep in tool logic instead of clear boundary errors.

**Independent Test**: Can be tested by sending a feature with missing required fields to any tool and verifying a clear validation error is returned.

**Acceptance Scenarios**:

1. **Given** an input feature missing a required property field, **When** sent to a tool for processing, **Then** the system rejects it at the boundary with an error naming the missing field
2. **Given** an input feature with a `kind` value that doesn't match any known feature type, **When** sent to a tool, **Then** the system rejects it with a clear "unknown feature kind" error
3. **Given** a valid input feature with all required fields, **When** sent to a tool, **Then** validation passes and the tool processes it normally

---

### User Story 4 - Schema Change Surfaces Affected Tools (Priority: P3)

A schema maintainer renames a property field in the shared schema (e.g., renaming `label_interval` to `label_period`). When the project's automated checks run, every tool that reads or writes the old field name produces a validation failure, clearly identifying which tools need updating. The maintainer can then update all affected tools in a single pass rather than discovering breakages piecemeal through user reports.

**Why this priority**: Provides a safety net for schema evolution — ensures no tool silently breaks when the shared data model changes.

**Independent Test**: Can be tested by modifying a schema field name, running the full tool test suite, and verifying all affected tools report validation failures.

**Acceptance Scenarios**:

1. **Given** a schema field is renamed, **When** existing tools run their tests, **Then** tools reading or writing the old field name produce clear validation errors
2. **Given** a new required field is added to the schema, **When** existing tools run their tests, **Then** tools that don't populate the new field produce validation errors

---

### Edge Cases

- What happens when a tool receives a feature with extra properties not defined in the schema? The system should accept it (open for extension), validating only that required fields are present and correctly typed
- What happens when a tool receives a feature with a valid `kind` but the wrong feature type for that tool's requirements? The existing selection requirement checking should reject it before schema validation occurs
- What happens when schema validation adds measurable latency to tool execution? Validation overhead must remain negligible relative to tool computation time
- What happens when a tool needs to produce output with a new property not yet in the schema? The tool developer must update the schema first (enforcing "specs before code" principle), then implement the tool change
- What happens when the schema package is unavailable or fails to load? The system should fail clearly at startup, not silently skip validation

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST validate all tool input features against the shared schema definitions before tool execution begins
- **FR-002**: System MUST validate all tool output features against the shared schema definitions before returning results to the caller
- **FR-003**: System MUST derive all enum parameter constraints (symbol shapes, colours, duration presets, reference point patterns) from the shared schema rather than hardcoded values within individual tools
- **FR-004**: System MUST report validation errors with sufficient detail to identify the specific field, expected type/value, and actual type/value received
- **FR-005**: System MUST treat schema validation failures as errors (not warnings), preventing invalid data from propagating
- **FR-006**: System MUST use the `kind` field on input features to determine which schema model to validate against
- **FR-007**: System MUST continue to validate GeoJSON structural correctness and provenance metadata (existing `validate_tool_output` checks) in addition to schema validation
- **FR-008**: System MUST allow extra properties on features beyond those defined in the schema (open for extension)
- **FR-009**: All existing tools (currently 11 tools across analysis, mutation, reference, shape, and sensor categories) MUST pass schema validation for both inputs and outputs without changing their functional behaviour
- **FR-010**: System MUST declare a dependency from the calculation service on the shared schema package so that schema models are available at runtime
- **FR-011**: System MUST replace all hardcoded enum value sets in tools with references to schema-defined enums
- **FR-012**: Validation errors on tool inputs MUST be distinguishable from validation errors on tool outputs, so developers can quickly identify which boundary failed

### Key Entities

- **Feature Model**: A schema-defined data structure representing a GeoJSON feature with typed properties, identified by its `kind` discriminator (e.g., Track, Point, Circle, Rectangle). Each kind maps to a specific property schema
- **Schema Enum**: A named set of allowed values defined once in the shared schema and used by tools for parameter validation (e.g., symbol shapes, named colours, duration presets, reference point patterns)
- **Validation Error**: A structured error produced when data does not conform to its expected schema, containing the field path, expected constraint, and actual value
- **Tool Boundary**: The entry and exit points of tool execution where input features arrive and output features depart — the enforcement points for schema validation

## Assumptions

- The shared schema package already contains generated models for all feature kinds currently used by tools (Track, Point, Circle, Rectangle, Line, Text, Vector, MultiPoint, MultiPolygon)
- The shared schema package already contains enum definitions for all parameter types referenced by tools (PointShapeEnum, NamedColorEnum, MarkerSymbolEnum, DurationPresetEnum, ReferencePointPatternEnum)
- Existing tool tests exercise representative inputs and outputs that can serve as validation baselines
- The `kind` discriminator (ADR-004) is present on all features flowing through the tool system
- Schema validation overhead is negligible for the feature sizes encountered in typical maritime analysis (tracks with up to ~10,000 positions)
- Tool functional behaviour and outputs remain identical — this feature adds validation enforcement, not behavioural changes

## Dependencies

- **ADR-002**: Schema-first development with generated models — this feature enforces ADR-002 compliance through the full tool stack
- **ADR-004**: Feature Kind Discriminator — the `kind` field is the dispatch mechanism for selecting the correct validation schema
- **ADR-008**: Schema-Validated Tool Inputs and Outputs — the architectural decision that mandates this work
- **Shared schema package**: Must be up-to-date with all feature kinds and enums used by current tools

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of tool input features are validated against the appropriate schema model before tool execution
- **SC-002**: 100% of tool output features are validated against the appropriate schema model before being returned
- **SC-003**: Zero hardcoded enum value sets remain in any tool — all enum constraints derive from the shared schema
- **SC-004**: Schema validation errors identify the specific field path and mismatch, enabling a developer to locate and fix the issue within one error message (no need to debug through tool internals)
- **SC-005**: All 11 existing tools pass both input and output schema validation with their current test data, confirming no functional regression
- **SC-006**: When a schema field is renamed or removed, affected tools produce clear validation failures in automated tests within the same test run — no silent breakages
- **SC-007**: Adding a new enum value to the schema requires zero tool code changes for that value to be accepted by all tools that use that enum
