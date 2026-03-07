Four views, one filter state. Feature #132 for Future Debrief shipped this week.

An analyst sets a metadata filter in the filter bar, zooms the map to the North Atlantic, narrows the timeline to Q3 exercises -- and the list, map, and timeline all update to show only exercises matching all three criteria. No manual synchronisation between views. No stale selections.

The technical core is a Zustand store with three filter axes (metadata, spatial, temporal) that compose via AND logic in a single composition hook. Each view subscribes to the same derived state. We consolidated four different exercise types that had accumulated across packages into one canonical StacBrowserItem -- that cleanup alone removed a category of bugs where views disagreed about what an exercise looked like.

The constraint from planning held up well: exercises with incomplete metadata still appear in views where they are relevant. An exercise without coordinates is not excluded by a spatial filter. It just does not participate in that axis.

35 hook tests, 14 store tests, and 913 component tests all passing. Part of Epic E08: STAC Stack Browser Discovery UI.

Full shipped post with screenshots and technical details: [link]

#FutureDebrief #MaritimeAnalysis #OpenSource
