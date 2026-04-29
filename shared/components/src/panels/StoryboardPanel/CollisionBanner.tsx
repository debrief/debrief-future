/**
 * Duplicate-timestamp collision banner (#235 FR-UX-004 + FR-CAP-017 +
 * FR-CAP-017a).
 *
 * Replaces the legacy VS Code Replace / Offset / Cancel modal. The
 * banner is anchored above the conflicting Scene row inside the rail
 * (NEVER occluding the central area). Three buttons map to the three
 * stateless action posts; the Offset button is hidden when:
 *   - `offsetCapReached` (60-step cap, per CollisionBannerState
 *     invariants), OR
 *   - `offsetWouldExceedTimeRange` (FR-CAP-017a — would push past the
 *     plot's time range).
 */

import React from 'react';
import type { CollisionBannerViewModel } from './types';

export interface CollisionBannerProps {
  readonly viewModel: CollisionBannerViewModel;
  readonly onReplace: (conflictingSceneId: string) => void;
  readonly onOffset: () => void;
  readonly onCancel: () => void;
}

export function CollisionBanner({
  viewModel,
  onReplace,
  onOffset,
  onCancel,
}: CollisionBannerProps): React.ReactElement | null {
  if (!viewModel.visible || viewModel.conflictingSceneId === null) return null;

  const offsetHidden =
    viewModel.offsetCapReached || viewModel.offsetWouldExceedTimeRange;
  const offsetHiddenReason = viewModel.offsetWouldExceedTimeRange
    ? 'This would push past the plot’s time range — pick a different moment.'
    : viewModel.offsetCapReached
      ? 'Reached the 60-second offset limit — pick a different moment.'
      : null;

  return (
    <div
      data-testid="storyboard-collision-banner"
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '8px 10px',
        borderBottom:
          '1px solid var(--vscode-inputValidation-warningBorder, #b89500)',
        background: 'var(--vscode-inputValidation-warningBackground, #352a00)',
        color: 'var(--vscode-inputValidation-warningForeground, inherit)',
      }}
    >
      <div data-testid="storyboard-collision-banner-message">
        {viewModel.cause === 'update-to-current'
          ? 'A scene already exists at this timestamp.'
          : 'A scene already exists at this timestamp.'}{' '}
        {viewModel.proposedTimestampDtg && (
          <span
            data-testid="storyboard-collision-banner-proposed"
            style={{ opacity: 0.85 }}
          >
            (Trying {viewModel.proposedTimestampDtg})
          </span>
        )}
      </div>
      {offsetHiddenReason !== null && (
        <div
          data-testid="storyboard-collision-banner-offset-disabled"
          style={{ fontSize: 11, opacity: 0.85 }}
        >
          {offsetHiddenReason}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button
          type="button"
          data-testid="collision-replace"
          onClick={(): void =>
            onReplace(viewModel.conflictingSceneId as string)
          }
        >
          Replace
        </button>
        {!offsetHidden && (
          <button
            type="button"
            data-testid="collision-offset"
            onClick={onOffset}
          >
            Offset (+1 s)
          </button>
        )}
        <button
          type="button"
          data-testid="collision-cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
