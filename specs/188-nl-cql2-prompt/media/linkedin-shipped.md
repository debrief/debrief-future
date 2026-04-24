An analyst types "UK submarines". 13 milliseconds later, 17 plots.

Shipped in Future Debrief: a library module that translates analyst phrases into CQL2-JSON filters. Hand it a phrase, the enum bundle, and an LLM client; it returns a filter the existing engine evaluates locally, a set of lozenge seeds in the exact shape the filter bar already renders, and any unrecognised terms the phrase contained. No UI in this slice — that's #189. No live LLM transport — that's #190. Just the translator, plus a CI harness of 12 analyst phrases that replays against hand-authored fixtures. Fully offline-reproducible; no network call in the test path.

Three design moves from the review made it worth shipping as a standalone library:

- Reusing the filter bar's chip shape instead of inventing a parallel summary type. When #189 wires the UI, no mapper layer is needed.
- Deriving the prompt's legal-fields block from the same constant the evaluator reads, with a compile-time exhaustiveness check. The prompt and the engine cannot drift apart silently.
- Five typed error reasons, including a walker that catches unrecognised terms leaking into the CQL2 tree as predicate values — the failure mode that would otherwise look like a correct empty result.

Prompt size 6 KB against a 20 KB budget. Runway for roughly 30 more vessel classes before we need to compact it.

Read the shipped post: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource #LLM
