# Feature Specification: PROV Schema Foundation

**Feature Branch**: `070-prov-schema-foundation`
**Created**: 2026-02-09
**Status**: Draft
**Input**: User description: "Implement PROV schema foundation [E02] — LinkML Log Entry schema, expanded ToolResult model, provenance migration, system record (requires #062)"
**Epic**: E02 — PROV Logging Implementation (Phase 0)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified Provenance Schema (Priority: P1)

A tool developer creates a new analysis tool that modifies features and needs to attach provenance. They use the expanded ToolResult model to declare which features were modified, which properties changed (with before/after values), and the full resolved parameter set. The system attaches a PROV-aligned Log entry to each affected feature using a single, consistent provenance format across the entire codebase.

**Why this priority**: This is the foundational schema that all subsequent PROV phases (Log Service, Log Panel, undo/redo split, snapshots, branching, replay) depend on. Without a unified provenance format, no downstream feature can be built.

**Independent Test**: Can be fully tested by running existing calc tools and verifying that output features carry provenance entries in the new PROV-aligned format with activity IDs, structured parameters, and PROV vocabulary.

**Acceptance Scenarios**:

1. **Given** a tool execution that modifies two features, **When** the executor attaches provenance, **Then** both features receive a Log entry in `properties.provenance` (as an array) sharing the same `activityId`, with `wasGeneratedBy` containing the tool name, version, and typed parameters.
2. **Given** a tool execution that creates a new result feature, **When** the executor attaches provenance, **Then** the Log entry's `generated` field lists the new feature's ID.
3. **Given** the new provenance format, **When** a LinkML schema validation runs against the Log entry, **Then** it passes all schema adherence tests.

---

### User Story 2 - Expanded Tool Output Contract (Priority: P2)

A tool developer builds a tool that produces both modified features and new artifact files. They populate the expanded ToolResult with `modifiedFeatures` (IDs and changed properties), `createdFeatures` (new feature IDs), `createdAssets` (artifact paths with stable result IDs), and `parameters` (typed values with default/tunable annotations). The system validates the expanded result and the downstream Log Service (Phase 1) can consume it without transformation.

**Why this priority**: The expanded ToolResult contract is the interface between Python services and the TypeScript Log Service. Getting this right in Phase 0 means Phase 1 can proceed without revisiting the contract.

**Independent Test**: Can be fully tested by constructing ToolResult instances with the new fields, validating them against the Pydantic model, and verifying serialisation round-trips.

**Acceptance Scenarios**:

1. **Given** a ToolResult with `modifiedFeatures` containing property deltas, **When** the model validates, **Then** each `ModifiedFeature` has a `featureId` and a `changedProperties` dict where each value is a `PropertyDelta` with `previousValue` and `newValue`.
2. **Given** a ToolResult with `createdAssets`, **When** the model validates, **Then** each `CreatedAsset` has a `resultId` (stable logical identity), a `path` (versioned file path), and an optional `mimeType`.
3. **Given** a ToolResult with `parameters`, **When** the model validates, **Then** each parameter entry has `value`, `default` (boolean), and `tunable` (boolean) fields.
4. **Given** a ToolResult missing all new optional fields, **When** the model validates, **Then** validation succeeds — all new fields default to `None`.

---

### User Story 3 - Provenance Format Unification (Priority: P3)

A system integrator audits the codebase and confirms that there is exactly one provenance implementation. The duplicate STAC provenance module (which wrote to `properties.prov`) has been removed. All provenance is written to `properties.provenance` as an array of PROV-aligned entries by a single function. Existing tests pass with the unified format.

**Why this priority**: Eliminating the duplicate prevents future confusion and ensures all features use a consistent provenance format before the Log Service is built.

**Independent Test**: Can be fully tested by searching the codebase for `properties.prov` references (should find none) and running the full test suite to confirm no regressions.

**Acceptance Scenarios**:

1. **Given** the unified codebase, **When** a search for `properties.prov` (as distinct from `properties.provenance`) is performed across all source files, **Then** zero matches are found.
2. **Given** the STAC service, **When** provenance is needed, **Then** it uses the shared provenance module from debrief-calc (or a shared location) rather than its own implementation.
3. **Given** existing STAC provenance tests, **When** they run against the unified format, **Then** they pass (updated to expect the new format).

---

### User Story 4 - System Record Schema (Priority: P4)

An analyst creates a new plot. The system automatically includes a system record feature — a non-spatial GeoJSON Feature with `featureType: "system"` — in the plot's FeatureCollection. This system record carries structured fields for snapshot links and branch records (initially empty). Renderers (map, feature list) correctly skip the system record when displaying spatial data.

**Why this priority**: The system record is the anchor for snapshot chains and branching metadata in Phases 4 and 5. Defining the schema now ensures those phases have a stable foundation.

