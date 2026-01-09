# Research: Schema Foundation

**Feature**: 000-schemas | **Date**: 2026-01-09
**Purpose**: Resolve technical unknowns and document technology decisions for the schema foundation.

---

## 1. LinkML as Master Schema Language

### Decision
Use LinkML (Linked Data Modeling Language) as the single source of truth for all data structures.

### Rationale
- **Purpose-built for multi-target generation**: LinkML generates Pydantic, JSON Schema, TypeScript, and more from a single source
- **Semantic richness**: Supports semantic web concepts (URIs, ontologies) while remaining practical
- **Active development**: Well-maintained with regular releases and community support
- **Extensible**: Custom generators can be added if needed

### Alternatives Considered
| Alternative | Rejected Because |
|-------------|-----------------|
| JSON Schema as source | Cannot generate Pydantic models directly; TypeScript generation requires separate tooling |
| Pydantic as source | No native TypeScript generation; JSON Schema output lacks semantic metadata |
| Protocol Buffers | Poor GeoJSON support; designed for RPC, not document validation |
| OpenAPI/Swagger | API-focused, not data model focused; verbose for complex nested structures |

### Key References
- [LinkML Documentation](https://linkml.io/)
- [LinkML Tutorial](https://linkml.io/linkml/intro/tutorial.html)

---

## 2. Pydantic Generator Configuration

### Decision
Use `gen-pydantic` with Pydantic v2, strict mode disabled, `extra_fields="forbid"`.

### Rationale
- **Pydantic v2 only**: Pydantic v1 support was deprecated in LinkML 1.7.5 and removed in 1.10.0
- **extra_fields="forbid"**: Catches unexpected fields at validation time, aligning with schema integrity principles
- **strict=False**: Allows reasonable coercion (e.g., string "123" to int 123) which helps with JSON interop
- **black formatting**: Include black for consistent code style

### Configuration
```bash
gen-pydantic \
  --extra-fields forbid \
  --black \
  schema.yaml > models.py
```

### Generator Options
| Option | Value | Reason |
|--------|-------|--------|
| `--extra-fields` | `forbid` | Constitution II.1 - schema is the contract |
| `--black` | enabled | Consistent formatting |
| `--pydantic-version` | `2` | Default in recent LinkML |
| `--strict` | `false` | Allow reasonable coercion for JSON interop |

### Key References
- [LinkML Pydantic Generator](https://linkml.io/linkml/generators/pydantic.html)

---

## 3. JSON Schema Generator Configuration

### Decision
Use `gen-json-schema` with draft 2020-12, top-class mode for entity-level schemas.

### Rationale
- **Draft 2020-12**: Latest JSON Schema draft with best tooling support
- **Entity-level schemas**: Generate separate schema files per entity for modular validation
- **$id handling**: Ensure stable $id URIs for schema references

### Configuration
```bash
gen-json-schema \
  --top-class TrackFeature \
  schema.yaml > track-feature.schema.json
```

### Limitations
- JSON Schema does not support inheritance hierarchy; slots are "rolled down" from parent
- Cannot validate GeoJSON ring closure or right-hand rule (requires custom logic)

### Key References
- [LinkML JSON Schema Generator](https://linkml.io/linkml/generators/json-schema.html)

---

## 4. TypeScript Generator Configuration

### Decision
Use `gen-typescript` to generate TypeScript interface definitions.

### Rationale
- **Type-only output**: Interfaces have no runtime effect but enable static type checking
- **Frontend compatibility**: Generated interfaces work in VS Code extension, Electron app, and browser
- **Matches Pydantic structure**: Same field names, types, and optionality

### Configuration
```bash
gen-typescript schema.yaml > types.ts
```

### Usage Pattern
TypeScript interfaces are for compile-time checking only. Runtime validation in TypeScript uses AJV with the generated JSON Schema.

### Key References
- [LinkML TypeScript Generator](https://linkml.io/linkml/generators/typescript.html)

---

## 5. AJV for JavaScript/TypeScript Validation

### Decision
Use AJV (Another JSON Validator) for runtime JSON Schema validation in TypeScript/JavaScript.

### Rationale
- **Performance**: Compiles schemas to functions for fast validation
- **Draft support**: Supports JSON Schema draft-04/06/07/2019-09/2020-12
- **TypeScript integration**: Compiled validators act as type guards
- **Industry standard**: Most widely used JSON Schema validator in JavaScript ecosystem

### Configuration Best Practices
```typescript
import Ajv from "ajv";
import addFormats from "ajv-formats";

// Single instance for entire application
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

// Compile schemas at startup, reuse validators
const validateTrackFeature = ajv.compile(trackFeatureSchema);
```

### Key Practices
1. **Single Ajv instance**: Share across application for schema caching
2. **Compile at startup**: Pre-compile all schemas, not at request time
3. **allErrors: true**: Report all validation errors, not just first
4. **strict: true**: Prevent silently ignored schema mistakes
5. **ajv-formats**: Add format validation (date-time, uri, etc.)

### Key References
- [AJV Getting Started](https://ajv.js.org/guide/getting-started.html)
- [AJV TypeScript Guide](https://ajv.js.org/guide/typescript.html)

---

## 6. GeoJSON Profile Strategy

### Decision
Model GeoJSON structures in LinkML with Debrief-specific property conventions.

### Rationale
- **Standard compliance**: Output must be valid GeoJSON per RFC 7946
- **Property extensions**: Debrief conventions in Feature properties (temporal data, platform metadata)
- **Tooling compatibility**: GeoJSON works with Leaflet, MapLibre, QGIS, etc.

### Modeling Approach
```yaml
# In LinkML schema
classes:
  TrackFeature:
    is_a: GeoJSONFeature
    slot_usage:
      geometry:
        range: LineString  # Tracks are LineStrings
      properties:
        range: TrackProperties

  TrackProperties:
    attributes:
      platform_id:
        range: string
        required: true
      track_type:
        range: TrackTypeEnum
      temporal_extent:
        range: TemporalExtent
```

### Limitations
- GeoJSON ring closure and right-hand rule cannot be validated via JSON Schema
- These require custom Python/TypeScript validators on top of schema validation

---

## 7. Round-Trip Testing Strategy

### Decision
Implement three-phase round-trip: Python → JSON → TypeScript → JSON → Python.

### Rationale
- **Interoperability proof**: Validates that all generated schemas handle identical data
- **Drift detection**: Catches mismatches between Pydantic and TypeScript representations
- **Constitution compliance**: Article II requires derived schema adherence

### Implementation Approach
```
1. Python generates TrackFeature instance using Pydantic model
2. Serialize to JSON using model_dump_json()
3. TypeScript loads JSON, validates with AJV, deserializes to typed object
4. TypeScript serializes back to JSON
5. Python loads JSON, validates with Pydantic
6. Compare: original Python dict == final Python dict
```

### Test Infrastructure
- pytest runs Python side
- vitest runs TypeScript side (via Node subprocess or shared fixtures)
- CI runs both, compares results

---

## 8. Schema Comparison Strategy

### Decision
Structural comparison of JSON Schema generated by LinkML vs JSON Schema derived from Pydantic.

### Rationale
- **Consistency check**: Two paths to JSON Schema should produce equivalent results
- **Generator validation**: Catches bugs in either LinkML or Pydantic generators

### Implementation Approach
```python
def compare_schemas(linkml_schema: dict, pydantic_schema: dict) -> list[str]:
    """
    Compare structural elements, ignoring:
    - $id and $schema fields (metadata)
    - description text (may differ)
    - property ordering (not semantically meaningful)

    Return list of meaningful differences.
    """
```

### Acceptable Differences
- `$id`, `$schema` metadata
- `description` text
- `title` values
- Property ordering

### Must Match
- Required fields list
- Property types
- Enum values
- Nested object structure
- Array item types

---

## 9. Build Tooling

### Decision
Use Makefile with `make generate` as single entry point.

### Rationale
- **Simple**: Make is available everywhere, no additional dependencies
- **Composable**: Easy to add new generators
- **CI-friendly**: Single command for schema regeneration

### Makefile Targets
```makefile
.PHONY: generate test clean

generate: generate-pydantic generate-jsonschema generate-typescript

generate-pydantic:
	gen-pydantic --extra-fields forbid --black src/linkml/debrief.yaml \
		> src/generated/python/debrief_schemas/__init__.py

generate-jsonschema:
	gen-json-schema src/linkml/debrief.yaml \
		> src/generated/json-schema/debrief.schema.json

generate-typescript:
	gen-typescript src/linkml/debrief.yaml \
		> src/generated/typescript/types.ts

test: generate
	pytest tests/
	cd src/generated/typescript && npm test

clean:
	rm -rf src/generated/python/*
	rm -rf src/generated/json-schema/*
	rm -rf src/generated/typescript/*
```

---

## 10. CI Pipeline Strategy

### Decision
GitHub Actions workflow with schema generation and adherence tests.

### Rationale
- **Constitution VI.4**: CI must pass before merge
- **Schema tests gate merges**: Prevent drift from reaching main branch

### Workflow Steps
1. Checkout code
2. Install uv, pnpm
3. Install Python dependencies (`uv sync`)
4. Install Node dependencies (`pnpm install`)
5. Generate all schemas (`make generate`)
6. Verify no uncommitted changes (ensures schemas are up to date)
7. Run adherence tests (`make test`)
8. Fail on any test failures

---

## Summary of Decisions

| Area | Decision |
|------|----------|
| Master schema | LinkML |
| Pydantic version | v2 with extra_fields=forbid |
| JSON Schema draft | 2020-12 |
| TypeScript generator | gen-typescript (interfaces only) |
| JS validation | AJV with strict mode |
| GeoJSON approach | LinkML models with standard compliance |
| Round-trip testing | Python → JSON → TS → JSON → Python |
| Schema comparison | Structural diff ignoring metadata |
| Build tool | Makefile |
| CI | GitHub Actions |

All NEEDS CLARIFICATION items from Technical Context have been resolved.
