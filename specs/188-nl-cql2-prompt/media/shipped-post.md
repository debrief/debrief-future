---
layout: future-post
title: "Shipped: NL to CQL2 prompt design and generation"
date: 2026-04-15
track: [credibility]
author: Ian
reading_time: 5
tags: [shipped, tracer-bullet, nl-cql2, filter-engine, llm, stac]
excerpt: "Eleven analyst phrases round-trip from English to CQL2 and back through the local filter engine. No network calls, no catalog in the prompt."
---

## What We Built

Item #188 ships the generator and regression harness that turn an analyst phrase — "UK frigates", "Type 23 frigates", "Saxon Warrior exercise" — into a CQL2 filter expression the existing filter engine evaluates locally. A new `nl-cql2/` module inside `shared/components` composes a fixed-size prompt (CQL2 schema block + the enum bundle from #187 + two worked `array_filter` examples), hands it to an injectable `LLMClient`, validates the JSON response at a typed boundary, and returns a `GenerationResult` carrying the CQL2, a list of `LozengeSeed` chips, and any unrecognised terms.

The library is deliberately small. One public entry point (`generateCql2`), one recorded-response client for CI (`createRecordedLLMClient`), one passthrough client for authoring (`createPassthroughLLMClient`), one enum loader. The headless regression harness lives under `__tests__/` so it never ships to library consumers — #190's demo UI and the VS Code extension import only the production surface.

```typescript
const result = await generateCql2("UK frigates", { enums, client });
const matched = filterByCql2Json(catalog, result.cql2);
// matched.length === 21 on the current sample catalog
```

Transport is deliberately out of scope. The library ships with hand-crafted schema-valid fixtures; item #189 will replace them one phrase at a time via `scripts/record-nl-fixtures.ts`, which is written and ready but not yet run. That script, plus `createPassthroughLLMClient`, is the entire coupling surface between the two items — #189 hands in a function, nothing more.

## Screenshots

No UI in this item. The executable artefact is the harness report:

```
NL → CQL2 Harness Report
=========================
corpus size     : 11
passed          : 11
failed          : 0
elapsedMs       : 13
promptSizeBytes : 5111 (ceiling 20480)

PASS
----
  uk-frigates                  matchCount=21
    phrase : UK frigates
    cql2   : {"op":"array_filter","args":[{"property":"debrief:platforms"},
             {"op":"and","args":[{"op":"=","args":[{"property":"nationality"},"GB"]},
             {"op":"=","args":[{"property":"vessel_role"},"frigate"]}]}]}
  type-23-frigates             matchCount=23
    phrase : Type 23 frigates
    cql2   : {"op":"array_filter","args":[{"property":"debrief:platforms"},
             {"op":"=","args":[{"property":"vessel_type"},"type23"]}]}
  klingon-warbirds             matchCount=73
    phrase : Klingon warbirds
    cql2   : {}
  ...
```

Full output: `specs/188-nl-cql2-prompt/evidence/harness-report.txt`.

Three of the eleven phrases test unrecognised-term handling. "Klingon warbirds" and "Ruritanian navy" both produce an empty CQL2 (`{}`) — the filter returns every item, and the unrecognised terms surface in the result for the UI to show. "UK warbirds" keeps the recognised half ("GB") and drops "warbirds" from the predicate. No zero-hit dead ends with no explanation.

## By the Numbers

| | |
|---|---|
| Corpus phrases passing | 11 / 11 |
| Tests passing | 197 (152 filter-engine + 45 nl-cql2) |
| Prompt size (current) | 5 111 B |
| Prompt size (5× registry, projected) | 7 452 B |
| SC-004 ceiling | 20 480 B |
| Harness wall time | 13 ms |
| New runtime dependencies | 0 |

The 5× extrapolation matters because #180 (the platform registry) will fill in during ongoing samples work. The prompt grows with the enum set, not with catalog size — varying catalog size leaves prompt size byte-identical, asserted by `promptSize.test.ts`.

## Lessons Learned

**Fold in the reverse parser rather than ship a shortcut.** The plan originally had a narrow `filterByCql2Json` helper — just enough to evaluate what the generator produced. `/speckit.review` pointed out that the filter engine already had a forward path (`filterExpressionToCql2Json`) but no reverse, and a full `cql2JsonToFilterExpression` parser was almost the same cost. We built it. The bonus: `Cql2ParseError` now fires on unsupported operators or bad arg arity, round-tripping is verified across every `FilterType`, and #190 gets a first-class way to populate filter-bar state from CQL2 produced anywhere — not just from the generator. One exported symbol (`PROPERTY_MAP`) became the single source of truth for property paths across evaluator, reverse parser, and prompt builder. That cascaded into a compile-time exhaustiveness test ensuring every `FilterType` has a mapping — a silent-failure class eliminated at build time.

**Reuse the chip shape you already have.** An early draft had the LLM emit a parallel `ChipSummary { label, field, values }` type. The review surfaced that `FilterBar/types.ts` already owns the chip model — `LozengeItem`. The generator now emits `LozengeSeed = Pick<LozengeItem, 'filterType'|'value'|'negated'>` — ID-free, deterministic, directly consumable by the existing `ADD_LOZENGE` reducer. No mapper layer, no second source of truth for chip semantics, no divergence risk when the FilterBar type grows a field. Small decision, large payoff.

**Single `PROPERTY_MAP`, derived everywhere.** The prompt's "legal fields" block is built from the same constant the evaluator and the new reverse parser use. A hand-maintained mirror would have drifted silently — the LLM would have been told one set of property paths, the evaluator would check against another, and the user would see zero-hit queries with no visible cause. Deriving from the single map means a property-path change is a TypeScript change, not a prompt edit. The tradeoff (contributors cannot tweak the schema block in isolation) is the right one for an Article I "no silent failures" surface.

**Interim fixtures are not a gap, they are a seam.** Shipping with hand-crafted schema-valid responses instead of real model recordings was deliberate. The harness proves the library works end-to-end; #189 proves a specific model works against the prompt. Mixing those concerns would have blocked 188 behind a transport decision (which model? what auth? what proxy?) that has no bearing on whether the generator and harness are correct. `scripts/record-nl-fixtures.ts` is written, tested, and waiting.

## What's Next

- **#189 — LLM transport.** Wires a real model behind `createPassthroughLLMClient` and re-records `responses.json`. The prompt and library do not change; the fixtures do. If any phrase regresses, the harness will say so and the FAIL output will show the exact CQL2 the model produced.
- **#190 — Demo UI.** Puts an input box in front of the generator. Chips land in the filter bar via the existing `ADD_LOZENGE` reducer; unrecognised terms show as a subtle banner. The whole thing is now just plumbing — the hard parts are done.

Credit to the prototype's golden phrase set — without it we would have been guessing at baselines instead of regressing against them.

→ [Spec](https://github.com/debrief/debrief-future/blob/188-nl-cql2-prompt/specs/188-nl-cql2-prompt/spec.md)
→ [Plan](https://github.com/debrief/debrief-future/blob/188-nl-cql2-prompt/specs/188-nl-cql2-prompt/plan.md)
→ [Harness report](https://github.com/debrief/debrief-future/blob/188-nl-cql2-prompt/specs/188-nl-cql2-prompt/evidence/harness-report.txt)
