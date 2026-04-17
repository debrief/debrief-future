/**
 * Component tests for DateTimeWidget.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DateTimeWidget } from './DateTimeWidget';

const spec = { kind: 'datetime' as const };

describe('DateTimeWidget', () => {
  it('commits a valid ISO datetime on Enter', () => {
    const onCommit = vi.fn();
    render(
      <DateTimeWidget
        name="start_datetime"
        value={''}
        spec={spec}
        onCommit={onCommit}
      />,
    );
    const input = screen.getByTestId(
      'datetime-widget-input-start_datetime',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2025-06-01T12:00:00Z' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith(
      'start_datetime',
      '2025-06-01T12:00:00Z',
    );
  });

  it('commits on blur', () => {
    const onCommit = vi.fn();
    render(
      <DateTimeWidget
        name="dt"
        value={''}
        spec={spec}
        onCommit={onCommit}
      />,
    );
    const input = screen.getByTestId('datetime-widget-input-dt') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2025-06-01T12:00:00Z' } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledWith('dt', '2025-06-01T12:00:00Z');
  });

  it('rejects invalid input with an error and does not commit', () => {
    const onCommit = vi.fn();
    render(
      <DateTimeWidget name="dt" value={''} spec={spec} onCommit={onCommit} />,
    );
    const input = screen.getByTestId('datetime-widget-input-dt') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'not-a-date' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByTestId('datetime-widget-error-dt').textContent).toMatch(
      /ISO-8601/,
    );
  });

  it('commits null when the clear button is pressed', () => {
    const onCommit = vi.fn();
    render(
      <DateTimeWidget
        name="dt"
        value={'2025-01-01T00:00:00Z'}
        spec={spec}
        onCommit={onCommit}
      />,
    );
    fireEvent.click(screen.getByTestId('datetime-widget-clear-dt'));
    expect(onCommit).toHaveBeenCalledWith('dt', null);
  });

  it('renders read-only when disabled', () => {
    render(
      <DateTimeWidget
        name="dt"
        value={'2025-01-01T00:00:00Z'}
        spec={spec}
        onCommit={() => {}}
        disabled
      />,
    );
    expect(screen.queryByTestId('datetime-widget-input-dt')).toBeNull();
  });
});
