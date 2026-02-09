# Research: PROV Schema Foundation

**Feature**: 070-prov-schema-foundation
**Date**: 2026-02-09
**Status**: Complete

## Decision 1: LinkML Field Naming Convention

**Decision**: Use `snake_case` for LinkML attribute names, matching existing project schemas. Configure Pydantic models with `alias_generator=to_camel` for JSON serialization to produce the camelCase output required by the SRD.

**Rationale**: All existing LinkML schemas (`common.yaml`, `geojson.yaml`, `tool.yaml`, `session-state.yaml`) use `snake_case` for attribute names (e.g., `platform_id`, `start_time`, `fill_color`). Breaking this convention for one schema module would create inconsistency. The SRD Annex A.3 specifies camelCase in JSON output (`activityId`, `wasGeneratedBy`), which is the serialized form. Pydantic v2 supports `alias_generator` to bridge the gap: LinkML defines `activity_id`, Pydantic exposes it as `activityId` in JSON.

**Alternatives considered**:
- camelCase in LinkML: Matches SRD JSON directly but breaks project-wide snake_case convention and creates inconsistency with other schema modules.
- No aliasing (snake_case everywhere): Simpler but diverges from the SRD specification and W3C PROV vocabulary naming.

## Decision 2: Log Entry Schema File Location

**Decision**: Create a new schema file `shared/schemas/src/linkml/log-entry.yaml` for the Log Entry and its supporting types. Add `log-entry` to the imports in `debrief.yaml`.

**Rationale**: Existing schemas follow a modular pattern: `tool.yaml` for tool definitions, `tool-result.yaml` for MCP result annotations, `geojson.yaml` for feature structures. The Log Entry is a distinct concept (provenance records on features) that doesn't fit cleanly into any existing module. A dedicated file keeps modules focused and makes the schema hierarchy clear.

**Alternatives considered**:
- Add to `common.yaml`: Would bloat the common module, which is currently focused on base types and enums.
- Add to `tool-result.yaml`: Conflates MCP response annotations with feature-level provenance. They serve different purposes: `tool-result.yaml` describes how MCP responses are annotated, `log-entry.yaml` describes how features carry provenance.

## Decision 3: System Record Schema Location

**Decision**: Create a new schema file `shared/schemas/src/linkml/system-record.yaml` for system record properties (snapshot links, branch records, file-level provenance). Add to `debrief.yaml` imports.

**Rationale**: The system record schema defines properties specific to non-spatial metadata features (`featureType: "system"`). It references `FeatureKindEnum` from `common.yaml` but introduces its own classes (`SnapshotLink`, `BranchRecord`, `SystemRecordProperties`). A separate file follows the modular pattern and keeps system record concerns isolated from spatial feature schemas.

**Alternatives considered**:
- Add to `geojson.yaml`: Would mix spatial feature schemas with non-spatial metadata. The system record has fundamentally different properties (no track positions, no styling).
- Add to `common.yaml`: Too broad — the system record is used by a specific feature type, not shared across all features.

## Decision 4: Activity ID Format

**Decision**: Use UUID v4 strings without a prefix. The `activityId` field is a plain UUID string (e.g., `"550e8400-e29b-41d4-a716-446655440000"`).

**Rationale**: The SRD examples show `activityId` values like `"act-001"` for readability, but these are illustrative. In practice, UUIDs provide guaranteed uniqueness without coordination. The Python `uuid.uuid4()` function and the JavaScript `crypto.randomUUID()` function both produce compatible UUID v4 strings. No prefix is needed — the field name `activityId` already identifies the purpose.

**Alternatives considered**:
- Prefixed UUIDs (`act-{uuid}`): Adds visual clarity but no functional benefit, and increases field length.
- Sequential integers: Requires coordination and cannot be generated independently by different processes.
- Timestamp-based IDs: Less random, potential collisions in rapid operations.

## Decision 5: Provenance Array Migration Strategy

**Decision**: Change `properties.provenance` from a single object to an array of entries. The `attach_log_entry()` function appends to the array. Legacy data with a single object is wrapped in an array on read.

**Rationale**: The Log requires accumulating multiple provenance entries per feature (e.g., a track loaded from a file, then used in a range calculation, then used in a bearing calculation). An array is the natural structure. The current codebase writes `properties.provenance` as a single dict — the migration must handle this.

