# REP Loader Temporal Metadata

## Epic
Standalone — supports **E08: STAC Stack Browser Discovery UI** (Timeline/Gantt view) and general STAC best practices compliance

## Problem
The STAC best practices recommend that Items use `start_datetime` and `end_datetime` to bracket temporal extent, with `datetime` set to a representative value. Currently, the REP file loader sets `datetime` to the creation timestamp but does not compute or populate `start_datetime` / `end_datetime` from the actual track data.

This means:
- The Timeline/Gantt view (#131) cannot show accurate exercise duration
- The Duration filter (SRD §4.4) has no data to filter against
- Temporal range queries via CQL2 (#126) return imprecise results

## Proposed Solution
1. After parsing REP track data, compute the temporal extent from all track positions' timestamps
2. Set `start_datetime` to the earliest position timestamp across all tracks
3. Set `end_datetime` to the latest position timestamp across all tracks
4. Set `datetime` to the start time (or midpoint — to be decided during implementation)
5. Update the STAC Item properties via `debrief-stac` API

## Success Criteria
- REP files with track data produce Items with accurate `start_datetime` and `end_datetime`
- `datetime` is set to a meaningful representative value (not just "now")
- Edge case: REP files with no temporal data retain current behaviour (`datetime` = creation time, no start/end)
- Test coverage with sample REP files containing known time ranges

## Existing Code
- `services/io/src/debrief_io/` — REP parser
- `services/stac/src/debrief_stac/plot.py` — Item creation with datetime fields
- Track features already contain `times` arrays (epoch ms) and `positions` with ISO 8601 timestamps

## Dependencies
None

## Complexity
Low

## Traceability
SRD action item BP-4 (§13.3 of `docs/stac-browser-srd.md`) — rated **High** priority
