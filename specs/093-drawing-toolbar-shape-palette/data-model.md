# Data Model: Drawing Toolbar with Shape Palette

**Feature**: 093-drawing-toolbar-shape-palette
**Date**: 2026-02-13

## Entities

### DrawingMode (Session State)

The drawing mode represents the currently active shape drawing operation. It is an ephemeral, non-persisted field in the session state spatial slice.

**Type**: `null | 'point' | 'rectangle' | 'polygon' | 'polyline'`

| Value | Meaning | Geoman API Equivalent |
|-------|---------|----------------------|
| `null` | No drawing active (default) | N/A |
| `'point'` | Point/marker placement | `'Marker'` |
| `'rectangle'` | Rectangle drawing | `'Rectangle'` |
| `'polygon'` | Polygon drawing | `'Polygon'` |
| `'polyline'` | Polyline drawing | `'Line'` |

**Properties**:
- **Ephemeral**: Not persisted in saved session state
- **Not undo-tracked**: Changes do not create undo history entries
- **Not dirty-triggering**: Changes do not mark the document as dirty
- **Resettable**: Resets to `null` on document switch or session reset

### ShapePaletteItem (UI Configuration)

A static configuration object representing one shape option in the dropdown palette.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `DrawingMode` (non-null) | The drawing mode this item activates |
| `label` | `string` | Display text (e.g., "Point", "Rectangle") |
| `icon` | `string` (SVG) | SVG markup for the shape icon |
| `title` | `string` | Accessible tooltip text |

**Instances** (4 items, static):
1. `{ id: 'point', label: 'Point', icon: <dot SVG>, title: 'Draw a point' }`
2. `{ id: 'rectangle', label: 'Rectangle', icon: <rectangle SVG>, title: 'Draw a rectangle' }`
3. `{ id: 'polygon', label: 'Polygon', icon: <polygon SVG>, title: 'Draw a polygon' }`
4. `{ id: 'polyline', label: 'Polyline', icon: <polyline SVG>, title: 'Draw a polyline' }`

### GeomanShapeMapping (Constant)

A lookup table mapping Debrief drawing mode values to Geoman API shape type strings.

| Debrief DrawingMode | Geoman Shape |
|---------------------|-------------|
| `'point'` | `'Marker'` |
| `'rectangle'` | `'Rectangle'` |
| `'polygon'` | `'Polygon'` |
| `'polyline'` | `'Line'` |

## State Transitions

```
                    click '+'
    ┌──────────┐ ─────────────> ┌───────────────┐
    │   null   │                │ Dropdown Open  │
    │ (default)│ <───────────── │  (transient)   │
    └──────────┘   click outside └───────────────┘
         ^          or Escape           │
         │                              │ select shape
         │                              v
         │                     ┌───────────────┐
         │                     │  Drawing Mode  │
         │                     │  (active)      │
         │                     └───────────────┘
         │                        │         │
         │          pm:create     │         │ Escape / click '+'
         │        (shape done)    │         │   / pm:drawend
         └────────────────────────┘         │
         └──────────────────────────────────┘
```

## Relationships

- **DrawingMode** is a field within the `SpatialSlice` of the session store
- **DrawingMode** drives the `map.pm.enableDraw()` / `map.pm.disableDraw()` Geoman API calls via **GeomanShapeMapping**
- **ShapePaletteItem** instances are static configuration; they define the dropdown contents
- The toolbar reads **DrawingMode** from session state to determine button appearance (default vs. active)
- Downstream features (#094, #095) will read **DrawingMode** and handle the `pm:create` event to persist shapes — this feature only manages the mode lifecycle
