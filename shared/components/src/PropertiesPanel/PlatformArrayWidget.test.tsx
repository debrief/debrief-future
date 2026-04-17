/**
 * Component tests for PlatformArrayWidget.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PlatformArrayWidget } from './PlatformArrayWidget';

const spec = { kind: 'platform-array' as const };

describe('PlatformArrayWidget', () => {
  it('adds a new row then commits when id is typed and blurred', () => {
    const onCommit = vi.fn();
    render(
      <PlatformArrayWidget
        name="debrief:platforms"
        value={[]}
        spec={spec}
        onCommit={onCommit}
      />,
    );
    fireEvent.click(screen.getByTestId('platform-array-add-debrief:platforms'));
    const idInput = screen.getByTestId(
      'platform-array-input-debrief:platforms-0-id',
    ) as HTMLInputElement;
    fireEvent.change(idInput, { target: { value: 'NELSON' } });
    fireEvent.blur(idInput);
    expect(onCommit).toHaveBeenCalledWith('debrief:platforms', [{ id: 'NELSON' }]);
  });

  it('edits an existing row and commits on blur', () => {
    const onCommit = vi.fn();
    render(
      <PlatformArrayWidget
        name="p"
        value={[{ id: 'NELSON', name: 'HMS Nelson' }]}
        spec={spec}
        onCommit={onCommit}
      />,
    );
    const nameInput = screen.getByTestId(
      'platform-array-input-p-0-name',
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'HMS Rodney' } });
    fireEvent.blur(nameInput);
    expect(onCommit).toHaveBeenCalledWith('p', [
      { id: 'NELSON', name: 'HMS Rodney' },
    ]);
  });

  it('deletes a row and commits the resulting array', () => {
    const onCommit = vi.fn();
    render(
      <PlatformArrayWidget
        name="p"
        value={[
          { id: 'A', name: 'Alpha' },
          { id: 'B', name: 'Bravo' },
        ]}
        spec={spec}
        onCommit={onCommit}
      />,
    );
    fireEvent.click(screen.getByTestId('platform-array-delete-p-0'));
    expect(onCommit).toHaveBeenCalledWith('p', [{ id: 'B', name: 'Bravo' }]);
  });

  it('blocks commit when a row has no id', () => {
    const onCommit = vi.fn();
    render(
      <PlatformArrayWidget
        name="p"
        value={[{ id: 'A' }]}
        spec={spec}
        onCommit={onCommit}
      />,
    );
    const idInput = screen.getByTestId('platform-array-input-p-0-id') as HTMLInputElement;
    fireEvent.change(idInput, { target: { value: '' } });
    fireEvent.blur(idInput);
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByTestId('platform-array-error-p').textContent).toMatch(/non-empty id/);
  });

  it('renders disabled (no add, no delete, inputs disabled)', () => {
    render(
      <PlatformArrayWidget
        name="p"
        value={[{ id: 'A' }]}
        spec={spec}
        onCommit={() => {}}
        disabled
      />,
    );
    expect(screen.queryByTestId('platform-array-add-p')).toBeNull();
    expect(screen.queryByTestId('platform-array-delete-p-0')).toBeNull();
    const idInput = screen.getByTestId('platform-array-input-p-0-id') as HTMLInputElement;
    expect(idInput.disabled).toBe(true);
  });
});
