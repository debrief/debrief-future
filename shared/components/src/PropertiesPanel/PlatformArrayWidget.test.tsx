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
    // New row auto-enters edit mode → inputs now rendered.
    const idInput = screen.getByTestId(
      'platform-array-input-debrief:platforms-0-id',
    ) as HTMLInputElement;
    fireEvent.change(idInput, { target: { value: 'NELSON' } });
    // Blur outside the row → commit + exit edit.
    fireEvent.blur(idInput, { relatedTarget: document.body });
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
    // Display row renders as a clickable cell. Click to enter edit mode.
    fireEvent.click(screen.getByTestId('platform-array-row-p-0'));
    const nameInput = screen.getByTestId(
      'platform-array-input-p-0-name',
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'HMS Rodney' } });
    fireEvent.blur(nameInput, { relatedTarget: document.body });
    expect(onCommit).toHaveBeenCalledWith('p', [
      { id: 'NELSON', name: 'HMS Rodney' },
    ]);
  });

  it('deletes a row (display mode) and commits the resulting array', () => {
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
    // Delete button is available on the read-only display row — no edit mode needed.
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
    fireEvent.click(screen.getByTestId('platform-array-row-p-0'));
    const idInput = screen.getByTestId('platform-array-input-p-0-id') as HTMLInputElement;
    fireEvent.change(idInput, { target: { value: '' } });
    fireEvent.blur(idInput, { relatedTarget: document.body });
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByTestId('platform-array-error-p').textContent).toMatch(/non-empty id/);
  });

  it('renders disabled (no add, no delete, no edit entry)', () => {
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
    // Clicking the row in disabled mode must not open inputs.
    fireEvent.click(screen.getByTestId('platform-array-row-p-0'));
    expect(screen.queryByTestId('platform-array-input-p-0-id')).toBeNull();
  });
});
