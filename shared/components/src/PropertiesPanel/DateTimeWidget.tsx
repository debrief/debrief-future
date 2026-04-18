/**
 * DateTimeWidget — single text input for ISO-8601 datetime strings.
 *
 * Commit discipline:
 *   - Commits on blur or Enter. Escape reverts the draft.
 *   - The clear (⌫) button commits `null` (nullable datetime).
 *   - Invalid input blocks commit with an inline error; nothing is sent to
 *     the caller until validation passes.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { FieldSpec } from './types';

export interface DateTimeWidgetProps {
  name: string;
  value: unknown;
  spec: Extract<FieldSpec, { kind: 'datetime' }>;
  onCommit: (name: string, newValue: unknown) => void;
  onCancel?: () => void;
  disabled?: boolean;
  error?: string | null;
}

// Loose ISO-8601 validator: requires date, optional time + timezone.
// Examples accepted: 2025-01-01, 2025-01-01T12:34:56Z, 2025-01-01T12:34:56.789+01:00
const ISO_RE =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

function validateIso(value: string): string | null {
  if (!ISO_RE.test(value)) {
    return 'Must be a valid ISO-8601 datetime (e.g. 2025-01-01T12:00:00Z).';
  }
  // Cross-check with Date to weed out 2025-02-30 etc.
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Invalid calendar date.';
  }
  return null;
}

export function DateTimeWidget({
  name,
  value,
  onCommit,
  onCancel,
  disabled,
  error,
}: DateTimeWidgetProps): React.ReactElement {
  const initial = typeof value === 'string' ? value : '';
  const [draft, setDraft] = useState(initial);
  const [localError, setLocalError] = useState<string | null>(null);
  const lastCommittedRef = useRef<string>(initial);

  // Keep draft in sync when the incoming value changes (e.g. external commit).
  useEffect(() => {
    const next = typeof value === 'string' ? value : '';
    setDraft(next);
    lastCommittedRef.current = next;
    setLocalError(null);
  }, [value]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed === '') {
      // Empty input → treat as null commit (same as clear button).
      if (lastCommittedRef.current === '') return;
      lastCommittedRef.current = '';
      setLocalError(null);
      onCommit(name, null);
      return;
    }
    const err = validateIso(trimmed);
    if (err) {
      setLocalError(err);
      return;
    }
    if (trimmed === lastCommittedRef.current) {
      setLocalError(null);
      return;
    }
    lastCommittedRef.current = trimmed;
    setLocalError(null);
    onCommit(name, trimmed);
  }, [draft, name, onCommit]);

  const clear = useCallback(() => {
    setDraft('');
    setLocalError(null);
    lastCommittedRef.current = '';
    onCommit(name, null);
  }, [name, onCommit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setDraft(lastCommittedRef.current);
        setLocalError(null);
        onCancel?.();
      }
    },
    [commit, onCancel],
  );

  const shownError = error ?? localError;

  if (disabled) {
    return (
      <div data-testid={`datetime-widget-${name}`}>
        <span className="log-panel__param-editor-value">{initial || '—'}</span>
      </div>
    );
  }

  return (
    <div data-testid={`datetime-widget-${name}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          placeholder="2025-01-01T00:00:00Z"
          data-testid={`datetime-widget-input-${name}`}
          className="log-panel__param-editor-input-field"
        />
        <button
          type="button"
          onClick={clear}
          title="Clear"
          aria-label={`Clear ${name}`}
          data-testid={`datetime-widget-clear-${name}`}
          className="log-panel__param-editor-btn log-panel__param-editor-btn--cancel"
        >
          {'\u232B'}
        </button>
      </div>
      {shownError && (
        <div
          className="log-panel__param-editor-error"
          role="alert"
          data-testid={`datetime-widget-error-${name}`}
        >
          {shownError}
        </div>
      )}
    </div>
  );
}

export default DateTimeWidget;
