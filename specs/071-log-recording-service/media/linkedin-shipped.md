Every tool execution in Debrief now leaves a provenance trail — which features were inputs, what parameters were used, how long it took — written directly into the GeoJSON files alongside the data it describes.

We shipped the Log Recording Service this week: a pure TypeScript module that creates PROV-aligned entries for every successful analysis operation. The interesting design decision was splitting responsibility between languages. Python writes provenance onto output features it creates. TypeScript writes provenance onto input features and assembles the global timeline at read time by scanning all features and deduplicating on activity ID. No separate timeline store, no sync problems.

43 new tests, 335 total, zero regressions. Dependency injection throughout, no new external dependencies. The analyst's workflow is completely unchanged — provenance recording happens transparently behind every tool execution.

This is the foundation for undo/redo and an interactive timeline panel in later phases.

[Read the full post](https://debrief.github.io/future/shipped-log-recording-service/)

#FutureDebrief #MaritimeAnalysis #Provenance
