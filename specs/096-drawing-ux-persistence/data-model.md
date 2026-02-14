# Data Model: Drawing UX Guidance and STAC Persistence

**Feature**: 096-drawing-ux-persistence
**Date**: 2026-02-14

## Entities

### 1. DrawingGuidance

Represents the mode-specific instruction text shown to the analyst during drawing.

| Field | Type | Description |
|-------|------|-------------|
| `instruction` | `string` | Mode-specific drawing instruction (e.g., "Click to place point") |
| `cancelHint` | `string` | Universal cancellation hint ("Press Esc to cancel") |

**Mapping to DrawingMode**:

| DrawingMode | Instruction Text |
|-------------|------------------|
| `'point'` | "Click to place point" |
| `'rectangle'` | "Click and drag to draw rectangle" |
| `'polygon'` | "Click to add vertices, double-click to finish" |
| `'polyline'` | "Click to add vertices, double-click to finish" |
| `null` | (no guidance displayed) |

**Lifecycle**: Ephemeral — exists only while `drawingMode` is non-null. Derived from the `drawingMode` state field; not stored independently.

### 2. DrawingPalette

An ordered set of colours used for sequential assignment to newly drawn shapes.

| Field | Type | Description |
|-------|------|-------------|
| `colours` | `string[]` | Array of 8 hex colour values in assignment order |
| `currentIndex` | `number` | Index of the next colour to assign (0-based, wraps modulo length) |

**Colour Values** (from research R2):

| Index | Hex Code | Name | Original Default For |
|-------|----------|------|---------------------|
| 0 | `#2196F3` | Blue | Rectangle |
| 1 | `#FF9800` | Orange | Polygon |
| 2 | `#00BCD4` | Teal | Polyline |
| 3 | `#9C27B0` | Purple | — |
| 4 | `#4CAF50` | Green | Point |
| 5 | `#F44336` | Red | — |
| 6 | `#795548` | Brown | — |
| 7 | `#607D8B` | Blue-grey | — |

**Cycling rule**: `nextColour = colours[currentIndex % colours.length]`; `currentIndex` increments by 1 after each shape creation.

**Lifecycle**: `currentIndex` is ephemeral (resets to 0 on session start). The palette array itself is a constant.

### 3. ProvenanceEntry (extension of existing pattern)

A single provenance log entry recorded for a user-drawn feature. Extends the pattern from feature 071 (Log Recording Service).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source` | `string` | Yes | Always `"user-drawn"` for shapes created via drawing tools |
| `timestamp` | `string` (ISO 8601) | Yes | UTC timestamp at feature creation time |
| `operator` | `string` | Yes | User identifier from config, or `"unknown"` if unavailable |
| `action` | `string` | Yes | `"created"` for initial drawing |

**Storage location**: Embedded in `feature.properties.provenance` as an array entry. Compatible with the existing `stacService.appendProvenance()` method.

**Example**:
```json
{
  "source": "user-drawn",
  "timestamp": "2026-02-14T10:30:00.000Z",
  "operator": "analyst-1",
  "action": "created"
}
```

### 4. UserDrawnFeature (extension of existing GeoJSON Feature)

A GeoJSON Feature that has been created through drawing interaction. Structurally identical to features from 094/095 (`ReferenceLocation`, `RectangleAnnotation`, `PolyAnnotation`, `LineAnnotation`), but distinguished by the presence of provenance metadata with `source: "user-drawn"`.

**Additional properties** (beyond schema base):

| Field | Type | Description |
|-------|------|-------------|
| `properties.provenance` | `ProvenanceEntry[]` | Provenance log entries, including the creation entry |
| `properties.style.color` | `string` | Stroke colour from drawing palette (overrides per-type default) |
| `properties.style.fill_color` | `string` | Fill colour from drawing palette (for area shapes) |

**Relationship to existing entities**: UserDrawnFeature is not a new schema type — it uses the existing `ReferenceLocation`, `RectangleAnnotation`, `PolyAnnotation`, or `LineAnnotation` types with provenance metadata added. The `createDrawnFeature()` function's `options` parameter is extended to accept palette colours.

## State Transitions

### DrawingMode Lifecycle (existing, unchanged)

```
null → 'point' | 'rectangle' | 'polygon' | 'polyline'  (user selects from palette)
  ↓
active mode → null  (shape completed, Escape pressed, or '+' clicked)
```

### Guidance Overlay Lifecycle (new)

```
Hidden  →  Visible (drawingMode transitions from null to any mode)
  ↓           ↓
  ←   Hidden (drawingMode transitions to null)
  ←   Updated (drawingMode transitions between non-null modes)
```

### Feature Persistence Lifecycle (new)

```
Shape Drawn → createDrawnFeature() → Added to Session State → stacService.addFeatures()
                                            ↓                         ↓
                                     Visible on Map              appendProvenance()
                                                                      ↓
                                                               Persisted to STAC
                                                                      ↓
                                                          (on failure: notification shown,
                                                           feature remains in session)
```

### Palette Index Lifecycle (new)

```
Session Start: index = 0
Shape Created: colour = palette[index % 8]; index++
Session End: index discarded (not persisted)
```

## Relationships

```
DrawingMode (spatial slice)
    ├── determines → DrawingGuidance text (via lookup table)
    ├── triggers  → cursor crosshair (via CSS class on map container)
    └── consumed by → createDrawnFeature() on shape completion

DrawingPalette (spatial slice index + constant array)
    └── provides → colour to CreateDrawnFeatureOptions.style override

UserDrawnFeature (GeoJSON Feature)
    ├── stored in → Session State (immediate)
    ├── persisted to → STAC Item (via stacService.addFeatures)
    └── has → ProvenanceEntry[] (via stacService.appendProvenance)
```

## Validation Rules

| Rule | Field | Constraint |
|------|-------|------------|
| VR-001 | `ProvenanceEntry.source` | Must be `"user-drawn"` for drawing-created features |
| VR-002 | `ProvenanceEntry.timestamp` | Must be valid ISO 8601 UTC string |
| VR-003 | `ProvenanceEntry.operator` | Must be non-empty string |
| VR-004 | `DrawingPalette.colours` | Must contain exactly 8 entries |
| VR-005 | `DrawingPalette.currentIndex` | Must be non-negative integer |
| VR-006 | Palette colour | Must be valid CSS hex colour string |
| VR-007 | Feature with provenance | `properties.provenance` must be array if present |
