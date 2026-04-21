The headless foundation for Storyboarding is in. Storyboards and Scenes now round-trip as plain GeoJSON Features inside the plot, with a schema-first data model and a UI-free CRUD module behind it.

Three design calls shaped the slice. The discriminator lives on the existing `FeatureKindEnum` (new values: `STORYBOARD`, `STORYBOARD_SCENE`) rather than a parallel `debrief:type` key. Audit history uses the inherited `provenance: LogEntry[]` slot with a new optional `agent` field — one surface, not two. And every mutation op is async, because `feature_set_hash` goes through Web Crypto's `subtle.digest`; pure queries stay sync.

All three Article II adherence gates landed in-slice: Pydantic round-trip, Pydantic-vs-LinkML schema equality, and a Py→JSON→TS→JSON→Py cross-language harness driven by pytest spawning a Node subprocess. 81 storyboard tests, 1771 Python tests, 1681 TypeScript tests across the monorepo.

Perf was the honest bit. `updateScene` hits p95 ~5.4 ms at 100k positions. `createScene` and `copySceneToOtherStoryboard` are marginal at ~15–20 ms — bypassing immer on additive hot paths got us 4×; the remaining cost is O(n) `findIndex`, and an indexed view is deferred.

#216 capture, #217 panel + playback, and #218 edit suite are all unblocked.

[LINK]

#FutureDebrief #MaritimeAnalysis #OpenSource
