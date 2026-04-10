---
platform: linkedin
feature: 178-vscode-tabular-results
post_type: shipped
word_count: 195
---

Shipped: tabular results in the Debrief VS Code extension.

Until this week, running an analysis tool in Debrief's VS Code extension
showed you a map layer — but the actual statistics and chart datasets
just… vanished.  You had to pop over to the web-shell for the real
numbers.

Feature 178 fixes that.  A new **Debrief Results** view lives in the
VS Code panel dock (next to Terminal / Output).  Run `track-stats` and
you get a proper table tab.  Run `range-bearing` and you get Range and
Bearing chart tabs side by side.  Hit Save, and the CSV is written to
disk, registered as a STAC asset, and linked via a new `FileSavedEvent`
LogEntry back to the originating tool run — full PROV-aligned
provenance, zero partial state on failure.

Zero forks of shared components.  `ChartPanelWrapper`, `TableRenderer`,
all the CSV utilities — reused unchanged from the web-shell.  Extension
host owns the tab state; the webview is a dumb renderer, trivially
recoverable when VS Code collapses the panel.

38 new unit tests, 23 Playwright E2E tests, 2301 total passing.  The
full post has screenshots showing the empty state, populated tabs with
unsaved indicators, Save As form, error + Retry, and two end-to-end
captures inside real VS Code chrome courtesy of the openvscode-server
E2E pipeline.

[Link to full shipped post]

#FutureDebrief #MaritimeAnalysis #VSCode #ProvenanceTracking
