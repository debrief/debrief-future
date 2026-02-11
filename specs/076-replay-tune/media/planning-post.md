---
layout: future-post
title: "Planning: Replay and Parameter Tuning"
date: 2026-02-11
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, prov-logging, replay]
excerpt: "Edit one parameter, replay everything after it automatically -- no manual re-runs."
---

## What We're Building

You've run a chain of analysis steps -- import tracks, calculate range at 60-second intervals, compute bearing, generate a plot artifact. Halfway through reviewing results, you realise the range calculation should have used 30-second intervals. Today, that means manually re-running every subsequent step with the original parameters, hoping you remember them all correctly.

We're building a replay engine that eliminates that. Select any past tool execution in the Log Panel, edit the parameter you want to change, and the system re-executes that operation with the new value, then replays every subsequent operation in order. The plot updates to reflect the cascaded changes. One edit, no manual re-runs.

Alongside tuning, we're adding two revert operations. "Revert to here" permanently discards everything after a selected point -- a clean rollback when an entire line of analysis was misguided. "Revert this" soft-deletes a single operation and replays subsequent ones without it -- surgical removal of one mistake while preserving everything that followed.

## How It Fits

This is Phase 6 of the PROV Logging Implementation (E02). The Log Recording Service (#071) captures every tool execution. Snapshots (#074) checkpoint that work into a navigable chain. The Log Panel (#072) displays the timeline. Replay ties all three together: it reads the log, loads snapshots when needed, and re-invokes tools through the existing calc service.

The Replay Engine itself is a pure-function module in the `session-state` package. It doesn't import VS Code or the calc service directly -- tool execution arrives via a callback that the extension injects. This means the entire replay logic is testable with mock executors, no framework dependencies. Replay operates in-memory on the Zustand store; file writes happen through the standard save-on-demand flow, same as normal tool execution.

## Key Decisions

- **Dependency injection, not direct imports**: The Replay Engine accepts a `ToolExecutor` callback and a `SnapshotLoader` callback. The VS Code extension provides real implementations; tests provide mocks. This keeps `session-state` framework-agnostic.
- **In-memory replay, not file-based**: Each replayed tool execution updates the Zustand store, just like a normal tool run. We don't rewrite GeoJSON between steps. File persistence only happens when the analyst saves, through the existing dirty-tracking flow.
- **Tool version mismatch halts immediately**: If the installed version of a tool differs from the version recorded in the log entry, replay stops before executing that step. No silent re-runs with a different tool version -- reproducibility is non-negotiable.
- **Soft-delete for "Revert this"**: Removed entries get a `deleted: true` flag rather than being physically removed from provenance arrays. The Log Panel can still display them (greyed out, recoverable), while the replay engine skips them.
- **Cancellation with full rollback**: Before replay starts, the engine deep-clones the current feature state. If the analyst cancels mid-replay or a step fails, the clone restores the pre-replay state. No partial results left behind.
- **Cross-snapshot replay**: When tuning a parameter from a previous snapshot segment, the engine loads that snapshot's GeoJSON, replays from the tuned entry forward through all subsequent segments (crossing snapshot boundaries), and reconstructs the current working state.
- **Parameter validation before replay**: Type constraints from tool definitions are checked before any re-execution begins. If a value is invalid, the analyst sees the error immediately -- no wasted computation.

## What We'd Love Feedback On

- **Version mismatch strictness**: We're doing exact string comparison on tool versions. Should patch-level differences (1.2.0 vs 1.2.1) be tolerated with a warning, or is strict matching the right default for reproducibility?
- **Replay scope indicator**: Before replay starts, should the UI show the analyst how many operations will re-execute and let them confirm? Or is immediate replay on parameter change the better UX for short chains?
- **Soft-delete recovery**: When an analyst restores a previously soft-deleted entry, should subsequent operations replay automatically, or should the analyst trigger replay manually?

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
