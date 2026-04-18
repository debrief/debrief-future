# Round-trip evidence: `debrief:overrides` + `PropertiesProvenanceEntry`

Verifies the LinkML additions survive every leg of the schema pipeline:
LinkML → Pydantic → JSON → TypeScript (types) → JSON → Python.

## 1. LinkML source (excerpt)

From `shared/schemas/src/linkml/stac-extension.yaml`:

```yaml
classes:
  PropertiesProvenanceEntry:
    attributes:
      activity_id: { range: string, required: true }
      timestamp:   { range: string, required: true }
      tool:        { range: string, required: true, pattern: "^debrief\\.propertiesPanel$" }
      method:      { range: string, required: true, pattern: "^properties-panel@.+$" }
      fields:      { range: string, required: true, multivalued: true, minimum_cardinality: 1 }
      source:      { range: string, required: true, pattern: "^user$" }

  StacExtensionProperties:
    attributes:
      overrides:
        range: string
        multivalued: true
        required: false
        slot_uri: debrief:overrides
      provenance_log:
        range: PropertiesProvenanceEntry
        multivalued: true
        required: false
        inlined_as_list: true
        slot_uri: debrief:provenance_log
```

## 2. Generated Pydantic (excerpt, `shared/schemas/src/generated/python/debrief_schemas/__init__.py`)

```python
class PropertiesProvenanceEntry(ConfiguredBaseModel):
    activity_id: str
    timestamp:   str
    tool:        str = Field(..., pattern=r"^debrief\.propertiesPanel$")
    method:      str = Field(..., pattern=r"^properties-panel@.+$")
    fields:      list[str] = Field(..., min_length=1)
    source:      str = Field(..., pattern=r"^user$")

class StacExtensionProperties(ConfiguredBaseModel):
    platforms:      list[PlatformRecord] | None = None
    tags:           list[str] | None = None
    feature_tags:   list[str] | None = None
    overrides:      list[str] | None = None
    provenance_log: list[PropertiesProvenanceEntry] | None = None
```

## 3. Generated JSON Schema (excerpt, `shared/schemas/src/generated/json-schema/debrief.schema.json`)

```json
"PropertiesProvenanceEntry": {
  "type": "object",
  "required": ["activity_id", "timestamp", "tool", "method", "fields", "source"],
  "properties": {
    "activity_id": { "type": "string" },
    "timestamp":   { "type": "string" },
    "tool":        { "type": "string", "pattern": "^debrief\\.propertiesPanel$" },
    "method":      { "type": "string", "pattern": "^properties-panel@.+$" },
    "fields":      { "type": "array", "items": { "type": "string" }, "minItems": 1 },
    "source":      { "type": "string", "pattern": "^user$" }
  }
}
```

## 4. Generated TypeScript (excerpt, `shared/schemas/src/generated/typescript/types.ts`)

```typescript
export interface PropertiesProvenanceEntry {
  activity_id: string,
  timestamp:   string,
  tool:        string,
  method:      string,
  fields:      string[],
  source:      string,
}

export interface StacExtensionProperties {
  platforms?:      PlatformRecord[],
  tags?:           string[],
  feature_tags?:   string[],
  overrides?:      string[],
  provenance_log?: PropertiesProvenanceEntry[],
}
```

## 5. Round-trip test

`shared/schemas/tests/test_properties_panel_roundtrip.py::TestPropertiesPanelRoundTrip::test_combined_overrides_and_provenance_roundtrip`:

```python
original = StacExtensionProperties(
    tags=["atlantic"],
    overrides=["start_datetime"],
    provenance_log=[PropertiesProvenanceEntry(
        activity_id="01HXK5G8P0Q1R2S3T4U5V6W7X8",
        timestamp="2026-04-17T10:00:00Z",
        tool="debrief.propertiesPanel",
        method="properties-panel@1.0.0",
        fields=["debrief:tags"],
        source="user",
    )],
)
json_str = original.model_dump_json()
restored = StacExtensionProperties(**json.loads(json_str))
assert restored == original  # ✅ Passes
```

## 6. Invariant tests (also passing)

- empty `fields[]` → `ValidationError` (`test_empty_fields_list_rejected`)
- `tool != "debrief.propertiesPanel"` → `ValidationError` (`test_bad_tool_sentinel_rejected`)
- `method` without `properties-panel@` prefix → `ValidationError` (`test_bad_method_prefix_rejected`)
- `source != "user"` → `ValidationError` (`test_bad_source_rejected`)

All verified at commit `60159e0e`.
