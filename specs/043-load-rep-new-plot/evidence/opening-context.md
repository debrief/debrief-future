## What We're Building

Imagine you've got a folder of REP track files from an exercise and want to start analyzing them. Right now, you'd create an empty plot first, then load the files. That works, but it's an extra step that breaks your flow.

We're adding an "Add to new plot in [store-name]" option to the existing import command. Point at your REP files, choose a store, and you get a new plot ready to open — one action instead of two.

## How It Fits

This builds on two pieces we shipped recently: REP file loading (#021) and the per-item folder structure for STAC catalogs (#040). The loader already knows how to parse REP files into GeoJSON tracks. Now it can also create the STAC Item and Collection scaffolding in one pass.

## Key Decisions

**Extending the existing command rather than creating a separate one** — the "Load into Debrief" picker now shows both existing plots and an option to create new ones. Keeps the UX unified instead of scattering related actions across multiple commands.

**Using crypto.randomUUID() for item IDs** — REP files can have duplicate titles ("Track 1", "Track 1"), and we need guaranteed uniqueness. Random UUIDs avoid collisions without complex deduplication logic.

**Fail-fast parsing** — we parse all selected REP files before creating anything on disk. If one file is malformed, you get an error immediately, not halfway through with a partially-populated plot.

**Atomic cleanup** — if anything fails after the plot folder exists, we delete it entirely. You either get a complete plot or nothing, never a broken half-state.
