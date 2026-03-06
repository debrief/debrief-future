# [E08] Filter bar with lozenge UI and AND/OR logic

## Epic
Part of **E08: STAC Stack Browser Discovery UI**

## Problem
Analysts need a visual, interactive way to build complex metadata filter queries. The filter bar must support adding, editing, and removing individual filters displayed as lozenges, with AND logic by default and OR containers for disjunction.

## Proposed Solution
1. Persistent filter bar above results views with lozenge (pill) display per active filter
2. Plus (+) button opens dropdown of available filter types (vessel class, tags, author, duration, title, track name, nationality, folder)
3. Click lozenge to edit value; remove button to delete
4. OR container lozenge: add via + button, supports drag-in of existing lozenges or mini + to add new filters inside
5. One level of OR nesting only
6. All filter state serialised as CQL2 JSON

## Success Criteria
- All 10 filter types from SRD Section 4.4 are supported with appropriate input methods
- AND logic combines top-level lozenges correctly
- OR container groups lozenges with OR logic, AND'd with other top-level filters
- Drag-to-group interaction works for moving lozenges into OR containers
- Dynamic results update on every filter change
- Storybook stories demonstrate all filter combinations

## Dependencies
Requires #125 (STAC Extension spec + mock data fixtures), #126 (CQL2 filter engine)

## Complexity
Medium
