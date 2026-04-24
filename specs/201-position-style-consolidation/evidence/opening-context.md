## What We're Building

The job started narrow. Two TypeScript interfaces both called `ResolvedPositionStyle` had drifted apart — one listed three marker shapes, the other five, and they disagreed on whether the resolved label field was `label` or `labelText`. A quick consolidation, one interface anchored to the schema-generated `PointShapeEnum`, done.

Then a `/speckit.review` pass pushed back. If two hand-typed unions had drifted, where else had the same thing happened? The answer, once we looked, was: in six more places along the same axis. So the scope expanded — not to chase every hand-typed union in the codebase, but to close the drift surface for this one axis, marker shapes, from the LinkML schema all the way down to the VS Code tool parameter.

The expanded set of changes:

- One `resolvePositionStyle` / `computeAllPositionStyles` pair, not two. The components-side semantics wins — `null` means "use the default or interval value", matching the LinkML description.
- A typed `InvalidPointShapeError` thrown at the resolver boundary when a JSON payload contains an unknown symbol. Previously, a mis-typed import drew a circle and nobody noticed.
- `assertNever` default branches on every `switch (symbol)` in the map renderer, so adding a shape to the schema breaks the build until every renderer handles it.
- `PositionStyle.symbol` and `PositionStyleOverride.symbol` narrowed from `string` to `PointShape` in the generated TypeScript, via a post-process step in the schemas build.
- `SymbolShape` in the position symbols layer and `VALID_SYMBOLS` in the VS Code apply-style helper both deleted, replaced by the schema-derived type and `Object.values(PointShapeEnum)`.
- A schema adherence test pinning `PointShapeEnum` and `MarkerSymbolEnum` to the same value-set. Feature #091 deliberately kept both for semantic separation (styling context versus tool-parameter context); we respect that ADR and close the drift surface with a test instead of a merge.

## How It Fits

Future Debrief is built schema-first. LinkML is the source of truth, and we generate Pydantic, JSON Schema, and TypeScript from it. That discipline works well at the service boundary and less consistently at the rendering edge, where it is tempting to drop a quick five-shape union next to the component that needs it. Each of those quick unions is a drift site.

Three Constitution articles sit behind the expanded scope. Article I.3 — no silent failure — drives the `InvalidPointShapeError`. Article II — schema integrity — drives the generated-type narrowing and the enum-parity test. Article XV — strict types — drives the exhaustive-switch enforcement. None of these are stretches; each bullet above maps to a specific article that the current state violates.

## Key Decisions

- **Fix root causes, not just the symptom.** The original spec would have unified the drifted types and left the resolvers, the silent failure, the non-exhaustive switches, and the sibling hand-typed unions in place. We chose the wider fix because the review agent was right: leaving those in place guarantees we do this work again in six months.
- **Respect the #091 ADR on `PointShapeEnum` vs `MarkerSymbolEnum`.** Semantic separation was a deliberate choice for a good reason. We close the drift risk with an adherence test, not by merging the enums.
- **Narrow generator output via post-process, not upstream.** Patching gen-typescript upstream is a year-long conversation. A local post-process step keeps the change in our tree and gives us the narrow types today. This is the highest-risk item in the plan (R-011 in research.md) — if we cannot find a tractable post-process hook, we will renegotiate the scope before implementation rather than force it.
- **Scope re-rated Medium, not Low.** The backlog item was rated Low. The honest rating is now Medium: roughly 13 production files, 3 schema/generated files, around 4 new tests, 200–300 lines touched. The review pass found what it found.
