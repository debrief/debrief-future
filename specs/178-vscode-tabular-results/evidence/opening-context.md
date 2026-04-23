## What We're Building

Run `track-stats` in the VS Code extension today and the result is invisible. The tool fires, debrief-calc returns the statistics, the GeoJSON layer lands on the map — but the actual numbers (mean speed, distance covered, time on station) live in `properties.statistics` on a feature you can't see. To find them you have to open the file in a text editor and squint at the JSON.

The web-shell got the fix in feature 177: a Results panel beneath the map with table tabs for flat statistics, chart tabs for time-series, Save / Save As to CSV, and a one-click round-trip back into the panel from the file dropdown. The VS Code extension is going to get the same thing, using the same React components, the same CSV utilities, and the same provenance plumbing.

## How It Fits

Debrief is built on the principle that every analytical step gets recorded. When you save a result, the file is registered as a STAC asset *and* a provenance entry is appended that links the saved CSV back to the tool run that produced it. Close the plot without saving and the orphan tool runs are cleaned up — what survives is what you decided was worth keeping.

The VS Code work is integration plumbing. The shared `ChartPanelWrapper` and `TableRenderer` components ship unchanged. The CSV utilities (`buildCsvContent`, `generateCsvFilename`) ship unchanged. The web-shell's table-from-statistics synthesizer moves into a shared utility so both apps call exactly the same function — no forks. What's new on the VS Code side is the extension-host coordinator (`ResultsPanelService`), a new `WebviewView` registered into the panel area beneath the editor, and a `recordFileSaved` method on the LogService that writes the link between a tool run and its CSV.

## Key Decisions

- **Panel area, not editor area.** The Results panel is a `WebviewView` in the bottom panel area (alongside Terminal and Output), not a sibling of the map editor. VS Code's editor-area splitting doesn't compose well with custom editors, and the panel area is where analysts already expect to find tool output. The user can drag it to the side bar if they prefer.
- **Extension host owns the state.** The webview is dumb. The host holds the in-memory tab list and replays it on `webviewReady`. This survives VS Code's habit of disposing collapsed views and means cleanup-on-plot-close is a single host-side handler.
- **Reuse, don't fork.** No new visual components. The web-shell's `synthesizeTableDataset` moves into `shared/utils` rather than getting copied. Both apps now consume the same module.
- **Open round-trips.** Click Open on a saved CSV and the file parses back into a flat dataset and reopens as a Results panel tab — symmetric with the web-shell. The "open in text editor" fallback is one click away via Open With.
- **Multi-panel side-by-side is deferred.** VS Code's panel system doesn't do horizontal splits the way GoldenLayout does. Distinct tool types stack as tabs for now; a follow-up will revisit if real workflows demand it.
- **Provenance via additive log entry.** No LinkML schema bump — we add a `FileSavedEvent` variant of the existing `LogEntry` envelope, identified by a sentinel `was_generated_by.tool` value. Pre-v4.0.0 freedom (Article XIV) covers the additive field.
