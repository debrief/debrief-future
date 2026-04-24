/**
 * Component tests for ArrayWidget.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ArrayWidget } from './ArrayWidget';

function spec(overrides: Partial<{ maxItems: number; itemEnum: string[] }> = {}) {
  return { kind: 'string-array' as const, ...overrides };
}

describe('ArrayWidget', () => {
  it('commits the new full array when Enter is pressed', () => {
    const onCommit = vi.fn();
    render(
      <ArrayWidget
        name="tags"
        value={['alpha']}
        spec={spec()}
        onCommit={onCommit}
      />,
    );
    const input = screen.getByTestId('array-widget-input-tags') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'bravo' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith('tags', ['alpha', 'bravo']);
  });

  it('does not commit on intermediate keystrokes', () => {
    const onCommit = vi.fn();
    render(<ArrayWidget name="tags" value={[]} spec={spec()} onCommit={onCommit} />);
    const input = screen.getByTestId('array-widget-input-tags') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: 'ab' } });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('removes a chip on click and commits new array', () => {
    const onCommit = vi.fn();
    render(
      <ArrayWidget
        name="tags"
        value={['alpha', 'bravo']}
        spec={spec()}
        onCommit={onCommit}
      />,
    );
    fireEvent.click(screen.getByTestId('array-widget-remove-tags-alpha'));
    expect(onCommit).toHaveBeenCalledWith('tags', ['bravo']);
  });

  it('blocks duplicates with an error', () => {
    const onCommit = vi.fn();
    render(
      <ArrayWidget
        name="tags"
        value={['alpha']}
        spec={spec()}
        onCommit={onCommit}
      />,
    );
    const input = screen.getByTestId('array-widget-input-tags') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'alpha' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByTestId('array-widget-error-tags').textContent).toMatch(/Duplicate/);
  });

  it('respects maxItems', () => {
    const onCommit = vi.fn();
    render(
      <ArrayWidget
        name="tags"
        value={['a', 'b']}
        spec={spec({ maxItems: 2 })}
        onCommit={onCommit}
      />,
    );
    const input = screen.getByTestId('array-widget-input-tags') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('renders disabled (no input, no remove buttons)', () => {
    render(
      <ArrayWidget
        name="tags"
        value={['alpha']}
        spec={spec()}
        onCommit={() => {}}
        disabled
      />,
    );
    expect(screen.queryByTestId('array-widget-input-tags')).toBeNull();
    expect(screen.queryByTestId('array-widget-remove-tags-alpha')).toBeNull();
  });
});
