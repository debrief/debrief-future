---
layout: future-post
title: "Planning: NL to CQL2 prompt design and generation"
date: 2026-04-14
track: [momentum]
author: Ian
reading_time: 5
tags: [tracer-bullet, nl-cql2, filter-engine, llm, stac]
excerpt: "Turning phrases like 'UK submarines in the 1990s' into CQL2 filters the existing engine can evaluate locally."
---

## What We're Building

An analyst types "UK submarines in the 1990s" or "German frigates on Exercise Dragonfire". We hand that phrase to a language model along with a fixed-size prompt — the CQL2 schema, the extracted enum bundle, a couple of worked `array_filter` examples — and get back a CQL2 filter expression plus a chip summary describing what was filtered on. The client then evaluates that CQL2 locally against the STAC catalog using the existing filter engine (items #126 and #185).

The item covers the prompt, the generator module, and a headless regression harness. It does not cover LLM transport or authentication (that is #189) or the stakeholder-facing demo UI (#190). This is the first of three Phase 3 items in epic E10 — NL-Assisted Catalog Discovery. Phase 0 (platform registry, LinkML overrides) and Phase 1 (import pipeline, save-time registry resolution, sample catalog regeneration) are done. Phase 2 (`array_filter` evaluator, filter-bar platform chips) is in flight.

## How It Fits

The generator lives as a new `nl-cql2/` module inside `shared/components`, as a sibling of `filter-engine/`. Co-locating them means the regression harness can import `createFilterEngine` directly and evaluate generated CQL2 against the real sample catalog on disk — no cross-package plumbing, no reimplementation of the evaluator.

The module is stateless and browser-compatible. #190's demo UI will consume it directly; #189's transport will supply the LLM call via a one-method `LLMClient` interface.

## Key Decisions

**Fixed-size prompt, no catalog in the prompt.** The LLM receives a CQL2 schema description and the extracted enum bundle (nationalities, vessel class taxonomy, exercises, tags, feature_tags) from item #187 — never catalog items. Client applies the generated CQL2 locally. FR-003 is explicit: "The prompt MUST NOT contain any catalog item data. Its size MUST be bounded by the schema + enums only, so that growing the catalog does not grow the prompt." The prototype embedded the catalog; at any serious scale that stops working. SC-004 ceilings the prompt at 20 KB for the current enum set, and a test varies catalog size and asserts prompt size is unchanged.

**CQL2-JSON output, not CQL2 text.** The LLM returns one JSON object: `{ cql2, chips, unrecognised_terms }`. CQL2-JSON is already what the filter engine consumes via `cql2JsonToArrayFilters`, so we skip a parse step and catch hallucinated fields at the validation boundary rather than later during evaluation. Two round-trips (first CQL2, then chips) were rejected — doubles latency and risks the two responses disagreeing.

**Injectable `LLMClient` interface.** One method: `generate(prompt: string): Promise<string>`. Ships with `RecordedLLMClient` (replays fixtures, used in CI) and `PassthroughLLMClient` (forwards to a caller-supplied function). Recorded fixtures mean CI is fully offline — Article I compliance — and deterministic. Authoring time uses whatever real model the author has access to; the prompt is model-agnostic. Transport and auth live in #189; this item never sees credentials.

**Schema description is derived, not hand-written.** `schemaDescription.ts` imports `FilterEngineConfig` and related types from `filter-engine/types.ts` and emits the prompt's "legal fields" block from them. Prompt changes that touch the schema block require a TypeScript change — the tradeoff for drift resistance. A test asserts every field in the emitted description is real in the filter engine.

**Corpus-driven regression harness.** Nine validated phrases from the prototype's golden set are the acceptance gate: UK submarines = 18 hits, Type 23 frigates = 25 hits, German frigates = 1 hit, and six more covering nationality-only, domain-only, vessel-role, exercise-only, compound nationality+vessel-type, compound exercise+platform, and one phrase with an unrecognised term. Per FR-012, comparison is by evaluated catalog outcome (match count, optionally plot ID set), not CQL2 string equality — semantically-equivalent permutations pass.

**Unrecognised terms surface, they do not silently vanish.** When the phrase contains "Klingon warbirds", the generator lists those terms in `unrecognised_terms` and drops them from the CQL2, rather than emitting `nationality = 'XX'` that evaluates to zero hits with no user-visible reason. Empty or whitespace-only phrases short-circuit without calling the LLM at all.

**Worked examples not drawn from the corpus.** Few-shot examples inside the prompt demonstrate one single-dimension filter and one compound `array_filter`, but they use phrases that are not in the test corpus. Otherwise corpus passes would be memorisation, not generalisation.

## What We'd Love Feedback On

- **The phrase corpus.** We have 9 validated phrases from the prototype. What would analysts actually type that we are missing? Compound queries mixing exercise + vessel type + date range feel like the most interesting gap — if you have examples from real work, we will add them.
- **Chip summary design.** One chip per human-intelligible dimension — so "UK submarines" produces one compound chip (`label: "UK submarine"`, `values: ["GB", "subsurface"]`), not a separate nationality chip and a separate domain chip. Does that match how analysts want to read and remove filters, or do they want each sub-predicate addressable on its own?
- **Unrecognised-term handling.** Surfacing unknowns and dropping them from the CQL2 is our current default. The alternative is to prompt the user to clarify before producing any filter. Which is less frustrating when the phrase is half-recognised?
- **Schema description source.** Deriving the prompt's schema block from filter-engine types is the right call for drift resistance, but it means prompt changes require a TypeScript change. Acceptable tradeoff, or should we expose a higher-level knob?

Credit to the prototype that produced the 9-phrase golden set — without that we would be guessing at the baseline instead of regressing against it.

→ [Spec](https://github.com/debrief/debrief-future/blob/188-nl-cql2-prompt/specs/188-nl-cql2-prompt/spec.md)
→ [Plan](https://github.com/debrief/debrief-future/blob/188-nl-cql2-prompt/specs/188-nl-cql2-prompt/plan.md)
→ [Research](https://github.com/debrief/debrief-future/blob/188-nl-cql2-prompt/specs/188-nl-cql2-prompt/research.md)
