---
platform: linkedin
type: shipped
feature: 185-cql2-array-filter
---

The cross-join false positive problem is fixed. Searching for "British submarines" no longer matches an exercise where HMS Montrose and U-32 happened to be in the same plot.

The `array_filter` evaluator is now part of the Future Debrief CQL2 filter engine. It evaluates compound predicates per element -- a match only counts when a single platform satisfies all the conditions. GB + subsurface = one vessel that is both. Not one vessel that is British and a different vessel that is a submarine.

32 new tests, zero regressions across 1,273 existing tests. Pure TypeScript, no new dependencies. The extension is additive -- existing filter expressions keep working unchanged.

Three things shipped beyond the core evaluator:

- Taxonomy expansion inside compound predicates -- "British frigates" expands correctly through the vessel_class hierarchy to match Type 23, Type 26, and other descendants
- Negation -- exclude items where any platform meets the compound condition
- CQL2 JSON round-trip -- serialize, deserialize, and evaluate produce identical results, which matters for the NL-to-CQL2 pipeline (#188) that generates these expressions from analyst queries

The filter bar UI (#186) and the natural language pipeline (#188) both depend on this. Both are next.

https://debrief.github.io/2026/04/13/shipped-cql2-array-filter-evaluator

#FutureDebrief #CQL2 #MaritimeAnalysis
