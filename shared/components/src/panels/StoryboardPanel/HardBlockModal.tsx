/**
 * Hard-block modal (Feature 217) — presentational, Storybook-only.
 *
 * The real modal in VS Code is rendered via
 * `vscode.window.showInformationMessage({ modal: true })` — this component
 * exists to exercise the design inside Storybook and to provide a stable
 * shape for snapshot screenshots across themes.
 */

import React, { useEffect, useRef } from 'react';
import type { MissingDataReason } from './types';

export interface HardBlockModalProps {
  readonly sceneTitle: string;
  readonly reason: MissingDataReason;
  readonly jumpPastLabel: string;
  readonly openForEditingLabel: string;
  onJumpPast(): void;
  onOpenForEditing(): void;
  onDismiss(): void;
}

function describeReason(reason: MissingDataReason): React.ReactNode {
  if (reason.kind === 'missing-features') {
    return (
      <>
        <div>The following features are no longer in this plot:</div>
        <ul style={{ marginTop: 4, marginBottom: 4, paddingLeft: 20 }}>
          {reason.missingFeatureIds.map((id) => (
            <li key={id}>
              <code>{id}</code>
            </li>
          ))}
        </ul>
      </>
    );
  }
  return (
    <div>
      The scene timestamp ({reason.sceneTimestampIso}) is out of range
      ({reason.plotStartIso} &ndash; {reason.plotEndIso}) for the current plot.
    </div>
  );
}

export function HardBlockModal({
  sceneTitle,
  reason,
  jumpPastLabel,
  openForEditingLabel,
  onJumpPast,
  onOpenForEditing,
  onDismiss,
}: HardBlockModalProps): React.ReactElement {
  const firstButtonRef = useRef<HTMLButtonElement | null>(null);

  // Focus the first action button on mount (simple focus-trap — the dialog
  // only has two buttons so full trap machinery is overkill).
  useEffect(() => {
    firstButtonRef.current?.focus();
  }, []);

  // Listen on window so the test doesn't need to locate the dialog node.
  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onDismiss]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hard-block-title"
      data-testid="hard-block-modal"
      className="storyboard-hard-block-modal"
      style={{
        background: 'var(--vscode-editor-background, #1e1e1e)',
        color: 'var(--vscode-foreground, #cccccc)',
        border: '1px solid var(--vscode-panel-border, #3c3c3c)',
        padding: 16,
        maxWidth: 420,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <h2
        id="hard-block-title"
        style={{ margin: 0, fontSize: 14, fontWeight: 600 }}
      >
        Cannot step onto &quot;{sceneTitle}&quot;
      </h2>
      <div
        data-testid="hard-block-body"
        className="storyboard-hard-block-modal__body"
        style={{ fontSize: 12 }}
      >
        {describeReason(reason)}
      </div>
      <div
        className="storyboard-hard-block-modal__actions"
        style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}
      >
        <button
          ref={firstButtonRef}
          type="button"
          data-testid="hard-block-jump-past"
          onClick={onJumpPast}
          style={{ padding: '4px 10px' }}
        >
          {jumpPastLabel}
        </button>
        <button
          type="button"
          data-testid="hard-block-open-for-editing"
          onClick={onOpenForEditing}
          style={{ padding: '4px 10px' }}
        >
          {openForEditingLabel}
        </button>
      </div>
    </div>
  );
}
