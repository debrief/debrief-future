/**
 * TrackBadge — pill badge showing a track/feature name.
 *
 * Feature: 176-log-panel-ux
 */

import React from 'react';
import type { TrackBadgeProps } from './types';

export function TrackBadge({ name, exists, className }: TrackBadgeProps): React.ReactElement {
  return (
    <span
      className={`log-panel__track-badge ${exists ? '' : 'log-panel__track-badge--deleted'} ${className ?? ''}`}
      data-testid="track-badge"
      title={exists ? name : `${name} (deleted)`}
    >
      {name}
    </span>
  );
}
