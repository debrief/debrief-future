# Data Model: Point and Rectangle Drawing

**Feature**: 094-point-rectangle-drawing
**Date**: 2026-02-13

## Entities

### Drawn Point Feature (uses existing ReferenceLocation schema)

A point drawn on the map by the analyst. Conforms to the existing `ReferenceLocation` schema.

| Field | Type | Required | Source | Notes |
|-------|------|----------|--------|-------|
| `type` | `"Feature"` | Yes | Constant | GeoJSON type discriminator |
| `id` | `string` | Yes | Generated | `crypto.randomUUID()` |
| `geometry` | `GeoJSONPoint` | Yes | Geoman output | `{ type: "Point", coordinates: [lon, lat] }` |
| `properties.kind` | `"POINT"` | Yes | Constant | FeatureKindEnum discriminator |
| `properties.name` | `string` | Yes | Default | "Drawn Point" (or "Drawn Point 2", etc.) |
| `properties.location_type` | `"REFERENCE"` | Yes | Default | LocationTypeEnum value |
| `properties.style` | `PointProperties` | Yes | Default | See Default Styling below |

### Drawn Rectangle Feature (uses existing RectangleAnnotation schema)

A rectangle drawn on the map by the analyst. Conforms to the existing `RectangleAnnotation` schema.

| Field | Type | Required | Source | Notes |
|-------|------|----------|--------|-------|
| `type` | `"Feature"` | Yes | Constant | GeoJSON type discriminator |
| `id` | `string` | Yes | Generated | `crypto.randomUUID()` |
| `geometry` | `GeoJSONPolygon` | Yes | Geoman output | Closed ring: `[sw, se, ne, nw, sw]` |
| `properties.kind` | `"RECTANGLE"` | Yes | Constant | FeatureKindEnum discriminator |
| `properties.label` | `string` | Optional | Default | "Drawn Rectangle" |
| `properties.style` | `PolygonProperties` | Yes | Default | See Default Styling below |

### Default Styling

**Point (PointProperties)**:

| Property | Value | Rationale |
|----------|-------|-----------|
| `shape` | `"circle"` | Standard marker shape |
| `radius` | `6` | Matches existing fixture defaults |
| `fill` | `true` | Solid fill for visibility |
| `fill_color` | `"#4CAF50"` | Green — distinct from track colours |
| `fill_opacity` | `0.7` | Semi-transparent |
| `stroke` | `true` | Outline for contrast |
| `color` | `"#388E3C"` | Darker green stroke |
| `weight` | `2` | Standard stroke width |
| `opacity` | `1.0` | Fully opaque stroke |

**Rectangle (PolygonProperties)**:

| Property | Value | Rationale |
|----------|-------|-----------|
| `fill` | `true` | Area fill for visibility |
| `fill_color` | `"#2196F3"` | Blue — matches existing area conventions |
| `fill_opacity` | `0.15` | Light fill, doesn't obscure map |
| `stroke` | `true` | Border for definition |
| `color` | `"#1976D2"` | Darker blue border |
| `weight` | `2` | Standard border width |
| `opacity` | `0.8` | Slightly transparent border |

## Validation Rules

### Geometry Validation

| Rule | Applies To | Check |
|------|-----------|-------|
| Non-null coordinates | Point, Rectangle | Geometry has valid coordinates |
| Closed ring | Rectangle | First coordinate === last coordinate |
| Non-zero area | Rectangle | Bounding box width > 0 AND height > 0 |
| Minimum vertices | Rectangle | At least 5 coordinates (4 corners + close) |

### Property Validation

| Rule | Applies To | Check |
|------|-----------|-------|
| Kind matches geometry | All | Point → "POINT", Polygon → "RECTANGLE" |
| Unique ID | All | `id` is a valid UUID |
| Style present | All | `properties.style` is not null/undefined |
| Required fields | Point | `name` and `location_type` are populated |

## State Transitions

```
Drawing Mode Lifecycle:
┌─────────────┐     shape selected      ┌──────────────┐
│  Inactive    │ ──────────────────────► │   Drawing    │
│ (mode=null)  │                         │ (mode=point  │
└─────────────┘ ◄────────────────────── │  or rect)    │
                    shape completed      └──────────────┘
                    or cancelled              │
                                              │ pm:create event
                                              ▼
                                        ┌──────────────┐
                                        │  Converting  │
                                        │  (transient) │
                                        └──────┬───────┘
                                               │ feature added
                                               │ to collection
                                               ▼
                                        ┌──────────────┐
                                        │  Selected    │
                                        │  (new feat)  │
                                        └──────────────┘
```

## Relationships

```
FeatureCollection (active plot)
  ├── TrackFeature[] (loaded from data files)
  ├── ReferenceLocation[] (loaded from data files + drawn points)
  ├── RectangleAnnotation[] (loaded from data files + drawn rectangles)
  └── ... other annotation types

DrawingMode (session-state, ephemeral)
  → Controls which Geoman mode is active
  → Reset to null on shape completion

Selection (session-state)
  → Updated to [newFeature.id] after drawing
  → Existing selection is replaced (not appended)
```
