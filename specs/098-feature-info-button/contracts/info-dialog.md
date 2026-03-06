# Component Contract: GeometryDialog

**Feature**: 098-feature-info-button
**Date**: 2026-02-17

## GeometryDialog Component

### Props Interface

```typescript
interface GeometryDialogProps {
  /** Display name of the feature (shown in dialog header) */
  featureName: string;

  /** GeoJSON geometry type */
  geometryType: string;

  /** GeoJSON coordinates array */
  coordinates: number[] | number[][] | number[][][] | number[][][][];

  /** Anchor position for dialog placement (from button's getBoundingClientRect) */
  anchorPosition: { x: number; y: number };

  /** Callback when dialog should close */
  onDismiss: () => void;
}
```

### Behaviour Contract

| Behaviour | Specification |
|-----------|--------------|
| **Rendering** | Renders a fixed-position dialog showing geometry type and formatted coordinates |
| **Positioning** | Anchored at `anchorPosition`, adjusted for viewport collision (same as CascadingMenu) |
| **Dismissal** | Calls `onDismiss` on: click outside, Escape key, close button click |
| **Accessibility** | `role="dialog"`, `aria-label="Geometry for {featureName}"` |
| **Test IDs** | `data-testid="geometry-dialog"`, `data-testid="geometry-type"`, `data-testid="geometry-coordinates"` |
| **Empty state** | Shows "No coordinates" when coordinates array is empty |
| **Theming** | Uses CSS custom properties (`--debrief-bg-secondary`, `--debrief-text-primary`, etc.) |

### Coordinate Display Format

| Geometry Type | Display Format |
|---------------|---------------|
| Point | `[lon, lat]` on a single line |
| LineString | Each `[lon, lat]` on its own line, numbered |
| MultiPoint | Each `[lon, lat]` on its own line, numbered |
| Polygon | Each ring indented, coordinates numbered within ring |
| MultiPolygon | Each polygon indented, then rings, then coordinates |

Coordinates displayed to full available precision (no rounding).

---

## FeatureRow Extensions

### New Props

```typescript
interface FeatureRowProps {
  // ... existing props ...

  /** Whether to show the info icon */
  showInfoIcon?: boolean;

  /** Info icon click handler for parent features */
  onInfoClick?: (event: React.MouseEvent, feature: DebriefFeature) => void;

  /** Info icon click handler for child rows */
  onChildInfoClick?: (event: React.MouseEvent, displayItem: DisplayItem) => void;
}
```

### Behaviour Contract

| Behaviour | Specification |
|-----------|--------------|
| **Placement** | Info icon renders immediately after the format icon (to its right) |
| **Visibility** | Same as format icon: hidden by default, visible on row hover or selection |
| **Click** | Calls `onInfoClick(event, feature)` for parent rows, `onChildInfoClick(event, displayItem)` for child rows |
| **Keyboard** | Enter key triggers the click handler (same as format icon) |
| **Event isolation** | `e.stopPropagation()` prevents row selection on icon click |
| **Test ID** | `data-testid="info-icon-{featureId}"` |
| **Icon** | Circled "i" SVG, 14x14, matching existing icon style |

---

## ActivityPanel Extensions

### New State

```typescript
// In ActivityPanel component (alongside existing formatMenuState)
const [infoDialogState, setInfoDialogState] = useState<{
  featureId: string;
  featureName: string;
  geometryType: string;
  coordinates: number[] | number[][] | number[][][] | number[][][][];
  position: { x: number; y: number };
} | null>(null);
```

### Behaviour Contract

| Behaviour | Specification |
|-----------|--------------|
| **Open** | On info button click: compute geometry, set state with anchor position |
| **Close** | Set state to `null` on dismiss |
| **Mutual exclusion** | Opening info dialog closes any open format menu, and vice versa |
| **Child geometry** | For child rows: derive geometry from parent feature + child index |
| **Render** | Conditionally render `GeometryDialog` when `infoDialogState` is non-null |
