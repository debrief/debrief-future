/**
 * BboxWidget — four numeric inputs arranged as [W, S, E, N].
 *
 * Commit discipline:
 *   - Any blur on any field re-validates the whole 4-tuple and commits if
 *     the value has changed and invariants hold (W < E, S < N).
 *   - Enter also commits.
 *   - An invariant violation surfaces an inline error and blocks the commit.
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { FieldSpec } from './types';

export interface BboxWidgetProps {
  name: string;
  value: unknown;
  spec: Extract<FieldSpec, { kind: 'bbox' }>;
  onCommit: (name: string, newValue: unknown) => void;
  onCancel?: () => void;
  disabled?: boolean;
  error?: string | null;
}

type Tuple4 = [number, number, number, number];
type DraftTuple = [string, string, string, string];

const LABELS: readonly string[] = ['W', 'S', 'E', 'N'];

function parseIncoming(value: unknown): DraftTuple {
  if (
    Array.isArray(value) &&
    value.length === 4 &&
    value.every((v) => typeof v === 'number' && Number.isFinite(v))
  ) {
    return value.map((v) => String(v)) as DraftTuple;
  }
  return ['', '', '', ''];
}

function tryParseTuple(draft: DraftTuple): Tuple4 | null {
  const nums = draft.map((s) => Number(s));
  if (nums.some((n) => !Number.isFinite(n))) return null;
  return nums as Tuple4;
}

function validateTuple(tuple: Tuple4): string | null {
  const [w, s, e, n] = tuple;
  if (!(w < e)) return 'West must be strictly less than East.';
  if (!(s < n)) return 'South must be strictly less than North.';
  return null;
}

function tuplesEqual(a: Tuple4 | null, b: Tuple4 | null): boolean {
  if (!a || !b) return a === b;
  return a.every((v, i) => v === b[i]);
}

export function BboxWidget({
  name,
  value,
  onCommit,
  disabled,
  error,
}: BboxWidgetProps): React.ReactElement {
  const [draft, setDraft] = useState<DraftTuple>(() => parseIncoming(value));
  const [lastCommitted, setLastCommitted] = useState<Tuple4 | null>(() =>
    tryParseTuple(parseIncoming(value)),
  );
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const next = parseIncoming(value);
    setDraft(next);
    setLastCommitted(tryParseTuple(next));
    setLocalError(null);
  }, [value]);

  const updateDraft = useCallback((index: number, v: string) => {
    setDraft((prev) => {
      const next = prev.slice() as DraftTuple;
      next[index] = v;
      return next;
    });
  }, []);

  const commit = useCallback(() => {
    const parsed = tryParseTuple(draft);
    if (!parsed) {
      setLocalError('All four values must be numbers.');
      return;
    }
    const err = validateTuple(parsed);
    if (err) {
      setLocalError(err);
      return;
    }
    if (tuplesEqual(parsed, lastCommitted)) {
      setLocalError(null);
      return;
    }
    setLastCommitted(parsed);
    setLocalError(null);
    onCommit(name, parsed);
  }, [draft, lastCommitted, name, onCommit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      }
    },
    [commit],
  );

  const shownError = error ?? localError;

  if (disabled) {
    return (
      <div data-testid={`bbox-widget-${name}`}>
        <span className="log-panel__param-editor-value">
          {draft.every((v) => v === '') ? '—' : draft.join(', ')}
        </span>
      </div>
    );
  }

  return (
    <div data-testid={`bbox-widget-${name}`}>
      <div style={{ display: 'flex', gap: 4 }}>
        {LABELS.map((label, i) => (
          <label
            key={label}
            style={{ display: 'flex', flexDirection: 'column', fontSize: 11 }}
          >
            <span>{label}</span>
            <input
              type="number"
              step="any"
              value={draft[i]}
              onChange={(e) => updateDraft(i, e.target.value)}
              onBlur={commit}
              onKeyDown={handleKeyDown}
              data-testid={`bbox-widget-input-${name}-${label}`}
              className="log-panel__param-editor-input-field"
              style={{ width: 80 }}
            />
          </label>
        ))}
      </div>
      {shownError && (
        <div
          className="log-panel__param-editor-error"
          role="alert"
          data-testid={`bbox-widget-error-${name}`}
        >
          {shownError}
        </div>
      )}
    </div>
  );
}

export default BboxWidget;
