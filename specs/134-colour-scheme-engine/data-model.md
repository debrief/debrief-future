# Data Model: Colour Scheme Engine (#134)

**Date**: 2026-03-07
**Feature Branch**: `134-colour-scheme-engine`

## Entities

### ColourDimension

A named strategy for mapping exercise metadata to colours.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier (e.g., `"age"`, `"vessel-class"`, `"tag"`) |
| `label` | `string` | Display label (e.g., `"Age"`, `"Vessel Class"`, `"Tag"`) |
| `type` | `"gradient" \| "categorical"` | Determines legend rendering mode |
| `resolve` | `(item: StacBrowserItem) → string \| null` | Extracts the dimension value from an item. Returns `null` if item lacks the relevant metadata. |

**Built-in dimensions**:
- `age`: type=gradient, resolve extracts `datetime` / `startDatetime` / `endDatetime`
- `vessel-class`: type=categorical, resolve extracts first entry from `vesselClasses[]`
- `tag`: type=categorical, resolve extracts first entry from `tags[]`

### ColourPalette

An ordered set of perceptually distinct CSS colour strings.

| Field | Type | Description |
|-------|------|-------------|
| `colours` | `readonly string[]` | Ordered palette colours (min 12 entries) |
| `unclassifiedColour` | `string` | Neutral colour for items without dimension metadata |
| `defaultColour` | `string` | Colour when no dimension is active |

### LegendModel

Describes the current colour encoding for rendering.

| Field | Type | Description |
|-------|------|-------------|
| `dimension` | `ColourDimension` | The active colour dimension |
| `type` | `"gradient" \| "categorical"` | Rendering mode |
| `entries` | `LegendEntry[]` | Legend entries (categorical mode) |
| `gradient` | `GradientSpec \| null` | Gradient specification (gradient mode) |
| `hasUnclassified` | `boolean` | Whether any items lacked metadata |

### LegendEntry (categorical)

| Field | Type | Description |
|-------|------|-------------|
| `label` | `string` | Category label (e.g., vessel class name) |
| `colour` | `string` | CSS colour string |
| `count` | `number` | Number of items in this category |

### GradientSpec (gradient)

| Field | Type | Description |
|-------|------|-------------|
| `minLabel` | `string` | Label for the low end (e.g., oldest date) |
| `maxLabel` | `string` | Label for the high end (e.g., most recent date) |
| `minColour` | `string` | CSS colour for the low end (faded) |
| `maxColour` | `string` | CSS colour for the high end (vivid) |

### ColourAssignment

The result of applying a dimension to items.

| Field | Type | Description |
|-------|------|-------------|
| `colorMap` | `ReadonlyMap<string, string>` | Maps item ID → CSS colour. For #130 consumption. |
| `colourFn` | `ColourFn` | Maps item → CSS colour or null. For #131 consumption. |
| `legend` | `LegendModel` | Legend description for UI rendering. |

## Relationships

```
ColourDimension ──[selected by user]──> Active Dimension
     │
     ├──[resolve per item]──> category value (string | null)
     │
     └──[+ ColourPalette]──> ColourAssignment
                                  │
                                  ├──> colorMap (Map<string,string>) ──> CatalogOverview (#130)
                                  ├──> colourFn (item => string|null) ──> TimelineView (#131)
                                  └──> LegendModel ──> ColourLegend component
```

## State Transitions

The colour engine has a single state variable: the active dimension ID (or `null`).

```
null (no dimension) ──[user selects]──> dimensionId
     ↑                                      │
     │                                      │
     └──[user resets]───────────────────────┘

dimensionId ──[user switches]──> differentDimensionId
```

When the active dimension or items change, the engine recomputes `ColourAssignment`.

## Validation Rules

- `ColourDimension.id` must be unique within the registry
- `ColourDimension.resolve` must never throw (callers wrap in try/catch per Constitution Art. V.1)
- `ColourPalette.colours` must have at least 12 entries
- `LegendModel.entries` is empty for gradient dimensions; `gradient` is null for categorical dimensions
