---
layout: future-post
title: "Building Storyboard Live Preview"
date: 2026-05-27
track: [credibility]
author: Ian
reading_time: 4
tags: [tracer-bullet, storyboarding, briefing-renderer]
excerpt: "A one-click Preview button that opens the finished-briefing player in a new tab — live, on both the desktop and browser surfaces, with the offline zip path untouched."
---

| Before — checking your briefing | After — checking your briefing |
|---|---|
| Click "Export as briefing zip" (VS Code only) | Click "Preview" (VS Code *and* the browser) |
| Save the zip somewhere | — |
| Unzip it | — |
| Double-click the player file | — |
| Watch it play back | Watch it play back, in a new tab |

## What We're Building

If you are building a briefing, the question you keep asking is a simple one: *does it actually look right when it plays?* Do the scenes transition the way you intended, does each one frame the right slice of the map, does the time-range animation run at the pace you had in mind, is the basemap the one you chose? Until now the only way to answer that with full fidelity was to export a distribution zip, save it, unzip it, and double-click a file — and even that round-trip was only available inside VS Code. Checking your work cost more clicks than making the change you wanted to check.

This adds a Preview button to the storyboard panel header, in both the VS Code extension and the browser (web-shell) app. One click opens the real briefing-renderer player in a new tab, loading your *current* storyboard live — no export, no zip, no file to manage. The same click-to-watch loop now exists everywhere you author. And as a companion, the "Export as briefing zip" capability — previously VS Code-only — comes to the browser for the first time, so the artefact you hand to someone else can be produced from either host.

## How It Fits

