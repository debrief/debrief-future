import React, { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ChartRenderer } from './ChartRenderer';
import { transformDataset } from './transformer';
import type { DatasetEnvelope } from './types';

import zoneHistogramFixture from './fixtures/zone-histogram.json';
import rangeBearingFixture from './fixtures/range-bearing-series.json';
import emptyFixture from './fixtures/empty-dataset.json';

const meta: Meta<typeof ChartRenderer> = {
  title: 'Components/ChartRenderer',
  component: ChartRenderer,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof ChartRenderer>;

// ── Helper: run transformer and return spec ──────────────────────────

function useTransformedSpec(dataset: DatasetEnvelope) {
  return useMemo(() => {
    const result = transformDataset(dataset);
    return result.ok ? result.spec : null;
  }, [dataset]);
}

// ── US1: Bar chart ───────────────────────────────────────────────────

export const BarChart: Story = {
  name: 'Bar Chart (zone_histogram)',
  render: () => {
    const spec = useTransformedSpec(zoneHistogramFixture as DatasetEnvelope);
    return (
      <div style={{ width: '100%', maxWidth: 600 }}>
        <ChartRenderer spec={spec} />
      </div>
    );
  },
};

// ── US2: Line chart ──────────────────────────────────────────────────

export const LineChart: Story = {
  name: 'Line Chart (range_bearing_series)',
  render: () => {
    const spec = useTransformedSpec(rangeBearingFixture as DatasetEnvelope);
    return (
      <div style={{ width: '100%', maxWidth: 600 }}>
        <ChartRenderer spec={spec} />
      </div>
    );
  },
};

// ── Edge case: Empty dataset ─────────────────────────────────────────

export const EmptyState: Story = {
  name: 'Empty Dataset',
  render: () => {
    // Transformer returns empty_data error → spec is null → error state
    const result = transformDataset(emptyFixture as DatasetEnvelope);
    const spec = result.ok ? result.spec : null;
    return (
      <div style={{ width: '100%', maxWidth: 600 }}>
        <ChartRenderer spec={spec} />
        {!result.ok && (
          <p style={{ color: 'var(--vscode-descriptionForeground, #888)', textAlign: 'center' }}>
            Transformer message: {result.error.message}
          </p>
        )}
      </div>
    );
  },
};

// ── Edge case: Error state (null spec) ───────────────────────────────

export const ErrorState: Story = {
  name: 'Error State (null spec)',
  render: () => (
    <div style={{ width: '100%', maxWidth: 600 }}>
      <ChartRenderer spec={null} />
    </div>
  ),
};

// ── Performance: Large dataset (10,000 points) ───────────────────────

export const LargeDataset: Story = {
  name: 'Large Dataset (10,000 points)',
  render: () => {
    const dataset: DatasetEnvelope = useMemo(
      () => ({
        type: 'zone_histogram',
        title: 'Large Dataset — 10,000 Zones',
        metadata: {
          xAxis: { label: 'Zone ID', type: 'ordinal' as const },
          yAxis: { label: 'Count', type: 'quantitative' as const },
        },
        data: Array.from({ length: 10000 }, (_, i) => ({
          zone: `Z${String(i).padStart(5, '0')}`,
          count: Math.floor(Math.random() * 100),
        })),
      }),
      [],
    );
    const spec = useTransformedSpec(dataset);
    return (
      <div style={{ width: '100%' }}>
        <ChartRenderer spec={spec} />
      </div>
    );
  },
};
