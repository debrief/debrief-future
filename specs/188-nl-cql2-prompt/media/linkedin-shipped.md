"UK frigates." "Type 23 frigates." "Saxon Warrior exercise." Eleven analyst phrases now round-trip from English through a language model into CQL2 filter expressions, and back through the local filter engine to produce the right match counts — 21, 23, 73 — against Future Debrief's sample STAC catalog.

Shipped: item #188. A new `nl-cql2/` module composes a fixed-size prompt from the CQL2 schema and the enum bundle (#187), hands it to an injectable LLM client, validates the JSON response at a typed boundary, and returns a CQL2 filter plus filter-bar chips plus any unrecognised terms. The prompt is 5 111 bytes today, projects to 7 452 at 5× registry growth, sits under a 20 KB ceiling. No catalog data in the prompt, ever.

Two opportunistic wins folded in from design review: a full CQL2-JSON reverse parser in the filter engine (useful well beyond this item), and chip output reusing the FilterBar's existing `LozengeItem` shape instead of inventing a parallel type. One source of truth across evaluator, reverse parser, and prompt builder — silent drift eliminated at compile time.

Transport is deliberately next. The library ships with recorded fixtures; #189 wires a real model. 197 tests passing, zero new runtime dependencies.

Read the shipped post: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource #LLM
