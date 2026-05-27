## Hook

| Before — checking your briefing | After — checking your briefing |
|---|---|
| Click "Export as briefing zip" (VS Code only) | Click "Preview" (VS Code *and* the browser) |
| Save the zip somewhere | — |
| Unzip it | — |
| Double-click the player file | — |
| Watch it play back | Watch it play back, in a new tab |

![Clicking Preview in the web-shell storyboard panel; the briefing renderer opens in a new tab and plays back the storyboard live](screenshots/web-shell-preview-workflow.gif)

## What We're Building

If you are building a briefing, the question you keep asking is a simple one: *does it actually look right when it plays?* Do the scenes transition the way you intended, does each one frame the right slice of the map, does the time-range animation run at the pace you had in mind, is the basemap the one you chose? Until now the only way to answer that with full fidelity was to export a distribution zip, save it, unzip it, and double-click a file — and even that round-trip was only available inside VS Code. Checking your work cost more clicks than making the change you wanted to check.

This adds a Preview button to the storyboard panel header, in both the VS Code extension and the browser (web-shell) app. One click opens the real briefing-renderer player in a new tab, loading your *current* storyboard live — no export, no zip, no file to manage. The same click-to-watch loop now exists everywhere you author. And as a companion, the "Export as briefing zip" capability — previously VS Code-only — comes to the browser for the first time, so the artefact you hand to someone else can be produced from either host.

## How It Fits

The briefing renderer is the same player that already ships inside exported zips (from #264), driving the playback engine built across #217, #258, and #263. What changed is *how the renderer gets its data*. It gained a second, additive boot path: alongside the existing air-gapped mode — where the storyboard JSON is inlined into the renderer's HTML at export time so a zip plays back fully offline — it can now boot from a live `?features=<url>` parameter, fetching and validating through exactly the same validators and seeding exactly the same store. The two hosts supply that URL differently (VS Code stands up an ephemeral loopback server; web-shell hands over a same-origin blob URL, building on the IndexedDB persistence from #236), but the renderer itself stays host-agnostic. This is entirely a frontend/TypeScript change — no schema touched.

## Key Decisions

- **Extend the renderer's boot path; never disturb the offline guarantee.** The inline air-gapped path that makes an exported zip play back with no network is left exactly as it was, and its tests must keep passing. The live path is purely additive — it activates only when the URL carries `?features=`. Same validators, same playback store, two ways in.

- **Let each host produce the features URL its own way.** VS Code stands up an ephemeral loopback HTTP server — a new pattern for the extension — serving the bundled renderer plus a live `/features.geojson`, opened via `asExternalUri` + `openExternal` so it still works fully offline. Web-shell needs no server at all: it uses a same-origin blob object URL, because the web-shell app and the renderer are sibling paths on the same origin in dev and on GitHub Pages alike. The renderer doesn't care which it got.

- **Export parity was cheap because the packing core was already pure.** The zip-packing logic was written as pure functions behind an injected host-dependency interface, so bringing export to web-shell meant writing one browser adapter — read through the stac-writer abstraction, deliver as a download — rather than reimplementing the packer. The pure core moves into a shared `@debrief/briefing-export` package. JSZip is already in the repo, so no new external dependency and no LinkML schema change.

- **Gate the button on a callback, not a host check.** The Preview button lives in the shared `StoryboardPanel` header and appears only when an optional `onPreview` callback is wired in. The shared component stays ignorant of who is hosting it; each host decides whether and how to offer preview by supplying (or omitting) the callback.
