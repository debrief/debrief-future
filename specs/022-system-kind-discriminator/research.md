# Research: SYSTEM Kind Discriminator

**Feature**: 022-system-kind-discriminator
**Date**: 2026-01-23

## Research Questions

### 1. How should null geometry be represented in LinkML?

**Decision**: Use optional geometry field with explicit null support

**Rationale**:
- GeoJSON RFC 7946 Section 3.2 explicitly allows `"geometry": null` for Features
- LinkML supports optional fields via `required: false`
- The SystemState class will have `geometry` as optional, defaulting to null
- This maintains GeoJSON compliance while expressing the schema constraint

**Alternatives Considered**:
- Union type with null: More complex, LinkML union support is limited
- Separate schema for null-geometry features: Unnecessary duplication

### 2. How should SYSTEM feature IDs be validated?

**Decision**: Convention-based validation via ID prefix pattern

**Rationale**:
- Feature IDs like `state.temporal`, `state.spatial`, `state.selection` use a `state.` prefix
- LinkML `pattern` constraint can enforce this in JSON Schema output
- Python/TypeScript consumers can use string matching for lookup
- Keeps validation simple while allowing future system state types

**Alternatives Considered**:
- Separate enum for system state IDs: Over-constraining, prevents future extensibility
- No validation: Allows malformed IDs, harder to debug

### 3. What properties does each SYSTEM feature type need?

**Decision**: Type-specific property schemas with discriminator

**Rationale**:
- `state.temporal`: `start_time` (datetime), `end_time` (datetime)
- `state.spatial`: `viewport` (`ViewportPolygon` — 4 corners + optional `zoom`), `rotation` (optional float)
- `state.selection`: `selected_ids` (array of strings)
- Using `state_type` discriminator within properties enables type-safe access
- Follows same pattern as existing kind discriminator for feature types

**Alternatives Considered**:
- Single generic properties bag: Loses type safety
- Separate feature classes per state type: Overkill for simple state

### 4. Should SYSTEM features have styling properties?

**Decision**: No styling properties for SYSTEM features

**Rationale**:
- SYSTEM features are metadata, not displayed on map
- Adding style would violate "services never touch UI" (they'd imply display)
- Keeps SYSTEM features minimal and focused on state storage

**Alternatives Considered**:
- Optional styling: Unnecessary complexity, no use case

### 5. How do existing tests need to change?

**Decision**: Add SystemState to ENTITY_MAP, create new fixtures

**Rationale**:
- `test_golden.py` uses ENTITY_MAP to map fixture prefixes to model classes
- Need to add `"system-state": SystemState` mapping
- `test_all_entities_have_valid_fixtures` and `test_all_entities_have_invalid_fixtures` will automatically include new fixtures
- Round-trip tests will cover SystemState via generic Feature handling

**Alternatives Considered**:
- Separate test file: Unnecessary fragmentation

## Key Findings

1. **GeoJSON null geometry is standard**: RFC 7946 explicitly supports it
2. **LinkML optional fields work well**: No special handling needed
3. **Existing test infrastructure scales**: Just add to ENTITY_MAP
4. **Pattern-based ID validation**: Simple, extensible approach
5. **No new dependencies**: All within existing LinkML/Pydantic stack

## Implementation Implications

- Add `SYSTEM` to `FeatureKindEnum` in `common.yaml`
- Create `SystemStateProperties` class with state_type discriminator
- Create `SystemState` feature class with optional geometry (null default)
- Add 3 valid fixtures (temporal, spatial, selection)
- Add 2 invalid fixtures (non-null geometry, invalid ID)
- Update `test_golden.py` ENTITY_MAP
