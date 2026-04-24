/**
 * Unit tests for HardBlockModal (Feature 217, T302).
 *
 * This component is Storybook-only — the actual modal in VS Code is
 * `vscode.window.showInformationMessage({ modal: true }, ...)`. The
 * presentational component exists so the design can be exercised in
 * theme-screenshots + interaction tests.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HardBlockModal } from '../HardBlockModal';
import type { MissingDataReason } from '../types';

describe('HardBlockModal', () => {
  const noop = (): void => undefined;

  it('has role="dialog" + aria-modal="true"', () => {
    const reason: MissingDataReason = {
      kind: 'missing-features',
      missingFeatureIds: ['f-1'],
    };
    render(
      <HardBlockModal
        sceneTitle="Scene 3"
        reason={reason}
        jumpPastLabel="Jump past this scene"
        openForEditingLabel="Open for editing"
        onJumpPast={noop}
        onOpenForEditing={noop}
        onDismiss={noop}
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('renders the two action buttons with supplied labels', () => {
    const reason: MissingDataReason = {
      kind: 'missing-features',
      missingFeatureIds: ['f-1'],
    };
    render(
      <HardBlockModal
        sceneTitle="Scene 3"
        reason={reason}
        jumpPastLabel="Jump past this scene"
        openForEditingLabel="Open for editing"
        onJumpPast={noop}
        onOpenForEditing={noop}
        onDismiss={noop}
      />,
    );
    expect(screen.getByRole('button', { name: 'Jump past this scene' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open for editing' })).toBeTruthy();
  });

  it('body describes scene + missing-features reason', () => {
    const reason: MissingDataReason = {
      kind: 'missing-features',
      missingFeatureIds: ['track-abc', 'annotation-xyz'],
    };
    render(
      <HardBlockModal
        sceneTitle="Scene — surface contact"
        reason={reason}
        jumpPastLabel="Jump past"
        openForEditingLabel="Open for editing"
        onJumpPast={noop}
        onOpenForEditing={noop}
        onDismiss={noop}
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Scene — surface contact');
    const body = screen.getByTestId('hard-block-body');
    expect(body.textContent).toMatch(/track-abc/);
    expect(body.textContent).toMatch(/annotation-xyz/);
  });

  it('body describes timestamp-out-of-range reason', () => {
    const reason: MissingDataReason = {
      kind: 'timestamp-out-of-range',
      sceneTimestampIso: '2026-04-20T14:35:00Z',
      plotStartIso: '2026-04-20T15:00:00Z',
      plotEndIso: '2026-04-20T17:00:00Z',
    };
    render(
      <HardBlockModal
        sceneTitle="Scene X"
        reason={reason}
        jumpPastLabel="Jump past"
        openForEditingLabel="Open for editing"
        onJumpPast={noop}
        onOpenForEditing={noop}
        onDismiss={noop}
      />,
    );
    const body = screen.getByTestId('hard-block-body');
    expect(body.textContent?.toLowerCase()).toMatch(/out of range|outside|range/);
  });

  it('clicking Jump past fires onJumpPast', () => {
    const onJumpPast = vi.fn();
    render(
      <HardBlockModal
        sceneTitle="Scene"
        reason={{ kind: 'missing-features', missingFeatureIds: ['a'] }}
        jumpPastLabel="Jump past this scene"
        openForEditingLabel="Open for editing"
        onJumpPast={onJumpPast}
        onOpenForEditing={noop}
        onDismiss={noop}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Jump past this scene' }));
    expect(onJumpPast).toHaveBeenCalledTimes(1);
  });

  it('clicking Open for editing fires onOpenForEditing', () => {
    const onOpenForEditing = vi.fn();
    render(
      <HardBlockModal
        sceneTitle="Scene"
        reason={{ kind: 'missing-features', missingFeatureIds: ['a'] }}
        jumpPastLabel="Jump past"
        openForEditingLabel="Open for editing"
        onJumpPast={noop}
        onOpenForEditing={onOpenForEditing}
        onDismiss={noop}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open for editing' }));
    expect(onOpenForEditing).toHaveBeenCalledTimes(1);
  });

  it('Escape key fires onDismiss', () => {
    const onDismiss = vi.fn();
    render(
      <HardBlockModal
        sceneTitle="Scene"
        reason={{ kind: 'missing-features', missingFeatureIds: ['a'] }}
        jumpPastLabel="Jump past"
        openForEditingLabel="Open for editing"
        onJumpPast={noop}
        onOpenForEditing={noop}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('focuses the first action button on mount (focus trap)', () => {
    render(
      <HardBlockModal
        sceneTitle="Scene"
        reason={{ kind: 'missing-features', missingFeatureIds: ['a'] }}
        jumpPastLabel="Jump past"
        openForEditingLabel="Open for editing"
        onJumpPast={() => undefined}
        onOpenForEditing={() => undefined}
        onDismiss={() => undefined}
      />,
    );
    const firstButton = screen.getByRole('button', { name: 'Jump past' });
    expect(document.activeElement).toBe(firstButton);
  });
});
