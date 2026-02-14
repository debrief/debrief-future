# Quickstart: Chart Renderer + Dataset-to-Spec Transformer

**Feature**: 085-chart-renderer

## Overview

This feature adds two components to the shared components library:

1. **Dataset-to-Spec Transformer** — converts standard result dataset JSON into Vega-Lite specs
2. **ChartRenderer** — React component that renders Vega-Lite specs as interactive charts

## Prerequisites

- Node.js 18+
- pnpm 8+
- Existing `@debrief/components` workspace built

## Getting Started

### 1. Install Dependencies

From the repository root:

```bash
cd shared/components
pnpm add vega vega-lite vega-embed
pnpm add -D @types/vega @types/vega-lite
```

### 2. Component Location

All new files live under `shared/components/src/ChartRenderer/`:

```
shared/components/src/ChartRenderer/
├── index.ts                          # Public exports
├── ChartRenderer.tsx                 # React component wrapping vega-embed
├── ChartRenderer.stories.tsx         # Storybook stories
├── ChartRenderer.test.tsx            # Vitest unit tests
├── transformer/
│   ├── index.ts                      # transformDataset() entry point
│   ├── registry.ts                   # TransformerRegistry class
│   ├── types.ts                      # DatasetEnvelope, TransformerError types
│   ├── mappings/
│   │   ├── zoneHistogram.ts          # zone_histogram → bar chart spec
│   │   └── rangeBearingSeries.ts     # range_bearing_series → line chart spec
│   └── theme.ts                      # Debrief CSS tokens → Vega-Lite config
├── fixtures/
│   ├── zone-histogram.json           # Sample zone_histogram dataset
│   ├── range-bearing-series.json     # Sample range_bearing_series dataset
│   ├── empty-dataset.json            # Zero data points
│   └── malformed-dataset.json        # Invalid schema for error testing
└── types.ts                          # Shared TypeScript types
```

### 3. Key APIs

**Transform a dataset**:
```typescript
import { transformDataset } from '@debrief/components/ChartRenderer';

const dataset = { type: 'zone_histogram', title: '...', metadata: {...}, data: [...] };
const result = transformDataset(dataset);

if (result.ok) {
  // result.spec is a Vega-Lite TopLevelSpec
} else {
  // result.error is a TransformerError
}
```

**Render a chart**:
```tsx
import { ChartRenderer } from '@debrief/components/ChartRenderer';

<ChartRenderer spec={vegaLiteSpec} />
```

**Register a new dataset type**:
```typescript
import { registerTransformer } from '@debrief/components/ChartRenderer';

registerTransformer('my_custom_type', (dataset) => {
  // Return a Vega-Lite TopLevelSpec
  return { mark: 'point', encoding: { ... }, data: { values: dataset.data } };
});
```

### 4. Run Storybook

```bash
cd shared/components
pnpm storybook
```

Navigate to **Components / ChartRenderer** in the Storybook sidebar.

### 5. Run Tests

```bash
cd shared/components
pnpm test -- --filter ChartRenderer
```

### 6. Build

```bash
cd shared/components
pnpm build
```

The ChartRenderer entry point is available as `@debrief/components/ChartRenderer`.

## Architecture Notes

- **Isolation boundary**: Only `ChartRenderer/` and `ChartRenderer/transformer/` import Vega-Lite. No other component, service, or tool may reference it.
- **Theming**: The transformer reads Debrief CSS custom properties and generates a Vega-Lite `config` object. Charts automatically match the active theme.
- **Error handling**: Three tiers — transformer validation (schema check), React error boundary (render failures), empty state detection (zero data points).
- **Offline**: No network requests. Vega-Lite is fully bundled.
