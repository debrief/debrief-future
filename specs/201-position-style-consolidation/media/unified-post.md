---
title: "Building drift closed from schema to VS Code tool parameter"
date: 2026-04-19
layout: future-post
author: Ian
track: momentum
excerpt: "A two-interface type fix grew into a seven-site refactor once we looked. The result: one schema-linked PointShape, one resolver, one exhaustive switch, and a silent-failure path closed."
---

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

The brief was small: two interfaces called `ResolvedPositionStyle` had
drifted. One listed three marker shapes, the other five. One called the
label field `label`, the other `labelText`. Make them one. A half-day job.

The `/speckit.review` pass made it a week. If the interface had drifted,
what about the enum it points at? The resolver that produces it? The
renderer switch that consumes it? The VS Code tool that takes a shape as a
parameter? We went and looked. The answer was drift in every direction.

So the work expanded along a single axis — marker shapes — from the LinkML
schema all the way to the MCP tool input schema. Every link in that chain
now points at one source of truth: `PointShapeEnum` in
`shared/schemas/src/linkml/common.yaml`. Change a value there, rerun
`pnpm --filter @debrief/schemas build`, and the type widens or narrows
everywhere that uses it, automatically.

The moving parts that landed together:

- **One interface.** `ResolvedPositionStyle` lives in `@debrief/utils`.
  `symbol: PointShape` (template-literal derivation of the schema enum),
  `labelText: string | null`. The components-side duplicate is gone; its
  file now re-exports.
- **One resolver.** `resolvePositionStyle` and `computeAllPositionStyles`
  are single-implementation in `@debrief/utils`. The components-side copy
  — which had subtly different null-override semantics — is gone. The
  winner: `null` means "no override, use the cascaded default", matching
  the LinkML attribute description.
- **One exhaustive switch.** Every renderer switch on `symbol` now has an
  `assertNever(shape)` default branch. Adding a 6th shape in LinkML
  breaks the build in every renderer file that needs updating, until it
  does.
- **A real runtime guard.** Before: a JSON payload with
  `symbol: "star"` silently drew a circle. After: it throws
  `InvalidPointShapeError` with the offending value and the valid set;
  the renderer catches, logs, and skips the symbol — without crashing
  the rest of the track.
- **Narrowed generator output.** A post-process step in
  `scripts/generate.py` rewrites `symbol: string,` to `symbol: PointShape,`
  on the two enum-ranged attributes after `gen-typescript` runs. No more
  "`string` in the type, enum in the comment" gap.
- **Pinned enum parity.** A new schema-adherence test keeps
  `PointShapeEnum` and `MarkerSymbolEnum` from silently drifting again —
  the ADR from feature #091 is honoured, the drift surface is closed.

## Numbers

| | Before | After |
|---|-------:|------:|
| `interface ResolvedPositionStyle` declarations | 2 | 1 |
| `resolvePositionStyle` / `computeAllPositionStyles` implementations | 2 each | 1 each |
| Hand-typed shape unions across the codebase | 3 | 0 |
| Renderer switches silently falling through on unknown shapes | 2 | 0 |
| Enum-parity adherence tests | 0 | 1 |
| Compile-time shape-drift warnings after a LinkML enum edit | 0 | depends on which renderer doesn't handle the new case |

## Lessons Learned

**The `/speckit.review` pass is where the scope expansion happens.** A
spec that only said "consolidate two interfaces" would have shipped the
half-day fix and left the underlying drift alive. The review asked
`why have the interfaces drifted at all?` and the answer forced six
sibling sites into the same refactor.

**R-011 was the one real risk.** `gen-typescript` emits `string` for
enum-ranged LinkML attributes, which is why the hand-typed unions exist
in the first place. We time-boxed a prototype for the
post-process mechanism — the existing `generate.py` already runs seven
post-process steps on the `gen-typescript` output for GeoJSON
coordinates, so the eighth was additive. Tractable.

**Never silently default on schema mismatch.** The old resolver's
`symbol as 'circle' | 'square' | 'triangle'` cast let unknown values
fall through to a default circle. That's an Article I.3 silent-failure
violation that pre-dated this feature; catching it here, via a typed
error and a try/catch in the renderer, was the shortest path to closing
it. Users with broken data now learn their data is broken.

## What's Next

Backlog #206 tracks the broader audit for other hand-typed unions along
other axes (named colours, line caps, line joins, label locations, etc).
The mechanism proven here — schema-derived template-literal type +
generator post-process + assertNever defaults + enum-parity test — can
carry over, one axis at a time.
