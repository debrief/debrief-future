# STAC Link Titles Improvement

## Epic
Standalone — supports **E08: STAC Stack Browser Discovery UI** but applies to core `debrief-stac` service

## Problem
STAC best practices recommend that all links carry meaningful titles matching the referenced entity's title. Currently:
- Item links in the catalog use the `item_id` (a UUID) as the title — not human-readable
- Structural links within Items (`root`, `parent`, `self`) have no titles at all

This causes UI flickering in STAC browsers that fall back to loading the target to discover its title, and makes raw JSON harder to navigate.

## Proposed Solution
1. Pass the plot title into `_add_item_link()` in `catalog.py` so catalog item-links carry meaningful titles (e.g., `"title": "Exercise Alpha 2024"` instead of `"title": "550e8400-..."`)
2. Add titles to structural links within Items: `"title": "Root catalog"` for `root`, `"title": "Parent catalog"` for `parent`, `"title": "<plot-title>"` for `self`
3. Update existing test fixtures to include link titles

## Success Criteria
- All `rel: "item"` links in catalog.json carry the plot's human-readable title
- All structural links (`root`, `parent`, `self`) in item.json carry descriptive titles
- Existing tests updated; no regressions
- Fixtures in `services/stac/tests/` reflect the new link format

## Existing Code
- `services/stac/src/debrief_stac/catalog.py` — `_add_item_link()` (lines 68-71)
- `services/stac/src/debrief_stac/plot.py` — structural link creation (lines 74-77)

## Dependencies
None

## Complexity
Low

## Traceability
SRD action items BP-1 and BP-2 (§13.3 of `docs/stac-browser-srd.md`)
