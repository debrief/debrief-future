/**
 * Vitest for ModeToggle (T072).
 *
 * Covers:
 *   - clicking the toggle dispatches `toggleDisplayMode` to the store
 *   - the `P` keyboard listener flips the mode from either side
 *   - in Present mode, mouse-near-top-right reveals the toggle for ~3 s
 *     and hides it again after the timeout (debounce)
 */

/// <reference lib="dom" />
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { FC } from 'react';
import { ModeToggle } from '../ModeToggle';
import { useBriefingStore } from '../../store';
import { useKeyboardModeToggle } from '../../hooks/useKeyboardModeToggle';

/**
 * Renders the ModeToggle alongside the keyboard-shortcut hook. The
 * App-level hook owns the `P` listener (post the
 * briefing-zip-mode-toggle.spec.ts soak fix); this harness lets the
 * unit tests still exercise the keyboard behaviour.
 */
const WithKeyboardHook: FC = () => {
  useKeyboardModeToggle();
  return <ModeToggle />;
};

beforeEach(() => {
  useBriefingStore.setState({
    displayMode: 'minimal',
    modeToggleVisible: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ModeToggle', () => {
  it('renders the Enter Present button by default in Minimal mode', () => {
    render(<ModeToggle />);
    const btn = screen.getByTestId('briefing-mode-toggle');
    expect(btn.textContent).toContain('Enter Present');
  });

  it('flips the display mode on click', () => {
    render(<ModeToggle />);
    fireEvent.click(screen.getByTestId('briefing-mode-toggle'));
    expect(useBriefingStore.getState().displayMode).toBe('present');
  });

  it('responds to the `P` keyboard shortcut (lowercase)', () => {
    render(<WithKeyboardHook />);
    fireEvent.keyDown(window, { key: 'p' });
    expect(useBriefingStore.getState().displayMode).toBe('present');
  });

  it('responds to the `P` keyboard shortcut (uppercase)', () => {
    render(<WithKeyboardHook />);
    fireEvent.keyDown(window, { key: 'P' });
    expect(useBriefingStore.getState().displayMode).toBe('present');
  });

  it('flips both directions via the keyboard', () => {
    render(<WithKeyboardHook />);
    fireEvent.keyDown(window, { key: 'p' });
    expect(useBriefingStore.getState().displayMode).toBe('present');
    fireEvent.keyDown(window, { key: 'p' });
    expect(useBriefingStore.getState().displayMode).toBe('minimal');
  });

  it('hides itself when entering Present mode (and reveals on hover)', () => {
    vi.useFakeTimers();
    const { unmount, rerender } = render(<ModeToggle />);

    // Enter Present mode → modeToggleVisible should flip to false on the
    // mode-change effect's next tick.
    act(() => {
      useBriefingStore.setState({ displayMode: 'present' });
    });
    rerender(<ModeToggle />);
    expect(useBriefingStore.getState().modeToggleVisible).toBe(false);

    // The button is gone from the DOM.
    expect(screen.queryByTestId('briefing-mode-toggle')).toBeNull();

    // Mouse near top-right reveals it.
    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
      fireEvent.mouseMove(window, { clientX: 1270, clientY: 40 });
    });
    rerender(<ModeToggle />);
    expect(useBriefingStore.getState().modeToggleVisible).toBe(true);

    // After 3 s it hides again.
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(useBriefingStore.getState().modeToggleVisible).toBe(false);

    unmount();
  });
});
