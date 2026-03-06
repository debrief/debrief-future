# [E08] Saved filter configurations

## Epic
Part of **E08: STAC Stack Browser Discovery UI**

## Problem
Analysts frequently reuse the same filter combinations. They need to save, name, retrieve, and delete filter configurations for quick reapplication.

## Proposed Solution
1. Save button in filter bar saves current lozenge set as a named configuration
2. Optional name prompt on save
3. Historic Filters dropdown (outside filter bar) lists saved configurations
4. Selecting a saved configuration restores the full filter set
5. Delete option available in the historic filters dropdown
6. Configurations serialised as CQL2 JSON for portability and persistence

## Success Criteria
- Save current filter state with optional name
- List saved configurations in dropdown
- Restore a saved configuration (replaces current filters)
- Delete saved configurations
- Persistence survives session restart
- CQL2 JSON format used for serialisation

## Dependencies
Requires #127 (Filter bar with lozenge UI)

## Complexity
Low
