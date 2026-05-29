/**
 * Vitest for `ReadOnlyBanner` (Spec 192, Phase 6, T046).
 *
 * Covers the four behavioural assertions called out in the contract
 * (`contracts/read-only-signal.md` — Behavioural rules, panel side):
 *
 *   - Renders the reason text verbatim.
 *   - Exposes `data-testid="read-only-banner"` for Playwright + visual
 *     smoke tests.
 *   - Uses `aria-live="polite"` so screen readers announce the state
 *     when it transitions mid-session.
 *   - Renders nothing when `reason === null` (suppresses the banner so
 *     writable plots show no decoration).
 *
 * Plus an empty-string belt-and-braces case: the component falls back to
 * a generic "read-only" message so the signal is never silently swallowed
 * (Article I.3 — No silent failures).
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReadOnlyBanner } from '../readOnlyBanner';

describe('ReadOnlyBanner', () => {
  it('renders the reason text verbatim', () => {
    render(<ReadOnlyBanner reason="Storage location is not writable" />);
    const banner = screen.getByTestId('read-only-banner');
    expect(banner.textContent).toBe('Storage location is not writable');
  });

  it('exposes data-testid="read-only-banner"', () => {
    render(<ReadOnlyBanner reason="EACCES: permission denied, open '/foo/item.json'" />);
    expect(screen.getByTestId('read-only-banner')).not.toBeNull();
  });

  it('uses aria-live="polite" for non-interruptive announcement', () => {
    render(<ReadOnlyBanner reason="Filesystem is read-only" />);
    const banner = screen.getByTestId('read-only-banner');
    expect(banner.getAttribute('aria-live')).toBe('polite');
  });

  it('uses role="status" alongside aria-live (W3C non-interruptive idiom)', () => {
    render(<ReadOnlyBanner reason="any" />);
    const banner = screen.getByTestId('read-only-banner');
    expect(banner.getAttribute('role')).toBe('status');
  });

  it('renders nothing when reason is null (suppresses banner on writable plots)', () => {
    const { container } = render(<ReadOnlyBanner reason={null} />);
    expect(screen.queryByTestId('read-only-banner')).toBeNull();
    // The rendered tree should be empty (no wrapper element).
    expect(container.firstChild).toBeNull();
  });

  it('falls back to a generic read-only message when reason is the empty string', () => {
    render(<ReadOnlyBanner reason="" />);
    const banner = screen.getByTestId('read-only-banner');
    // Article I.3 — the signal is visible even if the producer happens to
    // emit an empty reason string. The text matches the wording used by
    // PropertiesPanelDispatch as a default.
    expect(banner.textContent).toMatch(/read-only/i);
  });

  it('preserves long, EACCES-shaped reasons untruncated', () => {
    const reason =
      "EACCES: permission denied, open '/home/user/debrief-future/preview/workspace/samples/local-store/track-001/item.json'";
    render(<ReadOnlyBanner reason={reason} />);
    expect(screen.getByTestId('read-only-banner').textContent).toBe(reason);
  });
});
