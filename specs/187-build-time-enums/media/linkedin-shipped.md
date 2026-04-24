The LLM no longer needs to see the catalog to filter it.

Shipped: a build-time extractor that walks Future Debrief's platform registry and sample STAC catalog, and emits a single 2.7 KB JSON file — vessel-class taxonomy, nationality codes, exercise names, plot tags, feature tags. Every word an analyst might mention; none of the operational data itself.

With the bundle in place, the natural-language search work in Epic E10 can finally start writing its prompt. The LLM templates the vocabulary into its system prompt, writes a CQL2 filter, and the existing client-side engine evaluates it locally. The catalog never crosses the network.

Three commitments from the design review made the artefact useful rather than just present:

- Determinism. Two runs on identical inputs produce a byte-identical file, so the committed bundle is a clean review surface.
- Conservative extraction. A tag that appears once still surfaces; titles without the exercise-name separator contribute nothing. The LLM sees exactly what the data contains.
- Canonicalisation that humans can audit. Trim + case-fold collapses `"Training "` into `"training"`, but preserves the first-seen casing so `ASW`, `AAW`, and `MCM` stay upper-cased where reviewers expect them.

Next up: the prompt design in #188, with a headless test harness of analyst phrases that should round-trip from English to CQL2 and back.

Read the shipped post: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource #LLM
