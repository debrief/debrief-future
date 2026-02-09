---
layout: future-post
title: "Shipped: Log Recording Service"
date: 2026-02-09
track: [credibility]
author: Ian
reading_time: 4
tags: [tracer-bullet, provenance, prov-logging, session-state]
excerpt: "Every tool execution now leaves a PROV-aligned provenance trail on the features it touched"
---

## What We Built

Run a range calculation between two tracks in Debrief, and now there's a record of it. The tool name, version, parameters, which features were inputs, which were outputs, how long it took, and when it happened -- all written as a PROV-aligned provenance entry directly into the GeoJSON files in your STAC catalog.

The Log Service sits in the `session-state` package and exposes two functions. `recordToolResult()` takes a completed tool execution, wraps it in provenance entries, and appends those entries to the `properties.provenance` array of each affected feature on disk. `getTimeline()` reads all features in a plot, collects their provenance arrays, deduplicates entries that share an `activityId` (because a single tool run touching three features produces one operation, not three), and returns a sorted chronological list.

The integration is transparent. The call to `recordToolResult()` is wired into the existing `executeTool.ts` command. Analysts don't see a new dialog, a new save step, or any change at all. Provenance accumulates automatically, and the standard Ctrl+S save persists it alongside everything else.

## How It Works

The interesting design question was where provenance lives. Our initial assumption was the Zustand store -- that's where session state goes. But GeoJSON features live on disk, managed by `stacService`. The store holds UI state: selections, dirty flags, temporal bounds. Writing provenance to the store would have meant syncing it back to disk on every save, and features would have had two sources of truth for their own properties.

So provenance goes directly to disk via a new `appendProvenance()` method on `stacService`. The store gets a `markDirty()` call so the save indicator lights up, but the provenance data itself never passes through Zustand.

The Python/TypeScript split also clarified during implementation. When a Python tool creates an output feature, it already embeds provenance on that feature -- the Python executor knows the tool, version, and parameters better than anyone. The TypeScript Log Service only needs to handle input features: the tracks and positions that were read but not created. It looks for an `activityId` on the output features' provenance and reuses it, so input and output entries link together under the same operation.

```json
{
  "activityId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "timestamp": "2026-02-09T14:23:45.123Z",
  "wasGeneratedBy": {
    "tool": "calculate-range",
    "toolVersion": "1.2.0",
    "parameters": {
      "units": { "value": "nautical_miles", "default": true, "tunable": true }
    }
  },
  "used": ["track-alpha", "track-bravo"],
  "generated": ["range-result-001"],
  "executionDuration": "PT0.342S",
  "tune": null
}
```

Each entry follows the W3C PROV vocabulary: `wasGeneratedBy` identifies the tool, `used` lists inputs, `generated` lists outputs. The `tune` field is null for now -- it's reserved for Phase 6 when analysts can tweak parameters and replay operations. Parameters record whether each value is `tunable` and whether it's a `default`, laying groundwork for that replay capability without implementing it yet.

Timeline assembly is deliberately simple. No separate timeline store, no index, no cache. `getTimeline()` reads the GeoJSON, walks every feature's provenance array, deduplicates on `activityId`, and sorts by timestamp. For the typical plot size (5-20 features, 10-100 operations per session), this is fast enough. If it becomes a bottleneck with larger datasets, we'll add caching -- but not before we have evidence it's needed.

## What We Learned

**Dependency injection made testing straightforward.** The service is created via `createLogService(deps)` where deps are three functions: `appendProvenance`, `loadGeoJson`, and `markDirty`. All 43 tests -- 39 unit and 4 integration -- run against mock implementations with zero disk I/O. The integration tests use an in-memory GeoJSON fixture that simulates the full round trip: record a tool execution, append provenance, assemble the timeline, verify the entries are correct and deduplicated.

**Legacy format handling was worth doing early.** Not all tools return the expanded `ToolResult` with structured parameters and `modifiedFeatures`. The Log Service handles both formats: modern results with full metadata, and legacy results where it infers what it can from the tool ID, duration, and feature list. This means provenance recording starts working across all tools immediately, with richer entries arriving as individual tools are updated.

**Append-only was a good constraint.** Provenance arrays are never modified, only extended. A feature that's been through five tool operations has five entries, in order. No compaction, no merging, no conflict resolution. Combined with the `activityId` linking, the data model is simple enough that debugging is just reading JSON.

The test suite landed at 335 tests across the session-state package, with zero regressions to the existing 292. No new external dependencies -- the Log Service is pure TypeScript with dependency injection for the parts that touch the filesystem.

## What's Next

Phase 2 of the PROV Logging epic is the Log Panel -- a VS Code sidebar that visualises the timeline and lets analysts see what happened to their plot at a glance. The data is all there now; it just needs a UI. After that, Phase 3 narrows the undo/redo system so the existing StateSnapshot covers only UI state while provenance handles data history, and Phase 4 adds snapshot pagination for long-running sessions.

-> [See the specification](https://github.com/debrief/debrief-future/tree/main/specs/071-log-recording-service)
