# Feature Specification: Enforce Schema-Validated GeoJSON Across All Services

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

### User Story 4 - Parsed Files Produce Schema-Conformant Features (Priority: P2)

A data analyst loads a REP file containing track data and circle annotations. The file parser produces GeoJSON features that conform to the shared schema — with correct property structures, valid `kind` discriminators, and properly typed fields. When the parser is later modified and accidentally omits a required field from an annotation, the schema check catches the error at parse time rather than letting a malformed feature silently enter the catalog.

**Why this priority**: The file parser is where features are born. If features enter the system malformed, every downstream service (catalog, tools, renderers) must defensively handle bad data. Validating at the source eliminates an entire class of bugs.

**Independent Test**: Can be tested by parsing a known-good REP file and validating every output feature against the schema, then intentionally breaking a parser output and verifying the schema check catches it.

**Acceptance Scenarios**:

1. **Given** a valid REP file, **When** parsed into features, **Then** every output feature passes schema validation for its declared `kind`
2. **Given** a parser that omits a required property from an annotation feature, **When** the parser runs, **Then** the system reports a schema validation error identifying the missing field
3. **Given** a file containing multiple feature types (tracks, circles, rectangles, lines), **When** parsed, **Then** each feature validates against the correct schema model based on its `kind`

---

### User Story 5 - Catalog Operations Enforce Schema on Storage and Retrieval (Priority: P2)

A developer calls the catalog service to store a set of features. The catalog validates each feature against the schema before writing to disk. Later, when features are retrieved, the catalog returns properly typed data rather than opaque dictionaries. This ensures the catalog never becomes a repository of malformed data that other services silently consume and misinterpret.

**Why this priority**: The catalog is the persistence boundary — features flow in from parsers and tools, and flow out to renderers and analysis tools. If the catalog accepts and returns untyped data, schema enforcement elsewhere can be bypassed by storing bad data and retrieving it later.

**Independent Test**: Can be tested by attempting to store a malformed feature in the catalog and verifying rejection, then storing a valid feature and verifying the retrieved data passes schema validation.

**Acceptance Scenarios**:

1. **Given** a feature with invalid properties for its `kind`, **When** submitted to the catalog for storage, **Then** the catalog rejects it with a schema validation error
2. **Given** valid features stored in the catalog, **When** retrieved by any consumer, **Then** the returned features conform to the schema for their declared `kind`
3. **Given** a catalog containing features stored before schema enforcement, **When** retrieved, **Then** the system either validates them on read or clearly marks them as unvalidated legacy data

---

### User Story 6 - Frontend Renderers Use Shared Types (Priority: P3)

A frontend developer adds a new map layer to display sensor buffer zones. Instead of defining custom local types or using untyped objects, the developer imports the shared schema types directly. The type system catches at compile time if the renderer reads a property that doesn't exist on the sensor feature schema, preventing a runtime "undefined" error that would only surface during manual testing.

**Why this priority**: Frontends currently define their own workaround types (e.g., `SafeFeature`) or use untyped casts (`as any`, `as unknown`). Replacing these with shared schema types gives compile-time safety across the full stack.

**Independent Test**: Can be tested by removing a property from the shared schema and verifying that all frontend components using that property produce compile-time errors.

**Acceptance Scenarios**:

1. **Given** a frontend component that renders GeoJSON features, **When** it imports types from the shared schema, **Then** the compiler catches references to non-existent properties
2. **Given** a schema change that adds a new required field, **When** the project builds, **Then** frontend components that don't handle the new field produce compile-time errors
3. **Given** a frontend component that previously used local workaround types, **When** migrated to shared schema types, **Then** the component's behaviour is unchanged

---

### User Story 7 - Schema Change Surfaces All Affected Code (Priority: P3)

A schema maintainer renames a property field in the shared schema (e.g., renaming `label_interval` to `label_period`). When the project's automated checks run, every service that reads or writes the old field name produces a failure — tools show validation errors, parsers show schema errors, frontend builds fail with type errors, and catalog tests fail. The maintainer can update all affected code in a single pass rather than discovering breakages piecemeal through user reports.

**Why this priority**: Provides a safety net for schema evolution across the entire stack — ensures no service, parser, or renderer silently breaks when the shared data model changes.

