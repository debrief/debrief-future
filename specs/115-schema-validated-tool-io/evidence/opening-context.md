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
