We had two provenance systems writing to different properties in the same GeoJSON features. One wrote `properties.provenance`, the other wrote `properties.prov`. Both were flat, both incomplete, and nothing reconciled them.

I've just finished a 600-line transition plan that maps every interface change needed to unify them into a W3C PROV-inspired logging system. The plan covers 7 implementation phases across 27 files, from LinkML schema models to a new TypeScript Log Service that wraps tool outputs in structured activity records.

The dependency graph shows no circular dependencies. Phase 0 (schema foundation) can start immediately. Phase 6 (replay and parameter tuning) requires Phases 1 and 4 as prerequisites, but each phase produces a standalone, testable increment.

One finding: the undo/redo split is cleaner than expected. Only 2 of 12 fields in the StateSnapshot need to move — the rest are already UI-only.

[Read the full post](https://debrief.github.io/blog/shipped-prov-logging-transition-plan)

#FutureDebrief #MaritimeAnalysis #OpenSource
