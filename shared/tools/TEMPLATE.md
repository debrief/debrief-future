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

**Schema**: `shared/schemas/src/linkml/{schema}.yaml#{Class}`

**Result Type**: `{top_type}/{domain}/{specific_type}` (e.g., `mutation/track/styled`)

**Annotations**:
- `sourceFeatures`: IDs of input features
- `label`: Human-readable description template (e.g., "Applied {action} to {n} features")

## Algorithm

```pseudocode
FUNCTION tool_name(input: InputType, options: OptionsType) -> OutputType:
    // Initialize result
    result = empty collection

    FOR EACH item IN input.items:
        // Process each item
        IF condition:
            // Apply transformation
            processed = transform(item)
            result.add(processed)
        END IF
    END FOR

    RETURN result
END FUNCTION
```

### Pseudocode Style Guide

- **Keywords**: `FUNCTION`, `END FUNCTION`, `FOR EACH`, `END FOR`, `IF`, `ELSE`, `END IF`, `WHILE`, `END WHILE`, `RETURN`
- **Operators**: `IN`, `IS NULL`, `IS NOT NULL`, `AND`, `OR`, `NOT`
- **Types**: Use schema class names (e.g., `FeatureCollection`, `TrackFeature`)
- **Comments**: Use `//` for inline comments
- **No implementation details**: Avoid language-specific syntax, APIs, or libraries

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty input collection | Return empty collection (no error) |
| Invalid input type | Reject with validation error before processing |
| Missing required property | Reject with validation error specifying the missing property |
| Null optional value | Use default value |

## Examples

### Basic Example

**Input**:
```json
{
  "type": "FeatureCollection",
  "features": [
    // Minimal valid input
  ]
}
```

**Output**:
```json
{
  "type": "FeatureCollection",
  "features": [
    // Expected output
  ]
}
```

### Complex Example

For larger examples, use sister files:
- Input: `tool-name.complex.input.json`
- Output: `tool-name.complex.output.json`

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
