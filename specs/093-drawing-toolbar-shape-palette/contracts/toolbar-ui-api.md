# Contract: LeafletToolbar — Shape Palette UI

**Feature**: 093-drawing-toolbar-shape-palette
**Date**: 2026-02-13

## LeafletToolbar Props Extension

```typescript
export interface LeafletToolbarProps {
  position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright';
  visibleBounds: Bounds | null;
  fitPadding?: number;
  showZoomControls?: boolean;
  showFitButton?: boolean;
  // NEW props for drawing integration
  drawingMode?: DrawingMode;
  onDrawingModeChange?: (mode: DrawingMode) => void;
}
```

## Shape Palette Item Interface

```typescript
export interface ShapePaletteItem {
  id: Exclude<DrawingMode, null>;
  label: string;
  icon: string;  // SVG markup
  title: string;
}
```

## Dropdown Behavior Contract

| Trigger | Precondition | Result |
|---------|-------------|--------|
| Click '+' button | `drawingMode === null` | Open dropdown |
| Click '+' button | `drawingMode !== null` | Cancel drawing, close dropdown |
| Click shape item | Dropdown is open | Close dropdown, activate drawing |
| Click outside | Dropdown is open | Close dropdown, no mode change |
| Press Escape | Dropdown is open | Close dropdown, no mode change |
| Press Escape | Drawing mode active | Cancel drawing via Geoman |
| `pm:create` event | Drawing mode active | Reset to null (shape completed) |
| `pm:drawend` event | Drawing mode active | Reset to null (drawing cancelled) |

## CSS Classes Contract

| Class | Purpose |
|-------|---------|
| `.debrief-leaflet-toolbar__draw-trigger` | '+' button base |
| `.debrief-leaflet-toolbar__draw-trigger--active` | '+' button highlighted during drawing |
| `.debrief-shape-palette` | Dropdown container |
| `.debrief-shape-palette__item` | Individual shape option |
| `.debrief-shape-palette__item:hover` | Hover state for shape option |
| `.debrief-shape-palette__icon` | Icon within shape option |
| `.debrief-shape-palette__label` | Text label within shape option |

## Storybook Story Contract

| Story Name | Description | Interaction |
|------------|-------------|-------------|
| `DrawingToolbar` | Default toolbar with '+' button | Click '+', select shapes, verify mode changes |
| `DrawingToolbarActive` | Toolbar with pre-activated drawing mode | Visual verification of active state |
