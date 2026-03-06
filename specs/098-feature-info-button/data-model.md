# Data Model: Feature Info Button

**Feature**: 098-feature-info-button
**Date**: 2026-02-17

## Overview

This feature is read-only — it displays existing GeoJSON geometry data in a dialog. No new persistent data structures are introduced. The data model describes the transient state and props interfaces used by the new components.

## Entities

### GeometryData

Represents the geometry payload displayed in the info dialog. Derived from existing GeoJSON feature geometry.

| Field | Type | Description |
|-------|------|-------------|
| type | `string` | GeoJSON geometry type: "Point", "LineString", "MultiPoint", "MultiPolygon" |
| coordinates | `number[] \| number[][] \| number[][][] \| number[][][][]` | Coordinate array matching the geometry type |

**Source**: Extracted from `DebriefFeature.geometry` (TrackFeature, ReferenceLocation, MultiPointFeature, MultiPolygonFeature).

**For child rows**: Synthesised from parent feature geometry + child index:
- Position child → `{ type: "Point", coordinates: [lon, lat] }`
- Point child (MultiPoint) → `{ type: "Point", coordinates: parent.geometry.coordinates[index] }`
- Polygon child (MultiPolygon) → `{ type: "Polygon", coordinates: parent.geometry.coordinates[index] }`

### InfoDialogState

Transient UI state held in ActivityPanel (same pattern as `formatMenuState`).

| Field | Type | Description |
|-------|------|-------------|
| featureId | `string` | ID of the feature or child item |
| featureName | `string` | Display name (for dialog title) |
| geometry | `GeometryData` | The geometry to display |
| position | `{ x: number; y: number }` | Anchor position for dialog placement |

**Lifecycle**: Created when info button is clicked; set to `null` when dialog is dismissed.

## Relationships

```
DebriefFeature (existing)
  └── geometry (GeoJSON)
        └── displayed by → GeometryDialog (new)
                              └── positioned by → InfoDialogState (transient)

DisplayItem (existing, for child rows)
  ├── parentId → references DebriefFeature.id
  ├── index → child position within parent geometry
  └── used to derive → GeometryData for child-specific dialog
```

## Validation Rules

- `geometry.type` must be one of: "Point", "LineString", "MultiPoint", "MultiPolygon", "Polygon" (Polygon for child polygons of MultiPolygon)
- `geometry.coordinates` may be an empty array (edge case: feature with no coordinate data)
- `position.x` and `position.y` must be finite numbers (derived from `getBoundingClientRect()`)
- `featureId` must be a non-empty string

## State Transitions

```
[Closed] --click info button--> [Open]
[Open]   --click outside------> [Closed]
[Open]   --press Escape-------> [Closed]
[Open]   --click close button-> [Closed]
[Open]   --click different info button--> [Open] (with new feature data)
```

No intermediate loading or error states — geometry is always synchronously available.
