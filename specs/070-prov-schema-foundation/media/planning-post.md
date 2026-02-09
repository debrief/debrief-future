---
layout: future-post
title: "Planning: PROV Schema Foundation"
date: 2026-02-09
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, schemas, provenance, architecture, prov]
excerpt: "Replacing two flat provenance implementations with a unified PROV-aligned schema for structured change tracking and audit trails."
---

## What We're Building

Right now, Future Debrief has two separate provenance implementations writing different keys (`provenance` vs `prov`) with flat, limited models. Every time a tool runs, we record *that it happened*, but not much else — no structured parameters, no change deltas, no activity IDs linking related operations.

We're replacing this with a unified PROV-aligned schema foundation. Provenance becomes an append-only array of Log entries on each GeoJSON feature. Each entry captures: what changed (property deltas), what was created (new features, STAC assets), what activity generated it (UUID), and structured parameters with types and tuning annotations. We're adding a system record (Point feature with empty coordinates) for plot-level metadata like snapshot links and branch records. This aligns with W3C PROV vocabulary (`wasGeneratedBy`, `used`, `generated`) and sets up every downstream PROV feature: the Log Service, Log Panel, undo/redo split, snapshots, branching, and replay.

## How It Fits

This is Phase 0 of a 7-phase epic (E02: PROV Logging Implementation). The other six phases — Log Service, Log Panel, undo/redo, snapshots, branching, replay — all depend on this schema foundation. Getting the contract right now means those features can proceed without revisiting the data model. It's the first tracer-bullet deliverable for structured change tracking in Future Debrief.

## Key Decisions

- **snake_case in schemas, camelCase in JSON**: LinkML uses snake_case; Pydantic aliases produce camelCase for JSON/TypeScript compatibility
- **New dedicated schema files**: `log-entry.yaml` and `system-record.yaml`, not bolted onto existing schemas
- **UUID v4 for activity IDs**: No prefix, shared across features in multi-feature operations
- **Provenance becomes an array**: Append-only log on each feature; old single-object format wrapped on read
- **Remove duplicate STAC provenance module**: One implementation, not two
- **System record uses Point with empty coordinates**: Not null geometry — keeps it valid GeoJSON for renderers
- **All new ToolResult fields optional**: Backward compatibility with existing tools
- **Breaking changes permitted**: Article XIV (Pre-Release Freedom) allows schema changes before v4.0.0

## What We'd Love Feedback On

- **Property delta granularity**: We're tracking old/new values for changed properties. Should we also track *who* requested the change (user ID, session ID)? Or keep that for Phase 1 (Log Service)?
- **Activity ID scoping**: One UUID per tool invocation, or one per *batch* of related operations? The spec currently says per-invocation.
- **System record discoverability**: System records are Point features with `kind: "system"`. Should they also have a STAC Item role to make them easier to filter in catalog queries?

> [See the spec](https://github.com/debrief/debrief-future/blob/main/specs/070-prov-schema-foundation/spec.md)
