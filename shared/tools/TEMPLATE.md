---
name: tool-name
version: 1.0
category: category/subcategory
status: draft
---

# Tool Name

> One-line description of what the tool does.

## MCP

**Description**: A concise (1-2 sentence) description optimized for LLM understanding. Focus on what the tool does, not how.

**When to use**: Guidance on when this tool is appropriate. Describe the user intent or scenario.

**Parameters**:
- `param1`: Brief description of first parameter
- `param2`: Brief description of second parameter

**Returns**: Brief description of what the tool returns.

## Inputs

**Schema**: `shared/schemas/src/linkml/{schema}.yaml#{Class}`

**Constraints**:
- Constraint 1 (validation rules beyond schema)
- Constraint 2

**Defaults**:
- `optional_param`: default value

## Outputs

Tools return a **ToolResponse** containing one or more content items with Debrief annotations.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ToolResponse`

### Result Type Path

**Format**: `{top_type}/{domain}/{specific_type}`

The `result_subtype` (used in `@tool(output_kind=...)` and builder functions) is `{domain}/{specific_type}`.

| Top Type | When to Use |
|----------|-------------|
| `mutation` | Modifying existing features (e.g., `mutation/track/styled`) |
| `addition` | Creating new features (e.g., `addition/analysis/cpa_point`) |
| `deletion` | Removing features (e.g., `deletion/track/outlier`) |
| `artifact` | Producing non-GeoJSON output (e.g., `artifact/dataset/range_bearing_series`) |

### Naming Convention (IMPORTANT)

The `result_subtype` (`{domain}/{specific_type}`) **MUST** follow these rules:

1. **Use underscores, not hyphens**: `range_bearing_series` ✓, `range-bearing-series` ✗
2. **Lowercase only**: `cpa_point` ✓, `CPA_Point` ✗
3. **Two segments required**: `analysis/cpa_point` ✓, `cpa_point` ✗
4. **Schema pattern**: `^[a-z_]+/[a-z_]+$`

**Common domains**:
| Domain | Description | Example Specific Types |
|--------|-------------|------------------------|
| `track` | Track-related outputs | `smoothed`, `interpolated`, `styled` |
| `analysis` | Analysis results | `cpa_point`, `intercept_solution` |
| `sensor` | Sensor data | `recalibrated`, `filtered` |
| `dataset` | Data exports/series | `range_bearing_series`, `exported_csv` |
| `image` | Image artifacts | `bearing_time_plot`, `range_time_plot` |
| `report` | Report artifacts | `engagement_summary`, `track_report` |

### Annotations

Required on each content item:
- `debrief:resultType`: The hierarchical result type path
- `debrief:sourceFeatures`: IDs of input features used
- `debrief:label`: Human-readable description (e.g., "Applied {action} to {n} features")
- `debrief:href`: (artifacts only) Relative file path for persistence
- `debrief:deletedFeatures`: (deletions only) IDs of features removed

## Algorithm

```pseudocode
FUNCTION tool_name(input: InputType, options: OptionsType) -> ToolResponse:
    // Validate inputs
    IF input IS NULL OR input.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    // Process features
    modified_features = empty list
    source_ids = empty list

    FOR EACH feature IN input.features:
        // Collect source IDs for provenance
        source_ids.append(feature.id)

        // Apply transformation
        IF condition:
            processed = transform(feature)
            modified_features.append(processed)
        END IF
    END FOR

    // Build response with appropriate result type
    content_items = build_mutation(
        features: modified_features,
        result_subtype: "domain/specific_type",
        source_feature_ids: source_ids,
        label: "Applied {action} to {n} feature(s)"
    )

    RETURN build_response(content_items)
END FUNCTION
```

### Response Builder Functions

| Function | Result Type | Use When |
|----------|-------------|----------|
| `build_mutation(features, subtype, sources, label)` | `mutation/*` | Modifying existing features |
| `build_addition(features, subtype, sources, label)` | `addition/*` | Creating new features |
| `build_deletion(deleted_ids, subtype, sources, label)` | `deletion/*` | Removing features |
| `build_artifact(data, mime, subtype, sources, label, href)` | `artifact/*` | Producing files |
| `build_error(message, category, affected_ids)` | Error | Reporting failures |

### Pseudocode Style Guide

- **Keywords**: `FUNCTION`, `END FUNCTION`, `FOR EACH`, `END FOR`, `IF`, `ELSE`, `END IF`, `WHILE`, `END WHILE`, `RETURN`
- **Operators**: `IN`, `IS NULL`, `IS NOT NULL`, `IS EMPTY`, `AND`, `OR`, `NOT`
- **Types**: Use schema class names (e.g., `FeatureCollection`, `TrackFeature`, `ToolResponse`)
- **Comments**: Use `//` for inline comments
- **No implementation details**: Avoid language-specific syntax, APIs, or libraries

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty input collection | Return error response with `invalid_input` category |
| Invalid input type | Return error response with `invalid_input` category |
| Missing required property | Return error response specifying the missing property |
| Null optional value | Use default value |
| No matching features | Return error response (or empty content array if appropriate) |

## Examples

### Basic Example

**Input**:
```json
{
  "type": "FeatureCollection",
  "features": [
    // Minimal valid input feature(s)
  ]
}
```

**Output** (ToolResponse format):
```json
{
  "content": [
    {
      "type": "resource",
      "uri": "feature://feature-id",
      "mimeType": "application/geo+json",
      "text": "{...serialized GeoJSON Feature...}",
      "annotations": {
        "debrief:resultType": "mutation/domain/specific_type",
        "debrief:sourceFeatures": ["source-feature-id"],
        "debrief:label": "Applied action to 1 feature(s)"
      }
    }
  ]
}
```

### Golden Example Files

For testable examples, create sister files:
- Input: `tool-name.example.input.json` — FeatureCollection to process
- Output: `tool-name.example.output.json` — ToolResponse with content items

### Error Response Example

```json
{
  "error": {
    "code": -32000,
    "message": "No track features found in input",
    "data": {
      "debrief:errorCategory": "invalid_input",
      "debrief:affectedFeatures": []
    }
  }
}
```

## Changelog

### 1.0 (YYYY-MM-DD)
- Initial release

## References

**Related Tools**:
- [related-tool](./related-tool.1.0.md) - Brief description of relationship

**Schemas**:
- [SchemaClass](../../schemas/src/linkml/schema.yaml) - Schema used for input/output

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.actions.LegacyClass` (if applicable)

**External**:
- [External Reference](https://example.com) - Relevant standards or documentation
