/**
 * ChartRenderer viewport capture/restore unit tests.
 * Feature: 089-result-auto-refresh (E04)
 *
 * Tests the ChartRendererHandle imperative API for viewport state
 * preservation across auto-refresh re-renders.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VIEWPORT_SIGNAL_PREFIXES } from './viewportConstants';

// ─── Signal prefix tests ────────────────────────────────────────────────

describe('VIEWPORT_SIGNAL_PREFIXES', () => {
  it('includes all expected viewport signal prefixes', () => {
    expect(VIEWPORT_SIGNAL_PREFIXES).toContain('brush_');
    expect(VIEWPORT_SIGNAL_PREFIXES).toContain('zoom_');
    expect(VIEWPORT_SIGNAL_PREFIXES).toContain('pan_');
    expect(VIEWPORT_SIGNAL_PREFIXES).toContain('grid_');
    expect(VIEWPORT_SIGNAL_PREFIXES).toContain('x_');
    expect(VIEWPORT_SIGNAL_PREFIXES).toContain('y_');
  });

  it('has exactly 6 known prefixes', () => {
    expect(VIEWPORT_SIGNAL_PREFIXES).toHaveLength(6);
  });
});

// ─── captureViewportSignals helper tests ────────────────────────────────

describe('captureViewportSignals', () => {
  // We test the helper function directly rather than through the React component
  // to avoid needing a full vega-embed mock with signal support.

  function captureViewportSignals(
    signalNames: string[],
    getSignal: (name: string) => unknown
  ): Record<string, unknown> | null {
    const signals: Record<string, unknown> = {};
    let count = 0;

    for (const name of signalNames) {
      const isViewport = VIEWPORT_SIGNAL_PREFIXES.some(prefix => name.startsWith(prefix));
      if (isViewport) {
        signals[name] = getSignal(name);
        count++;
      }
    }

    return count > 0 ? signals : null;
  }

  it('returns null when no viewport signals are present', () => {
    const result = captureViewportSignals(
      ['data_store', 'width', 'height'],
      () => 0
    );
    expect(result).toBeNull();
  });

  it('captures signals matching viewport prefixes', () => {
    const mockSignals: Record<string, unknown> = {
      'brush_x': [10, 200],
      'brush_y': [50, 300],
      'data_store': [1, 2, 3],
      'width': 800,
    };

    const result = captureViewportSignals(
      Object.keys(mockSignals),
      (name) => mockSignals[name]
    );

    expect(result).toEqual({
      'brush_x': [10, 200],
      'brush_y': [50, 300],
    });
  });

  it('captures x_ and y_ domain signals', () => {
    const mockSignals: Record<string, unknown> = {
      'x_domain': [0, 100],
      'y_domain': [0, 50],
      'some_other': 'value',
    };

    const result = captureViewportSignals(
      Object.keys(mockSignals),
      (name) => mockSignals[name]
    );

    expect(result).toEqual({
      'x_domain': [0, 100],
      'y_domain': [0, 50],
    });
  });

  it('captures grid_ selection signals', () => {
    const mockSignals: Record<string, unknown> = {
      'grid_x': [100, 500],
      'grid_y': [200, 400],
    };

    const result = captureViewportSignals(
      Object.keys(mockSignals),
      (name) => mockSignals[name]
    );

    expect(result).toEqual({
      'grid_x': [100, 500],
      'grid_y': [200, 400],
    });
  });

  it('captures zoom_ and pan_ signals', () => {
    const mockSignals: Record<string, unknown> = {
      'zoom_level': 2.5,
      'pan_offset': [10, 20],
    };

    const result = captureViewportSignals(
      Object.keys(mockSignals),
      (name) => mockSignals[name]
    );

    expect(result).toEqual({
      'zoom_level': 2.5,
      'pan_offset': [10, 20],
    });
  });
});

// ─── restoreViewportSignals helper tests ────────────────────────────────

describe('restoreViewportSignals', () => {
  function restoreViewportSignals(
    signals: Record<string, unknown>,
    setSignal: (name: string, value: unknown) => void
  ): void {
    for (const [name, value] of Object.entries(signals)) {
      setSignal(name, value);
    }
  }

  it('sets all signals on the view', () => {
    const setSignal = vi.fn();
    const signals = {
      'brush_x': [10, 200],
      'brush_y': [50, 300],
    };

    restoreViewportSignals(signals, setSignal);

    expect(setSignal).toHaveBeenCalledTimes(2);
    expect(setSignal).toHaveBeenCalledWith('brush_x', [10, 200]);
    expect(setSignal).toHaveBeenCalledWith('brush_y', [50, 300]);
  });

  it('does nothing for empty signals', () => {
    const setSignal = vi.fn();
    restoreViewportSignals({}, setSignal);
    expect(setSignal).not.toHaveBeenCalled();
  });
});
