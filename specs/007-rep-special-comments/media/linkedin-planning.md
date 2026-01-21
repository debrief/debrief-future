REP files contain more than track data — they hold the operational story.

This week we're extending the Debrief parser to extract annotations that analysts have been creating for decades: narrative entries recording operator decisions, circles marking search areas, rectangles defining operational boundaries, and time-varying shapes that move during replay.

The parser will fail-fast on invalid data (because silent failures help no one), map the classic A-Q color codes to CSS values, and produce GeoJSON features ready for immediate display.

Curious about our approach? We'd especially value feedback on error handling philosophy and which annotation types matter most for real analysis.

https://debrief.github.io/future/planning-rep-special-comments

#FutureDebrief #MaritimeAnalysis #OpenSource
