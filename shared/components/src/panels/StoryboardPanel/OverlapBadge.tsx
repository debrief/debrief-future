/**
 * OverlapBadge — per-row passive warning that a time-range Scene's window
 * overlaps one or more other time-range Scenes in the same Storyboard
 * (Feature #271). Mirrors `StaleBadge`: a `role="status"` marker that names
 * the conflicting Scene(s) (not colour-only — FR-012) plus a Dismiss control.
 *
 * Purely presentational — it never mutates Scene data. The host owns the
 * (session-scoped, un-persisted) dismissal state and re-pushes the row's
 * `overlapsWith` accordingly.
 */

import React from 'react';
import type { OverlapPartner } from './types';

export interface OverlapBadgeProps {
  readonly sceneId: string;
  /** Non-empty when the badge renders — the caller (`SceneList`) gates this. */
  readonly overlapsWith: readonly OverlapPartner[];
  readonly onDismiss: () => void;
}

function buildLabel(partners: readonly OverlapPartner[]): string {
  const names = partners.map((p) => p.title);
  if (names.length === 1) return `Overlaps with ${names[0]}`;
  if (names.length === 2) return `Overlaps with ${names[0]} and ${names[1]}`;
  const head = names.slice(0, -1).join(', ');
  const tail = names[names.length - 1];
  return `Overlaps with ${head}, and ${tail}`;
}

export const OverlapBadge: React.FC<OverlapBadgeProps> = ({
  sceneId,
  overlapsWith,
  onDismiss,
}) => {
  const label = buildLabel(overlapsWith);
  return (
    <span
      role="status"
      data-testid="overlap-badge"
      data-scene-id={sceneId}
      aria-label={label}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '1px 4px',
        fontSize: 11,
        fontWeight: 700,
        // Reuse the same axe-contrast-safe warning tokens as StaleBadge
        // (verified ≥ 4.5:1 for #fff on #a04500 at this size, #234 FR-022).
        color: 'var(--vscode-statusBarItem-warningForeground, #fff)',
        background: 'var(--vscode-statusBarItem-warningBackground, #a04500)',
        borderRadius: 2,
      }}
    >
      <span aria-hidden="true">⚠</span>
      {/* Visible text names the partner(s) so the warning is not colour-only. */}
      <span data-testid="overlap-badge-text">{label}</span>
      <button
        type="button"
        data-testid="overlap-badge-dismiss-button"
        aria-label={`Dismiss overlap warning for scene ${sceneId}`}
        onClick={(e): void => {
          e.stopPropagation();
          onDismiss();
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
        Dismiss
      </button>
    </span>
  );
};
