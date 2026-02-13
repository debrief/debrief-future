import { describe, it, expect } from 'vitest';
import { transformDataset } from './index';
import type { DatasetEnvelope } from '../types';

import zoneHistogramFixture from '../fixtures/zone-histogram.json';
import rangeBearingFixture from '../fixtures/range-bearing-series.json';
import emptyFixture from '../fixtures/empty-dataset.json';
import malformedFixture from '../fixtures/malformed-dataset.json';

// ── US1: zone_histogram → bar chart ──────────────────────────────────

describe('zone_histogram → bar chart', () => {
  it('produces a bar chart spec from a valid zone_histogram dataset', () => {
    const result = transformDataset(zoneHistogramFixture as DatasetEnvelope);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Should be a bar chart
    const spec = result.spec as Record<string, unknown>;
    const mark = spec.mark;
    const markType = typeof mark === 'string' ? mark : (mark as { type: string })?.type;
    expect(markType).toBe('bar');
  });

  it('includes the dataset title in the spec', () => {
    const result = transformDataset(zoneHistogramFixture as DatasetEnvelope);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const spec = result.spec as Record<string, unknown>;
    expect(spec.title).toBe('Buffer Zone Point Distribution');
  });

  it('preserves axis labels from metadata', () => {
    const result = transformDataset(zoneHistogramFixture as DatasetEnvelope);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const spec = result.spec as Record<string, unknown>;
    const encoding = spec.encoding as Record<string, { axis?: { title: string } }>;
    expect(encoding.x?.axis?.title).toBe('Zone');
    expect(encoding.y?.axis?.title).toBe('Count (points)');
  });

  it('includes all data points', () => {
    const result = transformDataset(zoneHistogramFixture as DatasetEnvelope);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const spec = result.spec as Record<string, unknown>;
    const data = spec.data as { values: unknown[] };
    expect(data.values).toHaveLength(4);
  });
});

// ── US2: range_bearing_series → line chart ───────────────────────────

describe('range_bearing_series → line chart', () => {
  it('produces a line chart spec from a valid range_bearing_series dataset', () => {
    const result = transformDataset(rangeBearingFixture as DatasetEnvelope);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const spec = result.spec as Record<string, unknown>;
    const mark = spec.mark;
    const markType = typeof mark === 'string' ? mark : (mark as { type: string })?.type;
    expect(markType).toBe('line');
  });

  it('uses temporal x-axis', () => {
    const result = transformDataset(rangeBearingFixture as DatasetEnvelope);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const spec = result.spec as Record<string, unknown>;
    const encoding = spec.encoding as Record<string, { type?: string }>;
    expect(encoding.x?.type).toBe('temporal');
  });

  it('includes a colour channel for multi-series', () => {
    const result = transformDataset(rangeBearingFixture as DatasetEnvelope);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const spec = result.spec as Record<string, unknown>;
    const encoding = spec.encoding as Record<string, { field?: string }>;
    expect(encoding.color?.field).toBe('series');
  });

  it('flattens all series data into values', () => {
    const result = transformDataset(rangeBearingFixture as DatasetEnvelope);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const spec = result.spec as Record<string, unknown>;
    const data = spec.data as { values: unknown[] };
    // 6 points × 2 series = 12
    expect(data.values).toHaveLength(12);
  });
});

// ── US2: error handling ──────────────────────────────────────────────

describe('transformer error handling', () => {
  it('returns unsupported_type for unknown dataset types', () => {
    const dataset: DatasetEnvelope = {
      type: 'custom_unknown',
      title: 'Unknown',
      metadata: {
        xAxis: { label: 'X', type: 'nominal' },
        yAxis: { label: 'Y', type: 'quantitative' },
      },
      data: [{ x: 1 }],
    };
    const result = transformDataset(dataset);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('unsupported_type');
    expect(result.error.datasetType).toBe('custom_unknown');
  });

  it('returns invalid_schema for malformed datasets', () => {
    const result = transformDataset(malformedFixture as unknown as DatasetEnvelope);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('invalid_schema');
  });

  it('returns empty_data for datasets with no data points', () => {
    const result = transformDataset(emptyFixture as DatasetEnvelope);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('empty_data');
  });

  it('returns invalid_schema for null input', () => {
    const result = transformDataset(null as unknown as DatasetEnvelope);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('invalid_schema');
  });

  it('returns invalid_schema when metadata is missing', () => {
    const dataset = {
      type: 'zone_histogram',
      title: 'Test',
      data: [{ zone: 'A', count: 1 }],
    } as unknown as DatasetEnvelope;
    const result = transformDataset(dataset);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('invalid_schema');
  });
});
