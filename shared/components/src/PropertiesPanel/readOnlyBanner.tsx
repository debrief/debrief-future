/**
 * ReadOnlyBanner — surface the plot slice's read-only signal in the
 * Properties Panel (Spec 192 — Phase 6, T047).
 *
 * Renders above the active mode shell whenever the plot is read-only.
 * Consumed by the mode dispatcher. Behaviour-light: the heavy lifting is
 * done by the plot slice's `isReadOnly` / `readOnlyReason` producer rules
 * (see `services/session-state/src/store/slices/plot.ts` and the
 * `read-only-signal.md` contract).
 *
 * Behaviour:
 *   - When `reason === null` the banner renders nothing (the dispatcher
 *     gates on `isReadOnly`, so this is a belt-and-braces guard for any
 *     consumer that hands the component a null reason directly).
 *   - When `reason !== null` the banner renders the reason text inside a
 *     visible `role="status"` region with `aria-live="polite"` so screen
 *     readers announce the state when it transitions mid-session (e.g.
 *     after a writer rejection).
 *
 * Accessibility: `aria-live="polite"` + `role="status"` together form the
 * standard "non-interruptive notification" idiom (W3C ARIA 1.2 § 4.2).
 */

import React from 'react';

export interface ReadOnlyBannerProps {
  /** Human-readable reason for the read-only state. `null` suppresses the
   *  banner; any non-null string (including the empty string) renders the
   *  banner. The component is the sole authority on rendering — its
   *  dispatcher caller need not gate. */
  reason: string | null;
}

export function ReadOnlyBanner({ reason }: ReadOnlyBannerProps): React.ReactElement | null {
  if (reason === null) {
    return null;
  }
  // Empty-string reason → fall back to a generic message so the analyst
  // still sees the read-only signal (FR-018 / FR-019).
  const text = reason.length > 0 ? reason : 'This plot is read-only — editing is disabled.';
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
      {text}
    </div>
  );
}

export default ReadOnlyBanner;
