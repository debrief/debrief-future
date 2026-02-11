/**
 * SnapshotBoundary component — visual separator for snapshot boundaries.
 * Shows a "Show earlier history" placeholder link.
 *
 * Feature: 072-log-panel
 */

import React from 'react';
import type { SnapshotBoundaryProps } from './types';
import { LOG_PANEL_STRINGS } from './strings';

export function SnapshotBoundary({
  className,
}: SnapshotBoundaryProps): React.ReactElement {
  return (
    <div
      className={`log-panel__snapshot-boundary ${className ?? ''}`}
      data-testid="snapshot-boundary"
    >
      {LOG_PANEL_STRINGS.snapshotBoundary}
    </div>
  );
}
