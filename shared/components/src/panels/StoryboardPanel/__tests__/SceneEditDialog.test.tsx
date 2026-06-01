/**
 * Unit tests for SceneEditDialog — the per-Scene edit popup that replaced
 * the former inline SceneEditForm.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SceneEditDialog } from '../SceneEditDialog';

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof SceneEditDialog>> = {},
) {
  const props: React.ComponentProps<typeof SceneEditDialog> = {
    sceneId: 'a',
    title: 'Opening',
    description: 'Original',
    timestamp: '2026-04-20T10:00:00Z',
    missingData: { kind: 'ok' },
    onSave: vi.fn(),
    onUpdateToCurrent: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  render(<SceneEditDialog {...props} />);
  return props;
}

describe('SceneEditDialog', () => {
  it('renders title + description seeded from props', () => {
    renderDialog();
    expect(
      (screen.getByTestId('scene-edit-dialog-title-input') as HTMLInputElement)
        .value,
    ).toBe('Opening');
    expect(
      (
        screen.getByTestId(
          'scene-edit-dialog-description-textarea',
        ) as HTMLTextAreaElement
      ).value,
    ).toBe('Original');
  });

  it('Save passes the trimmed title and description', () => {
    const onSave = vi.fn();
    renderDialog({ onSave });
    fireEvent.change(screen.getByTestId('scene-edit-dialog-title-input'), {
      target: { value: '  Renamed  ' },
    });
    fireEvent.change(
      screen.getByTestId('scene-edit-dialog-description-textarea'),
      { target: { value: 'New notes' } },
    );
    fireEvent.click(screen.getByTestId('scene-edit-dialog-save'));
    expect(onSave).toHaveBeenCalledWith('Renamed', 'New notes');
  });

  it('Save maps an emptied description to null', () => {
    const onSave = vi.fn();
    renderDialog({ onSave });
    fireEvent.change(
      screen.getByTestId('scene-edit-dialog-description-textarea'),
      { target: { value: '' } },
    );
    fireEvent.click(screen.getByTestId('scene-edit-dialog-save'));
    expect(onSave).toHaveBeenCalledWith('Opening', null);
  });

  it('Cancel button fires onCancel', () => {
    const onCancel = vi.fn();
    renderDialog({ onCancel });
    fireEvent.click(screen.getByTestId('scene-edit-dialog-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Escape fires onCancel', () => {
    const onCancel = vi.fn();
    renderDialog({ onCancel });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('backdrop click fires onCancel', () => {
    const onCancel = vi.fn();
    renderDialog({ onCancel });
    fireEvent.mouseDown(screen.getByTestId('scene-edit-dialog-backdrop'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows a missing-data remedy with Update to current', () => {
    const onUpdateToCurrent = vi.fn();
    renderDialog({
      onUpdateToCurrent,
      missingData: { kind: 'out-of-range', scenario: 'after-end' },
    });
    expect(screen.getByTestId('scene-edit-dialog-missing-data')).toBeTruthy();
    fireEvent.click(screen.getByTestId('scene-edit-dialog-update-to-current'));
    expect(onUpdateToCurrent).toHaveBeenCalledTimes(1);
  });

  it('hides the missing-data section when data is ok', () => {
    renderDialog({ missingData: { kind: 'ok' } });
    expect(screen.queryByTestId('scene-edit-dialog-missing-data')).toBeNull();
  });
});
