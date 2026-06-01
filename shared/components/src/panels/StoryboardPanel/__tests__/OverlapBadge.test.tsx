/**
 * Unit tests for OverlapBadge (#271). Covers contract cases C2.2–C2.4.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OverlapBadge } from '../OverlapBadge';
import type { OverlapPartner } from '../types';

describe('OverlapBadge (#271)', () => {
  const noop = (): void => undefined;

  it('C2.2 — names a single partner in visible text and accessible name', () => {
    const partners: OverlapPartner[] = [{ sceneId: 'B', title: 'Approach run' }];
    render(<OverlapBadge sceneId="A" overlapsWith={partners} onDismiss={noop} />);
    const badge = screen.getByTestId('overlap-badge');
    expect(badge).toHaveAttribute('role', 'status');
    expect(badge).toHaveAttribute('aria-label', 'Overlaps with Approach run');
    expect(screen.getByTestId('overlap-badge-text')).toHaveTextContent(
      'Overlaps with Approach run',
    );
  });

  it('C2.2 — names every partner when overlapping multiple Scenes', () => {
    const partners: OverlapPartner[] = [
      { sceneId: 'B', title: 'Scene B' },
      { sceneId: 'C', title: 'Scene C' },
    ];
    render(<OverlapBadge sceneId="A" overlapsWith={partners} onDismiss={noop} />);
    expect(screen.getByTestId('overlap-badge')).toHaveAttribute(
      'aria-label',
      'Overlaps with Scene B and Scene C',
    );
  });

  it('C2.3 — carries data-testid and data-scene-id', () => {
    render(
      <OverlapBadge
        sceneId="A"
        overlapsWith={[{ sceneId: 'B', title: 'Scene B' }]}
        onDismiss={noop}
      />,
    );
    expect(screen.getByTestId('overlap-badge')).toHaveAttribute('data-scene-id', 'A');
  });

  it('C2.4 — Dismiss button invokes onDismiss and stops row click propagation', () => {
    const onDismiss = vi.fn();
    const onRowClick = vi.fn();
    render(
      <div onClick={onRowClick}>
        <OverlapBadge
          sceneId="A"
          overlapsWith={[{ sceneId: 'B', title: 'Scene B' }]}
          onDismiss={onDismiss}
        />
      </div>,
    );
    fireEvent.click(screen.getByTestId('overlap-badge-dismiss-button'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
