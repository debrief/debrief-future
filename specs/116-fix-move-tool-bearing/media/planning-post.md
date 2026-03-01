---
layout: future-post
title: "Planning: PROV Log Input Snapshot for Mutation Replay"
date: 2026-03-01
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, prov-logging, replay, schema]
excerpt: "Storing pre-operation geometry in the PROV log so that tuning a bearing orbits the original position, not the current one."
---

## What We're Building

An analyst moves a circle annotation East by 5 km. Later, they decide the bearing was wrong and drag a slider to change it to North. The circle should orbit its original position — 5 km North of where it started. Instead, it ends up 5 km North of where it already moved to. The bearing change compounds on top of the previous move rather than replacing it.

The root cause is that the replay system has no record of where the feature was before the move. It takes the feature's current coordinates and applies the new bearing to those. Each replay drifts further from the position the analyst intended.

The fix is to store the feature's pre-operation geometry in the PROV log entry at the moment the tool executes. We call this the input snapshot. When the analyst tunes a parameter, the replay system reads the snapshot, restores the feature to its pre-operation position, and applies the new parameters from that anchor point. Drag the bearing from 0 to 360 and the shape traces a clean circle around its original location.

The input snapshot captures the full geometry object and any kind-specific spatial properties — the center coordinate for circles, the origin for vectors. It does not capture provenance (which is append-only) or styling (which spatial mutations don't touch).

## How It Fits

This is a correctness fix for the replay engine (#076) and the parameter tuning interaction on the flip-card (#113). Both already work for non-spatial operations — changing a colour, adjusting a time interval. The gap is specific to tools that modify coordinates: without an anchor, there is nothing to replay against.

The TypeScript session-state layer already implements the full capture-store-restore-replay cycle. The VS Code extension snapshots input geometry before calling a mutation tool, the entry builder stores it, and the tune function restores from it. That code has been shipping and working. But the TypeScript types are hand-written — they exist outside the LinkML master schema. And the Python side knows nothing about input snapshots. If a tool is invoked directly via MCP (not through VS Code), no snapshot is captured. If a log entry round-trips through Python, the field gets silently dropped.

This feature closes both gaps. We add `InputFeatureState` to the LinkML schema so the type is generated rather than hand-written. We extend the Python `LogEntry` model so the field survives round-trips. And we have the Python executor capture pre-tool geometry for any tool whose `output_kind` starts with `mutation/`, so MCP-only invocations get the same coverage.

## Key Decisions

- **Capture in the Python executor, not in individual tool handlers.** The executor already has access to the input features before calling the handler. Capturing there means every mutation tool gets input snapshots automatically — no per-tool code required. The VS Code extension continues to capture as well, belt-and-suspenders, but the Python executor is now the authoritative source.

- **Store geometry plus kind-specific spatial properties. Exclude everything else.** A full feature snapshot would risk restoring non-spatial changes (a label edit, a colour change) that happened between the original execution and the replay. Capturing only geometry and spatial properties like `center` and `origin` keeps the snapshot minimal and purpose-specific.

- **Add `InputFeatureState` to the LinkML master schema.** The TypeScript type has been hand-written since the replay feature landed. That violates our schema-first principle — derived types should come from LinkML, not the other way around. Adding it to the schema means Pydantic models, JSON Schema, and TypeScript interfaces are all generated from a single source. The TypeScript hand-written type will be replaced by the generated one.

- **The field is optional on LogEntry.** Non-mutation tools (colour changes, calculations, imports) don't modify coordinates and don't need an input snapshot. Historical entries from before this feature don't have one either. The replay system already handles missing `inputState` gracefully — it checks for presence before attempting restore. Making the field optional keeps it backward compatible with no migration needed.

- **Convention, not configuration.** The executor decides whether to capture based on a simple prefix check: `output_kind.startswith("mutation/")`. Future mutation tools (rotate, scale, mirror) just need to follow the existing naming convention. No registration, no flags, no opt-in.

## What We'd Love Feedback On

- **Snapshot scope.** We are capturing geometry and kind-specific spatial properties but excluding everything else. Are there non-spatial properties that a mutation tool might need to restore during replay? If a future tool modifies both geometry and a non-spatial property atomically, this design would need extending.

- **Chained mutation fidelity.** Each operation stores the geometry from immediately before that specific step, not the global original. Replaying step 3 of a 5-step chain uses the state after step 2. Does that match the mental model you'd expect, or would there be cases where an analyst wants to replay against the very first position?

- **Schema-first migration.** Replacing the hand-written TypeScript `InputFeatureState` with a generated type means any subtle differences between the two will surface. We plan to diff them and resolve discrepancies before switching. If you've done similar hand-written-to-generated migrations, what caught you off guard?

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
