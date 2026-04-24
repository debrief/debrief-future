Filtering for "British submarines" across a catalog of maritime exercises sounds straightforward -- until the engine finds a plot with HMS Montrose (British, surface) alongside U-32 (German, subsurface) and calls it a match. Nationality matched one platform, domain matched another, and nobody checked whether the same vessel satisfied both conditions.

This is a classic cross-join false positive, and it shows up the moment you filter on more than one attribute of an array element. We are extending the CQL2 filter engine in Future Debrief with an `array_filter` evaluator that tests compound predicates per-element. A match only counts when a single platform satisfies all the conditions.

This is a building block for the NL-assisted discovery pipeline -- where an LLM generates CQL2 filter expressions from analyst queries rather than stuffing the whole catalog into the prompt context. Pure TypeScript, no new dependencies, additive extension to the existing engine. Existing filters keep working unchanged.

https://debrief.github.io/YYYY/MM/DD/planning-cql2-array-filter-evaluator

#FutureDebrief #CQL2 #MaritimeAnalysis
