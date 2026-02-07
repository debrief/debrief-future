---
layout: future-post
title: "Planning: Restore Previously-Open Plots on Startup"
date: 2026-02-06
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, vscode-extension, session-state]
excerpt: "Automatically restoring open STAC plots when VS Code restarts, so analysts pick up exactly where they left off."
---

## What We're Building

Maritime analysts working through exercise review typically have several plots open at once — different tracks, different scenarios, sometimes different exercises. When they close VS Code at the end of the day (or it crashes mid-afternoon), all of that context disappears. Reopening means hunting through the STAC catalog to find the same plots and re-opening them one by one. It's a small friction that happens constantly.

We're adding automatic restoration. When VS Code starts, the extension reads its persisted list of open plots and reopens each one sequentially, using the existing `openPlot` command pipeline. If a plot file has been moved or deleted since the last session, it gets silently skipped — no error dialogs, no interruption. The analyst just picks up where they left off.

## How It Fits

This builds directly on infrastructure we already have. STAC plots are identified by `stac://` URIs throughout the codebase — in `SessionManager`, in the tree provider, in the open command itself. The new `OpenPlotsService` persists a list of those URIs to VS Code's `workspaceState`, which is workspace-scoped and survives crashes. On startup, it walks the list and calls the same `debrief.openPlot` command the user would invoke manually. No parallel code paths. No duplication of the loading pipeline.

## Key Decisions

- **New service, not an extension of RecentPlots.** `RecentPlotsService` tracks history (capped at 10, ordered by last access). `OpenPlotsService` tracks current state (unbounded, ordered by open sequence). Different data, different lifecycle, different consumers. Combining them would conflate two distinct responsibilities.

- **Real-time persistence, not shutdown-only.** The open plots list is written to `workspaceState` every time a plot is opened or closed — not during `deactivate()`. This matters because `deactivate` isn't guaranteed to run on crash. If VS Code goes down unexpectedly, the last-known state is already saved.

- **Sequential restoration.** Plots are restored one at a time. `MapPanel` uses a singleton pattern, and parallel opens would create race conditions in both the panel and session management. The sequential approach is slower but correct.

- **`stac://` URIs as identifiers.** Already the canonical reference everywhere in the codebase. Stable across sessions, deterministic from catalog structure, and parseable via existing `buildStacUri()` / `parseStacUri()` utilities.

- **Silent skip for missing plots.** If a STAC item no longer exists on disk, the restoration wraps the open attempt in try/catch and moves on. The failed entry gets cleaned from the persisted list so it won't be attempted again next time.

## What We'd Love Feedback On

- **Restoration order matters?** We're preserving the order plots were originally opened. But analysts might prefer most-recently-opened first, or alphabetical by plot title. Does the order affect your workflow?

- **Scope of first iteration.** We're restoring which plots were open, not view state (zoom, pan, time position). Is that sufficient for the immediate win, or does partial restoration feel incomplete?

- **Multi-window behaviour.** VS Code's `workspaceState` is shared when two windows open the same workspace folder. Should we detect and handle this, or is it rare enough to accept the default behaviour?

- **Large plot counts.** Restoration is sequential, so 20 plots will take longer than 2. Is there a practical upper bound on how many plots analysts typically have open simultaneously?

→ [Join the discussion](https://github.com/debrief/debrief-future/discussions)
