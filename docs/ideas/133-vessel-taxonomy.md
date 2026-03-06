# [E08] Vessel taxonomy and hierarchical filtering

## Epic
Part of **E08: STAC Stack Browser Discovery UI**

## Problem
Vessel classification uses a formal hierarchical taxonomy. Filtering on a parent node must return all exercises involving any vessel in that subtree. The filter bar needs a hierarchical dropdown for vessel class selection.

## Proposed Solution
1. Define vessel taxonomy data model as a hierarchical tree structure
2. Express taxonomy as a STAC extension property (`vessel:class`)
3. Implement hierarchical dropdown in filter bar for vessel class selection
4. Parent node selection automatically includes all child vessel types
5. Taxonomy structure defined by development team; contents populated with analyst collaboration

## Success Criteria
- Hierarchical vessel taxonomy renders as a tree dropdown in filter bar
- Selecting a parent node filters for all vessels in that subtree
- Taxonomy data model is extensible (new vessel types can be added)
- Taxonomy expressed as STAC extension property for data/query interoperability
- Storybook stories demonstrate multi-level taxonomy navigation

## Dependencies
Requires #125 (STAC Extension spec), #127 (Filter bar)

## Complexity
Medium
