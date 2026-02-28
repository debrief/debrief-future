/**
 * RationaleField — editable text area for analyst rationale notes.
 * Feature: 113-prov-card-flip
 */

import React from 'react';
import { LOG_PANEL_STRINGS } from './strings';

export interface RationaleFieldProps {
  readonly value: string;
  readonly onChange: (text: string) => void;
  readonly inputRef?: React.Ref<HTMLTextAreaElement>;
}

export function RationaleField({
  value,
  onChange,
  inputRef,
}: RationaleFieldProps): React.ReactElement {
  return (
    <div className="log-panel__rationale-field" data-testid="rationale-field">
      <label className="log-panel__rationale-label">
        {LOG_PANEL_STRINGS.editFaceRationaleLabel}
      </label>
      <textarea
        ref={inputRef}
        className="log-panel__rationale-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={LOG_PANEL_STRINGS.editFaceRationalePlaceholder}
        rows={3}
        data-testid="rationale-textarea"
        aria-label={LOG_PANEL_STRINGS.editFaceRationaleLabel}
      />
    </div>
  );
}
