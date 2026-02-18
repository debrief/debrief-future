# Usage Example: Feature Info Button (098)

## User Workflow

1. Load a plot with features in the Layers panel
2. Hover over a feature row — the "i" info button appears (alongside format button)
3. Click the info button — a dialog shows the geometry type and coordinates
4. Click outside, press Escape, or click × to close the dialog

## Playwright Test Example

```typescript
import { test, expect } from '@playwright/test';

test('verify feature geometry via info button', async ({ page }) => {
  // Navigate to the app/storybook with loaded features
  await page.goto('/');

  // Locate the info button for a specific feature
  const infoButton = page.getByTestId('info-icon-track-001');
  await infoButton.click();

  // Verify dialog opens
  const dialog = page.getByRole('dialog', { name: /Geometry for/ });
  await expect(dialog).toBeVisible();

  // Read geometry type
  const geoType = dialog.getByTestId('geometry-type');
  await expect(geoType).toHaveText('LineString');

  // Read coordinates
  const coords = dialog.getByTestId('geometry-coordinates');
  await expect(coords).toContainText('-5');

  // Dismiss
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('verify geometry updates after drag', async ({ page }) => {
  // Open info dialog, read initial coordinates
  const infoButton = page.getByTestId('info-icon-track-001');
  await infoButton.click();

  const coords = page.getByTestId('geometry-coordinates');
  const initialText = await coords.textContent();

  // Close dialog
  await page.keyboard.press('Escape');

  // ... perform drag operation that changes geometry ...

  // Re-open and verify coordinates changed
  await infoButton.click();
  const updatedText = await coords.textContent();
  expect(updatedText).not.toEqual(initialText);
});
```

## Component Usage

```tsx
import { GeometryDialog } from '@debrief/components';

// Standalone usage
<GeometryDialog
  featureName="HMS Victory"
  geometryType="LineString"
  coordinates={[[-5.0, 50.0], [-4.0, 51.0]]}
  anchorPosition={{ x: 200, y: 100 }}
  onDismiss={() => setDialogOpen(false)}
/>

// Integrated via ActivityPanel (automatic)
// Just set showInfoIcon on FeatureList — ActivityPanel handles the rest
<FeatureList
  features={features}
  showInfoIcon
  onInfoClick={handleInfoClick}
  onChildInfoClick={handleChildInfoClick}
/>
```

## Supported Geometry Types

| Type | Display | Data Source |
|------|---------|-------------|
| Point | `[-3.12, 52.56]` | ReferenceLocation, child position |
| LineString | Numbered list of `[lon, lat]` | TrackFeature |
| MultiPoint | Numbered list of `[lon, lat]` | MultiPointFeature |
| Polygon | Exterior/Hole rings with coordinates | Child of MultiPolygon |
| MultiPolygon | Polygon + ring hierarchy | MultiPolygonFeature |

## Accessibility

- **Dialog role**: `role="dialog"` with `aria-label="Geometry for {name}"`
- **Test IDs**: `data-testid="geometry-dialog"`, `data-testid="geometry-type"`, `data-testid="geometry-coordinates"`
- **Info button**: `data-testid="info-icon-{featureId}"`, `role="button"`, keyboard accessible (Enter)
- **Dismissal**: Click outside, Escape key, or close button
