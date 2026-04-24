"Which exercises involved British submarines?" — a straightforward question that the current data model structurally cannot answer.

The problem: STAC item metadata stores nationalities and vessel classes as flat, disconnected lists. You can filter for British vessels or submarines, but not British submarines — because nothing links which nationality belongs to which vessel.

This week I'm restructuring the LinkML schema to replace those flat lists with a per-platform record array. Each platform carries its own nationality, vessel class, and domain as a unit, making compound queries a matter of standard predicate evaluation rather than impossible cross-referencing. Six optional override fields on track properties give analysts the final word when registry defaults need correcting.

It's a schema-only change — no runtime logic, no UI — but it's the structural foundation that save-time resolution, CQL2 filtering, and eventually natural language search all build against.

Planning post with full details: [link to full post]

#FutureDebrief #MaritimeAnalysis #OpenSource
