# [E08] Colour scheme engine with legend

## Epic
Part of **E08: STAC Stack Browser Discovery UI**

## Problem
Both the map and timeline views need a shared, configurable colour dimension to visually encode exercise properties. A legend must explain the current encoding.

## Proposed Solution
1. Configurable colour dimension selector (dropdown or similar control)
2. Initial colour dimensions: Age (gradient encoding recency), Vessel Class (one colour per class from taxonomy), Tag (colour by selected tag value)
3. Single colour scheme shared across map and timeline views
4. Legend component displayed alongside both map and timeline, explaining current colour encoding
5. Colour dimension list is extensible

## Success Criteria
- Colour dimension can be switched between Age, Vessel Class, and Tag
- Map and timeline views update to reflect selected colour scheme
- Legend accurately describes current colour encoding
- Extensible architecture allows adding new colour dimensions
- Storybook stories demonstrate each colour dimension

## Dependencies
Requires #130 (Map view), #131 (Timeline view)

## Complexity
Low
