/**
 * Unit tests for TransportRow (Feature 217, T301).
 *
 * Covers:
 *   - Forward / Backward buttons render with aria-labels + vscrui icons
 *   - "Scene N of M" counter rendering (and empty-counter when sceneTotal=0)
 *   - Disabled state from canGoForward / canGoBackward / transitionInFlight
 *   - Click callbacks fire the right handler
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransportRow } from '../TransportRow';
import type { TransportViewModel } from '../types';

function vm(overrides: Partial<TransportViewModel> = {}): TransportViewModel {
  return {
    canGoBackward: overrides.canGoBackward ?? true,
    canGoForward: overrides.canGoForward ?? true,
    sceneNumber: overrides.sceneNumber ?? 1,
    sceneTotal: overrides.sceneTotal ?? 3,
    transitionInFlight: overrides.transitionInFlight ?? false,
  };
}

describe('TransportRow', () => {
  it('renders Forward + Backward buttons with aria-labels', () => {
    render(
      <TransportRow
        transport={vm()}
        onForwardClick={() => undefined}
        onBackwardClick={() => undefined}
      />,
    );
    const fwd = screen.getByTestId('transport-forward');
    const back = screen.getByTestId('transport-backward');
    expect(fwd.getAttribute('aria-label')).toMatch(/forward/i);
    expect(back.getAttribute('aria-label')).toMatch(/back/i);
  });

  it('renders "Scene N of M" counter', () => {
    render(
      <TransportRow
        transport={vm({ sceneNumber: 2, sceneTotal: 5 })}
        onForwardClick={() => undefined}
        onBackwardClick={() => undefined}
      />,
    );
    const counter = screen.getByTestId('transport-counter');
    expect(counter.textContent).toContain('2');
    expect(counter.textContent).toContain('5');
  });

  it('renders an empty counter when sceneTotal === 0', () => {
    render(
      <TransportRow
        transport={vm({ sceneNumber: 0, sceneTotal: 0, canGoBackward: false, canGoForward: false })}
        onForwardClick={() => undefined}
        onBackwardClick={() => undefined}
      />,
    );
    const counter = screen.getByTestId('transport-counter');
    expect(counter.textContent?.trim()).toBe('');
  });

  it('disables Backward when canGoBackward is false', () => {
    render(
      <TransportRow
        transport={vm({ canGoBackward: false })}
        onForwardClick={() => undefined}
        onBackwardClick={() => undefined}
      />,
    );
    expect((screen.getByTestId('transport-backward') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('transport-forward') as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables Forward when canGoForward is false', () => {
    render(
      <TransportRow
        transport={vm({ canGoForward: false })}
        onForwardClick={() => undefined}
        onBackwardClick={() => undefined}
      />,
    );
    expect((screen.getByTestId('transport-forward') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('transport-backward') as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables both buttons when transitionInFlight is true', () => {
    render(
      <TransportRow
        transport={vm({ transitionInFlight: true })}
        onForwardClick={() => undefined}
        onBackwardClick={() => undefined}
      />,
    );
    expect((screen.getByTestId('transport-forward') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('transport-backward') as HTMLButtonElement).disabled).toBe(true);
  });

  it('clicking Forward fires onForwardClick', () => {
    const onForwardClick = vi.fn();
    render(
      <TransportRow
        transport={vm()}
        onForwardClick={onForwardClick}
        onBackwardClick={() => undefined}
      />,
    );
    fireEvent.click(screen.getByTestId('transport-forward'));
    expect(onForwardClick).toHaveBeenCalledTimes(1);
  });

  it('clicking Backward fires onBackwardClick', () => {
    const onBackwardClick = vi.fn();
    render(
      <TransportRow
        transport={vm()}
        onForwardClick={() => undefined}
        onBackwardClick={onBackwardClick}
      />,
    );
    fireEvent.click(screen.getByTestId('transport-backward'));
    expect(onBackwardClick).toHaveBeenCalledTimes(1);
  });

  it('clicking disabled Forward does not fire callback', () => {
    const onForwardClick = vi.fn();
    render(
      <TransportRow
        transport={vm({ canGoForward: false })}
        onForwardClick={onForwardClick}
        onBackwardClick={() => undefined}
      />,
    );
    fireEvent.click(screen.getByTestId('transport-forward'));
    expect(onForwardClick).not.toHaveBeenCalled();
  });
});
