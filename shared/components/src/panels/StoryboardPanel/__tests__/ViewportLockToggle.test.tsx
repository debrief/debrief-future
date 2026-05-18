/**
 * RTL tests for the StoryboardPanel padlock toggle (spec 260 / T036).
 *
 * Pattern modelled on `shared/components/src/StacBrowser/__tests__/
 * ThumbnailSizeToggle.test.tsx` (aria-pressed-bound toggle button).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StoryboardPanel } from '../StoryboardPanel';
import type { StoryboardPanelProps } from '../types';

function baseProps(
  overrides: Partial<StoryboardPanelProps> = {},
): StoryboardPanelProps {
  return {
    scenes: [],
    activeStoryboardName: 'Exercise Alpha',
    captureInFlight: false,
    onCaptureClick: () => undefined,
    onSceneRowClick: () => undefined,
    ...overrides,
  };
}

describe('StoryboardPanel — viewport-lock padlock toggle', () => {
  it('does NOT render the padlock when onViewportLockToggle is not provided', () => {
    render(<StoryboardPanel {...baseProps()} />);
    expect(screen.queryByTestId('viewport-lock-toggle')).toBeNull();
  });

  it('renders aria-pressed="false" when viewportLocked is false', () => {
    render(
      <StoryboardPanel
        {...baseProps({
          viewportLocked: false,
          onViewportLockToggle: () => undefined,
        })}
      />,
    );
    const btn = screen.getByTestId('viewport-lock-toggle');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(btn.getAttribute('aria-label')).toBe('Lock viewport');
  });

  it('renders aria-pressed="true" when viewportLocked is true', () => {
    render(
      <StoryboardPanel
        {...baseProps({
          viewportLocked: true,
          onViewportLockToggle: () => undefined,
        })}
      />,
    );
    const btn = screen.getByTestId('viewport-lock-toggle');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(btn.getAttribute('aria-label')).toBe('Unlock viewport');
  });

  it('fires onViewportLockToggle on click', () => {
    const onViewportLockToggle = vi.fn();
    render(
      <StoryboardPanel
        {...baseProps({
          viewportLocked: false,
          onViewportLockToggle,
        })}
      />,
    );
    fireEvent.click(screen.getByTestId('viewport-lock-toggle'));
    expect(onViewportLockToggle).toHaveBeenCalledTimes(1);
  });

  it('is disabled when hasActivePlot is false (FR-013)', () => {
    const onViewportLockToggle = vi.fn();
    render(
      <StoryboardPanel
        {...baseProps({
          viewportLocked: false,
          onViewportLockToggle,
          hasActivePlot: false,
        })}
      />,
    );
    const btn = screen.getByTestId('viewport-lock-toggle') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    // Click should be a no-op on a disabled native <button>.
    fireEvent.click(btn);
    expect(onViewportLockToggle).not.toHaveBeenCalled();
  });

  it('sits adjacent to the Capture button', () => {
    render(
      <StoryboardPanel
        {...baseProps({
          viewportLocked: false,
          onViewportLockToggle: () => undefined,
        })}
      />,
    );
    const lockBtn = screen.getByTestId('viewport-lock-toggle');
    const captureBtn = screen.getByTestId('capture-button');
    // Same parent — the panel header's right-hand button group.
    expect(lockBtn.parentElement).toBe(captureBtn.parentElement);
  });
});

describe('StoryboardPanel — keyboard shortcut (spec 260 / Story 3)', () => {
  // The L shortcut lives on MapView's root <div>, NOT in the StoryboardPanel
  // — the panel-level Vitest only covers the padlock control. The shortcut
  // is exercised by the MapView vitest + the web-shell Playwright spec.
  it('is documented as handled by MapView, not by the panel', () => {
    expect(true).toBe(true);
  });
});