**Independent Test**: Can be fully tested by creating a system record feature, validating it against the LinkML schema, and confirming that existing renderers do not crash or display it as a spatial feature.

**Acceptance Scenarios**:

1. **Given** a system record feature with `featureType: "system"` and Point geometry with empty coordinates, **When** validated against the LinkML schema, **Then** it passes.
2. **Given** a system record with `snapshotLinks` containing `prev` and `next` (each with `asset` path and `provEntryCount`), **When** validated, **Then** it passes.
3. **Given** a system record with a `branches` array containing branch records (each with `branchId`, `branchedFrom`, `branchedAt`, `targetAsset`), **When** validated, **Then** it passes.
4. **Given** a FeatureCollection containing a system record and spatial features, **When** rendered on a map, **Then** the system record is not displayed as a map element.

---

### User Story 5 - LinkML Schema Generation (Priority: P5)

A schema maintainer updates the Log Entry LinkML schema. Running the schema generators produces valid Pydantic models (Python) and JSON Schema that match the hand-written models. Golden fixture files validate correctly against both the generated and hand-written models. The generated schema can be used for cross-language validation.

**Why this priority**: Schema-first development is a governing principle. The LinkML schema is the source of truth; generated artefacts must stay in sync.

**Independent Test**: Can be fully tested by running LinkML generators and comparing outputs against golden fixtures and hand-written models.

**Acceptance Scenarios**:

1. **Given** the LinkML Log Entry schema, **When** `gen-pydantic` runs, **Then** it produces a valid Python module with classes matching the hand-written models.
2. **Given** golden fixture JSON files for valid and invalid Log entries, **When** validated against the generated Pydantic models, **Then** valid fixtures pass and invalid fixtures are rejected with appropriate error messages.
3. **Given** the LinkML Log Entry schema, **When** `gen-json-schema` runs, **Then** it produces a JSON Schema that accepts the same valid fixtures and rejects the same invalid fixtures.

---

### Edge Cases

- What happens when a tool returns no modified features and no created features (e.g., a read-only analysis)? The ToolResult should still be valid with empty/null optional fields, and provenance attachment should gracefully skip features with no changes.
- What happens when a feature already has a `properties.provenance` object (old format, single dict) instead of an array? The migration must handle legacy data by wrapping single entries in an array during read.
- What happens when the `properties.prov` key exists on features loaded from files created before the migration? The system should ignore `prov` (it will not be read) and any future save will write only `provenance`.
- What happens when a system record feature is included in tool selection? Tools should filter out system features from their input, as they are not spatial data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST define a LinkML schema for Log Entry matching the PROV-aligned structure defined in the SRD (Annex A.3), including `activityId`, `timestamp`, `wasGeneratedBy` (with `tool`, `toolVersion`, `parameters`), `used`, `generated`, `executionDuration`, and `tune`.
- **FR-002**: System MUST expand the ToolResult model with optional fields: `toolVersion` (string), `modifiedFeatures` (list of ModifiedFeature), `createdFeatures` (list of string IDs), `createdAssets` (list of CreatedAsset), and `parameters` (dict of string to ParameterValue).
- **FR-003**: System MUST define supporting data types: `ModifiedFeature` (featureId + changedProperties dict), `PropertyDelta` (previousValue + newValue), `CreatedAsset` (resultId + path + optional mimeType), and `ParameterValue` (value + default boolean + tunable boolean).
- **FR-004**: System MUST replace the current `attach_provenance()` function with `attach_log_entry()` that produces PROV-aligned entries and appends them to `properties.provenance` as an array.
- **FR-005**: System MUST assign a unique `activityId` to each Log entry, and share the same `activityId` across all features affected by a single operation.
- **FR-006**: System MUST remove the duplicate provenance module in the STAC service (`services/stac/src/debrief_stac/provenance.py`), ensuring all provenance is handled by a single implementation.
- **FR-007**: System MUST store provenance exclusively at `properties.provenance` (array of entries) — the `properties.prov` key must not be written anywhere.
- **FR-008**: System MUST define a LinkML schema for system record properties including `snapshotLinks` (with `prev`/`next` containing asset path and provEntryCount), `branches` (array of branch records), and file-level provenance entries.
- **FR-009**: System MUST support `ParameterValue.tunable` defaulting to `true` — all parameters are tunable unless explicitly marked otherwise.
- **FR-010**: System MUST record `executionDuration` in ISO 8601 duration format (e.g., `PT0.3S`) in the Log entry.
- **FR-011**: System MUST support the `tune` field on Log entries (initially null) to record future parameter tuning annotations with `timestamp`, `parameter`, `previousValue`, and `newValue`.
- **FR-012**: System MUST support the `generatedResultId` field on Log entries for artifact-producing tools, recording the stable logical identity of the result.
- **FR-013**: All new ToolResult fields MUST be optional with `None` defaults, ensuring backward compatibility with existing tools that do not yet populate them.
- **FR-014**: System MUST update all existing golden fixture files and sample data to conform to the new provenance format.
- **FR-015**: System MUST ensure all existing calc service tests pass with the expanded models — no test regressions.

