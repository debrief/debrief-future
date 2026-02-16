Drawn shapes that vanish when you close the plot are not annotations -- they are sketches on a whiteboard someone is about to erase.

Feature 096 is the last piece of Future Debrief's shape drawing epic. It adds three things: context-sensitive guidance text so analysts know the gesture for each shape type without memorising it, a sequential colour palette so consecutive shapes are visually distinct, and automatic STAC persistence so drawn annotations survive across sessions with full provenance metadata.

The persistence decision was straightforward: write immediately on creation, not in batches. Local disk writes are fast, and deferring provenance recording risks losing it. Every drawn shape gets the same lineage metadata as imported data -- source, timestamp, operator -- so downstream queries do not need special cases.

Eight cartographic colours cycle through the palette. Guidance strings are extracted to a constants file for future i18n. No new dependencies.

https://debrief.github.io/blog/2026/02/14/planning-drawing-ux-guidance-stac-persistence

#FutureDebrief #MaritimeAnalysis #STAC
