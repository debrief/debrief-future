# Quickstart: Schema-Validated GeoJSON

**Feature**: 115-schema-validated-tool-io

## What Changed

All GeoJSON features are now validated against the shared schema at every service boundary. Invalid features are rejected immediately with clear error messages.

## For Tool Developers

### Your tool outputs are now schema-validated

After your handler returns features, the executor validates each one against the Pydantic model for its `kind`. If a feature has a missing field, wrong type, or invalid enum value, you'll see an error like:

```
SchemaValidationError at tool_output: Feature 'result-001' (TRACK)
  - properties.style.line.color: expected NamedColorEnum, got 'fuschia'
```

### No more hardcoded enums

Replace hardcoded enum sets with schema imports. The executor validates parameter values against schema enums automatically.

Before:
```python
valid_symbols = {"circle", "square", "triangle", "diamond", "cross"}
if symbol not in valid_symbols:
    raise ValueError(f"Invalid symbol: {symbol}")
```

After:
```python
# Just declare param_type in tool registration — validation is automatic
ToolParameter(name="symbol", type="enum", param_type="MarkerSymbol")
```

### Adding new fields to feature output

If your tool needs to write a property that isn't in the schema, update the LinkML schema first (in `shared/schemas/src/linkml/`), regenerate, then update your tool. This enforces the "specs before code" principle.

## For Parser Developers

### Parser outputs are now schema-validated

Every feature returned by a handler's `parse()` method is validated against the schema for its declared `kind`. If your parser builds a circle annotation missing a required `style` field, you'll get:

```
SchemaValidationError at parser_output: Feature 'anno-001' (CIRCLE)
  - properties.style: field required
```

### Required properties

Ensure every feature you build includes all required fields for its kind. Check the schema models in `shared/schemas/src/generated/python/debrief_schemas/__init__.py` for the field list.

## For Frontend Developers

### Use schema types, not workarounds

Import feature types from `@debrief/schemas`:

```typescript
import type { TrackFeature, ReferenceLocation } from '@debrief/schemas';
```

For a union of all feature types, use `DebriefFeature` from the component library:

```typescript
import type { DebriefFeature } from '@debrief/components';
```

Use the existing type guards for narrowing:

```typescript
import { isTrackFeature, isReferenceLocation } from '@debrief/components';

if (isTrackFeature(feature)) {
  // feature.properties.positions is typed
}
```

### No more `as any` or `as unknown`

If the TypeScript compiler complains about a property access, it means the schema type doesn't include that field. Fix it by:
1. Checking if you're using the right type
2. If the field exists at runtime but not in the type, the schema needs updating

## For Schema Maintainers

### Schema changes are now caught everywhere

When you rename or remove a field in the LinkML schema:
- Python services fail with `SchemaValidationError` in tests
- TypeScript builds fail with compiler errors
- CI blocks the merge until all consumers are updated

This is intentional — the schema is the contract.

## Validation Boundaries

| Boundary | Service | When |
|----------|---------|------|
| `parser_output` | IO | After parsing a file, before returning features |
| `tool_input` | Calc | Before executing tool handler |
| `tool_output` | Calc | After handler returns, before provenance attachment |
| `catalog_write` | STAC | Before writing features to disk |
| `catalog_read` | STAC | After reading features from disk |

## Schema Evolution Safety Net

When you modify the LinkML schema (rename, remove, or add a required field), the validation infrastructure ensures every affected consumer is surfaced:

### What happens when you rename a field

1. **Update LinkML** — rename the field in `shared/schemas/src/linkml/*.yaml`
2. **Regenerate schemas** — run `uv run --directory shared/schemas python scripts/generate.py`
3. **Run tests** — the full test suite surfaces every affected location:
   - **Python**: `SchemaValidationError` in calc, IO, and STAC service tests
   - **TypeScript**: compiler errors in `pnpm build` for property access mismatches
   - **Fixtures**: `test_golden.py` rejects fixtures with stale field names

### What happens when you add a required field

1. Every existing feature dict that lacks the new field will fail `model_validate()`
2. The validation module's `validate_feature()` reports the missing field with its expected type
3. All boundaries (tool input/output, parser output, catalog read/write) will flag it

### Verification tests

The test suite in `shared/schemas/tests/test_validation.py` includes dedicated schema evolution tests:

- `TestSchemaFieldRename` — verifies renamed fields are rejected at all 4 write boundaries
- `TestSchemaNewRequiredField` — verifies missing required fields are caught and clearly reported

### Recommended workflow

```bash
# 1. Make schema change
vim shared/schemas/src/linkml/geojson.yaml

# 2. Regenerate
uv run --directory shared/schemas python scripts/generate.py

# 3. Run all tests (Python + TypeScript)
uv run pytest              # Python: schema, calc, io, stac
pnpm build                 # TypeScript: compiler catches type mismatches
pnpm test                  # TypeScript: runtime tests

# 4. Fix every failure — each is a consumer that needs updating
```
