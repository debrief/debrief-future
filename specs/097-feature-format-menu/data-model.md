# Data Model: Feature Format Menu

**Feature**: 097-feature-format-menu
**Date**: 2026-02-14

## Entities

### StylePropertyDescriptor

Describes a single editable style property exposed in the format menu.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Dot-path to the property within `properties.style` (e.g., `"line.color"`, `"fill_opacity"`) |
| label | string | I18N key for the display label (e.g., `"format.lineColor"`) |
| category | enum | Grouping: `"line"`, `"fill"`, `"point"`, `"stroke"` |
| valueType | enum | `"color"`, `"number"`, `"shape"`, `"dashPattern"` |
| presets | PresetValue[] | Ordered list of selectable values |

### PresetValue

A single selectable value for a style property.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier within the property (e.g., `"red"`, `"weight-3"`) |
| label | string | I18N key for display (e.g., `"Red"`, `"3 px"`) |
| value | string \| number | The actual style value to apply (e.g., `"#CC0000"`, `3`) |
| swatch | string \| null | CSS colour for visual indicator (colours only) |

### PresetColourPalette

Fixed set of 16 standard colours shared across all colour properties.

| Field | Type | Description |
|-------|------|-------------|
| colours | PresetValue[] | 16 colour entries with id, label, hex value, and swatch |

### StylePropertyMap

Static mapping from FeatureKindEnum to the list of editable StylePropertyDescriptors.

| Field | Type | Description |
|-------|------|-------------|
| kind | FeatureKindEnum | The feature kind this mapping applies to |
| properties | StylePropertyDescriptor[] | Ordered list of editable properties for this kind |

### FormatChangeRecord

Represents a format operation for provenance recording.

| Field | Type | Description |
|-------|------|-------------|
| featureIds | string[] | IDs of features being formatted |
| property | string | Dot-path of the property being changed |
| previousValues | Record<string, unknown> | Map of featureId → previous value |
| newValue | unknown | The new value being applied |
| isPointOverride | boolean | Whether this targets a position override (not track-level) |
| positionIndex | number \| null | If isPointOverride, the position array index |

### CascadingMenuItem

Menu item model for the cascading menu component.

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique item identifier |
| label | string | Display text |
| icon | string \| null | Optional icon identifier |
| swatch | string \| null | Optional colour swatch for colour items |
| disabled | boolean | Whether the item is greyed out (inapplicable in batch) |
| disabledReason | string \| null | Tooltip for disabled items |
| submenu | CascadingMenuItem[] \| null | Child items (null = leaf item) |

## Relationships

```
FeatureKindEnum ──(1:1)──> StylePropertyMap ──(1:N)──> StylePropertyDescriptor ──(1:N)──> PresetValue
                                                                                              │
                                                                                    PresetColourPalette
                                                                                    (shared across all
                                                                                     colour properties)

FormatChangeRecord ──(N:1)──> LogEntry (via LogService.recordToolResult)
                   ──(N:M)──> DebriefFeature (via featureIds)

CascadingMenuItem ──(tree)──> CascadingMenuItem (parent → submenu children)
```

## State Transitions

### Feature Style Lifecycle

```
Feature loaded from STAC
    │
    ├── properties.style = original parsed style
    │
    ▼
Format change applied
    │
    ├── properties.style mutated in-memory
    ├── MapView re-renders with new style
    ├── FeatureRow colour indicator updates
    ├── Provenance entry appended via LogService
    │
    ▼
Feature persisted to STAC
    │
    ├── stacService.writeGeoJson() writes updated FeatureCollection
    └── Updated style survives reload
```

### Position Style Override Lifecycle

```
Track position with default styling
    │
    ├── Inherits TrackStyle.point defaults
    ├── Interval rules may show/hide symbol
    │
    ▼
Per-point format change applied
    │
    ├── position_style_overrides[index] created/updated
    ├── PositionSymbolsLayer re-renders that point
    ├── Other points on same track unaffected
    ├── Provenance entry recorded with positionIndex
    │
    ▼
Track-level format change applied
    │
    ├── TrackStyle.point defaults updated
    ├── Per-point overrides preserved (NOT overwritten)
    └── Points with overrides keep their custom style
```

## Schema Extension Required

### PositionStyleOverride (existing, to be extended)

Current fields: `show_symbol`, `symbol`, `show_label`, `label`

**New fields needed**:

| Field | Type | Description |
|-------|------|-------------|
| fill_color | CSSColor \| null | Override fill colour (null = use track default) |
| stroke_color | CSSColor \| null | Override stroke colour (null = use track default) |
| radius | float \| null | Override marker radius (null = use track default) |
| fill_opacity | float \| null | Override fill opacity (null = use track default) |
| stroke_opacity | float \| null | Override stroke opacity (null = use track default) |

These follow the existing nullable pattern where `null` means "inherit from track defaults" and a value means "override for this position only."

## Validation Rules

- Colour values must match CSSColor pattern: `#hex`, named, `rgb()`, `rgba()`, `hsl()`, `hsla()`
- Opacity values must be in range [0, 1]
- Weight/radius values must be non-negative
- Dash array strings must match SVG dash-array format (comma-separated numbers)
- PointShapeEnum values must be one of: circle, square, triangle, diamond, cross
- Position index must be within bounds of the track's positions array
