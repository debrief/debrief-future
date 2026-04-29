/**
 * CollisionBanner — duplicate-timestamp inline banner (Feature 235).
 *
 * Replaces the legacy host-level Replace / Offset / Cancel modal with an
 * in-rail banner anchored above the conflicting Scene row.
 *
 * The Offset (+1 s) button is hidden when:
 *   - `offsetCapReached` (FR-CAP-017, 60-press cap), OR
 *   - `offsetWouldExceedTimeRange` (FR-CAP-017a — host signal).
 *
 * In both cases the panel surfaces an inline message in place of the
 * Offset button and only Replace / Cancel remain available.
 *
 * The banner does not compute the new timestamp on Offset — it simply
 * fires `onOffset()` and waits for the host to re-push a fresh banner
 * slice with the advanced `proposedTimestamp` and `offsetCount`.
 */

import React from 'react';
import type { CollisionBannerViewModel } from './types';

export interface CollisionBannerProps {
  readonly viewModel: CollisionBannerViewModel;
  readonly onReplace: (conflictingSceneId: string) => void;
  readonly onOffset: () => void;
  readonly onCancel: () => void;
}

export const CollisionBanner: React.FC<CollisionBannerProps> = ({
  viewModel,
  onReplace,
  onOffset,
  onCancel,
}) => {
  if (!viewModel.visible || viewModel.conflictingSceneId === null) {
    return null;
  }

  const conflictTitle = viewModel.conflictingSceneTitle ?? 'this scene';
  const offsetMessage = viewModel.offsetWouldExceedTimeRange
    ? "This would push past the plot's time range — pick a different moment."
    : viewModel.offsetCapReached
      ? 'Offset limit reached (60 attempts) — pick a different moment.'
      : null;

  return (
    <div
      data-testid="storyboard-collision-banner"
      role="alert"
      aria-live="assertive"
      data-conflicting-scene-id={viewModel.conflictingSceneId}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '8px 10px',
        borderTop:
          '1px solid var(--vscode-inputValidation-warningBorder, #b89500)',
        borderBottom:
          '1px solid var(--vscode-inputValidation-warningBorder, #b89500)',
        background:
          'var(--vscode-inputValidation-warningBackground, rgba(184, 149, 0, 0.15))',
        color:
          'var(--vscode-inputValidation-warningForeground, var(--vscode-foreground, inherit))',
      }}
    >
      <span
        data-testid="storyboard-collision-banner-message"
        style={{ fontSize: 12 }}
      >
        A scene already exists at this timestamp ({conflictTitle}).
      </span>
      {offsetMessage !== null && (
        <span
          data-testid="storyboard-collision-banner-offset-blocked"
          style={{ fontSize: 11, opacity: 0.85 }}
        >
          {offsetMessage}
        </span>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          type="button"
          data-testid="collision-replace"
          onClick={(): void =>
            onReplace(viewModel.conflictingSceneId as string)
          }
          aria-label={`Replace scene ${conflictTitle}`}
        >
          Replace
        </button>
        {!viewModel.offsetButtonHidden && (
          <button
            type="button"
            data-testid="collision-offset"
            onClick={onOffset}
            aria-label="Offset proposed timestamp by one second"
          >
            Offset (+1 s)
          </button>
        )}
        <button
          type="button"
          data-testid="collision-cancel"
          onClick={onCancel}
          aria-label="Cancel capture"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
