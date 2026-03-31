import React, { useMemo, useState, useCallback, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ChartRenderer, type ChartRendererHandle } from './ChartRenderer';
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

// ── Auto-Refresh: Simulated data update with viewport preservation ──

export const AutoRefresh: Story = {
  name: 'Auto-Refresh (simulated update)',
  render: () => {
    const chartRef = useRef<ChartRendererHandle>(null);
    const [version, setVersion] = useState(1);
    const [viewportInfo, setViewportInfo] = useState<string>('No viewport captured');

    const dataset: DatasetEnvelope = useMemo(
      () => ({
        type: 'zone_histogram',
        title: `Zone Histogram — v${version}`,
        metadata: {
          xAxis: { label: 'Zone', type: 'ordinal' as const },
          yAxis: { label: 'Count', type: 'quantitative' as const },
        },
        data: Array.from({ length: 8 }, (_, i) => ({
          zone: `Zone ${i + 1}`,
          count: Math.floor(Math.random() * 100 * version),
        })),
      }),
      [version],
    );

    const spec = useTransformedSpec(dataset);

    const handleRefresh = useCallback(async () => {
      // 1. Capture viewport
      const viewport = chartRef.current?.captureViewport();
      setViewportInfo(
        viewport
          ? `Captured ${Object.keys(viewport.signals).length} signal(s)`
          : 'No viewport signals'
      );

      // 2. Update data (simulates tool re-run)
      setVersion(v => v + 1);

      // 3. Restore viewport after React re-render
      if (viewport) {
        // Wait for next frame so the new spec has rendered
        requestAnimationFrame(() => {
          void chartRef.current?.restoreViewport(viewport);
        });
      }
    }, []);

    return (
      <div style={{ width: '100%', maxWidth: 600 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <button onClick={handleRefresh} data-testid="refresh-button">
            Simulate Data Update (v{version})
          </button>
          <span style={{ fontSize: 12, color: '#888' }}>{viewportInfo}</span>
        </div>
        <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>
          Zoom into the chart, then click the button. Viewport should be preserved.
        </p>
        <ChartRenderer ref={chartRef} spec={spec} />
      </div>
    );
  },
};

// ── Auto-Refresh: Pause/Resume toggle demo ──────────────────────────

export const PauseResume: Story = {
  name: 'Pause/Resume Toggle',
  render: () => {
    const [paused, setPaused] = useState(false);
    const [pending, setPending] = useState(false);
    const [version, setVersion] = useState(1);

    const dataset: DatasetEnvelope = useMemo(
      () => ({
        type: 'zone_histogram',
        title: `Histogram — v${version}`,
        metadata: {
          xAxis: { label: 'Zone', type: 'ordinal' as const },
          yAxis: { label: 'Count', type: 'quantitative' as const },
        },
        data: Array.from({ length: 5 }, (_, i) => ({
          zone: `Z${i + 1}`,
          count: Math.floor(10 + Math.random() * 50 * version),
        })),
      }),
      [version],
    );

    const spec = useTransformedSpec(dataset);

    const handleDataChange = () => {
      if (paused) {
        setPending(true);
      } else {
        setVersion(v => v + 1);
      }
    };

    const handleToggle = () => {
      if (paused) {
        // Resume — flush pending
        setPaused(false);
        if (pending) {
          setVersion(v => v + 1);
          setPending(false);
        }
      } else {
        setPaused(true);
      }
    };

    return (
      <div style={{ width: '100%', maxWidth: 600 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <button
            onClick={handleToggle}
            data-testid="pause-resume-button"
            style={{
              background: paused ? '#cca700' : '#007fd4',
              color: 'white',
              border: 'none',
              padding: '4px 12px',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={handleDataChange} data-testid="data-change-button">
            Trigger Data Change
          </button>
          {pending && (
            <span
              data-testid="pending-badge"
              style={{ fontSize: 12, color: '#cca700' }}
            >
              Pending update available
            </span>
          )}
          <span style={{ fontSize: 12, color: '#888' }}>
            {paused ? 'Auto-refresh paused' : 'Auto-refresh active'} (v{version})
          </span>
        </div>
        <ChartRenderer spec={spec} />
      </div>
    );
  },
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
