# Data Model: Client-Side CQL2 Filter Engine

**Feature**: 126-cql2-filter-engine
**Date**: 2026-03-06

## Entity: FilterExpression

The top-level filter state. Represents the complete set of active filters.

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `predicates` | `Predicate[]` | No | `[]` | Top-level predicates, combined with AND logic |
| `orGroups` | `OrGroup[]` | No | `[]` | OR groups, each AND'd with top-level predicates |

### Validation Rules

1. Empty expression (no predicates, no OR groups) is valid — matches all items
2. Each `orGroup` MUST contain at least 1 predicate
3. No nested OR groups (one level of OR nesting only)

### Evaluation Semantics

```
result = items.filter(item =>
  predicates.every(p => matches(item, p)) &&
  orGroups.every(g => g.predicates.some(p => matches(item, p)))
)
```

## Entity: Predicate

A single filter condition. Maps to a CQL2 comparison expression.

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `type` | `FilterType` | Yes | One of the defined filter type enum values |
| `value` | `string` | Yes | The filter value (interpretation depends on `type`) |

### FilterType Enum

| Value | STAC Property | Match Semantics |
|-------|---------------|-----------------|
| `vessel-class` | `debrief:vessel_classes` | Array contains value OR any descendant of value in taxonomy |
| `plot-tag` | `debrief:tags` | Array contains value (case-insensitive) |
| `feature-tag` | `debrief:feature_tags` | Array contains value (case-insensitive) |
| `author` | `debrief:author` | Exact match (case-insensitive) |
| `duration` | computed from `start_datetime`, `end_datetime` | Duration falls within bucket range |
| `title` | `title` | Substring match (case-insensitive) |
| `track-name` | `debrief:track_names` | Array contains value (case-insensitive) |
| `nationality` | `debrief:nationalities` | Array contains value (case-insensitive) |
| `collection` | parent collection ID | Exact match |

### Duration Bucket Values

| Value | Meaning | Condition |
|-------|---------|-----------|
| `<6H` | Under 6 hours | `duration < 6 * 60 * 60 * 1000` |
| `<24H` | Under 24 hours | `duration < 24 * 60 * 60 * 1000` |
| `<72H` | Under 72 hours | `duration < 72 * 60 * 60 * 1000` |
| `<10D` | Under 10 days | `duration < 10 * 24 * 60 * 60 * 1000` |
| `>10D` | 10 days or more | `duration >= 10 * 24 * 60 * 60 * 1000` |

Duration is computed as `end_datetime - start_datetime` in milliseconds. If either is absent, duration is 0.

## Entity: OrGroup

A container for OR-combined predicates.

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `predicates` | `Predicate[]` | Yes | At least 1 predicate |

### Evaluation Semantics

An item matches an OrGroup if it matches ANY predicate in the group.

## Entity: VesselTaxonomyNode

Hierarchical vessel classification for expanding parent-node filters. Provided by #125.

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Slug format (lowercase, hyphens) |
| `label` | `string` | Yes | Human-readable display name |
| `children` | `VesselTaxonomyNode[]` | No | Child nodes |

### Descendant Expansion

Items store vessel classes as **full taxonomy paths** (e.g., `"surface/warship/frigate/type23"`), as defined by #125. The engine must expand a filter node ID to all full paths under that node.

Given a taxonomy:
```
surface/warship/frigate/type23
surface/warship/frigate/type26
surface/warship/destroyer/type45
```

Filtering on `warship` expands to the set of full paths:
```
["surface/warship", "surface/warship/frigate", "surface/warship/frigate/type23",
 "surface/warship/frigate/type26", "surface/warship/destroyer",
 "surface/warship/destroyer/type45"]
```

An item matches if any of its `vesselClasses` entries appears in this expanded set.

The engine pre-computes a map at construction time: `{ nodeId → Set<fullPath> }` for every node in the taxonomy. Example:
```
{
  "surface":   Set(["surface", "surface/warship", "surface/warship/frigate", ...]),
  "warship":   Set(["surface/warship", "surface/warship/frigate", ...]),
  "frigate":   Set(["surface/warship/frigate", "surface/warship/frigate/type23", ...]),
  "type23":    Set(["surface/warship/frigate/type23"]),
  ...
}
```

The filter value is a **node ID** (e.g., `"warship"`), not a full path. The expansion map resolves it to all descendant full paths for matching against item data.

## Entity: StacBrowserItem

Extended version of `CatalogOverviewItem` with STAC extension properties. This is the input type for the filter engine.

| Field | Type | Required | Source |
|-------|------|----------|--------|
| `id` | `string` | Yes | STAC core |
| `title` | `string` | Yes | `item.properties.title` |
| `itemPath` | `string` | Yes | File path |
| `bbox` | `[number, number, number, number] \| null` | No | STAC core |
| `datetime` | `string \| null` | No | `item.properties.datetime` |
| `startDatetime` | `string \| null` | No | `item.properties.start_datetime` |
| `endDatetime` | `string \| null` | No | `item.properties.end_datetime` |
| `vesselClasses` | `string[]` | No | `item.properties["debrief:vessel_classes"]` |
| `tags` | `string[]` | No | `item.properties["debrief:tags"]` |
| `featureTags` | `string[]` | No | `item.properties["debrief:feature_tags"]` |
| `author` | `string \| null` | No | `item.properties["debrief:author"]` |
| `trackNames` | `string[]` | No | `item.properties["debrief:track_names"]` |
| `nationalities` | `string[]` | No | `item.properties["debrief:nationalities"]` |
| `collection` | `string \| null` | No | `item.collection` or parent collection ID |

### Relationship to CatalogOverviewItem

`StacBrowserItem` extends `CatalogOverviewItem` with the additional STAC extension properties defined by #125. Existing components using `CatalogOverviewItem` remain unchanged.

## Entity: CQL2JsonExpression

The CQL2 JSON representation of a FilterExpression. Not a runtime entity — this is the serialised output format.

### Structure Mapping

| FilterExpression | CQL2 JSON |
|-----------------|-----------|
| Single predicate | `{"op": "=", "args": [{"property": "name"}, "value"]}` |
| AND (multiple predicates) | `{"op": "and", "args": [...predicates]}` |
| OR group | `{"op": "or", "args": [...predicates]}` |
| AND + OR groups | `{"op": "and", "args": [...predicates, {"op": "or", ...}]}` |
| Array contains | `{"op": "a_containedBy", "args": [["value"], {"property": "name"}]}` |
| LIKE (title search) | `{"op": "like", "args": [{"property": "title"}, "%search%"]}` |
| Empty expression | `{}` (match all) |