The briefing renderer is the same player that already ships inside exported zips (from #264), driving the playback engine built across #217, #258, and #263. What changed is *how the renderer gets its data*. It gained a second, additive boot path: alongside the existing air-gapped mode — where the storyboard JSON is inlined into the renderer's HTML at export time so a zip plays back fully offline — it can now boot from a live `?features=<url>` parameter, fetching and validating through exactly the same validators and seeding exactly the same store. The two hosts supply that URL differently (VS Code stands up an ephemeral loopback server; web-shell hands over a same-origin blob URL, building on the IndexedDB persistence from #236), but the renderer itself stays host-agnostic. This is entirely a frontend/TypeScript change — no schema touched.

## Key Decisions

- **Extend the renderer's boot path; never disturb the offline guarantee.** The inline air-gapped path that makes an exported zip play back with no network is left exactly as it was, and its tests must keep passing. The live path is purely additive — it activates only when the URL carries `?features=`. Same validators, same playback store, two ways in.

- **Let each host produce the features URL its own way.** VS Code stands up an ephemeral loopback HTTP server — a new pattern for the extension — serving the bundled renderer plus a live `/features.geojson`, opened via `asExternalUri` + `openExternal` so it still works fully offline. Web-shell needs no server at all: it uses a same-origin blob object URL, because the web-shell app and the renderer are sibling paths on the same origin in dev and on GitHub Pages alike. The renderer doesn't care which it got.

- **Export parity was cheap because the packing core was already pure.** The zip-packing logic was written as pure functions behind an injected host-dependency interface, so bringing export to web-shell meant writing one browser adapter — read through the stac-writer abstraction, deliver as a download — rather than reimplementing the packer. The pure core moves into a shared `@debrief/briefing-export` package. JSZip is already in the repo, so no new external dependency and no LinkML schema change.

## Screenshots

It starts in the authoring surface. Here is the *Saxon Warrior — Twin CPA* exercise open in the browser (web-shell): two vessel tracks (HMS Richmond and Contact Alpha) crossing at a closest-point-of-approach, four scenes captured, and the **Preview** control sitting beside Capture in the storyboard panel header — active because the storyboard has scenes.

![Web-shell authoring surface: the Saxon Warrior storyboard with four captured scenes and the Preview button in the panel header](images/preview-trigger-webshell.png)
*The trigger: a storyboard with four captured scenes, Preview live in the panel header. Every screenshot below was produced by a Playwright run that clicked this exact button.*

One click opens the finished-briefing player in a new tab and plays the storyboard back — the same renderer that ships inside an exported zip, here driven live from a `?features=` blob URL. The player flies the viewport to each captured scene in turn over a live OpenStreetMap basemap. Below is the briefing playing scene by scene, progressively closing on the two vessels' converging tracks.

![Scene 1 — opening overview: both vessel tracks in frame, the two paths crossing](images/preview-scene-1-overview.png)
*Scene 1 — the opening overview frames both tracks; the transport reads 1 / 4.*

![Scene 2 — the viewport flies in toward the approach](images/preview-scene-2-approach.png)
*Scene 2 — Preview flies the viewport in to the next captured framing.*

![Scene 3 — closer on the closest-point-of-approach where the tracks meet](images/preview-scene-3-convergence.png)
*Scene 3 — tighter still on the CPA, where the two tracks converge.*

![Scene 4 — the closing geometry near the end of the timeline, Replay now offered](images/preview-scene-4-closing.png)
*Scene 4 — the closing geometry; at the final scene the transport offers Replay.*

![Present mode — all chrome hidden, the map fills the screen](images/preview-present-mode.png)
*Press P for Present mode — chrome hides and the map fills the screen, exactly as the distributed briefing plays.*

And when there is nothing to preview yet, the button stays out of the way:

![Preview button disabled with tooltip when storyboard has no scenes](images/preview-disabled-no-scenes.png)
*With no scenes captured, the button is disabled and a tooltip explains why.*

### The same loop on the desktop (VS Code)

Everything above is the browser surface. The desktop extension tells the identical story — capture, then Preview — inside real VS Code. The *Exercise Alpha* brief opens with two vessel tracks (HMS Defender and USS Freedom). Capturing a scene starts by naming the storyboard inline, right in the panel, with no modal thrown over the map:

![VS Code: capturing the first scene — the inline naming row over the Exercise Alpha map](images/vscode-storyboard-capture.png)
*Capturing in VS Code: clicking Capture names the storyboard inline, then screenshots the live map to a real thumbnail — the same capture pipeline as the browser.*

A few captures later the panel holds a storyboard of real captured-map thumbnails, and **Preview** sits live beside Capture:

![VS Code: the populated storyboard panel with real captured thumbnails beside the map](images/vscode-storyboard-panel.png)
*The desktop authoring surface: each scene row is a real thumbnail of the map at capture time. Preview is active because the storyboard has scenes.*

One click on Preview opens the same finished-briefing player — on the desktop it is served by an ephemeral loopback HTTP server bound to `127.0.0.1` rather than a blob URL, but the renderer is byte-identical:

![VS Code: the Preview button live in the populated storyboard panel — the trigger](images/vscode-preview-trigger.png)
*The trigger on the desktop: one click stands up the loopback server and opens the player.*

![VS Code preview playback: the briefing renderer playing scene 1 over an OpenStreetMap basemap, launched from VS Code](images/vscode-preview-playback.png)
*Replaying live, launched from VS Code's loopback server — the same player that ships inside an export zip, here reading the active storyboard over a live basemap.*

![VS Code preview: flown in to the final scene, the two tracks converging](images/vscode-preview-scene-3.png)
*Scene 3 — the player flies the viewport between the captured framings, just as on the browser surface.*

![VS Code preview in Present mode — chrome hidden, the map fills the tab](images/vscode-preview-present.png)
*Present mode (P) on the desktop-launched preview — chrome hides and the map fills the tab, exactly as the distributed briefing plays.*

## By the Numbers

The test suites covering this work:

- **70 briefing-renderer tests** — cover both the air-gapped inline boot path and the new live `?features=` path, including validator integration and store seeding.
- **44 shared briefing-export tests** — including a cross-surface zip-equivalence test that asserts VS Code and web-shell produce byte-identical archives from the same input.
- **808 VS Code unit tests** — among them 7 for the new loopback HTTP server and 4 for the preview command itself.
- **StoryboardPanel Preview-control unit tests + Storybook E2E** — cover the button's enabled/disabled state transitions and the tooltip text.
- **4 web-shell unit tests** for the preview launcher blob-URL path.

These are pass/fail suites; the numbers are test counts, not coverage percentages.

## Lessons Learned

The most expensive lesson surfaced while capturing these very screenshots: the first live previews came up with an *empty map* — no vessel tracks. The cause was a latent defect the preview inherited from the capture pipeline. When a scene records which features it shows (`visible_feature_ids`), the code read each feature's `properties.id`. But a Debrief data feature carries its identity at the **top-level GeoJSON `id`** — `properties.id` exists only on Storyboard and Scene features. So for real tracks the id came back `undefined`, the scene recorded an empty visibility set, and the scoping step dropped every track on the way into the briefing. The export had quietly had the same hole all along.

Why did strong typing not catch it? Because the feature was iterated as a deliberately-loose boundary type whose `properties` carried an index signature (`{ kind?: string; [k: string]: unknown }`), and the call site then *cast* it (`feature.properties as { id?: string }`). The index signature makes `.id` type-check as `unknown`; the cast fabricates a field the schema never defines. An unchecked assertion is exactly where the type system stops helping — the project already had the correctly-derived `DebriefFeature` union + guards that would have made this a compile error. The fix (ADR-038) routes every identity read through one typed accessor that reads the canonical top-level id, and a new lint rule now flags inline-object casts (`x as { … }`) so the same shortcut can't reappear. The broader principle: validate at the boundary with the type system, and never reach for an unchecked cast inside it.

The additive second boot path turned out to be the right framing from the start. Because the live path activates only on the presence of `?features=`, the inline offline path is structurally untouched — it imports no `fetch` at all. "Zero network for storyboard data" in the offline case is enforced by what the code doesn't import, not by an assertion in a test. That made it straightforward to keep both paths green simultaneously and meant the offline guarantee didn't need re-proving after every change to the live path.

The loopback HTTP server is new territory for the extension. Binding to 127.0.0.1 isn't sufficient on its own: a malicious page can resolve a domain it controls to 127.0.0.1 and then make requests that the browser treats as same-origin. The fix is a `Host`-header allowlist on the server — only `localhost` and `127.0.0.1` are accepted. It's not a complicated mitigation but it's easy to miss if you think "loopback binding = safe". Worth noting for any future extension work that stands up a local server.

Extracting the packing core into `@debrief/briefing-export` cost very little because the original code was already written as pure functions behind an injected dependency interface — the host-specific parts (reading a file, writing a zip entry) were passed in, not hardcoded. Moving that to a shared package was mostly a matter of updating import paths. The lesson is the familiar one: injecting I/O rather than calling it directly keeps options open in ways that aren't obvious until a second consumer appears.

## What's Next

The web-shell **Export as briefing zip** button is the remaining piece. The shared `@debrief/briefing-export` packing core is already extracted and proven host-agnostic by the cross-surface equivalence test; what remains is the browser Export UI and its static-bundle reader. That's a self-contained follow-on.

Separately, #272 (PMTiles basemaps) and #265 (MP4/GIF export) are tracked as independent workstreams and aren't blocked by anything here.

→ [See the code](https://github.com/debrief/debrief-future/tree/claude/speckit-implement-273-t2ska/specs/273-storyboard-preview-button)
