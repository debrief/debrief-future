## What We're Building

Right now, when an analyst clicks a track on the map, Debrief selects the whole track. That's it. There's no way to say "I mean this specific position" -- the one at 14:32 where the vessel changed course. The properties panel shows a track summary, tools operate on the entire feature, and any position-level question requires the analyst to eyeball it.

We're extending the selection model so that `featureIds` can hold path strings that identify child elements at arbitrary depth. A track position becomes `track-hms-defender/positions/4`. A position within a named segment becomes `track-hms-defender/segments/leg-alpha/positions/3`. The path format uses RFC 6901 escaping conventions for special characters, but the structure is our own: a domain hierarchy, not a JSON document traversal.

The key insight that makes this tractable: these paths are just strings. They go into the existing `featureIds` array. A single-segment path like `track-hms-defender` is identical to the current flat ID. No schema change. No version bump. Existing code that treats feature IDs as opaque strings keeps working.

## How It Fits

Selection is the hinge of the whole UI. The map writes to it, the properties panel reads from it, tools query it to decide whether they're applicable. Getting position-level selection right unblocks the properties panel, position-level tools, and temporal analysis -- all of which need to know exactly what the analyst is pointing at. The changes touch four existing packages (session-state, shared schemas, shared components, VS Code extension) but create nothing new. The core addition is about 20 lines of pure TypeScript path utilities.

## Key Decisions

- **RFC 6901 escaping, domain-specific structure**: We adopt the `~0`/`~1` escape conventions from JSON Pointer but not the full JSON Pointer syntax. Our paths describe a domain hierarchy (`positions/4`), not a JSON traversal (`/properties/positions/4`).
- **Shared level registry**: A `LevelDefinition` in the schema defines whether each level uses ID-based addressing (`segments/leg-alpha`) or index-based addressing (`positions/4`). This prevents every consumer from hard-coding that knowledge.
- **Leaf-only semantics**: Selecting a position does not implicitly select the parent track. Tools that need the parent can parse the path upward.
- **Two-tier validation**: The selection store validates structure (non-empty, valid escaping, no empty segments). Semantic checks (does position 42 actually exist?) are the consumer's job.
- **No new dependencies**: Path parse/validate/build is ~20 lines of stdlib TypeScript. Constitution Article IX satisfied.
- **Stale paths retained, not pruned**: If data reloads and a position index no longer exists, the path stays in the selection and the UI marks it as unresolvable. The store doesn't subscribe to data changes.
