/**
 * Transport row for the Storyboard panel (Feature 217).
 *
 * Presentational — receives a `TransportViewModel` + two click callbacks.
 * Forward / Backward buttons use vscrui icons; disabled state is driven by
 * `canGoForward`/`canGoBackward`/`transitionInFlight`.
 */

import React from 'react';
import { Icon } from 'vscrui';
import type { TransportViewModel } from './types';

export interface TransportRowProps {
  readonly transport: TransportViewModel;
  onForwardClick(): void;
  onBackwardClick(): void;
}

export function TransportRow({
  transport,
  onForwardClick,
  onBackwardClick,
}: TransportRowProps): React.ReactElement {
  const backwardDisabled = !transport.canGoBackward || transport.transitionInFlight;
  const forwardDisabled = !transport.canGoForward || transport.transitionInFlight;
  const counterText =
    transport.sceneTotal === 0
      ? ''
      : `Scene ${transport.sceneNumber} of ${transport.sceneTotal}`;

  return (
    <div
      data-testid="transport-row"
      className="storyboard-transport-row"
      role="toolbar"
      aria-label="Storyboard transport"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 10px',
        borderTop: '1px solid var(--vscode-panel-border, #3c3c3c)',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <button
          type="button"
          data-testid="transport-backward"
          aria-label="Backward — previous scene"
          disabled={backwardDisabled}
          onClick={backwardDisabled ? undefined : onBackwardClick}
          style={{
            padding: '4px 8px',
            opacity: backwardDisabled ? 0.5 : 1,
            cursor: backwardDisabled ? 'default' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Icon name="chevron-left" />
        </button>
        <button
          type="button"
          data-testid="transport-forward"
          aria-label="Forward — next scene"
          disabled={forwardDisabled}
          onClick={forwardDisabled ? undefined : onForwardClick}
          style={{
            padding: '4px 8px',
            opacity: forwardDisabled ? 0.5 : 1,
            cursor: forwardDisabled ? 'default' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Icon name="chevron-right" />
        </button>
      </div>
      <span
        data-testid="transport-counter"
        className="storyboard-transport-row__counter"
        style={{ fontSize: 11, opacity: 0.8 }}
      >
        {counterText}
      </span>
    </div>
  );
}
