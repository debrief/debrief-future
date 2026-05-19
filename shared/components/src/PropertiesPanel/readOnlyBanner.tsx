/**
 * ReadOnlyBanner — surface the plot slice's read-only signal in the
 * Properties Panel (Spec 192 — Phase 2, T023).
 *
 * Renders above the active mode shell whenever the plot is read-only.
 * Consumed by the mode dispatcher. Behaviour-light: the heavy lifting is
 * done by the plot slice's `isReadOnly` / `readOnlyReason` producer rules.
 *
 * Accessibility: `aria-live="polite"` so screen readers announce the state
 * when it transitions mid-session (e.g. after a writer rejection).
 */

import React from 'react';

export interface ReadOnlyBannerProps {
  /** Human-readable reason for the read-only state. Null/empty is allowed
   *  (the banner still renders so the UI surfaces the state visibly). */
  reason: string | null;
}

export function ReadOnlyBanner({ reason }: ReadOnlyBannerProps): React.ReactElement {
  return (
    <div
      data-testid="read-only-banner"
      role="status"
      aria-live="polite"
      style={{
        marginBottom: 8,
        padding: '6px 10px',
        background: 'var(--vscode-editorInfo-background, #2d2d2d)',
        color: 'var(--vscode-editorInfo-foreground, #ddd)',
        border: '1px solid var(--vscode-panel-border, #555)',
        borderRadius: 2,
        fontSize: 12,
        lineHeight: 1.4,
      }}
    >
      {reason && reason.length > 0
        ? reason
        : 'This plot is read-only — editing is disabled.'}
    </div>
  );
}

export default ReadOnlyBanner;
