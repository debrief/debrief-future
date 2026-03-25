A single type alias -- `Feature = dict[str, Any]` -- has been the root cause of more bugs in Future Debrief than any other line of code. It makes the compiler blind to misspelled property names, missing fields, and wrong types across 150 locations in 60 files.

The irony: we already generate fully typed Pydantic models and TypeScript interfaces from our LinkML schemas. Type guards exist. Validation functions exist. But domain data drops into untyped dicts the moment it leaves the service boundary, and stays untyped for the rest of its life.

This week we're planning the fix -- making schema-derived types follow data from parse to serialise. No new dependencies. Gradual migration, starting at the executor boundary and working outward. The goal is simple: when a schema property gets renamed, the compiler catches every consumer, not just the ones at the edge.

The full planning post covers the migration strategy, the trade-offs around TypeScript type guards vs Zod, and how session-state types will move from hand-written to generated.

https://debrief.github.io/blog/planning-cradle-to-grave-typing

#FutureDebrief #TypeSafety #SchemaFirst
