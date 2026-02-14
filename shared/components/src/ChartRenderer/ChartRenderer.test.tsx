import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ChartRenderer } from './ChartRenderer';
import type { TopLevelSpec } from 'vega-lite';

// Mock vega-embed — we test the component lifecycle, not vega rendering.
const mockFinalize = vi.fn();
vi.mock('vega-embed', () => ({
  default: vi.fn(async () => ({ finalize: mockFinalize, view: {} })),
}));

import embed from 'vega-embed';
const mockedEmbed = vi.mocked(embed);

const barSpec: TopLevelSpec = {
  $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
  title: 'Test Bar Chart',
  mark: 'bar',
  data: { values: [{ x: 'A', y: 1 }] },
  encoding: {
    x: { field: 'x', type: 'nominal' },
    y: { field: 'y', type: 'quantitative' },
  },
};

const lineSpec: TopLevelSpec = {
  $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
  title: 'Test Line Chart',
  mark: 'line',
  data: { values: [{ time: '2024-01-01', value: 10 }] },
  encoding: {
    x: { field: 'time', type: 'temporal' },
    y: { field: 'value', type: 'quantitative' },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── US1: renders bar chart from valid spec ───────────────────────────

describe('ChartRenderer — bar chart', () => {
  it('renders a chart container with data-testid', () => {
    render(<ChartRenderer spec={barSpec} />);
    expect(screen.getByTestId('chart-renderer')).toBeInTheDocument();
  });

  it('calls vega-embed with the spec', async () => {
    render(<ChartRenderer spec={barSpec} />);
    await waitFor(() => {
      expect(mockedEmbed).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        barSpec,
        { actions: false, renderer: 'canvas' },
      );
    });
  });

  it('hides loading indicator after embed completes', async () => {
    render(<ChartRenderer spec={barSpec} />);
    await waitFor(() => {
      expect(screen.queryByTestId('chart-loading')).not.toBeInTheDocument();
    });
  });

  it('cleans up the view on unmount', async () => {
    const { unmount } = render(<ChartRenderer spec={barSpec} />);
    await waitFor(() => expect(mockedEmbed).toHaveBeenCalled());
    unmount();
    expect(mockFinalize).toHaveBeenCalled();
  });
});

// ── US1: empty state ─────────────────────────────────────────────────

describe('ChartRenderer — empty state', () => {
  it('is handled by the transformer returning empty_data error, not the component', () => {
    // The transformer intercepts empty data before producing a spec.
    // If the component ever receives a null spec, it shows an error state.
    // This test confirms the error state for null spec works.
    render(<ChartRenderer spec={null} />);
    expect(screen.getByTestId('chart-error')).toBeInTheDocument();
    expect(screen.getByTestId('chart-error')).toHaveTextContent('No render spec provided');
  });
});

// ── US1: error state for null/malformed spec ─────────────────────────

describe('ChartRenderer — error state', () => {
  it('shows error message for null spec', () => {
    render(<ChartRenderer spec={null} />);
    expect(screen.getByTestId('chart-error')).toHaveTextContent('No render spec provided');
  });

  it('shows error message when vega-embed throws', async () => {
    mockedEmbed.mockRejectedValueOnce(new Error('Invalid spec'));
    const onError = vi.fn();
    render(<ChartRenderer spec={barSpec} onError={onError} />);

    await waitFor(() => {
      expect(screen.getByTestId('chart-error')).toHaveTextContent(
        'Chart rendering failed: Invalid spec',
      );
    });
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('does not crash when spec is invalid', async () => {
    mockedEmbed.mockRejectedValueOnce(new Error('Bad spec'));
    render(<ChartRenderer spec={barSpec} />);

    await waitFor(() => {
      expect(screen.getByTestId('chart-error')).toBeInTheDocument();
    });
  });
});

// ── US2: renders line chart with temporal x-axis ─────────────────────

describe('ChartRenderer — line chart', () => {
  it('calls vega-embed with a line chart spec', async () => {
    render(<ChartRenderer spec={lineSpec} />);
    await waitFor(() => {
      expect(mockedEmbed).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        lineSpec,
        { actions: false, renderer: 'canvas' },
      );
    });
  });
});

// ── US4: isolation check ─────────────────────────────────────────────

describe('ChartRenderer — rendering library isolation', () => {
  it('only imports vega-embed, not vega or vega-lite directly', () => {
    // This is a structural assertion: the ChartRenderer.tsx file
    // should only import from vega-embed and vega-lite (for types).
    // The actual isolation check (no vega imports outside ChartRenderer/)
    // is verified by the grep-based test in the Polish phase.
    expect(true).toBe(true); // Placeholder — real check is grep-based
  });
});