**Alternatives considered**:
- Keep single object and add a separate `properties.log` array: Creates two provenance concepts and diverges from the SRD which specifies `properties.provenance` as the single location.
- Immediately rewrite all existing data: Unnecessary — Article XIV permits breaking changes, and existing data is limited to development fixtures.

## Decision 6: Handling `properties.prov` Removal

**Decision**: Delete `services/stac/src/debrief_stac/provenance.py` entirely. Update STAC service tests to use the unified provenance module from debrief-calc. Do not add code to read or migrate `properties.prov` from existing data.

**Rationale**: The `properties.prov` key is only written by the STAC provenance module and only exists in data created during development. Article XIV (Pre-Release Freedom) permits breaking changes — there is no production data to migrate. Any existing files with `properties.prov` will simply lose that metadata on next save, which is acceptable for development data.

**Alternatives considered**:
- Add a migration function to convert `prov` → `provenance`: Over-engineering for development-only data with no production users.
- Keep the STAC module as a thin wrapper: Adds unnecessary indirection. Better to have one implementation.

## Decision 7: New Model Location

**Decision**: Add all new model classes (`ModifiedFeature`, `PropertyDelta`, `CreatedAsset`, `ParameterValue`) to `services/calc/debrief_calc/models.py`. Replace functions in `services/calc/debrief_calc/provenance.py` with new Log Entry-aware versions.

**Rationale**: The existing `models.py` already contains `ToolResult`, `Provenance`, `SourceRef`, and `ToolError`. Adding the new supporting types keeps all model definitions in one place. The `provenance.py` module retains its role as the provenance attachment logic, but its functions change signature and output format.

**Alternatives considered**:
- Create a new `log_entry.py` module for new models: Splits related models across files unnecessarily. The new types are small and directly related to ToolResult.
- Move models to shared/schemas: The generated Pydantic models from LinkML will live in shared/schemas. The hand-written models in debrief-calc serve as the runtime implementation. Both must match.

## Decision 8: Validation Update Strategy

**Decision**: Update `validate_tool_output()` to accept the new provenance format (array of entries). Validate that each entry in the array has the required PROV fields (`activity_id`, `timestamp`, `was_generated_by` with `tool` and `tool_version`). Keep validation of `kind` field unchanged.

**Rationale**: The validation module currently checks that `properties.provenance` exists and contains `tool`, `version`, `timestamp`, and `sources`. The new format nests these under `was_generated_by` and renames some fields. The validator must be updated to match the new structure while maintaining the same level of strictness.

**Alternatives considered**:
- Skip provenance validation during transition: Weakens the safety net. Better to update validation alongside the format.
- Add schema-based validation via JSON Schema: Appropriate for fixtures but too heavyweight for the runtime validator which is called on every tool execution.

## Decision 9: Existing Provenance Model Retention

**Decision**: Keep the `Provenance` and `SourceRef` classes in `models.py` but mark them as deprecated. Add new `LogEntry` and related classes alongside. Remove the deprecated classes in a future cleanup pass.

**Rationale**: Some tests and tool implementations may reference `Provenance` directly. A phased transition — deprecate, then remove — is safer than immediate deletion. The new `LogEntry` class is the replacement.

**Alternatives considered**:
- Immediate removal: Higher risk of breaking imports and tests. The old classes are small and don't interfere with the new ones.
- Rename to `LegacyProvenance`: Adds noise. Simple deprecation comments are sufficient.

## Decision 10: Geometry for System Record

**Decision**: Use `{"type": "Point", "coordinates": []}` for system record geometry, consistent with the transition plan and feature 022's existing implementation.

**Rationale**: The SRD Annex A.4 shows `geometry: null` but the transition plan (which was written after analysis of real-world GeoJSON renderers) notes that many renderers fail on null geometries. The project already uses Point with empty coordinates for non-spatial features (feature 022 shipped this approach). Consistency with the existing codebase takes priority over literal SRD text.

**Alternatives considered**:
- `geometry: null`: Matches SRD Annex A.4 literally but causes renderer failures.
- Omit geometry entirely: Invalid GeoJSON — the `geometry` field is required.
