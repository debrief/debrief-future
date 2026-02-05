# Data Model: Tool Specification Template Structure

**Feature**: 049-tool-documentation-model
**Date**: 2026-02-05

## Overview

A Tool Specification is a markdown document with 9 required sections. This document defines the structure and content requirements for each section.

## Template Sections

### 1. Metadata

**Purpose**: Machine-readable identification for tooling and discovery

**Required Fields**:
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| name | string | Tool identifier (kebab-case) | `set-track-color` |
| version | semver | Major.minor version | `1.0` |
| category | path | Hierarchical category | `track/styling` |
| status | enum | draft, stable, deprecated | `stable` |
| replaces | string? | Previous version path (if deprecated) | `track/styling/set-track-color.0.9` |

**Format**: YAML frontmatter at top of file

```yaml
---
name: set-track-color
version: 1.0
category: track/styling
status: stable
---
```

### 2. MCP

**Purpose**: LLM-optimized descriptions for MCP tool discovery

**Required Fields**:
| Field | Type | Description |
|-------|------|-------------|
| description | string | 1-2 sentence summary optimized for LLM understanding |
| when_to_use | string | Guidance on when this tool is appropriate |
| parameters | list | Brief description of each input parameter |
| returns | string | Brief description of output |

**Format**: Markdown section with structured content

```markdown
## MCP

**Description**: Sets the display color for one or more track features.

**When to use**: When the user wants to change track visibility, distinguish tracks by category, or apply a color coding scheme.

**Parameters**:
- `features`: Track features to modify (GeoJSON FeatureCollection)
- `color`: CSS color value or property-to-color mapping

**Returns**: Modified track features with updated styling properties.
```

### 3. Inputs

**Purpose**: Formal input schema definition

**Required Fields**:
| Field | Type | Description |
|-------|------|-------------|
| schema | reference | Path to schema definition |
| constraints | list | Validation rules beyond schema |
| defaults | object | Default values for optional fields |

**Format**: References existing schemas in `shared/schemas/`

```markdown
## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Features must have `geometry.type == "LineString"` or `"MultiLineString"`
- At least one feature required

**Defaults**:
- `opacity`: 1.0
```

### 4. Outputs

**Purpose**: Formal output schema definition

**Required Fields**:
| Field | Type | Description |
|-------|------|-------------|
| schema | reference | Path to schema definition |
| result_type | string | ToolResult resultType value |
| annotations | object | Required ToolResultAnnotations fields |

**Result Type Naming Convention**:

The `result_type` follows the pattern `{top_type}/{domain}/{specific_type}`:

| Constraint | Rule | Example |
|------------|------|---------|
| Characters | Lowercase letters and underscores only | `range_bearing_series` ✓ |
| No hyphens | Use underscores for word separation | `range-bearing` ✗ |
| Two suffixes | Must have domain AND specific type | `dataset/range_bearing_series` ✓ |
| Schema pattern | `^(mutation\|addition\|deletion\|artifact)/[a-z_]+/[a-z_]+$` | |

**Format**: References existing schemas

```markdown
## Outputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature` with `shared/schemas/src/linkml/styling.yaml#TrackStyle`

**Result Type**: `mutation/track/styled`

**Annotations**:
- `sourceFeatures`: IDs of input features
- `label`: "Applied color {color} to {n} tracks"
```

### 5. Algorithm

**Purpose**: Unambiguous step-by-step specification in pseudocode

**Requirements**:
- Language-neutral pseudocode
- No implementation details (no specific APIs, libraries, or syntax)
- Clear control flow (FOR, IF, WHILE, RETURN)
- Variable declarations with types
- Comments for complex logic

**Format**: Code block with pseudocode

```markdown
## Algorithm

```pseudocode
FUNCTION set_track_color(features: FeatureCollection, color: string) -> FeatureCollection:
    result = empty FeatureCollection

    FOR EACH feature IN features:
        IF feature.geometry.type IN ["LineString", "MultiLineString"]:
            // Initialize style if not present
            IF feature.properties.style IS NULL:
                feature.properties.style = default_track_style()
            END IF

            // Apply color to line properties
            feature.properties.style.line.color = color

            result.features.append(feature)
        END IF
    END FOR

    RETURN result
END FUNCTION
```
```

### 6. Edge Cases

**Purpose**: Document boundary conditions and error handling

**Required Categories**:
| Category | Description |
|----------|-------------|
| Empty Input | Behavior when no features provided |
| Invalid Input | Behavior for malformed/invalid data |
| Boundary Values | Behavior at limits (min/max values) |
| Type Mismatches | Behavior for unexpected feature types |

**Format**: List with scenario and expected behavior

```markdown
## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return empty collection (no error) |
| Non-track features mixed in | Skip non-track features, process tracks only |
| Invalid color string | Reject with validation error before processing |
| Color with alpha channel | Accept and preserve alpha value |
```

### 7. Examples

**Purpose**: Concrete input/output pairs for validation

**Requirements**:
- At least one "basic" example per tool
- Examples for each edge case
- Small examples inline, large examples as sister files

**Inline Format**:
```markdown
## Examples

### Basic Example

**Input**:
```json
{
  "type": "FeatureCollection",
  "features": [...]
}
```

**Output**:
```json
{
  "type": "FeatureCollection",
  "features": [...]
}
```
```

**Sister File Format**:
```markdown
## Examples

### Complex Track Network

See:
- Input: `set-track-color.network.input.json`
- Output: `set-track-color.network.output.json`
```

### 8. Changelog

**Purpose**: Version history and migration notes

**Format**: Reverse chronological list

```markdown
## Changelog

### 1.0 (2026-02-05)
- Initial release

### 0.9 (deprecated)
- Beta version with different parameter names
- Migration: Rename `colour` parameter to `color`
```

### 9. References

**Purpose**: Related resources for implementers

**Categories**:
| Category | Description |
|----------|-------------|
| Related Tools | Other tools in the same category |
| Schemas | Relevant schema definitions |
| Legacy Code | Original Debrief implementation (if applicable) |
| External | Papers, standards, or documentation |

**Format**: Categorized link list

```markdown
## References

**Related Tools**:
- [apply-symbol-style](./apply-symbol-style.1.0.md)
- [label-interval](./label-interval.1.0.md)

**Schemas**:
- [TrackStyle](../../schemas/src/linkml/styling.yaml)
- [TrackFeature](../../schemas/src/linkml/geojson.yaml)

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.actions.SetTrackColor`
```

## Validation Rules

### File Naming
- Pattern: `[tool-name].[major].[minor].md`
- Example: `set-track-color.1.0.md`

### Golden Example Naming
- Input: `[tool-name].[example-name].input.json`
- Output: `[tool-name].[example-name].output.json`
- Example: `set-track-color.basic.input.json`

### Section Order
Sections MUST appear in the order defined above. All 9 sections MUST be present.
