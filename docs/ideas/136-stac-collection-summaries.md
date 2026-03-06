# [E08] STAC Collection Summaries for Browser Backend

## Epic
Part of **E08: STAC Stack Browser Discovery UI**

## Problem
Debrief currently uses flat STAC Catalogs. The STAC Browser Discovery UI needs efficient filtering without loading every Item. STAC best practices recommend Collections with summaries for groups of related Items, enabling pre-aggregated metadata queries.

The SRD references "Folder / Collection" as a filter type (§4.4) and the CQL2 filter engine (#126) needs summary data to validate filter ranges, but there is no Collection support in the backend.

## Proposed Solution
1. Promote root-level Catalogs to STAC Collections when they contain Items
2. Auto-generate Collection summaries on catalog operations:
   - `datetime` range: min/max across all Items
   - `bbox` extent: union of all Item bounding boxes
   - Extension field summaries: distinct vessel classes, nationalities, tags
3. Update summaries incrementally when Items are added/removed (avoid full re-scan)
4. Expose summaries through the existing MCP and CLI interfaces

## Success Criteria
- Root catalogs are valid STAC Collections with `summaries` object
- Summaries include temporal range, spatial extent, and extension property enumerations
- Summaries updated incrementally on `create_plot` / `add_features` / `delete` operations
- CQL2 filter engine (#126) can use summaries for range validation
- Backwards-compatible: existing catalogs without summaries still load correctly

## Existing Code
- `services/stac/src/debrief_stac/catalog.py` — catalog creation and listing
- `services/stac/src/debrief_stac/types.py` — type definitions (would need `STACCollection`)
- `apps/vscode/src/services/stacService.ts` — already has child catalog traversal code (lines 134-155)

## Dependencies
- #125 — STAC Extension spec (defines which extension properties appear in summaries)

## Complexity
Medium

## Traceability
SRD action item BP-3 (§13.3 of `docs/stac-browser-srd.md`)
