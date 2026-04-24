/**
 * StaleBadge — per-row stale-thumbnail indicator rendered alongside a
 * Scene's thumbnail in the Storyboard panel (Feature 218 — FR-EDIT-017).
 *
 * Visible marker + tooltip listing unresolved feature IDs + a Refresh
 * thumbnail button wired through the panel dispatcher.
 */

import React from 'react';

export interface StaleBadgeProps {
  readonly sceneId: string;
  readonly unresolvedFeatureIds: readonly string[];
  readonly onRefreshThumbnail: () => void;
}

function buildTooltip(ids: readonly string[]): string {
  if (ids.length === 0) {
    return 'Scene thumbnail is stale — underlying plot changed.';
  }
  const list = ids.slice(0, 5).join(', ');
  const suffix = ids.length > 5 ? `, +${ids.length - 5} more` : '';
  return `Scene thumbnail is stale — unresolved feature IDs: ${list}${suffix}.`;
}

export const StaleBadge: React.FC<StaleBadgeProps> = ({
  sceneId,
  unresolvedFeatureIds,
  onRefreshThumbnail,
}) => {
  const tooltipId = `stale-badge-tooltip-${sceneId}`;
  const tooltip = buildTooltip(unresolvedFeatureIds);
  return (
    <span
      role="status"
      data-testid="stale-badge"
      data-scene-id={sceneId}
      aria-label="Thumbnail is stale"
      aria-describedby={tooltipId}
      title={tooltip}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '1px 4px',
        fontSize: 10,
        fontWeight: 600,
        color: 'var(--vscode-statusBarItem-warningForeground, #fff)',
        background: 'var(--vscode-statusBarItem-warningBackground, #ff8c00)',
        borderRadius: 2,
      }}
    >
      <span aria-hidden="true">⚠</span>
      <span>STALE</span>
      <span
        id={tooltipId}
        style={{
          position: 'absolute',
          left: -9999,
          width: 1,
          height: 1,
          overflow: 'hidden',
        }}
      >
        {tooltip}
      </span>
      <button
        type="button"
        data-testid="stale-badge-refresh-button"
        aria-label={`Refresh thumbnail for scene ${sceneId}`}
        onClick={(e): void => {
          e.stopPropagation();
          onRefreshThumbnail();
        }}
        style={{
          marginLeft: 4,
          padding: '1px 4px',
          fontSize: 10,
          border: 'none',
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        Refresh
      </button>
    </span>
  );
};
