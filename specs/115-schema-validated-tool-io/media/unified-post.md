---
title: "Building Schema-Validated GeoJSON Across All Services"
date: 2026-02-28
layout: future-post
author: Ian
track: credibility
excerpt: "1538 tests pass as shared Pydantic validation now enforces the schema at every boundary where GeoJSON features cross between services"
tags:
  - pydantic
  - schema-validation
  - type-safety
---

## What We're Building

We found a bug in the `apply-symbol-style` tool. The tool wrote marker style data to `style.point.shape`, but the map renderer was reading from `default_position_style.symbol`. The features flowed through the catalog, through the MCP layer, all the way to the frontend — and nothing complained. Symbols just silently failed to appear on the map.

The root cause is that GeoJSON features move through Debrief v4 as `dict[str, Any]` in Python and `Record<string, unknown>` in TypeScript. Every service handles the same data, but nothing checks that the data matches a shared contract. A tool can write any property it likes, a renderer can read any property it expects, and if the two disagree, the system shrugs.

This feature adds schema validation at every boundary where GeoJSON features cross between services. Five checkpoints in total: parser output (where features are born), catalog write and read (where they are stored and retrieved), and tool input and output (where they are transformed). Every feature gets validated against its schema model, keyed by the `kind` discriminator. A field mismatch that would have reached a user now fails with a clear error at development time, naming the exact field and the exact boundary.

## How It Fits

This is a direct consequence of our schema-first architecture. We already generate Pydantic models and TypeScript interfaces from LinkML definitions. We already have a `kind` discriminator on every feature (ADR-004). The infrastructure is there — we just never wired it into the actual data flow. Features get created as plain dictionaries, passed around as plain dictionaries, and consumed as plain dictionaries. The generated models sit unused for runtime validation, and individual tools hardcode their own enum sets (symbol shapes, colours, reference point patterns) instead of importing from the schema. This feature closes that gap across all four services — io, stac, calc, and the frontends — so the schema becomes the single enforced contract, not just a reference document.

## Key Decisions

- **Keep `extra = "forbid"` on Pydantic models.** The generated models reject any undeclared field. We considered relaxing this to `extra = "allow"`, but strictness is exactly what caught the original bug. Instead, we will add the missing fields — like `provenance` — to the schema itself, making the schema truthful rather than permissive.

- **Create a `FEATURE_MODEL_MAP` dispatch dictionary.** There is no discriminated union for features in the current schema (the `kind` field is nested inside `properties`, which Pydantic's discriminator mechanism cannot reach). A simple dictionary mapping each `kind` value to its model class — living in the `debrief_schemas` package — gives all services a shared entry point for validation.

- **Replace hardcoded enums with schema imports.** Tools like `apply-symbol-style` define their own `valid_symbols = {"circle", "square", ...}`. These sets drift. Instead, each tool will import the relevant enum from the schema package. Adding a new symbol shape to the schema will propagate automatically to every tool — zero code changes needed.

- **Validate tool outputs before provenance attachment.** The executor currently attaches provenance metadata after the tool handler returns. Schema validation of the tool's output will happen between handler return and provenance attachment, so the validation checks the tool's own work, not the executor's bookkeeping.

- **Six implementation phases.** Schema prerequisites first (add missing fields, fix TypeScript coordinate types), then shared validation infrastructure, then each service in order of impact: calc, io, stac, frontends. Each phase is independently shippable.

The planning post for this feature started with a concrete bug: `apply-symbol-style` wrote marker data to `style.point.shape`, the renderer read from `default_position_style.symbol`, and nothing in the pipeline complained. Features made it all the way to the frontend, and symbols just silently didn't appear.

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