**Independent Test**: Can be tested by modifying a schema field name, running the full project build and test suite, and verifying all affected code reports failures.

**Acceptance Scenarios**:

1. **Given** a schema field is renamed, **When** the full project build and test suite runs, **Then** every service, parser, and frontend component using the old field name produces a clear error
2. **Given** a new required field is added to the schema, **When** the full project build and test suite runs, **Then** all code that constructs features of that kind without the new field produces an error

---

### Edge Cases

- What happens when a tool receives a feature with extra properties not defined in the schema? The system should accept it (open for extension), validating only that required fields are present and correctly typed
- What happens when a tool receives a feature with a valid `kind` but the wrong feature type for that tool's requirements? The existing selection requirement checking should reject it before schema validation occurs
- What happens when schema validation adds measurable latency to tool execution or file parsing? Validation overhead must remain negligible relative to the operation's computation time
- What happens when a tool needs to produce output with a new property not yet in the schema? The tool developer must update the schema first (enforcing "specs before code" principle), then implement the tool change
- What happens when the schema package is unavailable or fails to load? The system should fail clearly at startup, not silently skip validation
- What happens when the catalog contains features stored before schema enforcement was introduced? Legacy features should be validated on retrieval; features that fail validation should be clearly flagged rather than silently dropped
- What happens when the file parser encounters data that doesn't map to any known feature kind? The parser should produce a clear error identifying the unrecognised data rather than silently creating an untyped feature
- What happens when a frontend component needs a property that exists at runtime but isn't in the schema type? This indicates a schema gap — the schema must be updated to reflect reality, not bypassed with type casts

## Requirements *(mandatory)*

### Functional Requirements

#### Calculation Service (Tool Boundaries)

- **FR-001**: System MUST validate all tool input features against the shared schema definitions before tool execution begins
- **FR-002**: System MUST validate all tool output features against the shared schema definitions before returning results to the caller
- **FR-003**: System MUST derive all enum parameter constraints (symbol shapes, colours, duration presets, reference point patterns) from the shared schema rather than hardcoded values within individual tools
- **FR-004**: System MUST replace all hardcoded enum value sets in tools with references to schema-defined enums
- **FR-005**: All existing tools (currently 11 tools across analysis, mutation, reference, shape, and sensor categories) MUST pass schema validation for both inputs and outputs without changing their functional behaviour

#### IO Service (Feature Creation)

- **FR-006**: All file parsers MUST produce features that conform to the shared schema for the feature's declared `kind`
- **FR-007**: All annotation builders (circle, rectangle, line, text, vector, polygon, sensor) MUST produce features that conform to their respective schema models
- **FR-008**: The REP track parser MUST produce track features that conform to the Track schema model
- **FR-009**: Parser output MUST be validated against the schema before features are returned to the caller

#### STAC Catalog Service (Feature Storage)

- **FR-010**: The catalog service MUST validate features against the schema before writing them to storage
- **FR-011**: The catalog service MUST replace all untyped GeoJSON aliases (e.g., type aliases that resolve to plain dictionaries) with references to shared schema types
- **FR-012**: Features retrieved from the catalog MUST conform to the schema for their declared `kind`

#### Frontend Components (Feature Rendering)

- **FR-013**: Frontend components MUST import GeoJSON feature types from the shared schema package rather than defining local workaround types
- **FR-014**: Frontend components MUST NOT use untyped casts (e.g., treating features as generic objects) when accessing feature properties — property access must be type-checked at compile time
- **FR-015**: The shared component library's feature diffing and flattening functions MUST use shared schema types for feature properties

#### Cross-Cutting

- **FR-016**: System MUST report validation errors with sufficient detail to identify the specific field path, expected type/value, and actual type/value received
- **FR-017**: System MUST treat schema validation failures as errors (not warnings), preventing invalid data from propagating
- **FR-018**: System MUST use the `kind` field on features to determine which schema model to validate against
- **FR-019**: System MUST continue to validate GeoJSON structural correctness and provenance metadata (existing checks) in addition to schema validation
- **FR-020**: System MUST allow extra properties on features beyond those defined in the schema (open for extension)
- **FR-021**: Validation errors MUST be distinguishable by boundary (parser output, tool input, tool output, catalog write, catalog read) so developers can quickly identify where the failure occurred
- **FR-022**: Each service that handles GeoJSON features MUST declare a dependency on the shared schema package

