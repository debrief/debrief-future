# [E08] Client-side CQL2 filter engine

## Epic
Part of **E08: STAC Stack Browser Discovery UI**

## Problem
The filter bar's AND/OR logic must be validated without a backend. A reference CQL2 filter implementation is needed for Storybook development and to ensure the query model is correct before production integration.

## Proposed Solution
Implement a client-side CQL2 filter function that:
1. Operates on the mock data array (fixture item.json files)
2. Supports AND conjunction of multiple filter predicates
3. Supports OR disjunction within OR container groups
4. Handles all filter types: vessel class, tags, author, duration, title, track name, nationality, folder/collection
5. Produces CQL2 JSON serialisation for portability

## Success Criteria
- Filter function correctly applies AND/OR logic on mock data
- All filter types from SRD Section 4.4 are supported
- CQL2 JSON serialisation matches OGC CQL2 spec structure
- Unit tests cover AND, OR, nested AND+OR, and edge cases (empty filters, no matches)

## Dependencies
Requires #125 (STAC Extension spec + mock data fixtures)

## Complexity
Medium
