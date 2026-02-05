# Research: Language-Neutral Tool Documentation Model

**Feature**: 049-tool-documentation-model
**Date**: 2026-02-05

## Decisions

### 1. Template Section Structure

**Decision**: 9 sections in the following order: Metadata, MCP, Inputs, Outputs, Algorithm, Edge Cases, Examples, Changelog, References

**Rationale**:
- Metadata first for quick identification and tooling integration
- MCP section early for LLM-friendly discovery
- Inputs/Outputs before Algorithm follows "contract then implementation" pattern
- Edge Cases after Algorithm ensures boundary conditions are documented
- Examples provide concrete validation cases
- Changelog tracks evolution
- References provide context for implementers

**Alternatives Considered**:
- Fewer sections (merged Inputs/Outputs) — rejected: loses clarity for cross-language validation
- More sections (separate Validation section) — rejected: adds complexity without value

### 2. Golden Example Format

**Decision**: JSON file pairs with naming convention `[tool-name].[example-name].input.json` and `[tool-name].[example-name].output.json`

**Rationale**:
- JSON is language-neutral and easily parsed by both Python and TypeScript
- Separate files allow larger examples without cluttering spec markdown
- Naming convention enables automated test discovery
- Multiple examples per tool support edge case coverage

**Alternatives Considered**:
- YAML fixtures — rejected: JSON is more universally parseable and matches GeoJSON format
- Inline examples only — rejected: large examples would make specs unreadable
- Single file with input/output pairs — rejected: harder to diff individual inputs/outputs

### 3. Decorator Implementation

**Decision**: Python `@tool_spec(path)` decorator using functools.wraps, storing spec path in function attribute

**Rationale**:
- Standard library only (functools, pathlib, os)
- Validates spec exists at import time (fail-fast)
- Preserves function metadata with functools.wraps
- Spec path accessible via `func.__tool_spec__` attribute for introspection

**Alternatives Considered**:
- Runtime validation only — rejected: delayed failures are harder to debug
- Class-based registry — rejected: over-engineered for current needs
- External config file — rejected: breaks colocation principle

### 4. Version Scheme

**Decision**: Semver in filename: `[tool-name].[major].[minor].md` (e.g., `set-track-color.1.0.md`)

**Rationale**:
- Multiple versions can coexist in the same directory
- File-level versioning enables easy comparison
- Decorators reference exact version, enabling gradual migration
- Patch versions omitted — spec changes are either breaking (major) or additive (minor)

**Alternatives Considered**:
- Single file with version in metadata — rejected: loses version history, complicates migration
- Full semver with patch — rejected: patch-level spec changes are rare
- Git-based versioning — rejected: requires Git access, not self-contained

### 5. Existing Schema References

**Decision**: Tool specs reference existing schemas by path rather than embedding definitions

**Rationale**:
- GeoJSON features already defined in `shared/schemas/src/linkml/geojson.yaml`
- Styling properties already defined in `shared/schemas/src/linkml/styling.yaml`
- ToolResult annotations defined in `shared/schemas/src/linkml/tool-result.yaml`
- Single source of truth maintained (Constitution Article II)

**Schema References for Initial Tools**:
| Tool | Input Schema | Output Schema |
|------|--------------|---------------|
| set-track-color | TrackFeature (geojson.yaml) | TrackFeature + TrackStyle (styling.yaml) |
| apply-symbol-style | TrackFeature | TrackFeature + PointProperties (styling.yaml) |
| label-interval | TrackFeature | TrackFeature + PositionStyle (styling.yaml) |
| symbol-interval | TrackFeature | TrackFeature + PositionStyle (styling.yaml) |

### 6. Algorithm Pseudocode Style

**Decision**: Language-neutral pseudocode using Python-like syntax without Python-specific constructs

**Rationale**:
- Readable by both Python and TypeScript developers
- Avoids implementation bias
- Focus on logic, not syntax

**Style Guide**:
```
FOR EACH feature IN input.features:
    IF feature.type == "track":
        feature.properties.style.line.color = input.color
    END IF
END FOR
RETURN modified features
```

**Alternatives Considered**:
- Formal specification language (TLA+, Z) — rejected: learning curve too high
- Natural language only — rejected: too ambiguous for cross-implementation consistency
- Actual Python code — rejected: biases TypeScript implementers

## Unresolved Questions

None — all technical decisions resolved for Phase 1.
