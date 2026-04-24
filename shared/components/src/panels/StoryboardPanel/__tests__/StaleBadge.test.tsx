/**
 * Unit tests for StaleBadge (Feature 218 — T085).
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StaleBadge } from '../StaleBadge';

describe('StaleBadge', () => {
  it('renders with STALE marker + refresh button', () => {
    render(
      <StaleBadge
        sceneId="scene-1"
        unresolvedFeatureIds={['track-alpha']}
        onRefreshThumbnail={vi.fn()}
      />,
    );
    const badge = screen.getByTestId('stale-badge');
    expect(badge.textContent).toContain('STALE');
    expect(screen.getByTestId('stale-badge-refresh-button')).toBeDefined();
  });

  it('tooltip names unresolved feature IDs', () => {
    render(
      <StaleBadge
        sceneId="scene-1"
        unresolvedFeatureIds={['track-alpha', 'track-bravo']}
        onRefreshThumbnail={vi.fn()}
      />,
    );
    const badge = screen.getByTestId('stale-badge');
    const title = badge.getAttribute('title');
    expect(title).toContain('track-alpha');
    expect(title).toContain('track-bravo');
  });

  it('handles hash-drift case (no unresolved IDs) with a generic message', () => {
    render(
      <StaleBadge
        sceneId="scene-1"
        unresolvedFeatureIds={[]}
        onRefreshThumbnail={vi.fn()}
      />,
    );
    const title = screen.getByTestId('stale-badge').getAttribute('title');
    expect(title).toContain('underlying plot changed');
  });

  it('Refresh click fires onRefreshThumbnail and stops propagation', () => {
    const onRefreshThumbnail = vi.fn();
    const rowClick = vi.fn();
    render(
      <div onClick={rowClick} data-testid="row">
        <StaleBadge
          sceneId="scene-1"
          unresolvedFeatureIds={['x']}
          onRefreshThumbnail={onRefreshThumbnail}
        />
      </div>,
    );
    fireEvent.click(screen.getByTestId('stale-badge-refresh-button'));
    expect(onRefreshThumbnail).toHaveBeenCalledTimes(1);
    expect(rowClick).not.toHaveBeenCalled(); // stopPropagation
  });

  it('accessibility: role="status" + aria-describedby points at visually-hidden tooltip', () => {
    render(
      <StaleBadge
        sceneId="scene-1"
        unresolvedFeatureIds={['x']}
        onRefreshThumbnail={vi.fn()}
      />,
    );
    const badge = screen.getByTestId('stale-badge');
    expect(badge.getAttribute('role')).toBe('status');
    const describedBy = badge.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const tooltipEl = document.getElementById(describedBy!);
    expect(tooltipEl?.textContent).toContain('x');
  });

  it('truncates tooltip to 5 unresolved IDs + count suffix', () => {
    const ids = Array.from({ length: 8 }, (_, i) => `track-${i}`);
    render(
      <StaleBadge
        sceneId="scene-1"
        unresolvedFeatureIds={ids}
        onRefreshThumbnail={vi.fn()}
      />,
    );
    const title = screen.getByTestId('stale-badge').getAttribute('title');
    expect(title).toContain('track-0');
    expect(title).toContain('track-4');
    expect(title).toContain('+3 more');
    expect(title).not.toContain('track-7');
  });
});
