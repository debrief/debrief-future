Users can now create new plots directly from REP files with a single right-click action. Select your files, enter a plot name, and Debrief handles the rest: parsing the exercise data, extracting temporal and spatial metadata, creating the STAC item, and opening it in the map panel. Atomic operation — if parsing fails, nothing hits disk.

What surprised us: the new "add to new plot" workflow didn't require changing a single line of existing stacService code. The addFeatures() and addAsset() methods absorbed the new data flow without modification. That's exactly what you want from a layered architecture — it flexes without refactoring.

The implementation also validated our fail-fast parsing strategy. Instead of streaming data during creation, we validate all files upfront. Simpler, more reliable, and atomicity is trivial.

[Read the full writeup](https://debrief.github.io/posts/shipped-load-rep-new-plot)

#FutureDebrief #MaritimeAnalysis #OpenSource
