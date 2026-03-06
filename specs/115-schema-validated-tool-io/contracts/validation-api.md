# Validation API Contract

**Feature**: 115-schema-validated-tool-io
**Date**: 2026-02-28

## Core Validation Functions

### `validate_feature(feature, boundary) → None | raises SchemaValidationError`

Validates a single GeoJSON feature against the schema model matching its `kind`.

**Parameters:**
- `feature` — GeoJSON feature dict with `properties.kind`
- `boundary` — string identifying the validation point: `"parser_output"`, `"tool_input"`, `"tool_output"`, `"catalog_write"`, `"catalog_read"`

**Behaviour:**
1. Extract `kind` from `feature["properties"]["kind"]`
2. Look up model class in `FEATURE_MODEL_MAP`
3. Call `model.model_validate(feature)`
4. On success: return `None`
5. On failure: raise `SchemaValidationError` with boundary, feature ID, field path, expected/actual

**Error cases:**
- Missing `properties` → `SchemaValidationError("Missing properties")`
- Missing `kind` → `SchemaValidationError("Missing kind discriminator")`
- Unknown `kind` → `SchemaValidationError("Unknown feature kind: {kind}")`
- Field validation failure → `SchemaValidationError` with Pydantic error details

---

### `validate_features(features, boundary) → None | raises SchemaValidationError`

Validates a list of features. Fails on first invalid feature.

**Parameters:**
- `features` — list of GeoJSON feature dicts
- `boundary` — validation boundary identifier

**Behaviour:**
- Iterates features, calls `validate_feature()` for each
- On first failure: raises with feature index and ID in error context

---

### `resolve_feature_model(kind) → type[ConfiguredBaseModel] | None`

Returns the Pydantic model class for a given `kind` value, or `None` if unknown.

**Parameters:**
- `kind` — string value from `FeatureKindEnum` (e.g., `"TRACK"`, `"CIRCLE"`)

**Returns:** The Pydantic model class (e.g., `TrackFeature`), or `None`

---

### `resolve_enum_values(param_type) → set[str] | None`

Returns the set of valid values for a schema-defined enum, or `None` if unknown.

**Parameters:**
- `param_type` — string name matching a schema enum (e.g., `"NamedColor"`, `"MarkerSymbol"`)

**Returns:** Set of string values (e.g., `{"red", "green", "blue", ...}`), or `None`

**Mapping:**

| param_type | Schema Enum | Values |
|------------|-------------|--------|
| `"NamedColor"` | `NamedColorEnum` | red, green, blue, yellow, orange, purple, cyan, magenta, white, black, grey |
| `"MarkerSymbol"` | `MarkerSymbolEnum` | circle, square, triangle, diamond, cross |
| `"DurationPreset"` | `DurationPresetEnum` | PT1M, PT5M, PT15M, PT30M, PT1H, PT2H, PT6H, PT12H, PT24H |
| `"ReferencePointPattern"` | `ReferencePointPatternEnum` | grid, scatter |
| `"CardinalDirection"` | `CardinalDirectionEnum` | N, NE, E, SE, S, SW, W, NW |
| `"NumericPreset"` | `NumericPresetEnum` | 1, 2, 5, 10, 25, 50, 100 |

---

## Error Type

### `SchemaValidationError`

Raised when feature data does not conform to its expected schema.

**Fields:**
- `boundary: str` — where validation failed
- `feature_id: str | None` — ID of the failing feature
- `feature_kind: str | None` — kind value of the failing feature
- `errors: list[FieldError]` — list of individual field errors

**FieldError fields:**
- `field_path: str` — dot-delimited path (e.g., `"properties.positions.0.time"`)
- `expected: str` — expected type or constraint
- `actual: str` — what was found
- `message: str` — human-readable description

**String representation:**
```
SchemaValidationError at tool_output: Feature 'track-001' (TRACK)
  - properties.positions.0.time: expected datetime, got string '2024-01-01'
  - properties.style.line.color: expected NamedColorEnum, got 'fuschia'
```

---

## Integration Points

### Calc Executor (tool input/output)

```
# Before handler execution:
validate_features(context.features, "tool_input")

# After handler returns, before provenance attachment:
validate_features(output_features, "tool_output")
```

### IO Parser (parser output)

```
# After building features from parsed file:
validate_features(features, "parser_output")
```

### STAC Catalog (storage)

```
# Before writing to disk:
validate_features(features, "catalog_write")

# After reading from disk:
validate_features(features, "catalog_read")
```

### Parameter Validation

```
# At executor level, before handler:
for param in tool.parameters:
    if param.param_type:
        valid_values = resolve_enum_values(param.param_type)
        if valid_values and params[param.name] not in valid_values:
            raise InvalidParameterError(param.name, params[param.name], valid_values)
```
