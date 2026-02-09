---
layout: future-post
title: "Planning: PROV Logging Integration"
date: 2026-02-08
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, provenance, session-state, architecture]
excerpt: "Mapping the gap from flat provenance to a full W3C PROV-inspired logging system"
---

## What We're Building

Every analysis tool in Debrief produces results -- bearing calculations, range measurements, speed estimates. Right now, we record a simple provenance stamp: which tool ran, what version, when. That's enough to know what happened, but not enough to undo it, replay it with different parameters, or branch off to explore an alternative hypothesis.

The SRD defines a W3C PROV-inspired logging system that closes this gap. Each tool invocation becomes a structured Log entry with typed parameters (including which ones the analyst can tune), explicit input/output feature references, and a shared activity ID that links multi-feature operations. A new TypeScript Log Service assembles these entries into a timeline that supports undo, snapshots, branching, and parameter replay -- all offline, all stored on the GeoJSON features themselves. For analysts, this means being able to ask "what if I'd used a 30-second interval instead of 60?" and have the system replay the calculation chain from that point forward. For auditors, it means a complete, immutable record of every analytical step.

## How It Fits

This sits at the intersection of two constitutional principles: Article III (every transformation records lineage) and Article IV (services never touch UI). Python calc services remain stateless -- they return expanded ToolResults with structured change tracking. The TypeScript Log Service, living in session-state, wraps those results in PROV-vocabulary entries and writes them to feature properties. The SRD lays out six priorities targeting the March 2026 demonstration, and this transition plan maps each one to concrete implementation phases with clear dependencies.

## Key Decisions

- **Expand ToolResult, don't replace it**: The current Python model gets new fields -- `modifiedFeatures` with property deltas, `createdAssets` with stable identifiers, typed `parameters` with default/tunable annotations. Existing fields stay. Every calc tool populates the expanded contract; the Log Service consumes it.

- **Log Service is TypeScript, not Python**: It's a session-state concern. Python services return data; the Log Service wraps it, assigns activity IDs, and writes entries to feature properties in the Zustand store. No new Python service, no network dependency.

- **UI undo stays separate from data history**: The current undo middleware handles viewport, time controls, visibility -- all display state. Only one field (`featureCollectionUri`) crosses the boundary into data territory. The split is clean: remove two fields from the undo snapshot, leave the rest unchanged.

- **Unify the dual provenance formats**: Today, `debrief-calc` writes `properties.provenance` and `debrief-stac` writes `properties.prov` -- two formats, same purpose, different shapes. Both get replaced by a single PROV-aligned model with `activityId`, `wasGeneratedBy`, `used`, and `generated` fields.

- **Seven phases, no circular dependencies**: Schema foundation first, then Log recording, then four parallel-capable phases (Log panel, undo split, snapshots, branching/replay). Each phase maps to an SRD priority and produces a self-contained backlog item.

## What We'd Love Feedback On

The transition plan is a gap analysis -- it maps every interface change between the current codebase and the SRD target. Some of the phasing decisions have real trade-offs:

1. **Undo/redo split timing**: Phase 3 narrows the undo middleware after Log recording is in place. Should we do it earlier, during schema work, to avoid two rounds of test updates? Or is the current sequencing right -- prove the Log works first, then shrink the middleware?

2. **Provenance migration strategy**: We're replacing both existing formats in one step, leveraging Article XIV (pre-release breaking changes permitted). Is a hard cut the right call, or would a transitional period with format detection reduce coordination risk across in-flight features?

3. **Snapshot granularity**: The SRD defines snapshots as clean-state checkpoints that reset the Log. Should snapshots be automatic (every N operations) or analyst-initiated only? The plan currently assumes analyst-initiated, but automatic snapshots could prevent unbounded Log growth.

[Join the discussion](https://github.com/debrief/debrief-future/discussions)
