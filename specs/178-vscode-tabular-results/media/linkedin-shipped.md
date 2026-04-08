---
platform: linkedin
feature: 178-vscode-tabular-results
post_type: shipped
word_count: 178
---

Shipped: tabular results in the Debrief VS Code extension.

Until this week, running an analysis tool in Debrief's VS Code extension
showed you a map layer — but the actual statistics and chart datasets
just… vanished.  You had to pop over to the web-shell for the real
numbers.

Feature 178 fixes that.  A new Results panel lives beneath the editor.
Run `track-stats` and you get a proper table tab.  Run `range-bearing`
and you get Range and Bearing chart tabs side by side.  Hit Save, and
the CSV is written to disk, registered as a STAC asset, and linked via
a new `FileSavedEvent` LogEntry back to the originating tool run — full
PROV-aligned provenance, zero partial state on failure.

The win: zero forks of shared components.  `ChartPanelWrapper`,
`TableRenderer`, all the CSV utilities — reused unchanged from the
web-shell.  Extension host owns the tab state; the webview is a dumb
renderer, trivially recoverable when VS Code collapses the panel.

38 new unit tests, 2278 total passing.  Details in the shipped post.
