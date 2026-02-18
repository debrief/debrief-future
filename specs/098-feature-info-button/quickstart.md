# Quickstart: Feature Info Button

**Feature**: 098-feature-info-button
**Date**: 2026-02-17

## Prerequisites

- Node.js 18+
- pnpm 8+
- Repository cloned and on branch `098-feature-info-button`

## Setup

```bash
# Install dependencies
pnpm install

# Navigate to shared components
cd shared/components
```

## Development Workflow

### 1. Run Storybook (visual development)

```bash
pnpm storybook
# Opens at http://localhost:6006
# Navigate to Layers > FeatureList or Layers > GeometryDialog
```

### 2. Run Unit Tests (watch mode)

```bash
pnpm test:watch
```

### 3. Run Unit Tests (single run)

```bash
pnpm test
```

### 4. Run E2E Tests

```bash
pnpm test:e2e
# Or with UI:
pnpm test:e2e:ui
```

## Key Files to Edit

| File | Action | Purpose |
|------|--------|---------|
| `src/FeatureList/FeatureRow.tsx` | Modify | Add info button after format icon |
| `src/FeatureList/FeatureList.css` | Modify | Add info-icon CSS (clone format-icon rules) |
| `src/FeatureList/FeatureList.test.tsx` | Modify | Add info button unit tests |
| `src/FeatureList/FeatureList.stories.tsx` | Modify | Add info button stories |
| `src/GeometryDialog/GeometryDialog.tsx` | Create | New dialog component |
| `src/GeometryDialog/GeometryDialog.css` | Create | Dialog styles |
| `src/GeometryDialog/GeometryDialog.test.tsx` | Create | Dialog unit tests |
| `src/GeometryDialog/index.ts` | Create | Component exports |
| `src/ActivityPanel/ActivityPanel.tsx` | Modify | Add info dialog state management |
| `e2e/GeometryDialog.spec.ts` | Create | Playwright E2E tests |

## Implementation Order

1. **GeometryDialog component** — Build the dialog in isolation with Storybook
2. **GeometryDialog tests** — Unit tests for rendering, accessibility, coordinate formatting
3. **FeatureRow info button** — Add the "i" icon to rows (alongside format icon)
4. **FeatureRow tests** — Verify info button renders, handles clicks, respects visibility rules
5. **ActivityPanel wiring** — Connect info button clicks to GeometryDialog state
6. **FeatureList stories** — Interactive stories showing the complete flow
7. **E2E tests** — Playwright tests verifying automated access to geometry data

## Verify Success

```bash
# All unit tests pass
pnpm test

# Storybook builds without errors
pnpm build-storybook

# E2E tests pass
pnpm test:e2e
```

## Testing with Playwright

The primary goal of this feature is enabling Playwright-based verification. Example test pattern:

```typescript
// Locate the info button for a specific feature
const infoButton = page.getByTestId('info-icon-track-001');

// Click to open geometry dialog
await infoButton.click();

// Verify dialog appears
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
```