### Key Entities

- **Feature Model**: A schema-defined data structure representing a GeoJSON feature with typed properties, identified by its `kind` discriminator (e.g., Track, Point, Circle, Rectangle). Each kind maps to a specific property schema
- **Schema Enum**: A named set of allowed values defined once in the shared schema and used across all services for validation (e.g., symbol shapes, named colours, duration presets, reference point patterns)
- **Validation Error**: A structured error produced when data does not conform to its expected schema, containing the boundary name, field path, expected constraint, and actual value
- **Service Boundary**: A point where GeoJSON features enter or leave a service — the enforcement point for schema validation. Five boundaries exist: parser output, catalog write, catalog read, tool input, tool output

## Scope

### In Scope

- Schema validation enforcement at all five service boundaries (parser output, catalog write, catalog read, tool input, tool output)
- Replacing all hardcoded enum values in tools with schema-derived enums
- Replacing untyped GeoJSON type aliases in the catalog service with schema types
- Migrating frontend components from local workaround types to shared schema types
- Migrating all 21+ annotation builder functions to produce schema-conformant output
- Migrating the REP track parser to produce schema-conformant output

### Out of Scope

- Changing the functional behaviour of any tool, parser, or renderer — this feature adds type safety, not new functionality
- Modifying the schema definitions themselves (those are governed by a separate process)
- Adding new feature kinds to the schema
- Changing how MCP protocol messages are structured (only the GeoJSON payloads within them are in scope)

## Assumptions

- The shared schema package already contains generated models for all feature kinds currently used across all services (Track, Point, Circle, Rectangle, Line, Text, Vector, MultiPoint, MultiPolygon, Narrative, SystemState)
- The shared schema package already contains enum definitions for all parameter types referenced by tools (PointShapeEnum, NamedColorEnum, MarkerSymbolEnum, DurationPresetEnum, ReferencePointPatternEnum)
- Existing tests across all services exercise representative inputs and outputs that can serve as validation baselines
- The `kind` discriminator (ADR-004) is present on all features flowing through the system
- Schema validation overhead is negligible for the feature sizes encountered in typical maritime analysis (tracks with up to ~10,000 positions)
- Tool, parser, and renderer functional behaviour and outputs remain identical — this feature adds validation enforcement, not behavioural changes
- Frontend build processes already consume the shared schema package for type generation
- Legacy features already stored in catalogs before this change contain valid data that will pass schema validation (if not, a migration path for legacy data is a separate concern)

## Dependencies

- **ADR-002**: Schema-first development with generated models — this feature enforces ADR-002 compliance across the full stack
- **ADR-004**: Feature Kind Discriminator — the `kind` field is the dispatch mechanism for selecting the correct validation schema
- **ADR-008**: Schema-Validated Tool Inputs and Outputs — the architectural decision that mandates this work
- **Shared schema package**: Must be up-to-date with all feature kinds and enums used across all services and frontends

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of tool input features are validated against the appropriate schema model before tool execution
- **SC-002**: 100% of tool output features are validated against the appropriate schema model before being returned
- **SC-003**: 100% of features produced by file parsers (REP tracks and all annotation types) pass schema validation for their declared `kind`
- **SC-004**: 100% of features written to the catalog pass schema validation before storage
- **SC-005**: Zero hardcoded enum value sets remain in any tool — all enum constraints derive from the shared schema
- **SC-006**: Zero untyped GeoJSON aliases remain in the catalog service — all feature references use shared schema types
- **SC-007**: Zero local workaround types for GeoJSON features remain in frontend components — all feature types are imported from the shared schema package
- **SC-008**: Zero untyped casts (`as any`, `as unknown`) for GeoJSON feature property access remain in frontend components
- **SC-009**: Schema validation errors identify the specific boundary, field path, and mismatch, enabling a developer to locate and fix the issue within one error message
- **SC-010**: All existing tools, parsers, and renderers pass schema validation with their current test data, confirming no functional regression
- **SC-011**: When a schema field is renamed or removed, affected code across all services and frontends produces clear failures in automated builds and tests — no silent breakages
- **SC-012**: Adding a new enum value to the schema requires zero code changes in any tool, parser, or renderer for that value to be accepted
