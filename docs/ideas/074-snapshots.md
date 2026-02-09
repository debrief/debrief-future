# [E02] Implement snapshots with doubly-linked chain (SRD P4)

## Epic
Part of **E02: PROV Logging Implementation** — Phase 4

## Problem
As analysts make many tool-driven changes, the working GeoJSON file grows with accumulated Log entries on every feature. There is no mechanism to create clean checkpoints or access history beyond the current working file.

## Proposed Solution
1. Implement `createSnapshot()` in Log Service — saves clean GeoJSON (no Log entries on features)
2. Implement doubly-linked chain via system record (`snapshotLinks.prev`/`next`)
3. Store snapshot assets in STAC Item via `stacService`
4. Add "Capture snapshot from here" action
5. Add "Show earlier history" in Log Panel (loads entries from previous snapshot)
6. Add cross-snapshot timeline assembly

## Success Criteria
- `createSnapshot()` saves clean GeoJSON with Log entries stripped
- Working file and snapshot are doubly-linked via system record
- Log Panel shows "Show earlier history" when snapshot boundary exists
- Previous entries are loadable on demand

## Dependencies
- #071 (Log Recording service)

## Complexity
Medium

## Reference
- [Transition Plan: Phase 4](docs/architecture/prov-transition-plan.md#phase-4-snapshots-srd-p4)
- [SRD Sections 4.3-4.5, Annex A.5](docs/srd-prov-undo.md)
