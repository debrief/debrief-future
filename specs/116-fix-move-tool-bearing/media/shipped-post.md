---
layout: future-post
title: "Shipped: PROV Log Input Snapshot for Mutation Replay"
date: 2026-03-01
track: [credibility]
author: Ian
reading_time: 4
tags: [tracer-bullet, prov-logging, replay, schema]
excerpt: "Replay now anchors mutations to their pre-operation position, not the current one. Bearing orbits stay clean."
---

## What We Built

When an analyst replays a move operation with a different bearing, the shape should orbit its original position. Before this fix, each replay compounded on top of the previous result — change the bearing three times and the shape drifts further from where it should be.

We added an input snapshot to the PROV log entry. At the moment a mutation tool executes, the executor captures the feature's pre-operation geometry and stores it in the log. When replay re-executes the tool with modified parameters, it reads the snapshot and uses it as the anchor point. The bearing changes now trace a clean circle around the original position.

The fix lives in three layers:

**Schema (LinkML)**: Added `InputFeatureState` class to the canonical schema. Geometry plus kind-specific spatial properties (the `center` for circles, the `origin` for vectors). Everything else excluded — styling, labels, provenance — because mutations don't touch those.

**Python models**: Generated Pydantic models for `InputFeatureState` and extended `LogEntry` with an optional `input_state` field. Updated `create_log_entry()` to accept it. Added a `_capture_input_state()` helper that snaps geometry at the moment the tool runs.

**Executor wiring**: Convention-based automation. Any tool whose `output_kind` starts with `mutation/` gets automatic input capture. The executor takes the snapshot BEFORE calling the handler — timing is critical because handlers mutate in-place. Individual mutation tools don't need code changes. Future tools (rotate, scale, mirror) inherit the pattern automatically by following the naming convention.

## By the Numbers

| | |
|---|---|
| Tests passing | 75 |
| Failed | 0 |
| Python tests overall | 933/933 |
| Test categories | 9 (model creation, serialization, round-trip, executor capture, mutation convention, chained operations) |

## Lessons Learned

**Capture timing matters.** We initially considered capturing input state in the mutation tool's handler. That's too late — the handler mutates the feature in-place. The executor has a clean window before the handler runs. Passing the snapshot through the tool's normal input channel means handlers never know they're being replayed.

**Convention beats configuration.** Instead of adding a `capture_input=True` flag to tool definitions or special-casing move-shape, we made it automatic: any tool following the `mutation/` prefix convention gets covered. This scales to future tools without configuration changes.

**Schema-first eventually wins.** The TypeScript session state had hand-written `InputFeatureState` types that were working fine. But they existed outside the master schema, which violates our foundational principle. We added them to LinkML, generated the Pydantic and TypeScript models, and closed the gap. It took longer than keeping the hand-written type, but now the schema is canonical.

**Round-trip is the test.** A PROV log entry that survives Python → JSON → Python with `inputState` intact is one that will work in replay. We verified this explicitly: serialization, deserialization, model creation all pass. No silent data loss on round-trip.

## What's Next

The replay engine on the TypeScript side already reads `inputState` and uses it during parameter tuning — that code shipped months ago. Now the Python executor provides the same data, so MCP-only invocations (tools called outside VS Code) get the same coverage. Both paths converge on the canonical schema.

Chained mutations — applying move, then rotate, then scale — each operation now anchors to the geometry immediately before that step. The second operation in the chain captures the geometry after the first, not the original unmoved position. This gives analysts predictable behavior when stacking operations.

→ [See the implementation](https://github.com/debrief/debrief-future/pull/116)
→ [Read the spec](https://github.com/debrief/debrief-future/blob/main/specs/116-fix-move-tool-bearing/spec.md)
