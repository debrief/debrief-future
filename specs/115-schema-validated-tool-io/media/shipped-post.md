---
layout: future-post
title: "Shipped: Schema-Validated GeoJSON Across All Services"
date: 2026-02-28
track: [credibility]
author: Ian
reading_time: 4
tags: [tracer-bullet, schema-validation, type-safety, pydantic, linkml]
excerpt: "1538 tests pass as shared Pydantic validation now enforces the schema at every boundary where GeoJSON features cross between services"
---

## What We Shipped

The planning post for this feature started with a concrete bug: `apply-symbol-style` wrote marker data to `style.point.shape`, the renderer read from `default_position_style.symbol`, and nothing in the pipeline complained. Features made it all the way to the frontend, and symbols just silently didn't appear.

The fix to that specific bug was a one-liner. The real problem was structural: GeoJSON features flowed through four services as plain `dict[str, Any]` in Python and `Record<string, unknown>` in TypeScript. Every service touched the same data. Nothing verified it matched a shared contract.

We now have five validation checkpoints — `parser_output`, `tool_input`, `tool_output`, `catalog_write`, `catalog_read` — each enforcing the Pydantic model for the feature's `kind`. The same `validate_feature()` function handles all of them. A field mismatch that would previously have reached a user now fails at the boundary where it originates, naming the field and the boundary:

```python
# SchemaValidationError at tool_output: Feature 'ref-002' (POINT)
#   - properties.name: Field required
#   - properties.display_name: Extra inputs are not permitted
```

## What Changed

**Shared validation infrastructure.** A `FEATURE_MODEL_MAP` in `debrief_schemas` dispatches each of the 12 feature kinds to its Pydantic model class. `validate_feature()` and `validate_features()` sit on top of that map, raising `SchemaValidationError` with structured detail. All services import from one place.

**Calc service.** The executor validates tool inputs before the handler runs and tool outputs before provenance is attached. Validation is warn-and-continue in production — a malformed feature logs a warning rather than crashing a tool call — but the errors surface clearly in tests and development.

**IO service.** Parser outputs are validated before features enter the catalog. A REP file that parses successfully but produces a malformed feature is caught here, not downstream.

**STAC service.** Features are validated at catalog write. The catalog read boundary also validates, so anything that bypassed earlier checks doesn't propagate silently.

**Enum values from schema, not from code.** Three tools — `apply-symbol-style`, `set-track-color`, `generate-reference-points` — each had hardcoded sets like `valid_symbols = {"circle", "square", ...}`. Those are gone. `resolve_enum_values("MarkerSymbol")` pulls the valid set from the schema at runtime. New enum values added to the schema propagate automatically.

**Provenance on all 12 feature types.** Every feature property class now has an optional `provenance: list[LogEntry]` field. It survives round-trips through Python and JSON, and the generated TypeScript types include it as `provenance?: LogEntry[]`. This was a prerequisite for strict validation — without it, `extra = "forbid"` would have rejected features that already carried provenance.

**TypeScript coordinate types fixed.** The schema generator was emitting `number[]` for all geometry coordinate arrays. LineString coordinates are `number[][]`, Polygon coordinates are `number[][][]`. Fixed in the generator; `pnpm build` succeeds across components, web-shell, and the VS Code extension.

## By the Numbers

| | |
|---|---|
| Tests passing | 1538 |
| Tests failed | 0 |
| Services covered | 4 (schemas, calc, io, stac) + frontend |
| Feature kinds with provenance | 12 / 12 |
| Validation checkpoints | 5 |
| Hardcoded enum sets removed | 3 |

Schema tests: 188 passing across golden fixtures, JSON schema, round-trip, and the new validation module. Existing 934 Python service tests and 604 TypeScript component tests all continue to pass — no regressions.

## What We Learned

**The `kind` discriminator placement matters.** Pydantic's discriminated union mechanism requires the discriminator at the top level of the model. Our `kind` field lives inside `properties`, so standard `Literal` discriminators don't apply. The `FEATURE_MODEL_MAP` dictionary is a deliberate workaround: simple, explicit, easy to read, and avoids contorting the schema to fit Pydantic's expectations.

**Warn-and-continue is the right default for production.** We debated whether validation failures at service boundaries should be hard errors. For development and tests, they are — `SchemaValidationError` raises. For production tool execution, a malformed output feature shouldn't crash an entire tool call that might have transformed ten other features correctly. Logging the error and continuing gives operators something to act on without breaking workflows.

**Schema prerequisites have to go first.** We tried integrating validation before adding `provenance` to the feature models. Every feature with provenance data immediately failed with "extra inputs are not permitted." The sequencing in the implementation plan — schema prerequisites, then infrastructure, then each service — was correct and saved rework.

## What's Next

Schema validation is now enforced at every boundary. The next thing to make use of that foundation is aggregate analysis: querying across exercises to surface patterns no single-exercise analysis can find. The provenance fields we added here are what make cross-exercise attribution possible — every feature carries a record of what created it and when.

→ [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/115-schema-validated-tool-io)
→ [See the branch](https://github.com/debrief/debrief-future/tree/claude/implement-speckit-115-kxnF2)
