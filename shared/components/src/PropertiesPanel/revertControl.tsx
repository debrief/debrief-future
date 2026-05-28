/**
 * revertControl — per-field "Revert to auto-derived" affordance for the
 * six per-platform override slots on `TrackProperties` (Spec 192, US-6,
 * T060).
 *
 * Surface fixed by `contracts/revert-action.md` § "Widget surface":
 *
 *   - Reads four observables: `effectiveValue`, `autoDerivedValue`,
 *     `hasOverride`, `isReverted`.
 *   - Emits `onRevert` / `onUnrevert` — the staging-buffer mutations live
 *     in `useStagedEdits.revertField` / `unrevertField` (Phase 2 Stream C).
 *
 * State matrix (4 rows, 1:1 with the contract table):
 *
 *   | Condition                                                    | Render |
 *   |---|---|
 *   | hasOverride && autoDerivedValue !== null && !isReverted      | enabled, label "Revert", tooltip "Restore the registry value: <auto>" |
 *   | isReverted                                                   | enabled, label "Undo revert", tooltip "Restore your override of <savedOverrideValue>" |
 *   | hasOverride && autoDerivedValue === null                     | disabled, tooltip "No auto-derived value available for this platform" |
 *   | !hasOverride                                                 | hidden (returns null) |
 *
 * Article XV: strict types, no `any`. The `slot` prop is constrained to
 * the six override slots via a literal union so the testid is type-safe.
 *
 * Bulk revert is explicitly Out of Scope (FR-023) — this widget is
 * per-field only, instantiated once per override slot by the parent
 * `FeatureEditorMode`.
 */

import React, { useCallback } from 'react';

// ─── Slot type ────────────────────────────────────────────────────────

/**
 * The six per-platform override slots on `TrackProperties`. Hand-listed
 * here as a literal union so the testid `revert-<slot>` is type-safe and
 * matches the FeatureEditorMode's `PER_PLATFORM_OVERRIDE_SLOTS` constant.
 * If a slot is added or removed, both lists must move in lockstep —
 * `FeatureEditorMode`'s exhaustiveness guard catches the mismatch on the
 * staging-buffer side; this widget's call sites catch it on the render side.
 */
export type RevertControlSlot =
  | 'display_name'
  | 'nationality'
  | 'vessel_class'
  | 'vessel_type'
  | 'vessel_role'
  | 'domain';

// ─── Props ────────────────────────────────────────────────────────────

export interface RevertControlProps {
  /** The slot this control governs. */
  slot: RevertControlSlot;
  /** Current effective value (override if set, else auto-derived). */
  effectiveValue: string | null;
  /** Auto-derived value resolved on-the-fly from the platform registry. */
  autoDerivedValue: string | null;
  /** True when an explicit override is in place (saved or staged). */
  hasOverride: boolean;
  /** True when the analyst has already clicked revert this session. */
  isReverted: boolean;
  onRevert: () => void;
  onUnrevert: () => void;
}

// ─── Component ────────────────────────────────────────────────────────

export function RevertControl(props: RevertControlProps): React.ReactElement | null {
  const {
    slot,
    effectiveValue,
    autoDerivedValue,
    hasOverride,
    isReverted,
    onRevert,
    onUnrevert,
  } = props;

  // ─── Row 4: no override → hidden ────────────────────────────────────
  if (!hasOverride) {
    return null;
  }

  // ─── Row 2: already reverted → "Undo revert" ────────────────────────
  if (isReverted) {
    // `effectiveValue` carries the saved override value in this state
    // (the un-revert restores it).
    const overrideLabel = effectiveValue ?? '';
    return (
      <ControlButton
        slot={slot}
        label="Undo revert"
        title={
          overrideLabel
            ? `Restore your override of ${overrideLabel}`
            : 'Restore your override'
        }
        disabled={false}
        onClick={onUnrevert}
      />
    );
  }

  // ─── Row 3: no auto-derived value → disabled with explanatory tooltip
  if (autoDerivedValue === null) {
    return (
      <ControlButton
        slot={slot}
        label="Revert"
        title="No auto-derived value available for this platform"
        disabled={true}
        onClick={onRevert}
      />
    );
  }

  // ─── Row 1: enabled "Revert", tooltip mentions auto-derived value ────
  return (
    <ControlButton
      slot={slot}
      label="Revert"
      title={`Restore the registry value: ${autoDerivedValue}`}
      disabled={false}
      onClick={onRevert}
    />
  );
}

// ─── Button shell ─────────────────────────────────────────────────────

interface ControlButtonProps {
  slot: RevertControlSlot;
  label: string;
  title: string;
  disabled: boolean;
  onClick: () => void;
}

function ControlButton(props: ControlButtonProps): React.ReactElement {
  const { slot, label, title, disabled, onClick } = props;

  // The disabled handler short-circuits even if the host environment
  // (jsdom + fireEvent.click) bypasses the `disabled` attribute — the
  // contract says clicks while disabled MUST be no-ops (Row 3 test case).
  const handleClick = useCallback((): void => {
    if (disabled) return;
    onClick();
  }, [disabled, onClick]);

  return (
    <button
      type="button"
      data-testid={`revert-${slot}`}
      onClick={handleClick}
      disabled={disabled}
      aria-disabled={disabled ? 'true' : undefined}
      title={title}
      style={{
        marginLeft: 6,
        padding: '1px 6px',
        fontSize: 10,
        fontWeight: 600,
        borderRadius: 3,
        background: disabled
          ? 'var(--vscode-button-secondaryBackground, #444)'
          : 'var(--vscode-button-secondaryBackground, #3a3d41)',
        color: disabled
          ? 'var(--vscode-disabledForeground, #888)'
          : 'var(--vscode-button-secondaryForeground, #ccc)',
        border: '1px solid var(--vscode-panel-border, transparent)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {label}
    </button>
  );
}

export default RevertControl;
