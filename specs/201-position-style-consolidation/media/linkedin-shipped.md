A two-interface type fix grew into a week's refactor once we looked.

Two `ResolvedPositionStyle` interfaces had drifted: one listed three marker shapes, the other five; one called the label field `label`, the other `labelText`. Consolidating them should have been a half-day job.

A `/speckit.review` pass pushed back. If the interface had drifted, what about the enum it points at? The resolver that produces it? The renderer switch that consumes it? The VS Code tool that takes a shape as a parameter? Every link in the chain had drifted in its own direction.

So we closed the drift along a single axis — marker shapes — from the LinkML schema all the way to the MCP tool input. One `PointShape` type derived from the generator output. One resolver, not two. `assertNever` defaults in every renderer switch so adding a new shape breaks the build in every file that needs updating. A runtime guard that throws `InvalidPointShapeError` instead of silently drawing a circle on unknown input — an Article I.3 silent-failure path the pre-existing code was carrying.

Before / after on the structural metrics: 2 interfaces → 1, 3 hand-typed unions → 0, 2 silent-fallback renderers → 0, 0 parity tests → 1.

The mechanism scales to the broader hand-typed-union audit we'll keep doing one axis at a time. Full write-up: [LINK].

#FutureDebrief #TechDebt #TypeScript #SchemaFirst
