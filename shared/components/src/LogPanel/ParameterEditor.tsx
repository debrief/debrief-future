/**
 * ParameterEditor component — inline parameter editing with type-specific controls.
 *
 * Supports float, integer, duration, enum, boolean, and string parameter types.
 * Non-tunable parameters display their value in read-only mode.
 *
 * Feature: 076-replay-tune (Phase 3)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { LOG_PANEL_STRINGS } from './strings';
import './ParameterEditor.css';

export interface ParameterEditorProps {
  name: string;
  value: unknown;
  typeInfo: {
    type: 'float' | 'integer' | 'duration' | 'enum' | 'boolean' | 'string';
    min?: number;
    max?: number;
    allowedValues?: string[];
    pattern?: string;
    label: string;
  };
  tunable: boolean;
  onCommit: (name: string, newValue: unknown) => void;
  onCancel: () => void;
}

/**
 * Validate a value against the parameter type constraints.
 * Returns an error message string, or null if valid.
 */
function validate(
  value: unknown,
  typeInfo: ParameterEditorProps['typeInfo']
): string | null {
  switch (typeInfo.type) {
    case 'float':
    case 'integer': {
      const num = Number(value);
      if (isNaN(num)) return 'Must be a valid number.';
      if (typeInfo.type === 'integer' && !Number.isInteger(num)) {
        return 'Must be a whole number.';
      }
      if (typeInfo.min !== undefined && num < typeInfo.min) {
        return `Must be at least ${typeInfo.min}.`;
      }
      if (typeInfo.max !== undefined && num > typeInfo.max) {
        return `Must be at most ${typeInfo.max}.`;
      }
      return null;
    }
    case 'duration': {
      const str = String(value).trim();
      if (!/^PT(\d+H)?(\d+M)?(\d+(\.\d+)?S)?$/.test(str) || str === 'PT') {
        return 'Must be a valid ISO 8601 duration (e.g. PT30S, PT1M30S).';
      }
      return null;
    }
    case 'enum': {
      const str = String(value);
      if (typeInfo.allowedValues && !typeInfo.allowedValues.includes(str)) {
        return `Must be one of: ${typeInfo.allowedValues.join(', ')}.`;
      }
      return null;
    }
    case 'boolean':
      return null;
    case 'string': {
      if (typeInfo.pattern) {
        const regex = new RegExp(typeInfo.pattern);
        if (!regex.test(String(value))) {
          return `Must match pattern: ${typeInfo.pattern}`;
        }
      }
      return null;
    }
    default:
      return null;
  }
}

export function ParameterEditor({
  name,
  value,
  typeInfo,
  tunable,
  onCommit,
  onCancel,
}: ParameterEditorProps): React.ReactElement {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<unknown>(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  // Focus the input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleStartEdit = useCallback(() => {
    if (!tunable) return;
    setIsEditing(true);
    setEditValue(value);
    setError(null);
  }, [tunable, value]);

  const handleCommit = useCallback(() => {
    let coercedValue: unknown = editValue;

    // Coerce to correct type before validation
    if (typeInfo.type === 'float') {
      coercedValue = parseFloat(String(editValue));
    } else if (typeInfo.type === 'integer') {
      coercedValue = parseInt(String(editValue), 10);
    } else if (typeInfo.type === 'boolean') {
      coercedValue = Boolean(editValue);
    }

    const validationError = validate(coercedValue, typeInfo);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsEditing(false);
    setError(null);
    onCommit(name, coercedValue);
  }, [editValue, typeInfo, name, onCommit]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(value);
    setError(null);
    onCancel();
  }, [value, onCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCommit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleCommit, handleCancel]
  );

  const containerClass = [
    'log-panel__param-editor',
    isEditing ? 'log-panel__param-editor--editing' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Non-tunable: show value only, no edit affordance
  if (!tunable) {
    return (
      <div className={containerClass} data-testid={`param-editor-${name}`}>
        <span className="log-panel__param-editor-value" title={LOG_PANEL_STRINGS.tuneNotTunable}>
          {String(value)}
        </span>
      </div>
    );
  }

  // Read-only display (tunable but not currently editing)
  if (!isEditing) {
    return (
      <div className={containerClass} data-testid={`param-editor-${name}`}>
        <span
          className="log-panel__param-editor-value log-panel__param-editor-value--clickable"
          onClick={handleStartEdit}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleStartEdit();
            }
          }}
        >
          {String(value)}
        </span>
      </div>
    );
  }

  // Editing mode: render type-appropriate input
  const renderInput = () => {
    switch (typeInfo.type) {
      case 'float':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="number"
            step="any"
            min={typeInfo.min}
            max={typeInfo.max}
            value={String(editValue)}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            data-testid={`param-editor-input-${name}`}
            className="log-panel__param-editor-input-field"
          />
        );
      case 'integer':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="number"
            step={1}
            min={typeInfo.min}
            max={typeInfo.max}
            value={String(editValue)}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            data-testid={`param-editor-input-${name}`}
            className="log-panel__param-editor-input-field"
          />
        );
      case 'duration':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            placeholder="PT30S"
            value={String(editValue)}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            data-testid={`param-editor-input-${name}`}
            className="log-panel__param-editor-input-field"
          />
        );
      case 'enum':
        return (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={String(editValue)}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            data-testid={`param-editor-input-${name}`}
            className="log-panel__param-editor-input-field"
          >
            {(typeInfo.allowedValues ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case 'boolean':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="checkbox"
            checked={Boolean(editValue)}
            onChange={(e) => setEditValue(e.target.checked)}
            onKeyDown={handleKeyDown}
            data-testid={`param-editor-input-${name}`}
            className="log-panel__param-editor-input-field"
          />
        );
      case 'string':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            pattern={typeInfo.pattern}
            value={String(editValue)}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            data-testid={`param-editor-input-${name}`}
            className="log-panel__param-editor-input-field"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={containerClass} data-testid={`param-editor-${name}`}>
      <div className="log-panel__param-editor-input">
        <label className="log-panel__param-editor-label">{typeInfo.label}</label>
        {renderInput()}
        {error && (
          <div className="log-panel__param-editor-error" role="alert">
            {error}
          </div>
        )}
      </div>
      <div className="log-panel__param-editor-actions">
        <button
          className="log-panel__param-editor-btn log-panel__param-editor-btn--commit"
          onClick={handleCommit}
          data-testid="param-editor-commit"
          title={LOG_PANEL_STRINGS.tuneCommit}
        >
          &#x2713;
        </button>
        <button
          className="log-panel__param-editor-btn log-panel__param-editor-btn--cancel"
          onClick={handleCancel}
          data-testid="param-editor-cancel"
          title={LOG_PANEL_STRINGS.tuneCancel}
        >
          &#x2717;
        </button>
      </div>
    </div>
  );
}
