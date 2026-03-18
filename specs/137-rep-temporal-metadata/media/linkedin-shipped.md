REP files now carry accurate temporal metadata. When a REP file loads, the system extracts the true time span of track data — earliest position to latest position — and writes it to the STAC Item as `start_datetime` and `end_datetime`.

Why it matters: downstream features depend on this. Timeline/Gantt view can render correct exercise duration. Temporal filters find the right exercises. CQL2 queries that ask "show me exercises between these dates" actually get the right answer.

The implementation aggregates per-track timestamps during load. No new dependencies. Simple, single responsibility. 9 tests passing across multi-track, single-track, edge cases like zero-duration tracks and non-track features.

Exposed via MCP so frontends delegate temporal logic to the backend service where it belongs. One source of truth about when an exercise happened, and it's now right.

#FutureDebrief #MaritimeAnalysis #Backend
