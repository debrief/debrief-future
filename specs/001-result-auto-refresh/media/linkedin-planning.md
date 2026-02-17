Re-running an analysis tool shouldn't mean hunting for the right chart and re-opening it. In Future Debrief, we're planning auto-refresh for result views -- when an analyst re-runs a tool with different parameters, any open chart showing those results updates in place, preserving zoom and pan state.

The interesting bit: we don't need any new infrastructure for this. The Result ID Registry already emits events when a logical result changes. Result views just need to subscribe and re-render. The hardest part is deciding what "same result" means when tool parameters change -- and that's what we're working through now.

This is part of the Results Visualization epic, and it's one of those features where getting the design right matters more than the implementation.

Full planning post: [LINK]

#FutureDebrief #MaritimeAnalysis #OpenSource
