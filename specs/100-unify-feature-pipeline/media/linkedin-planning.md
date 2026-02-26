# LinkedIn Planning Summary

---

Our data loading service splits features into three arrays -- tracks, locations, everything else. Then the map component immediately merges them back into one list for rendering.

We're removing that round trip. `stacService.loadPlotData()` will return a single `FeatureCollection`. Components classify features themselves using type guards that already exist in the schema. The service stops making rendering decisions.

The practical result: adding a new feature kind no longer requires changes to the service, the view providers, or the message protocol. Just the rendering layer. Three setter methods become one. Extension-local types that duplicate the schema get deleted. `visible` and `selected` flags -- which were always UI state, not data properties -- come off the data types entirely.

It's a refactoring, not a feature. But it's the kind of structural cleanup that makes every future feature cheaper to build.

[Read the full planning post ->](https://debrief.github.io/2026/02/24/planning-unifying-feature-pipeline)

#FutureDebrief #MaritimeAnalysis #OpenSource
