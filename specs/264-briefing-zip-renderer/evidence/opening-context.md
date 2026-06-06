<!--
Cached opener for the feature post. Written during /speckit.plan.
The ## Hook heading is stripped at ship time; the other three sections are
copied verbatim into media/shipped-post.md.
-->

## Hook

A briefing is only useful if the person who needs to watch it can actually open it. Until now, ours couldn't leave the tool.

| Before #264 | After #264 |
|---|---|
| Recipient needs Debrief (or VS Code + the extension) installed to view a Storyboard. | Recipient needs a browser. Double-click `index.html`. |
| Air-gapped machines are out of reach — no install path, no network for tiles. | Tiles and assets are pre-fetched into the zip. Works from `file://` with the network cable pulled. |
| "It looks slightly different on the recipient's side" is an ever-present risk because two codepaths render the playback. | One playback engine, two adapters. Authoring view and briefing view share the same per-frame math by construction. |
| One Storyboard per plot is the safe assumption — exporting "all of it" or nothing. | The export command sits on a specific Storyboard's overflow menu; the zip contains exactly that one. |

## What We're Building

A briefing leaves Debrief as a single `.zip` file. The recipient unzips it on any machine with a modern browser — a classified workstation, a stakeholder's laptop, a training-room PC with the network cable out — double-clicks `index.html`, and the Storyboard plays. Same Scene order, same viewport tweens, same time-slider scrub through every time-range Scene from #263, same per-frame track motion. No install, no extension host, no server, no network call. The zip carries its own basemap tiles, its own Scene thumbnails, its own GeoJSON, its own SPA.

Two viewing modes live behind a hover-revealed toggle. Minimal shows a transport bar (play, pause, next/previous Scene) and a scrubber, for an interactive walkthrough where the audience wants to stop on a moment. Present hides every control and lets the map fill the screen, for the room where the briefer is talking and the screen should just be the picture. Mode survives the toggle; playback position survives the toggle; nothing about the rendering changes between them — only what chrome is on top.

## How It Fits

The briefing renderer is the second consumer of the Storyboard playback engine that #217 and #258 built and #263 extended for time-range Scenes. That engine — `StoryboardPlaybackService` — gets hoisted out of `apps/vscode/` into `shared/components/` and composed in the new SPA at `apps/briefing-renderer/` (sibling to `apps/backlog-navigator/` and `apps/spec-navigator/`) against four browser-side port adapters: Map, SessionStore, PanelView, TimeRangeView. The VS Code extension still composes the same service against its own adapters. One engine, two callers — promotion to a shared package is no longer a speculative bet, it has its second user (the deferral noted in #263 resolves here). The export command lives in the VS Code extension as `debrief.storyboard.exportAsBriefingZip`, and the pre-built SPA bundle ships as a static resource inside the extension so every export is reproducible from the version of the tool that produced it.

## Key Decisions

- **Inline the data, don't `fetch()` it.** Browsers restrict `fetch()` from `file://` origins by design. The export injects `features.geojson` and `item.json` into `index.html` as `<script type="application/json">` blocks, and binary assets (Scene thumbnails, basemap tiles) load through ordinary relative `<img>` and Leaflet `TileLayer` paths — which `file://` allows. This is the pattern that lets the zip work on a totally cold machine.
- **Pre-fetch tiles per Scene at export time, including the interpolation path.** Each Scene's captured viewport and zoom give a tile set; for time-range Scenes we sample the viewport tween between `viewport_start` and `viewport_end` and union the coverage so mid-scrub pans never hit a missing tile. The bytes go in `tiles/{z}/{x}/{y}.png`. The zip is the basemap server.
- **One playback engine, hoisted not forked.** `StoryboardPlaybackService` becomes a `shared/components/` module the moment it has two callers. Forking it for the SPA would have been faster this week and a maintenance liability forever — every per-frame interpolation drift between authoring and briefing would be a bug-shaped wedge. By construction now, they cannot drift.
- **Boundary types derived, not re-listed.** `BriefingFeatureCollection = PlotFeatureCollection`; `BriefingItemJson = Pick<StacItem, …>` for the subset the SPA actually consumes. Constitution Article IV.5 is enforced with a compile-time exhaustiveness guard so a future field added to `StacItem` shows up as a build error here, not a silently-dropped payload in someone's classified briefing.
- **One new dependency: `jszip`.** Pure JS, MIT-licensed, no native binaries, used only at export time inside the VS Code extension. Considered shelling out to `zip(1)` and rejected on cross-platform grounds (Windows hosts).
- **Export per Storyboard, not per plot.** The command lives on the Storyboard's own overflow menu — there is no ambiguity about which one you exported, even when a plot accumulates several over an exercise's iteration. The scoping pass walks the chosen Storyboard's `SceneFeature` references and includes only the features they actually touch.
