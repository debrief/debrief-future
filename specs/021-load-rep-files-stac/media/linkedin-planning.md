# LinkedIn Planning Post: REP File Loading

**Target Length**: 150-200 words
**Type**: Planning announcement

---

Drop a REP file onto the map, see the tracks appear.

That's the goal for this week's work on Future Debrief. We're adding drag-and-drop REP import directly into the VS Code extension — no import wizards, no intermediate steps. Analysts receive new data constantly; getting it into a plot should take seconds.

The architecture is intentionally simple. The extension coordinates; existing Python services (debrief-io for parsing, debrief-stac for storage) do the actual work. We're wiring, not rewriting.

A few decisions we're weighing:
- Duplicate detection: filename matching vs content hashing
- Context menu picker: two-step (catalog → plot) or flat list
- Progress feedback for large files

The broader point: good tools feel invisible. You shouldn't have to think about file formats and storage backends when you just want to see some tracks on a map.

Full planning post with architecture details: [link]

#FutureDebrief #MaritimeAnalysis #VSCode
