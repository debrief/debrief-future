/**
 * Unit tests for UndoToast (Feature 218 — T063).
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UndoToast, type UndoToastProps } from '../UndoToast';

function makeProps(overrides: Partial<UndoToastProps> = {}): UndoToastProps {
  return {
    state: {
      sceneId: 'scene-1',
      sceneTitle: 'Opening',
      deletedAt: '2026-04-24T12:00:00Z',
      canUndo: true,
    },
    onUndo: vi.fn(),
    onDismiss: vi.fn(),
    ...overrides,
  };
}

describe('UndoToast', () => {
  it('renders nothing when state is null', () => {
    const { container } = render(<UndoToast {...makeProps({ state: null })} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the scene title and Undo + Dismiss buttons', () => {
    render(<UndoToast {...makeProps()} />);
    const toast = screen.getByTestId('undo-toast');
    expect(toast.textContent).toContain('Opening');
    expect(screen.getByTestId('undo-toast-undo-button')).toBeDefined();
    expect(screen.getByTestId('undo-toast-dismiss-button')).toBeDefined();
  });

  it('Undo click fires onUndo', () => {
    const onUndo = vi.fn();
    render(<UndoToast {...makeProps({ onUndo })} />);
    fireEvent.click(screen.getByTestId('undo-toast-undo-button'));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('Dismiss click fires onDismiss', () => {
    const onDismiss = vi.fn();
    render(<UndoToast {...makeProps({ onDismiss })} />);
    fireEvent.click(screen.getByTestId('undo-toast-dismiss-button'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('Undo button disables when canUndo is false', () => {
    const props = makeProps({
      state: {
        sceneId: 's',
        sceneTitle: 'x',
        deletedAt: 'now',
        canUndo: false,
      },
    });
    render(<UndoToast {...props} />);
    const btn = screen.getByTestId('undo-toast-undo-button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('has role="status" and aria-live="polite"', () => {
    render(<UndoToast {...makeProps()} />);
    const toast = screen.getByTestId('undo-toast');
    expect(toast.getAttribute('role')).toBe('status');
    expect(toast.getAttribute('aria-live')).toBe('polite');
  });

  it('Escape key fires onDismiss', () => {
    const onDismiss = vi.fn();
    render(<UndoToast {...makeProps({ onDismiss })} />);
    const toast = screen.getByTestId('undo-toast');
    fireEvent.keyDown(toast, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
