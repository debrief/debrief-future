An analyst tuning a plot-lock runs bearing analysis, tweaks a parameter, runs it again. Today, each re-run means manually opening a JSON file to see what changed. Next week's feature closes that gap.

The results bottom panel gives tool output somewhere to render -- charts, images, and summaries in a tabbed layout alongside VS Code's terminal. Tabs open automatically when tools finish, and they live-update when the underlying file is overwritten. The analyst sees improvements (or regressions) immediately without closing and reopening anything. Three entry points feed into the same panel: tool completion, the STAC browser, and the attachments context menu.

No new dependencies. The chart renderer from feature 085 does the drawing; this feature gives it a home.

https://debrief.github.io/blog/2026/02/14/planning-results-bottom-panel-with-tabbed-layout

#FutureDebrief #MaritimeAnalysis #OpenSource
