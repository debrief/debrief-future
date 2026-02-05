# LinkedIn Summary - Feature 051

Analysis results currently disappear when you close and reopen a plot in VS Code. All that calculation work — range-bearing calculations, coordinate checks, anything saved to the plot — vanishes until you run the tools again.

We're fixing that. When a plot opens, we'll scan its STAC item for existing result files and restore them to the Attachments dropdown automatically. Results become persistent across sessions, not ephemeral artifacts.

The mechanism is straightforward: identify results by STAC metadata roles (or filename patterns as fallback), load them when the plot activates, feed them through the same component pipeline that handles fresh results. No UI changes. One more piece of the analysis workflow working reliably.

We're working through a few open questions on the implementation — filename scope, timestamp handling, whether to visually distinguish new vs. restored results — and would like to hear from analysts using the system.

→ [Read the full planning post](https://debrief.github.io/)

#FutureDebrief #MaritimeAnalysis #AnalysisTools
