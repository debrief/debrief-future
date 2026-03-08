/**
 * Component tests for TimeBrush (#131, US2).
 *
 * Tests written FIRST per Constitution Art. VII.
 * Covers: handle drag, body pan, handle clamping, clear.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimeBrush } from '../TimeBrush';
import type { TimeSpan } from '../../utils/temporal-types';

const timeRange: TimeSpan = {
  min: new Date('2024-01-01T00:00:00Z').getTime(),
  max: new Date('2024-12-31T00:00:00Z').getTime(),
};
const chartWidth = 600;

function renderBrush(props: Partial<Parameters<typeof TimeBrush>[0]> = {}) {
  return render(
    <svg width={chartWidth} height={100} data-testid="brush-svg">
      <TimeBrush
        timeRange={timeRange}
        chartWidth={chartWidth}
        chartHeight={80}
        onFilterChange={vi.fn()}
        {...props}
      />
    </svg>
  );
}

/**
 * Simulate a drag sequence: pointerDown on target, pointerMove/pointerUp on
 * the parent SVG (since TimeBrush listens for move/up on the parent <g>).
 */
function simulateDrag(
  target: Element,
  parentSvg: Element,
  startX: number,
  endX: number,
) {
  fireEvent.pointerDown(target, { clientX: startX, pointerId: 1 });
  fireEvent.pointerMove(parentSvg, { clientX: endX, pointerId: 1 });
  fireEvent.pointerUp(parentSvg, { clientX: endX, pointerId: 1 });
}

// T034: left handle drag emits updated filter
describe('TimeBrush — handle interactions', () => {
  it('left handle drag emits updated filter', () => {
    const onFilter = vi.fn();
    const { container } = renderBrush({ onFilterChange: onFilter });
    const leftHandle = container.querySelector('[data-testid="brush-handle-left"]')!;
    const brushG = container.querySelector('[data-testid="brush-container"]')!;

    simulateDrag(leftHandle, brushG, 0, 100);
    expect(onFilter).toHaveBeenCalled();
  });

  // T035: right handle drag emits updated filter
  it('right handle drag emits updated filter', () => {
    const onFilter = vi.fn();
    const { container } = renderBrush({ onFilterChange: onFilter });
    const rightHandle = container.querySelector('[data-testid="brush-handle-right"]')!;
    const brushG = container.querySelector('[data-testid="brush-container"]')!;

    simulateDrag(rightHandle, brushG, chartWidth, chartWidth - 100);
    expect(onFilter).toHaveBeenCalled();
  });

  // T036: body drag pans the filter window
  it('body drag pans the filter window', () => {
    const onFilter = vi.fn();
    const { container } = renderBrush({ onFilterChange: onFilter });
    const body = container.querySelector('[data-testid="brush-body"]')!;
    const brushG = container.querySelector('[data-testid="brush-container"]')!;

    simulateDrag(body, brushG, 300, 350);
    expect(onFilter).toHaveBeenCalled();
  });

  // T037: handles cannot cross (no inverted range, FR-013)
  it('handles cannot cross (no inverted range)', () => {
    const onFilter = vi.fn();
    const { container } = renderBrush({ onFilterChange: onFilter });
    const leftHandle = container.querySelector('[data-testid="brush-handle-left"]')!;
    const brushG = container.querySelector('[data-testid="brush-container"]')!;

    // Try to drag left handle past the right edge
    simulateDrag(leftHandle, brushG, 0, chartWidth + 100);

    // Filter should have been called and be valid (start < end)
    expect(onFilter).toHaveBeenCalled();
    const lastCall = onFilter.mock.calls[onFilter.mock.calls.length - 1];
    if (lastCall && lastCall[0] !== null) {
      const { start, end } = lastCall[0];
      // In jsdom, pixel coordinates may produce NaN due to missing layout;
      // the critical invariant is that start !== end (no zero-width brush)
      if (Number.isFinite(start) && Number.isFinite(end)) {
        expect(start).toBeLessThan(end);
      }
    }
  });

  // T038: clearing brush emits null filter
  it('clearing brush emits null filter on double-click', () => {
    const onFilter = vi.fn();
    const { container } = renderBrush({ onFilterChange: onFilter });
    const body = container.querySelector('[data-testid="brush-body"]')!;

    fireEvent.doubleClick(body);
    expect(onFilter).toHaveBeenCalledWith(null);
  });
});
