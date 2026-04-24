# Round-Trip Evidence: `ToolCategoryEnum`

**Feature**: 207-tool-manifest-categories
**Captured**: 2026-04-22
**Commit**: 5ea7ad28
**Constitution reference**: Article II.1 (LinkML as single source of truth) and II.2 (schema adherence tests mandatory)

Article II requires lossless round-trip of schema-defined values through every supported serialisation. This document captures the evidence that every canonical `ToolCategoryEnum` value survives the full Python → JSON → JSON Schema → Python pipeline.

## Source of truth

```yaml
# shared/schemas/src/linkml/tool.yaml
enums:
  ToolCategoryEnum:
    permissible_values:
      import: { description: "File / data ingestion tools" }
      style: { description: "Appearance-changing tools" }
      calc: { description: "Analytical computation tools" }
      filter: { description: "Tools that narrow the dataset" }
      snapshot: { description: "Tools that export or capture state" }
```

## Generated artefacts

| Language | File | Symbol |
|---|---|---|
| Python | `shared/schemas/src/generated/python/debrief_schemas/__init__.py` | `class ToolCategoryEnum(str, Enum)` with 5 members |
| TypeScript | `shared/schemas/src/generated/typescript/types.ts` | `export enum ToolCategoryEnum { import = "import", style = "style", ... }` |
| JSON Schema | `shared/schemas/src/generated/json-schema/Tool.schema.json` | `"category": { "$ref": "#/$defs/ToolCategoryEnum" }` with `enum: [import, style, calc, filter, snapshot]` |

## Round-trip transcript

Captured via `uv run python` against `commit 5ea7ad28`:

```
Python → JSON (import):   {"id":"sample-import","name":"Sample import","description":"Round-trip demo","category":"import"}
JSON → Python (import):   category='import'

Python → JSON (style):    {"id":"sample-style","name":"Sample style","description":"Round-trip demo","category":"style"}
JSON → Python (style):    category='style'

Python → JSON (calc):     {"id":"sample-calc","name":"Sample calc","description":"Round-trip demo","category":"calc"}
JSON → Python (calc):     category='calc'

Python → JSON (filter):   {"id":"sample-filter","name":"Sample filter","description":"Round-trip demo","category":"filter"}
JSON → Python (filter):   category='filter'

Python → JSON (snapshot): {"id":"sample-snapshot","name":"Sample snapshot","description":"Round-trip demo","category":"snapshot"}
JSON → Python (snapshot): category='snapshot'
```

Observations:
- Each canonical value serialises to its exact string form.
- Each re-parsed `Tool.category` equals the input string (the generated `ConfiguredBaseModel` sets `use_enum_values=True`, so the stored form is the underlying string).
- No value drifts; no quoting artefacts; no escape-sequence issues.
- A second `model_dump_json(exclude_none=True)` is byte-identical to the first (tested explicitly in `test_round_trip_declared_category`).

## Automated tests

The transcript above is captured manually for illustration, but the same property is enforced by:

- `shared/schemas/tests/test_tool_category_round_trip.py::test_round_trip_declared_category` — parametric test over all five enum members + the `None` case. Runs on every CI invocation.
- `shared/schemas/tests/test_tool_category_round_trip.py::test_invalid_category_rejected_by_pydantic` — negative test: `"geometry"` raises `ValidationError`.
- `shared/schemas/tests/test_tool_category_round_trip.py::test_invalid_category_rejected_by_json_schema` — negative test: `"geometry"` fails JSON Schema validation.

All 8 round-trip tests pass on commit 5ea7ad28.

## JSON Schema cross-check

Every serialised tool also validates against `Tool.schema.json`:

```python
from jsonschema import Draft202012Validator
import json
schema = json.loads(open("shared/schemas/src/generated/json-schema/Tool.schema.json").read())
validator = Draft202012Validator(schema)

# Each of the five serialisations above is .validate()'d — no exception raised.
# The invalid case {"category": "geometry"} raises ValidationError.
```

This ties the Pydantic model, the LinkML source, and the wire schema into a single consistent triangle — any drift in one vertex will fail one of the automated tests.
