/**
 * PlatformArrayWidget — table-style editor for `platform-array` FieldSpec.
 *
 * Display mode renders each platform as a read-only row (id · name ·
 * nationality · vessel_class) with a × button. Clicking a row enters edit
 * mode for that row only (and `+ Add platform` spawns a blank row already
 * in edit mode). Edits commit on blur / Enter; the full replaced array
 * always goes through `onCommit` — no partial writes.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

interface ColumnSpec {
  field: EditableField;
  placeholder: string;
  flex: string;
  maxLength?: number;
}

const COLUMNS: readonly ColumnSpec[] = [
  { field: 'id', placeholder: 'id', flex: '1 1 25%' },
  { field: 'name', placeholder: 'name', flex: '1 1 30%' },
  { field: 'nationality', placeholder: 'nat', flex: '0 0 48px', maxLength: 3 },
  { field: 'vessel_class', placeholder: 'class', flex: '1 1 25%' },
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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Only pull in new props when the user isn't mid-edit — otherwise their
    // in-progress text would be wiped by every re-render.
    if (editingIndex === null) {
      setRows(incoming);
      setLocalError(null);
    }
  }, [incoming, editingIndex]);

  const commitRows = useCallback(
    (next: PlatformDraft[]) => {
      if (next.some((row) => !row.id.trim())) {
        setLocalError('Each platform row must have a non-empty id.');
        return false;
      }
      const ids = next.map((row) => row.id.trim());
      if (new Set(ids).size !== ids.length) {
        setLocalError('Platform ids must be unique.');
        return false;
      }
      setLocalError(null);
      onCommit(name, toCommitShape(next));
      return true;
    },
    [name, onCommit],
  );

  const updateField = useCallback(
    (index: number, field: EditableField, v: string) => {
      setRows((prev) => {
        const next = prev.slice();
        const current = next[index];
        if (!current) return prev;
        next[index] = { ...current, [field]: v };
        return next;
      });
    },
    [],
  );

  const exitEdit = useCallback(() => {
    if (commitRows(rows)) setEditingIndex(null);
  }, [rows, commitRows]);

  const addRow = useCallback(() => {
    const blank: PlatformDraft = { id: '', name: '', nationality: '', vessel_class: '' };
    const nextRows = [...rows, blank];
    setRows(nextRows);
    setEditingIndex(nextRows.length - 1);
  }, [rows]);

  const deleteRow = useCallback(
    (index: number) => {
      const next = rows.slice();
      next.splice(index, 1);
      setRows(next);
      setEditingIndex(null);
      commitRows(next);
    },
    [rows, commitRows],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        exitEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setRows(incoming);
        setEditingIndex(null);
        setLocalError(null);
      }
    },
    [exitEdit, incoming],
  );

  // When the user tabs/clicks away from the entire row, commit + exit.
  const handleRowBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      const next = e.relatedTarget as Node | null;
      if (next && e.currentTarget.contains(next)) return;
      exitEdit();
    },
    [exitEdit],
  );

  const shownError = error ?? localError;

  return (
    <div data-testid={`platform-array-widget-${name}`}>
      {rows.length === 0 && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--vscode-descriptionForeground)',
            marginBottom: 4,
          }}
        >
          (No platforms)
        </div>
      )}

      {rows.map((row, i) =>
        editingIndex === i ? (
          <div
            key={i}
            ref={i === editingIndex ? rowRef : undefined}
            onBlur={handleRowBlur}
            data-testid={`platform-array-row-${name}-${i}`}
            data-editing="true"
            style={{
              display: 'flex',
              gap: 4,
              marginBottom: 4,
              alignItems: 'center',
            }}
          >
            {COLUMNS.map((col) => (
              <input
                key={col.field}
                type="text"
                value={row[col.field]}
                onChange={(e) => updateField(i, col.field, e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={col.placeholder}
                maxLength={col.maxLength}
                disabled={disabled}
                autoFocus={col.field === 'id' && row.id === ''}
                data-testid={`platform-array-input-${name}-${i}-${col.field}`}
                className="log-panel__param-editor-input-field"
                style={{
                  flex: col.flex,
                  minWidth: 0,
                  ...(col.field === 'nationality'
                    ? { textAlign: 'center', textTransform: 'uppercase' }
                    : {}),
                }}
              />
            ))}
            {!disabled && (
              <button
                type="button"
                onClick={() => deleteRow(i)}
                data-testid={`platform-array-delete-${name}-${i}`}
                aria-label={`Delete platform ${i + 1}`}
                className="log-panel__param-editor-btn log-panel__param-editor-btn--cancel"
                style={{ flex: '0 0 auto' }}
              >
                {'\u00D7'}
              </button>
            )}
          </div>
        ) : (
          <div
            key={i}
            data-testid={`platform-array-row-${name}-${i}`}
            onClick={() => !disabled && setEditingIndex(i)}
            style={{
              display: 'flex',
              gap: 8,
              padding: '4px 6px',
              marginBottom: 2,
              fontSize: 12,
              alignItems: 'center',
              cursor: disabled ? 'default' : 'pointer',
              borderRadius: 3,
              border: '1px solid transparent',
              background: 'var(--vscode-input-background, transparent)',
            }}
          >
            {COLUMNS.map((col) => (
              <span
                key={col.field}
                style={{
                  flex: col.flex,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textAlign: col.field === 'nationality' ? 'center' : 'left',
                  opacity: row[col.field] ? 1 : 0.5,
                  fontStyle: row[col.field] ? 'normal' : 'italic',
                }}
              >
                {row[col.field] || col.placeholder}
              </span>
            ))}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteRow(i);
                }}
                data-testid={`platform-array-delete-${name}-${i}`}
                aria-label={`Delete platform ${i + 1}`}
                className="log-panel__param-editor-btn log-panel__param-editor-btn--cancel"
                style={{ flex: '0 0 auto' }}
              >
                {'\u00D7'}
              </button>
            )}
          </div>
        ),
      )}

      {!disabled && (
        <button
          type="button"
          onClick={addRow}
          data-testid={`platform-array-add-${name}`}
          className="log-panel__param-editor-btn log-panel__param-editor-btn--commit"
          style={{ marginTop: 4 }}
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
