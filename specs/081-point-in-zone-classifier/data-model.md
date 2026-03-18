# Data Model: Point-in-Zone Classifier

**Feature**: 081-point-in-zone-classifier
**Date**: 2026-02-17

## Entities

### Input: Reference Point Feature (MultiPoint)

The classifier reads this feature produced by generate-reference-points (#078).

```
ReferencePointFeature
├── type: "Feature"
├── id: string                    # e.g., "ref-grid"
├── geometry
│   ├── type: "MultiPoint"
│   └── coordinates: [lon, lat][] # Array of 2D coordinate pairs
└── properties
    ├── kind: "POINT"
    ├── locationType: "REFERENCE"
    ├── name: string              # e.g., "Reference Points (grid 12)"
    ├── style
    │   ├── shape: "square"
    │   ├── color: "#666666"
    │   └── radius: 5
    └── pointMetadata: PointMetadataEntry[]  # Parallel to coordinates
```

### Input: Zone Feature (MultiPolygon)

The classifier reads this feature produced by buffer-zone-generator (#080).

```
ZoneFeature
├── type: "Feature"
├── id: string                    # e.g., "zone-<uuid>"
├── geometry
│   ├── type: "MultiPolygon"
│   └── coordinates: [ring][]     # Array of polygon rings (outer ring only per zone)
└── properties
    ├── kind: "ZONE"
    ├── name: string              # e.g., "Detection Zones (75%, 50%, 25%)"
    ├── style: ZoneStyle          # Feature-level style (innermost zone)
    └── zones: ZoneMetadata[]     # Per-zone metadata, ordered innermost → outermost
```

### ZoneMetadata

Per-zone metadata entry from the buffer-zone-generator.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| name | string | Zone label | "75%" |
| detection_likelihood_pct | integer | Detection probability (1-100) | 75 |
| buffer_distance_nm | float | Distance from track in nm | 3.0 |
| style | ZoneStyle | Per-zone rendering style | `{fill_color: "#9C27B0", ...}` |

### ZoneStyle

```
ZoneStyle
├── fill: boolean
├── fill_color: string    # Hex color, e.g., "#9C27B0"
├── fill_opacity: float
├── stroke: boolean
├── color: string         # Stroke color
├── weight: number
├── opacity: float
└── dash_array: string
```

### PointMetadataEntry (Extended)

The classifier extends existing `PointMetadataEntry` with `zone` and `color` fields.

| Field | Type | Required | Source | Description |
|-------|------|----------|--------|-------------|
| index | integer | yes | generate-reference-points | 0-based ordinal |
| name | string | yes | generate-reference-points | Human-readable label |
| zone | string | added by classifier | point-in-zone-classifier | Zone name or "none" |
| color | string | added by classifier | point-in-zone-classifier | Hex color for per-point rendering |

### Output: Classified Reference Feature

The classifier outputs a mutated copy of the input reference feature with:
1. Updated `pointMetadata` entries (zone + color added)
2. New `pointColors` array (parallel to coordinates)

```
ClassifiedReferenceFeature
├── type: "Feature"
├── id: string                    # Same as input
├── geometry
│   ├── type: "MultiPoint"
│   └── coordinates: [lon, lat][] # Same as input (unchanged)
└── properties
    ├── kind: "POINT"
    ├── locationType: "REFERENCE"
    ├── name: string              # Same as input
    ├── style
    │   ├── shape: "square"
    │   ├── color: "#666666"      # Default color (unchanged)
    │   └── radius: 5
    ├── pointMetadata: ExtendedPointMetadataEntry[]  # Updated with zone/color
    └── pointColors: string[]     # NEW: Hex colors parallel to coordinates
```

## State Transitions

The reference point feature transitions through the E03 pipeline:

```
[Generate Reference Points #078]
  → ReferencePointFeature (pointMetadata with index, name)
    → [Point-in-Zone Classifier #081]
      → ClassifiedReferenceFeature (pointMetadata + zone, color; pointColors added)
        → [Zone Histogram Generator #082]
          → ZoneHistogramDataset (counts per zone from classified metadata)
```

## Validation Rules

| Rule | Scope | Description |
|------|-------|-------------|
| V-001 | Input | Reference feature must have `kind: "POINT"` and `locationType: "REFERENCE"` |
| V-002 | Input | Reference feature must have MultiPoint geometry |
| V-003 | Input | Zone feature must have `kind: "ZONE"` |
| V-004 | Input | Zone feature must have MultiPolygon geometry |
| V-005 | Input | `pointMetadata.length` must equal `coordinates.length` |
| V-006 | Input | Zone feature must have non-empty `zones` array |
| V-007 | Output | `pointColors.length` must equal `coordinates.length` |
| V-008 | Output | Every pointMetadata entry must have `zone` and `color` fields |
| V-009 | Output | Geometry coordinates must be unchanged from input |
