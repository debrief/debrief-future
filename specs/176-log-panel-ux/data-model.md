# Data Model: Analysis Log Panel — Rich Card UX

**Feature**: 176-log-panel-ux
**Date**: 2026-04-02

## Overview

This feature is purely a UI rendering enhancement. It does not modify the underlying PROV data model or STAC storage format. All new types are UI-layer projections used for rendering.

## New Types

### ToolCategory

Visual classification of tools into families for icon rendering. Declared in tool manifest; resolved at display time.

```
ToolCategory = 'import' | 'style' | 'calc' | 'filter' | 'snapshot'
```

Each category has associated visual properties:

| Category | Background Colour | Glyph |
|----------|------------------|-------|
| import   | #dbeafe          | ⬇     |
| style    | #ede9fe          | 🎨    |
| calc     | #dcfce7          | ∿     |
| filter   | #fff7ed          | ⧖     |
| snapshot | #fef9c3          | 📷    |

Unknown/unmapped tools: `#e5e5e5` (neutral grey), no glyph.

### ParamType

Inferred or declared parameter display type, used for chip icon selection.

```
ParamType = 'colour' | 'number' | 'boolean' | 'range' | 'enum'
```

| Type    | Icon Prefix | Example Chip       |
|---------|-------------|--------------------|
| colour  | (swatch)    | █ green            |
| number  | #           | # 30 s             |
| enum    | ≡           | ≡ linear           |
| range   | ↔           | ↔ 10 m – 200 m    |
| boolean | ⊤ / ⊥       | ⊤ yes / ⊥ no      |

Fallback (no type resolved): plain text, no icon prefix.

### ToolCategoryConfig

Static mapping from ToolCategory to visual properties.

```
ToolCategoryConfig = {
  category: ToolCategory
  background: string        // CSS colour
  glyph: string             // emoji or codicon
  label: string             // i18n display name
}
```

### ViewMode (updated)

Replaces the current split of `ViewMode` + `PresentationMode`:

```
ViewMode = 'timeline' | 'by-feature' | 'compact' | 'detailed'
```

## Modified Types

### TimelineEntry (display projection)

Existing fields unchanged. No schema-level modifications. The `operationCategory` field remains for filtering; visual category is resolved separately from the tool manifest at render time.

### ParameterValue (schema type — NOT modified)

The schema `ParameterValue` type (`value: string, default?: boolean, tunable?: boolean`) is not changed. The rich card reads these fields and applies client-side type inference for chip rendering.

## Relationships

```
TimelineEntry
  ├── has many → ParameterValue (existing, via parameters record)
  ├── resolved to → ToolCategory (via tool manifest lookup)
  └── each ParameterValue resolved to → ParamType (via inferParamType)

ViewMode → determines which LogEntry rendering variant is used:
  ├── timeline → full 3-row cards, newest-first
  ├── by-feature → full 3-row cards, grouped by track
  ├── compact → header + meta rows only (no params)
  └── detailed → full 3-row cards + used[]/generated[] lists
```

## Validation Rules

- `ToolCategory` must be one of the 5 defined values or `undefined` (fallback).
- `ParamType` inference must follow the priority chain: tool schema → heuristic → fallback.
- `ViewMode` must be one of the 4 defined values. Default is `'timeline'`.
- The `ParameterValue.default` field determines whether the non-default marker (●) is shown. `false` or `undefined` means "analyst set this value" → show marker.
- Empty `rationale` string treated as `null` (no icon shown).
