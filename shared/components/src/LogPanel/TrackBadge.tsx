/**
 * TrackBadge — pill badge showing a track/feature name.
 *
 * Feature: 176-log-panel-ux
 */

import React from 'react';
import type { TrackBadgeProps } from './types';
import { LOG_PANEL_STRINGS } from './strings';

export function TrackBadge({ name, exists, className }: TrackBadgeProps): React.ReactElement {
  const suffix = LOG_PANEL_STRINGS.trackBadgeDeletedSuffix;
  const ariaLabel = exists ? name : `${name} (${suffix})`;
  return (
    <span
      className={`log-panel__track-badge ${exists ? '' : 'log-panel__track-badge--deleted'} ${className ?? ''}`}
      data-testid="track-badge"
      title={ariaLabel}
      aria-label={ariaLabel}
    >
      {name}
    </span>
  );
}
