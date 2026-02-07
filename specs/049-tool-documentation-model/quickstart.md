# Quickstart: Creating a Tool Specification

**Feature**: 049-tool-documentation-model
**Date**: 2026-02-05

## Overview

This guide walks you through creating a new tool specification using the Debrief tool documentation model.

## Prerequisites

- Familiarity with the tool's intended behavior
- Access to existing GeoJSON/styling schemas in `shared/schemas/`
- Understanding of the input/output data structures

## Step-by-Step Guide

### 1. Determine Category and Name

**Category**: Choose a hierarchical path based on tool domain
```
track/          # Track operations
  styling/      # Visual appearance
  analysis/     # Track analysis
  transform/    # Track modifications
annotation/     # Annotation operations
measure/        # Measurement tools
```

**Name**: Use kebab-case, action-noun format
- Good: `set-track-color`, `calculate-distance`, `smooth-track`
- Avoid: `trackColorSetter`, `distanceCalc`, `smoothing`

### 2. Copy Template

```bash
cp shared/tools/TEMPLATE.md shared/tools/{category}/{tool-name}.1.0.md
```

### 3. Fill Metadata

```yaml
---
name: your-tool-name
version: 1.0
category: your/category
status: draft
---
```

### 4. Write MCP Section

Focus on LLM-friendly descriptions:

**Good**:
> Sets the display color for track features. Use when the user wants to distinguish tracks visually or apply a color coding scheme.

**Avoid**:
> This tool modifies the TrackStyle.line.color property of TrackFeature objects by iterating through the FeatureCollection and applying the specified CSS color value.

### 5. Define Inputs and Outputs

Reference existing schemas:
- GeoJSON: `shared/schemas/src/linkml/geojson.yaml`
- Styling: `shared/schemas/src/linkml/styling.yaml`
- Tool Results: `shared/schemas/src/linkml/tool-result.yaml`

### 6. Write Algorithm

Use language-neutral pseudocode:

```pseudocode
FUNCTION tool_name(input: InputType) -> OutputType:
    // Comment explaining logic
    FOR EACH item IN input.items:
        process(item)
    END FOR
    RETURN result
END FUNCTION
```

**Keywords**: FOR EACH, IF, ELSE, END IF, END FOR, WHILE, RETURN, AND, OR, NOT, IS NULL

### 7. Document Edge Cases

Cover at minimum:
- [ ] Empty input
- [ ] Invalid input
- [ ] Boundary values
- [ ] Type mismatches

### 8. Create Golden Examples

**Basic example** (inline in spec):
```json
// Small, readable, demonstrates happy path
```

**Complex examples** (sister files):
```
your-tool.complex.input.json
your-tool.complex.output.json
```

### 9. Add Changelog and References

```markdown
## Changelog

### 1.0 (YYYY-MM-DD)
- Initial release

## References

**Related Tools**:
- [similar-tool](./similar-tool.1.0.md)

**Schemas**:
- [RelevantSchema](../../schemas/src/linkml/schema.yaml)
```

### 10. Validate Spec

Run through checklist:
- [ ] All 9 sections present
- [ ] Metadata YAML is valid
- [ ] Algorithm is unambiguous
- [ ] At least one golden example
- [ ] Edge cases documented
- [ ] Schema references are valid paths

## Linking Implementation

### Python

```python
from debrief_tools.decorators import tool_spec

@tool_spec("track/styling/set-track-color.1.0")
def set_track_color(features: FeatureCollection, color: str) -> FeatureCollection:
    # Implementation
    pass
```

### TypeScript (Future)

```typescript
// @tool_spec("track/styling/set-track-color.1.0")
export function setTrackColor(features: FeatureCollection, color: string): FeatureCollection {
    // Implementation
}
```

## Common Mistakes

### 1. Implementation Details in Algorithm

**Wrong**:
```pseudocode
result = geojson.loads(input_json)
result['features'][0]['properties']['style']['line']['color'] = color
return geojson.dumps(result)
```

**Right**:
```pseudocode
FOR EACH feature IN input.features:
    feature.properties.style.line.color = color
END FOR
RETURN input
```

### 2. Python-Specific Syntax

**Wrong**:
```pseudocode
if feature.get('properties', {}).get('style') is None:
    feature['properties']['style'] = {}
```

**Right**:
```pseudocode
IF feature.properties.style IS NULL:
    feature.properties.style = empty Style
END IF
```

### 3. Missing Edge Cases

Always consider:
- What if the collection is empty?
- What if a feature is the wrong type?
- What if a required property is missing?

### 4. Inline Examples Too Large

If your inline example exceeds ~20 lines, move it to a sister file:
```markdown
### Large Network Example

See:
- Input: `tool-name.network.input.json`
- Output: `tool-name.network.output.json`
```

## Template Location

`shared/tools/TEMPLATE.md`

## Example Specs

See `shared/tools/track/styling/` for initial examples:
- `set-track-color.1.0.md`
- `apply-symbol-style.1.0.md`
- `label-interval.1.0.md`
- `symbol-interval.1.0.md`
