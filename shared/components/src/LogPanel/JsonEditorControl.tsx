/**
 * JsonEditorControl — JSON textarea fallback for complex parameters.
 * Feature: 113-prov-card-flip
 */

import React, { useState, useCallback } from 'react';
import { LOG_PANEL_STRINGS } from './strings';

export interface JsonEditorControlProps {
  readonly name: string;
  readonly value: unknown;
  readonly tunable: boolean;
  readonly onChange: (value: unknown) => void;
}

export function JsonEditorControl({
  name,
  value,
  tunable,
  onChange,
}: JsonEditorControlProps): React.ReactElement {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      setText(newText);
      try {
        const parsed: unknown = JSON.parse(newText);
        setParseError(null);
        onChange(parsed);
      } catch {
        setParseError(LOG_PANEL_STRINGS.jsonEditorParseError);
      }
    },
    [onChange]
  );

  return (
    <div className="log-panel__json-editor" data-testid={`json-editor-${name}`}>
      <textarea
        className="log-panel__json-editor-textarea"
        value={text}
        onChange={handleChange}
        disabled={!tunable}
        rows={4}
        aria-label={name}
        data-testid={`json-editor-input-${name}`}
      />
      {parseError && (
        <div
          className="log-panel__json-editor-error"
          role="alert"
          data-testid={`json-editor-error-${name}`}
        >
          {parseError}
        </div>
      )}
    </div>
  );
}
