/**
 * RTL tests for ViewportLockBanner (spec 260 / T035).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewportLockBanner } from '../ViewportLockBanner';

describe('ViewportLockBanner', () => {
  it('renders nothing when locked is false', () => {
    const { container } = render(
      <ViewportLockBanner locked={false} onUnlock={() => undefined} />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('viewport-lock-banner')).toBeNull();
  });

  it('renders a role="status" banner with aria-live="polite" when locked', () => {
    render(<ViewportLockBanner locked={true} onUnlock={() => undefined} />);
    const banner = screen.getByTestId('viewport-lock-banner');
    expect(banner.getAttribute('role')).toBe('status');
    expect(banner.getAttribute('aria-live')).toBe('polite');
  });

  it('renders an inner unlock button with the lock label', () => {
    render(<ViewportLockBanner locked={true} onUnlock={() => undefined} />);
    const button = screen.getByTestId('viewport-lock-banner-unlock');
    expect(button.textContent).toMatch(/Viewport locked/);
    expect(button.textContent).toMatch(/click to unlock/);
    expect(button.getAttribute('aria-label')).toBe('Unlock viewport');
  });

  it('fires onUnlock when the inner button is clicked', () => {
    const onUnlock = vi.fn();
    render(<ViewportLockBanner locked={true} onUnlock={onUnlock} />);
    fireEvent.click(screen.getByTestId('viewport-lock-banner-unlock'));
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });
});
