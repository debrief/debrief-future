# Research: REP Loader Temporal Metadata (#137)

**Date**: 2026-03-18
**Feature**: 137-rep-temporal-metadata

## Decision 1: Where to compute temporal extent

**Decision**: Add a Python-side `update_temporal_metadata()` function in `services/stac/src/debrief_stac/plot.py`, exposed via MCP tool.

**Rationale**: The TypeScript `stacService.updateTemporalMetadata()` already does this client-side (reads GeoJSON, scans `times` arrays, writes `start_datetime`/`end_datetime` to item.json). However, per Constitution Article IV ("services never touch UI; frontends never persist"), temporal computation is domain logic that belongs in the Python service layer, not the TypeScript frontend. The existing TS implementation works but violates architectural boundaries by performing data persistence directly.

**Alternatives considered**:
- **Extend PlotMetadata with temporal fields and set at create time**: Rejected because at `create_plot()` time, features haven't been added yet — temporal data is only available after `add_features()`.
- **Compute in REP handler and pass through**: Rejected because temporal aggregation is a STAC concern (cross-track global extent), not an I/O concern.
- **Keep only the TypeScript implementation**: Rejected due to Constitution Article IV violation and because other frontends (Jupyter, Electron loader) would need duplicate logic.

## Decision 2: What `datetime` should be set to

**Decision**: Set `datetime` to the exercise start time (earliest track timestamp).

**Rationale**: STAC best practices allow `datetime` to be null when `start_datetime`/`end_datetime` are present, but many consumers use `datetime` for simple sorting and display. Setting it to the start time is most intuitive for chronological browsing of exercises. The SRD suggests either midpoint or start — start is simpler and more predictable.

**Alternatives considered**:
- **Midpoint**: Would confuse users who expect "date" to mean "when it started"
- **Null (STAC-compliant)**: Some downstream consumers may not handle null gracefully
- **Keep as creation time**: Defeats the purpose of the feature

## Decision 3: Python function design

**Decision**: Add `update_temporal_metadata(catalog_path, plot_id)` that reads the plot's features, computes extent, and updates the item JSON. Expose as MCP tool.

**Rationale**: Follows the same pattern as `add_features()` and other post-creation updates. The function reads `features.geojson` from the plot directory, iterates track features for `start_time`/`end_time` properties (already ISO 8601), and writes `start_datetime`/`end_datetime`/`datetime` to `item.json`.

**Implementation notes**:
- Use `start_time`/`end_time` from track feature properties (not the `times` epoch ms array) — they're already ISO 8601 strings and available
- The existing TypeScript implementation uses `times[]` epoch ms array — the Python version should use `start_time`/`end_time` properties for consistency with the schema (TrackProperties defines these as required fields)
- Fall back gracefully: if no tracks or no temporal data, leave `datetime` unchanged

## Decision 4: TypeScript migration path

**Decision**: Replace the body of the existing TS `updateTemporalMetadata()` with an MCP call to the new Python tool.

**Rationale**: The TypeScript method already exists and is called from `importRep.ts`. Rather than removing it (which would break the existing workflow), we delegate to the Python service. This aligns with the "thick services, thin frontends" principle.

**Alternatives considered**:
- **Delete TS method entirely**: Would require updating importRep.ts flow — unnecessary churn
- **Keep both implementations**: Duplication violates DRY and risks drift

## Decision 5: Collection extent propagation

**Decision**: No changes needed — existing `_extract_item_extent()` in `collection.py` already reads `start_datetime`/`end_datetime` from item properties.

**Rationale**: The collection summaries feature (#136) already handles temporal extent aggregation. Once items have `start_datetime`/`end_datetime`, collection-level extent updates automatically.
