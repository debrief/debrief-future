# [E02] Implement branching from history point (SRD P5)

## Epic
Part of **E02: PROV Logging Implementation** — Phase 5

## Problem
Analysts sometimes want to explore "what if" scenarios by branching from a point in history. Currently there is no way to duplicate a plot's state at a specific point and continue analysis in a different direction.

## Proposed Solution
1. Implement `branchFrom(activityId)` in Log Service — creates new plot with state at that history point
2. Create new STAC Item for branch plot via `stacService`
3. Populate `branches[]` array on source system record with two-way links
4. Add "Branch from here" action in Log Panel
5. Ensure branch plot's Log is trimmed to the branch point

## Success Criteria
- `branchFrom(activityId)` creates a new plot with state at that point
- Source and branch plots both record the link in their system records
- Branch plot's Log is trimmed to the branch point

## Dependencies
- #074 (Snapshots — requires snapshot infrastructure for state reconstruction)

## Complexity
Medium

## Reference
- [Transition Plan: Phase 5](docs/architecture/prov-transition-plan.md#phase-5-branching-srd-p5)
- [SRD Section 4.6](docs/srd-prov-undo.md)
