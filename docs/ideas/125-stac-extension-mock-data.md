# [E08] STAC Extension spec + mock data fixtures

## Epic
Part of **E08: STAC Stack Browser Discovery UI**

## Problem
The Discovery UI requires agreed property names and data structures before any component development can begin. Without a formal STAC Extension spec and mock data fixtures, there is no contract between UI and backend.

## Proposed Solution
1. Author a STAC Extension spec defining the namespace and property names for: vessel class (`vessel:class`), plot-level tags, feature-level tags, author, track names, nationalities, and duration representation
2. Create a set of fixture `item.json` files covering variety of vessel classes, tags, authors, durations, nationalities, geographic extents, time ranges, and edge cases (zero/single/large result sets)
3. Document the mock data contract before Storybook development begins

## Success Criteria
- STAC Extension spec document published with defined namespace and property schema
- Fixture set of ≥10 realistic `item.json` files created
- Mock data contract reviewed and agreed by team
- Duration representation (computed vs stored) decided and documented

## Existing Code

The `CatalogOverview` component (#042) at `shared/components/src/CatalogOverview/` already consumes STAC item data with `bbox`, `datetime`, `startDatetime`, `endDatetime` fields via the `CatalogOverviewItem` interface. The mock data fixtures should extend this existing contract with the new extension properties (vessel class, tags, etc.) rather than starting from scratch. See `StacService.listItems()` for the current STAC data loading pipeline.

## Dependencies
None — this is the foundational prerequisite for all other E08 items

## Complexity
Medium
