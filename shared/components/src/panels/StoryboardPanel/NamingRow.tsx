/**
 * First-capture inline naming row (#235 FR-UX-003 + FR-CAP-015).
 *
 * Replaces the legacy VS Code top-of-window quick-pick. The row lives
 * inside the panel rail (NEVER occluding the central area's map or
 * time controller) and is auto-focused on open. Enter confirms (when
 * `canConfirm`); Escape cancels and clears the row.
 *
 * Source-of-truth split:
 *   - Host owns `visible` / `defaultName` / `knownNames` (push state).
 *   - Panel owns `pendingName` (panel-local in the reducer).
 *   - `collisionWith` is derived from `pendingName` against `knownNames`
 *     and disables Confirm when non-null.
 */

import React, { useEffect, useRef } from 'react';
import type { NamingRowViewModel } from './types';

export interface NamingRowProps {
  readonly viewModel: NamingRowViewModel;
  readonly onTextChange: (text: string) => void;
  readonly onConfirm: (name: string) => void;
  readonly onCancel: () => void;
}

export function NamingRow({
  viewModel,
  onTextChange,
  onConfirm,
  onCancel,
}: NamingRowProps): React.ReactElement | null {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus the input on first mount (FR-CAP-015 default focus
  // assumption from spec.md). select() lets the analyst overtype the
  // pre-filled default without first clearing it.
  useEffect(() => {
    if (viewModel.visible && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [viewModel.visible]);

  if (!viewModel.visible) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (viewModel.canConfirm) onConfirm(viewModel.pendingName.trim());
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      data-testid="storyboard-naming-row"
      role="group"
      aria-label="Name this storyboard"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '8px 10px',
        borderBottom: '1px solid var(--vscode-panel-border, #3c3c3c)',
        background: 'var(--vscode-input-background, #2d2d30)',
      }}
    >
      <label
        htmlFor="storyboard-naming-row-input"
        style={{ fontSize: 11, opacity: 0.85 }}
      >
        Name this storyboard
      </label>
      <input
        ref={inputRef}
        id="storyboard-naming-row-input"
        data-testid="storyboard-naming-row-input"
        type="text"
        value={viewModel.pendingName}
        onChange={(e): void => onTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-invalid={viewModel.collisionWith !== null}
        aria-describedby={
          viewModel.collisionWith !== null
            ? 'storyboard-naming-row-collision'
            : undefined
        }
        style={{
          padding: '4px 6px',
          background: 'var(--vscode-input-background, #1e1e1e)',
          color: 'var(--vscode-input-foreground, inherit)',
          border:
            viewModel.collisionWith !== null
              ? '1px solid var(--vscode-inputValidation-errorBorder, #be1100)'
              : '1px solid var(--vscode-input-border, transparent)',
        }}
      />
      <div
        data-testid="storyboard-naming-row-collision-slot"
        id="storyboard-naming-row-collision"
        role="alert"
        style={{
          fontSize: 11,
          minHeight: 16,
          color: 'var(--vscode-inputValidation-errorForeground, #f48771)',
        }}
      >
        {viewModel.collisionWith !== null
          ? `A storyboard named "${viewModel.collisionWith}" already exists on this plot.`
          : ''}
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button
          type="button"
          data-testid="storyboard-naming-row-cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          data-testid="storyboard-naming-row-confirm"
          disabled={!viewModel.canConfirm}
          onClick={(): void => onConfirm(viewModel.pendingName.trim())}
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
