/**
 * Component tests for TrackBadge.
 *
 * Feature: 176-log-panel-ux (T012)
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TrackBadge } from '../TrackBadge';
import { LOG_PANEL_STRINGS } from '../strings';

describe('TrackBadge', () => {
  it('renders existing track badge without deleted modifier', () => {
    render(<TrackBadge name="HMS Alpha" exists={true} />);
    const badge = screen.getByTestId('track-badge');
    expect(badge.textContent).toBe('HMS Alpha');
    expect(badge.className).not.toContain('log-panel__track-badge--deleted');
    expect(badge.getAttribute('aria-label')).toBe('HMS Alpha');
  });

  it('renders deleted track badge with modifier + suffixed aria-label', () => {
    render(<TrackBadge name="HMS Ghost" exists={false} />);
    const badge = screen.getByTestId('track-badge');
    expect(badge.className).toContain('log-panel__track-badge--deleted');
    const expected = `HMS Ghost (${LOG_PANEL_STRINGS.trackBadgeDeletedSuffix})`;
    expect(badge.getAttribute('aria-label')).toBe(expected);
    expect(badge.getAttribute('title')).toBe(expected);
  });

  it('renders multiple badges side-by-side (wrap styling lives in CSS)', () => {
    render(
      <div>
        <TrackBadge name="Alpha" exists={true} />
        <TrackBadge name="Bravo" exists={true} />
        <TrackBadge name="Charlie" exists={true} />
      </div>
    );
    const badges = screen.getAllByTestId('track-badge');
    expect(badges).toHaveLength(3);
  });
});
