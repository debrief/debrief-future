## What We're Building

When an analyst captures a few Scenes into a Storyboard while exploring a plot, then closes without saving, the persisted plot file should look exactly like it did before they opened it. Until this change, it didn't. Every capture rewrote `item.json` on disk to register a `scene-thumbnail-{id}` asset entry, even though the rest of the editor only flushes plot mutations at save time. "Discard changes" silently left a trail of entries pointing at PNGs the user never committed to.

This work moves Scene-thumbnail asset-entry registration off the capture path and into the save path, where every other on-disk plot mutation already lives. The change is invisible mid-session — captured Scenes still appear immediately in the Storyboard panel — but the contract underneath is now consistent: `item.json` is a save-time artefact, full stop. Discard means discard, and the in-memory-session-vs-persisted-plot boundary holds the way an engineer reading the code would expect.

## How It Fits

A follow-up to #216 (Storyboarding Capture), this tightens the seam between `sceneThumbnailService.writeSceneThumbnail` and the save-time `item.json` rewrite that already lives in `saveSession.ts` for plot-level thumbnails. The new buffer flushes through that same rewrite. Discarded captures leave orphan PNGs on disk, which the existing `gcOrphanAssets` pass continues to reclaim — no new GC mechanism, no new orphan class.

## Key Decisions

- **PNGs stay eager; only the `item.json` registration is deferred.** The Storyboard panel renders thumbnails by file-path convention — it never reads `item.json.assets`. Eager PNG writes already satisfy "the user sees their captured Scene immediately" without teaching any consumer about buffering. Deferring PNG bytes too would have meant base64 in memory for every capture and a buffer-aware resolver in the panel, for no consumer-visible gain.
- **Filter-on-flush, not eager remove-on-undo.** At save time we commit only buffered entries whose Scene still exists in the in-memory plot. The storyboardEdit undo path, delete-scene path, and Zustand undo stack stay ignorant of the buffer. It's the same liveness predicate `gcOrphanAssets` already uses, applied pre-save.
- **The save-time merge piggybacks on the existing `item.json` rewrite.** `saveSession.ts` already reads `item.json`, sets the plot-level `thumbnail` keys, and writes atomically. Folding the buffer-flush into that same step keeps save to one `item.json` write — the headline metric drops from N (one per capture) to 1.
- **Buffer is in-memory only.** A crash discards captures and the PNGs become orphans the existing GC handles, matching how `features.geojson` already behaves on crash — the symmetry this whole change is about.
