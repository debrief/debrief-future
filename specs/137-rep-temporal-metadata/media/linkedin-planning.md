Load a 2022 naval exercise in 2026, and the timeline shows it as a 2026 event. That's what happens when STAC Items get timestamped at load time rather than from actual track data.

This week we're adding temporal metadata extraction to Future Debrief's REP loader. One new Python function scans all track features for their start/end times, computes the global extent, and writes it back to the STAC Item. The Timeline/Gantt view, duration filters, and temporal queries all read those fields -- they just need them to be correct.

Small change, but it connects three existing features (#131 Timeline, #126 CQL2 filters, #136 Collection summaries) that were waiting for accurate temporal data.

https://debrief.github.io/blog/2026/03/18/planning-rep-loader-temporal-metadata

#FutureDebrief #MaritimeAnalysis #STAC
