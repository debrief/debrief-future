/**
 * PlatformArrayWidget — list editor for `platform-array` FieldSpec.
 *
 * Each platform row renders four text inputs (id, name, nationality,
 * vessel_class). Add, edit, and delete each fire `onCommit` with the full
 * replaced array — no batching, no partial writes.
 *
 * Row-level text edits commit on blur or Enter.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { FieldSpec } from './types';

export interface PlatformArrayWidgetProps {
  name: string;
  value: unknown;
  spec: Extract<FieldSpec, { kind: 'platform-array' }>;
  onCommit: (name: string, newValue: unknown) => void;
  onCancel?: () => void;
  disabled?: boolean;
  error?: string | null;
}

interface PlatformDraft {
  id: string;
  name: string;
  nationality: string;
  vessel_class: string;
}

type EditableField = keyof PlatformDraft;
const FIELDS: readonly EditableField[] = [
  'id',
  'name',
  'nationality',
  'vessel_class',
];

function readStringField(entry: unknown, field: string): string {
  if (typeof entry !== 'object' || entry === null) return '';
  const value = (entry as { [k: string]: unknown })[field];
  return typeof value === 'string' ? value : '';
}

function coerceToPlatforms(value: unknown): PlatformDraft[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => ({
    id: readStringField(entry, 'id'),
    name: readStringField(entry, 'name'),
    nationality: readStringField(entry, 'nationality'),
    vessel_class: readStringField(entry, 'vessel_class'),
  }));
}

interface PlatformCommit {
  id: string;
  name?: string;
  nationality?: string;
  vessel_class?: string;
}

function toCommitShape(rows: PlatformDraft[]): PlatformCommit[] {
  // Strip empty optional fields so the patch matches the schema (optional
  // fields omitted, not empty strings).
  return rows.map((row) => {
    const out: PlatformCommit = { id: row.id.trim() };
    if (row.name.trim()) out.name = row.name.trim();
    if (row.nationality.trim()) out.nationality = row.nationality.trim();
    if (row.vessel_class.trim()) out.vessel_class = row.vessel_class.trim();
    return out;
  });
}

export function PlatformArrayWidget({
  name,
  value,
  onCommit,
  disabled,
  error,
}: PlatformArrayWidgetProps): React.ReactElement {
  const incoming = useMemo(() => coerceToPlatforms(value), [value]);
  const [rows, setRows] = useState<PlatformDraft[]>(incoming);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setRows(incoming);
    setLocalError(null);
  }, [incoming]);

  const commitRows = useCallback(
    (next: PlatformDraft[]) => {
      // Validate ids — each row must have a non-empty id.
      if (next.some((row) => !row.id.trim())) {
        setLocalError('Each platform row must have a non-empty id.');
        return;
      }
      const ids = next.map((row) => row.id.trim());
      if (new Set(ids).size !== ids.length) {
        setLocalError('Platform ids must be unique.');
        return;
      }
      setLocalError(null);
      onCommit(name, toCommitShape(next));
    },
    [name, onCommit],
  );

  const updateField = useCallback(
    (index: number, field: EditableField, v: string) => {
      setRows((prev) => {
        const next = prev.slice();
        const current = next[index];
        if (!current) return prev;
        const updated: PlatformDraft = {
          id: current.id,
          name: current.name,
          nationality: current.nationality,
          vessel_class: current.vessel_class,
        };
        updated[field] = v;
        next[index] = updated;
        return next;
      });
    },
    [],
  );

  const commitFromRows = useCallback(() => {
    commitRows(rows);
  }, [rows, commitRows]);

  const addRow = useCallback(() => {
    const blank: PlatformDraft = {
      id: '',
      name: '',
      nationality: '',
      vessel_class: '',
    };
    setRows([...rows, blank]);
    // We do NOT commit yet — wait for the user to fill in the id, then blur.
  }, [rows]);

  const deleteRow = useCallback(
    (index: number) => {
      const next = rows.slice();
      next.splice(index, 1);
      setRows(next);
      commitRows(next);
    },
    [rows, commitRows],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitFromRows();
      }
    },
    [commitFromRows],
  );

  const shownError = error ?? localError;

  return (
    <div data-testid={`platform-array-widget-${name}`}>
      {rows.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--vscode-descriptionForeground)' }}>
          (No platforms)
        </div>
      )}
      {rows.map((row, i) => (
        <div
          key={i}
          data-testid={`platform-array-row-${name}-${i}`}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            marginBottom: 4,
            alignItems: 'center',
          }}
        >
          {FIELDS.map((field) => (
            <input
              key={field}
              type="text"
              value={row[field]}
              onChange={(e) => updateField(i, field, e.target.value)}
              onBlur={commitFromRows}
              onKeyDown={handleKeyDown}
              placeholder={field}
              disabled={disabled}
              data-testid={`platform-array-input-${name}-${i}-${field}`}
              className="log-panel__param-editor-input-field"
              style={{ width: 120 }}
            />
          ))}
          {!disabled && (
            <button
              type="button"
              onClick={() => deleteRow(i)}
              data-testid={`platform-array-delete-${name}-${i}`}
              aria-label={`Delete row ${i + 1}`}
              className="log-panel__param-editor-btn log-panel__param-editor-btn--cancel"
            >
              {'\u00D7'}
            </button>
          )}
        </div>
      ))}

      {!disabled && (
        <button
          type="button"
          onClick={addRow}
          data-testid={`platform-array-add-${name}`}
          className="log-panel__param-editor-btn log-panel__param-editor-btn--commit"
        >
          + Add platform
        </button>
      )}

      {shownError && (
        <div
          className="log-panel__param-editor-error"
          role="alert"
          data-testid={`platform-array-error-${name}`}
        >
          {shownError}
        </div>
      )}
    </div>
  );
}

export default PlatformArrayWidget;
