---
layout: future-post
title: "Shipped: PROV Logging Transition Plan"
date: 2026-02-08
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, provenance, session-state, architecture]
excerpt: "A 600-line transition plan mapping every interface change for W3C PROV-inspired logging"
---

## What We Built

I spent the last few days mapping the gap between our current codebase and the PROV logging target in the SRD. The result is a 600-line transition plan that covers every file, interface, and breaking change needed to get from flat provenance stamps to a full PROV-vocabulary logging system.

The plan breaks down into 7 implementation phases: schema foundation (LinkML models and expanded ToolResult), log recording (TypeScript service that wraps tool outputs), log panel UI, undo/redo split, snapshots, branching, and replay/tuning. Each phase maps directly to an SRD priority and produces a standalone backlog item with acceptance criteria and test requirements. The dependency graph shows no circular dependencies — you can implement Phase 0 today without touching anything else.

## Lessons Learned

The gap was larger than I expected in provenance. Moving from a flat `{tool, version, timestamp, sources, parameters}` stamp to structured Log entries with activity IDs, typed parameters, and output tracking touches 27 files. The Python side needs 4 new model types (ModifiedFeature, PropertyDelta, CreatedAsset, ParameterValue), and the TypeScript side needs a new Log Service library.

The gap was smaller than I expected in undo/redo. Only 2 of 12 fields in the StateSnapshot need to move out — `featureCollectionUri` and `savePath`. The rest are already UI-only (viewport, time controls, selection, visibility). The 50-step limit and smart recording logic stay unchanged.

Planning surfaced a latent problem: we had two provenance formats. The calc service wrote to `properties.provenance`, and the stac service wrote to `properties.prov`. Both were flat, both incomplete, and nothing reconciled them. The new schema unifies them into a single PROV-aligned array that both services use.

## What's Next

Phase 0 is the schema foundation: LinkML models for Log entries, expanded ToolResult with structured change tracking, provenance migration, and system record creation. It's the prerequisite for everything else. Once that lands, Phase 1 adds the Log Service library and wires it into the tool execution workflow.

> [See the plan](https://github.com/debrief/debrief-future/blob/main/docs/architecture/prov-transition-plan.md)
