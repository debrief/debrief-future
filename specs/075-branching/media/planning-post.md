---
layout: future-post
title: "Planning: Branching from History"
date: 2026-02-10
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, prov-logging, branching]
excerpt: "Forking analysis paths from any point in history so analysts can explore 'what if' without losing work."
---

## What We're Building

You've imported tracks, set up your colours, calculated ranges, and run TMA. Fifteen steps into an analysis, you realise you want to try a different approach -- but only from step eight onward. Today, that means saving a copy somewhere, manually winding back, and hoping you can find both versions later.

Branching lets an analyst select any entry in their analysis log and say "branch from here." The system creates a new, independent plot whose state matches that moment in history, with the log trimmed to include only entries up to the branch point. Both plots record their relationship -- the source knows it spawned a branch, the branch knows where it came from -- so the analyst can navigate between them and compare results. Each branch is a full citizen: it can accumulate its own history, take its own snapshots, even spawn further branches.

## How It Fits

This is Phase 5 of the PROV logging epic. Phase 0 (#070) defined the provenance schema. Phase 1 (#071) built the recording service that captures every tool execution. Phase 4 (#074) added snapshot checkpoints with a doubly-linked chain. Branching consumes all of that: it reads the log to identify branch points, uses the snapshot chain to reconstruct earlier states, and creates a new STAC Item to house the branch plot. The branch service extends the snapshot service's dependency injection pattern, so testing remains straightforward -- mock the file operations, verify the provenance algebra.

## Key Decisions

- **Branches are independent STAC Items, not assets of the source**: Unlike snapshots (which are read-only assets within the same Item), a branch is a living plot that accumulates its own history. It gets its own Item directory, its own `plot.geojson`, its own snapshot chain. This means branches show up as separate plots in catalog listings.
- **Deep-copy with provenance trimming, not tool replay**: For branches within the current working segment, the feature geometry already reflects all operations. We deep-copy the FeatureCollection and trim each feature's provenance array to entries up to the branch point. No replay engine needed.
- **Pre-snapshot branching limited to snapshot boundaries initially**: Branching from an arbitrary entry inside a previous snapshot's range would require reconstructing state via tool replay -- a Phase 6 capability. For now, pre-snapshot branches can target snapshot boundaries (where the geometry is already correct). The system reports a clear message for unsupported cases.
- **Two-way links via system record metadata**: The source plot gets a `BranchRecord` in its `branches[]` array. The branch plot gets a `BranchOrigin` field. Both get a `FileProvEntry` with `type: "branch"`. Relative paths keep everything portable.
- **Branch-of-branch works identically**: The branching algorithm doesn't care whether the current plot is an original or already a branch. A new branch always points back to its immediate parent, not the root.
- **Write-then-link atomicity**: Same pattern as snapshots -- write the branch plot to disk first, update the source's system record only on success. If disk write fails, nothing changes.

## What We'd Love Feedback On

- **Branch discovery**: When an analyst opens a plot that has branches, how prominently should those branches be surfaced? A badge on the plot tab? An entry in the log panel? Both?
- **Naming**: Branches currently get system-generated IDs like `branch-a1b2c3d4`. Should we add user-defined labels in this phase, or keep that for a follow-up?
- **Nested branching depth**: We're not imposing a limit on branch-of-branch depth. Is there a practical scenario where this causes confusion, or is unbounded depth fine?

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
