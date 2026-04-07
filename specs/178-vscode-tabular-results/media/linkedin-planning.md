Run a track-stats tool in Debrief's VS Code extension today and the answer is invisible — the numbers land in a JSON property you can't see. We're about to fix that.

The web-shell version of Debrief got a Results panel last sprint: tool outputs render as table tabs (for flat statistics) or chart tabs (for time-series), with Save/Save As to CSV and a one-click round-trip back into the panel. The same thing is now coming to the VS Code extension.

The trick is reuse. The shared React components ship unchanged. The CSV utilities ship unchanged. The web-shell's table-from-statistics synthesizer moves into a shared module so both apps call exactly the same function. What's new is a small extension-host coordinator, a new bottom-panel webview, and a `recordFileSaved` provenance entry that links every saved CSV back to the tool run that produced it. Close the plot without saving and the orphan tool runs are cleaned up — what survives is what you decided was worth keeping.

Spec, research notes, and open questions: https://github.com/debrief/debrief-future/tree/claude/vscode-tabular-results-CFFcS/specs/178-vscode-tabular-results

#FutureDebrief #MaritimeAnalysis #OpenSource
