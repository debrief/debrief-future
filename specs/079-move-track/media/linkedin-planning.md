Specifying a tool that slides a vessel track across the sea by compass bearing and distance -- step two of a five-tool reactive cascade for buffer zone analysis.

The interesting design constraint: the tool itself is stateless. It just translates coordinates using great-circle math. The reactive behaviour -- where editing the move parameters causes downstream buffer zones, point classifications, and histograms to update automatically -- comes entirely from the provenance system that orchestrates it. Keeping that separation clean is the architectural point the whole demo is designed to illustrate.

Nautical miles for the distance unit (not km), Vincenty formula for accuracy, and both Python and TypeScript implementations building against a single language-neutral spec.

https://debrief.github.io/blog/planning-move-track-tool

#FutureDebrief #MaritimeAnalysis #OpenSource
