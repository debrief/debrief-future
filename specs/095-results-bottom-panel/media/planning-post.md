---
layout: future-post
title: "Planning: Results Bottom Panel with Tabbed Layout"
date: 2026-02-14
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, results-visualization, e04-results-visualization, vscode-extension]
excerpt: "A tabbed bottom panel that displays tool results as charts and images -- closing the loop between running analysis and seeing the output."
---

## What We're Building

An analyst runs a bearing analysis tool, and right now the result lands as a JSON file in the plot's `results/` folder. To see what happened, they have to open that file manually and squint at data arrays. Feature 085 gave us a chart renderer. This feature gives it somewhere to live.

The results panel sits in VS Code's bottom area -- the same region as the terminal and output panels. When a tool finishes and persists a result, a tab opens automatically showing the rendered chart. Run another tool, get another tab. The analyst can flip between a zone histogram and a range-bearing plot without losing either. Tabs derive their titles from dataset metadata, so "Zone Histogram -- Track Alpha" and "Range-Bearing -- Alpha vs Bravo" are distinguishable at a glance.

The part I'm most focused on is the iterative tuning loop. An analyst adjusting plot-lock parameters might run the same bearing analysis ten times in a row, tweaking values each time. Each re-run overwrites the same result file. Rather than closing and reopening tabs, the open tab detects the file change and re-renders automatically. The analyst sees the improvement (or regression) immediately -- a tight feedback cycle that mirrors how the workflow actually works.

## How It Fits

This is the second feature in Epic E04 (Results Visualization), directly consuming the `ChartRenderer` component from feature 085. It's also the first feature that ties together three previously separate entry points: tool completion (from the calc service integration, #052), the STAC browser file tree (#077), and the attachments context menu (#051). All three funnel into the same panel through the existing `openResultArtifact` command -- we're redirecting it from "open raw JSON in a text editor" to "render in the results panel."

The panel itself is a `WebviewViewProvider` registered in a `panel` view container, following the same pattern as the log panel (#072) and activity panel (#047). Tab state lives in the extension host; the webview renders a shared React component (`ResultsPanel`) from `@debrief/components`. No new runtime dependencies -- Vega-Lite, React, and the chart renderer are already in the project.

## Key Decisions

- **Extension host owns tab state, webview renders**: The extension host is the only process that can receive commands from multiple entry points, create file watchers, and survive webview disposal. The webview gets tab data via `postMessage` and handles the UI. Same pattern as the log panel and activity panel.
- **File watching with debounce for live update**: Each open tab gets a `vscode.workspace.createFileSystemWatcher` on its result file, disposed when the tab closes. A 200ms debounce after the last change event handles the case where a tool writes the file in multiple chunks -- we wait for the write to settle before re-reading.
- **Content routing by MIME type and structure**: JSON files are parsed to see if they match the `DatasetEnvelope` shape (from #085). If yes, they go through the chart transformer. Images (`image/png`, `image/jpeg`, `image/svg+xml`) display inline. Everything else gets a fallback summary with filename, type, and size.
- **Tab identity is plot path + file path**: The same filename in different plots produces separate tabs. If an analyst opens a result that's already displayed, the existing tab activates rather than creating a duplicate.
- **Reuse existing command**: The `debrief.openResultArtifact` command already exists and is wired to the attachments context menu. We redirect it to the panel -- no new command registration needed for that entry point. The STAC browser gets a context menu action calling the same command.
- **Session-scoped tabs only**: Tabs are not persisted across VS Code restarts. This keeps the implementation simple. If persistence proves necessary, it's a clean addition later without changing the tab model.

## What We'd Love Feedback On

The panel supports three content types: datasets rendered as charts, images displayed inline, and a fallback summary for everything else. Are there specific result types we're missing? For instance, should HTML reports from future tools get their own renderer, or is the fallback summary (with a link to open in VS Code's native viewer) sufficient for now?

When multiple plots have open result tabs, we prepend the plot name to disambiguate titles. For single-plot sessions, we omit it to save space. Is that the right heuristic, or would you prefer the plot name always visible?

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
