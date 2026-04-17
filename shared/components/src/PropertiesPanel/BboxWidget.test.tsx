/**
 * Component tests for BboxWidget.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BboxWidget } from './BboxWidget';

const spec = { kind: 'bbox' as const };

describe('BboxWidget', () => {
  it('commits a valid 4-tuple after edit + blur', () => {
    const onCommit = vi.fn();
    render(
      <BboxWidget
        name="bbox"
        value={[0, 0, 1, 1]}
        spec={spec}
        onCommit={onCommit}
      />,
    );
    const east = screen.getByTestId('bbox-widget-input-bbox-E') as HTMLInputElement;
    fireEvent.change(east, { target: { value: '2' } });
    fireEvent.blur(east);
    expect(onCommit).toHaveBeenCalledWith('bbox', [0, 0, 2, 1]);
  });

  it('commits on Enter', () => {
    const onCommit = vi.fn();
    render(
      <BboxWidget
        name="bbox"
        value={[0, 0, 1, 1]}
        spec={spec}
        onCommit={onCommit}
      />,
    );
    const north = screen.getByTestId('bbox-widget-input-bbox-N') as HTMLInputElement;
    fireEvent.change(north, { target: { value: '5' } });
    fireEvent.keyDown(north, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith('bbox', [0, 0, 1, 5]);
  });

  it('surfaces W<E invariant violation and does not commit', () => {
    const onCommit = vi.fn();
    render(
      <BboxWidget
        name="bbox"
        value={[0, 0, 1, 1]}
        spec={spec}
        onCommit={onCommit}
      />,
    );
    const west = screen.getByTestId('bbox-widget-input-bbox-W') as HTMLInputElement;
    fireEvent.change(west, { target: { value: '5' } });
    fireEvent.blur(west);
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByTestId('bbox-widget-error-bbox').textContent).toMatch(
      /West must be/,
    );
  });

  it('surfaces S<N invariant violation', () => {
    const onCommit = vi.fn();
    render(
      <BboxWidget
        name="bbox"
        value={[0, 0, 1, 1]}
        spec={spec}
        onCommit={onCommit}
      />,
    );
    const south = screen.getByTestId('bbox-widget-input-bbox-S') as HTMLInputElement;
    fireEvent.change(south, { target: { value: '5' } });
    fireEvent.blur(south);
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByTestId('bbox-widget-error-bbox').textContent).toMatch(
      /South must be/,
    );
  });

  it('does not re-commit when the value is unchanged', () => {
    const onCommit = vi.fn();
    render(
      <BboxWidget
        name="bbox"
        value={[0, 0, 1, 1]}
        spec={spec}
        onCommit={onCommit}
      />,
    );
    const east = screen.getByTestId('bbox-widget-input-bbox-E') as HTMLInputElement;
    fireEvent.blur(east);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('renders read-only when disabled', () => {
    render(
      <BboxWidget
        name="bbox"
        value={[0, 0, 1, 1]}
        spec={spec}
        onCommit={() => {}}
        disabled
      />,
    );
    expect(screen.queryByTestId('bbox-widget-input-bbox-W')).toBeNull();
  });
});
