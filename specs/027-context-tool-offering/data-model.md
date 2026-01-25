# Data Model: Context-Sensitive Tool Offering

**Feature**: Context-Sensitive Tool Offering
**Date**: 2026-01-24

## Entities

### Tool

An analysis operation that can be applied to selected features.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Display name for the tool |
| description | string | Yes | Brief description of what the tool does |
| version | string | Yes | Semantic version (e.g., "1.0.0") |
| requirements | SelectionRequirement[] | Yes | Array of selection constraints |

**Validation Rules**:
- `name` must be non-empty
- `version` must be valid semver
- `requirements` may be empty (tool accepts any selection)

**Example**:
```json
{
  "name": "Range Calculation",
  "description": "Calculate range and bearing between two tracks",
  "version": "1.0.0",
  "requirements": [
    { "kind": "track", "min": 2, "max": 2 }
  ]
}
```

### SelectionRequirement

A constraint specifying which feature kinds a tool accepts.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| kind | string | Yes | Feature kind (e.g., "track", "point") |
| min | number | Yes | Minimum count required (0 = optional) |
| max | number | Yes | Maximum count allowed |

**Validation Rules**:
- `kind` must be non-empty string
- `min` must be >= 0
- `max` must be >= `min`
- `max` may be `Infinity` for unlimited (represented as `null` in JSON)

**Example**:
```json
{ "kind": "track", "min": 2, "max": 2 }
```

### Selection

The current set of selected features.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| features | Feature[] | Yes | Array of selected GeoJSON features |

**Derived Properties**:
- `countsByKind`: Map<string, number> - Computed count of features per kind

**Example**:
```json
{
  "features": [
    { "type": "Feature", "properties": { "kind": "track" }, "geometry": {...} },
    { "type": "Feature", "properties": { "kind": "track" }, "geometry": {...} }
  ]
}
```

### MatchResult

Output of the matching algorithm for a single tool.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| tool | Tool | Yes | The tool being evaluated |
| isActive | boolean | Yes | Whether tool matches current selection |
| inactiveReason | string | No | Explanation if tool is inactive |

**Example (active)**:
```json
{
  "tool": { "name": "Range Calculation", ... },
  "isActive": true
}
```

**Example (inactive)**:
```json
{
  "tool": { "name": "Range Calculation", ... },
  "isActive": false,
  "inactiveReason": "Requires 2 tracks (1 selected)"
}
```

## Relationships

```
Tool ──────┬──── 1:N ────── SelectionRequirement
           │
Selection ─┴──── evaluated against ────▶ MatchResult[]
```

## State Transitions

This feature involves no persistent state in Phases 1-2. All matching is computed on-demand from the current selection.

**Future (Phase 3)**: Tool execution will produce ResultEnvelope with state transitions (add/update/remove features).

## Fixture Data Requirements

### features.json

Sample GeoJSON features for testing:
- 3 tracks (track-1, track-2, track-3)
- 2 reference locations (ref-1, ref-2)
- 2 points (point-1, point-2)

### tools.json

Sample tool definitions for testing:
- "Range Calculation" - requires exactly 2 tracks
- "Bearing to Point" - requires 1 track + 1 point
- "Area Analysis" - requires 3+ reference locations
- "Track Summary" - requires 1+ tracks (no max)
- "Global Statistics" - no requirements (always active)
