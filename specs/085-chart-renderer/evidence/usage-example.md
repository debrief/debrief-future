# Usage Example: Chart Renderer

## Transform a Dataset and Render a Chart

```tsx
import { ChartRenderer, transformDataset } from '@debrief/components/ChartRenderer';
import type { DatasetEnvelope } from '@debrief/components/ChartRenderer';

// 1. Tool produces a standard dataset
const dataset: DatasetEnvelope = {
  type: 'zone_histogram',
  title: 'Buffer Zone Point Distribution',
  metadata: {
    xAxis: { label: 'Zone', type: 'nominal' },
    yAxis: { label: 'Count', type: 'quantitative', units: 'points' },
  },
  data: [
    { zone: 'Zone A (0-5 nm)', count: 42 },
    { zone: 'Zone B (5-10 nm)', count: 17 },
    { zone: 'Zone C (10-15 nm)', count: 8 },
    { zone: 'Zone D (15-20 nm)', count: 3 },
  ],
};

// 2. Transform dataset to Vega-Lite spec
const result = transformDataset(dataset);

// 3. Render the chart
function MyChart() {
  if (!result.ok) {
    return <div>Error: {result.error.message}</div>;
  }
  return <ChartRenderer spec={result.spec} />;
}
```

**Expected output**: A bar chart with 4 bars (Zone A–D), y-axis labelled "Count (points)", auto-scaled axes, and the title "Buffer Zone Point Distribution".

## Line Chart (Multi-Series)

```tsx
const dataset: DatasetEnvelope = {
  type: 'range_bearing_series',
  title: 'Range over Time',
  metadata: {
    xAxis: { label: 'Time', type: 'temporal' },
    yAxis: { label: 'Range', type: 'quantitative', units: 'nm' },
  },
  series: [
    {
      name: 'Track A → Track B',
      data: [
        { time: '2024-01-15T10:00:00Z', value: 12.5 },
        { time: '2024-01-15T10:05:00Z', value: 11.8 },
        { time: '2024-01-15T10:10:00Z', value: 10.2 },
      ],
    },
  ],
};

const result = transformDataset(dataset);
// result.ok === true → line chart spec with temporal x-axis
```

## Error Handling

```tsx
// Unsupported dataset type
const result = transformDataset({ type: 'custom_unknown', ... });
// result.ok === false
// result.error.type === 'unsupported_type'
// result.error.message === 'Unsupported dataset type: custom_unknown'

// Empty dataset
const result = transformDataset({ type: 'zone_histogram', data: [], ... });
// result.ok === false
// result.error.type === 'empty_data'

// Null spec → error state in component
<ChartRenderer spec={null} />
// Renders: "No render spec provided" (no crash)
```

## Register a Custom Dataset Type

```tsx
import { registerTransformer } from '@debrief/components/ChartRenderer';

registerTransformer('my_scatter', (dataset) => ({
  $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
  title: dataset.title,
  mark: 'point',
  data: { values: dataset.data ?? [] },
  encoding: {
    x: { field: 'x', type: 'quantitative' },
    y: { field: 'y', type: 'quantitative' },
  },
}));
```
