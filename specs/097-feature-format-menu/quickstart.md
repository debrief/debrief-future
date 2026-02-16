# Quickstart: Feature Format Menu

**Feature**: 097-feature-format-menu
**Date**: 2026-02-14

## Overview

This feature adds a cascading format menu to the Layers panel, enabling analysts to change visual style properties on plot features. Changes are applied immediately and recorded in the provenance log.

## Key Components

### 1. CascadingMenu (new shared component)

A reusable hover-cascade menu component. Parent items open sub-menus on hover; leaf items trigger selection on click.

**Location**: `shared/components/src/CascadingMenu/`

**Usage**:
```tsx
<CascadingMenu
  items={[
    {
      id: 'line-color',
      label: 'Line Colour',
      submenu: [
        { id: 'red', label: 'Red', swatch: '#CC0000' },
        { id: 'blue', label: 'Blue', swatch: '#0000CC' },
      ],
    },
    {
      id: 'line-weight',
      label: 'Line Weight',
      submenu: [
        { id: 'w1', label: '1 px' },
        { id: 'w3', label: '3 px' },
      ],
    },
  ]}
  anchorPosition={{ x: 100, y: 200 }}
  onSelect={(itemId) => console.log('Selected:', itemId)}
  onDismiss={() => console.log('Dismissed')}
/>
```

### 2. FormatMenu (new shared component)

Wraps CascadingMenu with format-specific logic: maps feature kinds to editable properties, builds menu items from presets, and calls formatService on selection.

**Location**: `shared/components/src/FormatMenu/`

**Usage**:
```tsx
<FormatMenu
  featureIds={['track-001', 'track-002']}
  featureKinds={['TRACK']}
  anchorPosition={{ x: 150, y: 300 }}
  onFormatApplied={(result) => console.log(result.activityId)}
  onDismiss={() => setMenuOpen(false)}
/>
```

### 3. FormatService (session-state)

Applies style changes to in-memory features, records provenance, and persists via stacService.

**Location**: `services/session-state/src/format/`

**Key method**:
```typescript
const result = await formatService.applyStyleChange({
  featureIds: ['track-001'],
  property: 'line.color',
  newValue: '#CC0000',
});
// result.activityId → provenance ID
// result.featuresUpdated → 1
// result.previousValues → { 'track-001': '#0000CC' }
```

### 4. Integration Points

**FeatureRow** (`shared/components/src/FeatureList/FeatureRow.tsx`):
- Adds a format icon button to each row
- Clicking opens FormatMenu anchored to the icon
- Hidden for feature kinds with no editable properties

**LayersToolbar** (`shared/components/src/LayersToolbar/LayersToolbar.tsx`):
- Adds a Format button to the selection-scoped group
- Disabled when no features selected
- Opens FormatMenu for the current selection

**MapView** (`shared/components/src/MapView/MapView.tsx`):
- Re-renders when `properties.style` changes on any feature
- Uses existing `featureStyle` function which reads from `properties.style`

## Development Workflow

1. **Start with CascadingMenu** — build the generic cascading component with Storybook stories
2. **Define presets** — implement `presetPalette.ts` (colours) and `stylePropertyMap.ts` (properties per kind)
3. **Build FormatMenu** — wrap CascadingMenu with format-specific logic
4. **Add formatService** — implement `applyStyleChange` with provenance recording
5. **Wire FeatureRow** — add format icon to each row
6. **Wire LayersToolbar** — add format button to toolbar
7. **Add per-point support** — extend PositionStyleOverride schema, wire point rows
8. **E2E tests** — Playwright tests against Storybook stories

## Schema Change Required

The `PositionStyleOverride` class in `shared/schemas/src/linkml/styling.yaml` needs additional optional fields for per-point colour and size overrides:
- `fill_color` (CSSColor, nullable)
- `stroke_color` (CSSColor, nullable)
- `radius` (float, nullable)
- `fill_opacity` (float, nullable)
- `stroke_opacity` (float, nullable)

After schema change: regenerate Pydantic models, JSON Schema, and TypeScript types, then run schema adherence tests.

## Testing Strategy

| Layer | What | Where |
|-------|------|-------|
| Unit | Style property map returns correct properties per kind | `services/session-state/src/format/__tests__/` |
| Unit | Preset palette has 16 colours with valid hex values | `shared/components/src/FormatMenu/__tests__/` |
| Unit | FormatService applies style changes and records provenance | `services/session-state/src/format/__tests__/` |
| Storybook | CascadingMenu renders, keyboard nav works, viewport repositioning | `shared/components/src/CascadingMenu/CascadingMenu.stories.tsx` |
| Storybook | FormatMenu shows correct properties per feature kind | `shared/components/src/FormatMenu/FormatMenu.stories.tsx` |
| E2E | Full format flow: open menu → select value → verify map update | `shared/components/e2e/FormatMenu.spec.ts` |