### Key Entities

- **Log Entry**: A PROV-aligned provenance record stored on GeoJSON features. Contains activity identity, timestamp, generator information (tool, version, parameters), input references, output references, execution duration, and tuning annotations.
- **ToolResult**: The contract between Python tool services and the orchestration layer. Contains tool identity, success/failure, output features, error details, execution duration, and (new) structured change tracking fields.
- **ModifiedFeature**: Associates a feature ID with the properties that were changed, each carrying before/after values.
- **PropertyDelta**: Captures the previous and new value of a single property change.
- **CreatedAsset**: Identifies an artifact file produced by a tool, with a stable logical result ID and the versioned file path.
- **ParameterValue**: A typed parameter value with metadata indicating whether it was a default and whether it is tunable for future replay.
- **System Record**: A non-spatial GeoJSON Feature (Point with empty coordinates, `featureType: "system"`) carrying plot-level metadata: snapshot chain links and branch records.
- **SnapshotLink**: A reference to a snapshot file (asset path) with the count of provenance entries it contains, enabling lazy loading in the Log Panel.
- **BranchRecord**: A reference to a branched plot, recording the activity ID it branched from, timestamp, and target asset path.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of existing calc service tests pass after the model expansion and provenance migration, with no regressions.
- **SC-002**: The LinkML Log Entry schema successfully generates valid Pydantic models and JSON Schema, verified by running generators and validating against at least 3 golden fixture files (valid) and 2 invalid fixture files.
- **SC-003**: Zero occurrences of `properties.prov` (as distinct from `properties.provenance`) exist in the codebase after migration — verified by full-text search.
- **SC-004**: The new provenance format matches the SRD Annex A.3 structure — verified by comparing generated Log entries against the 3 canonical examples (tool invocation, property edit, artifact-producing tool).
- **SC-005**: System record features validate correctly against the LinkML schema — verified with at least 2 golden fixtures (one with empty snapshot links, one with populated links and branches).
- **SC-006**: All new ToolResult fields are optional — verified by constructing a ToolResult with only the original 5 fields and confirming validation passes.
- **SC-007**: Round-trip test passes: a Log entry created in Python, serialised to JSON, and validated against the LinkML-generated JSON Schema produces identical structure.

## Assumptions

- **A-001**: The SYSTEM feature kind (from #062) is already available in the FeatureKindEnum and does not need modification.
- **A-002**: The `activityId` format uses UUID v4 strings (e.g., `act-{uuid}`), consistent with the SRD examples. The exact prefix format is not mandated by this spec — tool implementations may use any unique string.
- **A-003**: The `executionDuration` field uses ISO 8601 duration format (e.g., `PT0.3S`) as shown in the SRD, converted from the existing `duration_ms` float.
- **A-004**: Existing tools do not need to be updated to populate the new ToolResult fields in this phase. The new fields are optional and will be adopted incrementally as tools are migrated.
- **A-005**: The system record schema is defined in this phase but system record creation logic (adding a system feature to new plots) may be deferred to Phase 1 if it requires stacService changes.
- **A-006**: The `tune` field on Log entries is always `null` in this phase — tuning functionality is implemented in Phase 6.
- **A-007**: The `properties.provenance` array is append-only. Entries are never modified after creation (tuning adds annotations; it does not alter the original entry).
- **A-008**: Legacy data with `properties.prov` will be handled by simply not reading that key. No automatic migration of existing STAC catalog data is required — future saves will use the new format.

## Dependencies

- **#062** (FeatureKindEnum values — complete): Provides the SYSTEM kind discriminator used by the system record feature.
- **SRD** (`docs/srd-prov-undo.md`): Defines the target Log Entry structure (Annex A.3), system record format (Annex A.4), and ToolResult contract (Annex A.8).
- **Transition Plan** (`docs/architecture/prov-transition-plan.md`): Provides the detailed migration steps, file inventory, and breaking change checklist for Phase 0.

## Out of Scope

- **Log Service** (Phase 1, #071): The TypeScript service that wraps ToolResults in Log entries at runtime. This phase defines the schema; Phase 1 implements the runtime service.
- **Log Panel** (Phase 2, #072): The VS Code activity panel for viewing and interacting with the timeline.
- **Undo/redo split** (Phase 3, #073): Narrowing the StateSnapshot to UI-only fields.
- **Snapshots, branching, replay** (Phases 4-6, #074-#076): These use the schemas defined here but are not implemented in this phase.
- **TypeScript type updates** for the expanded ToolResult: These are part of Phase 1 (#071) when the Log Service consumes the expanded contract.
- **Updating individual tool implementations** to populate new ToolResult fields: Tools will be updated incrementally as they are migrated via the tool implementation workflow.
