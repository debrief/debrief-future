/**
 * ArrayWidget — chip-list editor for `string-array` FieldSpec.
 *
 * Commit discipline (Decision 6):
 *   - Tapping Enter in the text input commits the full new array (add).
 *   - Clicking the `×` button on a chip commits the full new array (remove).
 *   - Intermediate keystrokes stay local — no onCommit until the user acts.
 *
 * Respects `maxItems` and deduplicates on add. In disabled mode, renders
 * read-only chips only (no input, no `×`).
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { FieldSpec } from './types';

export interface ArrayWidgetProps {
  name: string;
  value: unknown;
  spec: Extract<FieldSpec, { kind: 'string-array' }>;
  onCommit: (name: string, newValue: unknown) => void;
  onCancel?: () => void;
  disabled?: boolean;
  error?: string | null;
}

function coerceToStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

export function ArrayWidget({
  name,
  value,
  spec,
  onCommit,
  disabled,
  error,
}: ArrayWidgetProps): React.ReactElement {
  const items = useMemo(() => coerceToStringArray(value), [value]);
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const atMax = spec.maxItems !== undefined && items.length >= spec.maxItems;

  const commitAdd = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (items.includes(trimmed)) {
      setLocalError('Duplicate entry — already in list.');
      return;
    }
    if (atMax) {
      setLocalError(`Maximum ${spec.maxItems} entries reached.`);
      return;
    }
    if (spec.itemEnum && !spec.itemEnum.includes(trimmed)) {
      setLocalError(`Must be one of: ${spec.itemEnum.join(', ')}.`);
      return;
    }
    const next = [...items, trimmed];
    setDraft('');
    setLocalError(null);
    onCommit(name, next);
  }, [draft, items, atMax, spec.maxItems, spec.itemEnum, onCommit, name]);

  const commitRemove = useCallback(
    (entry: string) => {
      const next = items.filter((v) => v !== entry);
      setLocalError(null);
      onCommit(name, next);
    },
    [items, onCommit, name],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitAdd();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setDraft('');
        setLocalError(null);
      }
    },
    [commitAdd],
  );

  const handleBlur = useCallback(() => {
    if (draft.trim()) commitAdd();
  }, [draft, commitAdd]);

  const shownError = error ?? localError;

  return (
    <div data-testid={`array-widget-${name}`}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {items.map((entry) => (
          <span
            key={entry}
            data-testid={`array-widget-chip-${name}-${entry}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 6px',
              background: 'var(--vscode-badge-background, #444)',
              color: 'var(--vscode-badge-foreground, #fff)',
              borderRadius: 3,
              fontSize: 12,
            }}
          >
            <span>{entry}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => commitRemove(entry)}
                data-testid={`array-widget-remove-${name}-${entry}`}
                aria-label={`Remove ${entry}`}
                style={{
                  background: 'transparent',
                  color: 'inherit',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: 12,
                  lineHeight: 1,
                }}
              >
                {'\u00D7'}
              </button>
            )}
          </span>
        ))}
      </div>

      {!disabled && (
        <div style={{ marginTop: 6 }}>
          {spec.itemEnum ? (
            <select
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={atMax}
              data-testid={`array-widget-input-${name}`}
              className="log-panel__param-editor-input-field"
            >
              <option value="">Select to add…</option>
              {spec.itemEnum
                .filter((opt) => !items.includes(opt))
                .map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
            </select>
          ) : (
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              disabled={atMax}
              placeholder={atMax ? `Max ${spec.maxItems} reached` : 'Add tag…'}
              data-testid={`array-widget-input-${name}`}
              className="log-panel__param-editor-input-field"
            />
          )}
        </div>
      )}

      {shownError && (
        <div
          className="log-panel__param-editor-error"
          role="alert"
          data-testid={`array-widget-error-${name}`}
        >
          {shownError}
        </div>
      )}
    </div>
  );
}

export default ArrayWidget;
