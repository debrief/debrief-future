# Plan PROV Logging Integration with Application State

**ID:** 069
**Category:** Infrastructure
**Status:** proposed

---

## Problem

Application state (session-state Zustand store, ToolResult models, GeoJSON provenance) was implemented without awareness of the PROV logging design described in `docs/srd-prov-undo.md` and `docker/code-server/ux-log-panel.md`. These SRD documents define a rich provenance system (W3C PROV vocabulary, Log Service, Log Panel, snapshots, branching, replay) but the current codebase has a simpler model. A transition plan is needed before implementation can begin.

## Proposed Solution

Produce an architecture/design document that bridges the gap between the current state and the SRD target. The plan should cover:

1. **ToolResult contract expansion** — current `ToolResult` (tool, success, features, error, duration_ms) needs to grow to include `modifiedFeatures` (with property deltas), `createdFeatures`, `createdAssets` (with resultId/path), full resolved parameters including defaults
2. **Log Service design** — new TypeScript shared library that wraps ToolResults into PROV-vocabulary Log entries (`activityId`, `wasGeneratedBy`, `used`, `generated`, `tune`) and writes them to feature properties
3. **Undo/redo split** — separate the current 50-step undo middleware into UI-only undo/redo (viewport, time, visibility) vs data-change Log; clarify responsibilities
4. **Provenance schema migration** — current `feature.properties.provenance` / `feature.properties.prov` replaced with SRD's richer PROV-aligned model; existing sample data, fixtures, and plots updated to new schema (no backward compatibility — Article XIV)
5. **System record feature** — null-geometry feature for snapshot links, branch records, file-level history
6. **Phased implementation sequence** — map SRD priorities (P1: Log Recording -> P2: Log Panel -> P3: Undo/Redo -> P4: Snapshots -> P5: Branching -> P6: Replay) to concrete backlog items with dependencies
7. **Session-state integration points** — how the Log Service interacts with the Zustand store, dirty tracking, and persistence via stacService

## Success Criteria

- Transition plan document that covers all 7 areas above
- Clear dependency graph between implementation phases
- Identified breaking changes to existing interfaces (ToolResult, provenance schema, undo middleware)
- Each phase is self-contained enough to become its own backlog item or epic

## Constraints

- Must work offline (CONSTITUTION Article I)
- Provenance is mandatory (CONSTITUTION Article III) — this is not optional
- Log Service must be TypeScript (session-state concern, not Python domain logic — per SRD A.2)
- Python services remain stateless — they return ToolResults, Log Service wraps them
- Break existing provenance schema freely (Article XIV: Pre-Release Freedom); fix all sample data/fixtures to match new schema

## Out of Scope

- Actual implementation of Log Service, Log Panel, replay engine (separate items after planning)
- LinkML schema authoring (follows from the plan)
- UX prototyping for Log Panel (covered separately in ux-log-panel.md)
