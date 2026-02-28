/**
 * DisableToggle — toggle switch for disabling/enabling timeline entries.
 * Feature: 113-prov-card-flip
 */

import React from 'react';
import { LOG_PANEL_STRINGS } from './strings';

export interface DisableToggleProps {
  readonly disabled: boolean;
  readonly autoDependency: boolean;
  readonly causeActivityId: string | null;
  readonly onChange: (disabled: boolean) => void;
}

export function DisableToggle({
  disabled,
  autoDependency,
  causeActivityId,
  onChange,
}: DisableToggleProps): React.ReactElement {
  return (
    <div className="log-panel__disable-toggle" data-testid="disable-toggle">
      <label className="log-panel__disable-toggle-label">
        <input
          type="checkbox"
          checked={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="log-panel__disable-toggle-input"
          data-testid="disable-toggle-input"
          aria-label={LOG_PANEL_STRINGS.editFaceDisableLabel}
        />
        <span className="log-panel__disable-toggle-text">
          {LOG_PANEL_STRINGS.editFaceDisableLabel}
        </span>
      </label>
      {autoDependency && causeActivityId && (
        <div
          className="log-panel__disable-toggle-warning"
          role="status"
          data-testid="disable-toggle-warning"
        >
          {LOG_PANEL_STRINGS.editFaceDisableWarning(causeActivityId)}
        </div>
      )}
    </div>
  );
}
