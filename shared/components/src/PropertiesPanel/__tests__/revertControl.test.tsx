/**
 * Vitest for the `revertControl` widget (Spec 192, Phase 8, T059).
 *
 * TDD per Article VII.1 — these tests are authored before the body lands in
 * T060. The widget surface is fixed by `contracts/revert-action.md` and
 * mirrors the four rows of the contract's state matrix:
 *
 *   1. `hasOverride === true` AND `autoDerivedValue !== null` AND NOT
 *      `isReverted` → control enabled, label "Revert", tooltip mentions the
 *      auto-derived value.
 *   2. `isReverted === true` → control enabled, label "Undo revert",
 *      tooltip mentions the previously-saved override value.
 *   3. `hasOverride === true` AND `autoDerivedValue === null` → control
 *      disabled with the "no auto-derived value" tooltip (FR-024 edge case).
 *   4. `hasOverride === false` → control hidden (no node rendered).
 *
 * The widget is per-field (per FR-023 — Out of Scope bulk revert). One
 * widget instance per slot; each carries a stable testid
 * `revert-<slot>` (T064).
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { RevertControl } from '../revertControl';

describe('RevertControl (Spec 192, Phase 8, T059)', () => {
  // ─── Row 1 — override present + auto-derived resolved + not yet reverted ───
  describe('override present + auto-derived value resolved', () => {
    it('renders the control with label "Revert"', () => {
      render(
        <RevertControl
          slot="vessel_role"
          effectiveValue="frigate"
          autoDerivedValue="destroyer"
          hasOverride={true}
          isReverted={false}
          onRevert={vi.fn()}
          onUnrevert={vi.fn()}
        />,
      );
      const btn = screen.getByTestId('revert-vessel_role');
      expect(btn.textContent).toMatch(/revert/i);
      expect(btn.textContent).not.toMatch(/undo/i);
    });

    it('is enabled (not disabled)', () => {
      render(
        <RevertControl
          slot="vessel_role"
          effectiveValue="frigate"
          autoDerivedValue="destroyer"
          hasOverride={true}
          isReverted={false}
          onRevert={vi.fn()}
          onUnrevert={vi.fn()}
        />,
      );
      const btn = screen.getByTestId('revert-vessel_role') as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
      expect(btn.getAttribute('aria-disabled')).not.toBe('true');
    });

    it('tooltip mentions the auto-derived value to be restored', () => {
      render(
        <RevertControl
          slot="vessel_role"
          effectiveValue="frigate"
          autoDerivedValue="destroyer"
          hasOverride={true}
          isReverted={false}
          onRevert={vi.fn()}
          onUnrevert={vi.fn()}
        />,
      );
      const btn = screen.getByTestId('revert-vessel_role');
      const title = btn.getAttribute('title') ?? '';
      expect(title).toMatch(/destroyer/);
    });

    it('invokes onRevert when clicked', () => {
      const onRevert = vi.fn();
      render(
        <RevertControl
          slot="vessel_role"
          effectiveValue="frigate"
          autoDerivedValue="destroyer"
          hasOverride={true}
          isReverted={false}
          onRevert={onRevert}
          onUnrevert={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByTestId('revert-vessel_role'));
      expect(onRevert).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Row 2 — already reverted (pre-save undo affordance) ───────────
  describe('already reverted (analyst has clicked revert before save)', () => {
    it('renders the control with label "Undo revert"', () => {
      render(
        <RevertControl
          slot="vessel_role"
          effectiveValue="destroyer"
          autoDerivedValue="destroyer"
          hasOverride={true}
          isReverted={true}
          onRevert={vi.fn()}
          onUnrevert={vi.fn()}
        />,
      );
      const btn = screen.getByTestId('revert-vessel_role');
      expect(btn.textContent).toMatch(/undo/i);
    });

    it('is enabled (not disabled)', () => {
      render(
        <RevertControl
          slot="vessel_role"
          effectiveValue="destroyer"
          autoDerivedValue="destroyer"
          hasOverride={true}
          isReverted={true}
          onRevert={vi.fn()}
          onUnrevert={vi.fn()}
        />,
      );
      const btn = screen.getByTestId('revert-vessel_role') as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });

    it('invokes onUnrevert when clicked', () => {
      const onUnrevert = vi.fn();
      render(
        <RevertControl
          slot="vessel_role"
          effectiveValue="destroyer"
          autoDerivedValue="destroyer"
          hasOverride={true}
          isReverted={true}
          onRevert={vi.fn()}
          onUnrevert={onUnrevert}
        />,
      );
      fireEvent.click(screen.getByTestId('revert-vessel_role'));
      expect(onUnrevert).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Row 3 — override present but no auto-derived available (FR-024) ───
  describe('override present + no auto-derived value (unknown platform)', () => {
    it('renders the control but disabled', () => {
      render(
        <RevertControl
          slot="vessel_role"
          effectiveValue="frigate"
          autoDerivedValue={null}
          hasOverride={true}
          isReverted={false}
          onRevert={vi.fn()}
          onUnrevert={vi.fn()}
        />,
      );
      const btn = screen.getByTestId('revert-vessel_role') as HTMLButtonElement;
      expect(btn).toBeDefined();
      expect(btn.disabled).toBe(true);
    });

    it('tooltip explains why the control is disabled', () => {
      render(
        <RevertControl
          slot="vessel_role"
          effectiveValue="frigate"
          autoDerivedValue={null}
          hasOverride={true}
          isReverted={false}
          onRevert={vi.fn()}
          onUnrevert={vi.fn()}
        />,
      );
      const btn = screen.getByTestId('revert-vessel_role');
      const title = btn.getAttribute('title') ?? '';
      expect(title).toMatch(/no auto-derived value/i);
    });

    it('does NOT invoke onRevert when clicked while disabled', () => {
      const onRevert = vi.fn();
      render(
        <RevertControl
          slot="vessel_role"
          effectiveValue="frigate"
          autoDerivedValue={null}
          hasOverride={true}
          isReverted={false}
          onRevert={onRevert}
          onUnrevert={vi.fn()}
        />,
      );
      const btn = screen.getByTestId('revert-vessel_role');
      // jsdom dispatches click even on disabled buttons; the widget body
      // must early-return inside its handler if disabled. Either way: no
      // call should propagate to `onRevert`.
      fireEvent.click(btn);
      expect(onRevert).not.toHaveBeenCalled();
    });
  });

  // ─── Row 4 — no override → control hidden ─────────────────────────
  describe('no override present', () => {
    it('renders nothing (hidden)', () => {
      const { container } = render(
        <RevertControl
          slot="vessel_role"
          effectiveValue={null}
          autoDerivedValue="destroyer"
          hasOverride={false}
          isReverted={false}
          onRevert={vi.fn()}
          onUnrevert={vi.fn()}
        />,
      );
      expect(screen.queryByTestId('revert-vessel_role')).toBeNull();
      // The widget should not render *any* DOM nodes when hidden so
      // FeatureEditorMode can place it inline without leaving a hole.
      expect(container.firstChild).toBeNull();
    });
  });

  // ─── Per-slot testid convention (T064) ────────────────────────────
  describe('per-slot data-testid convention (T064)', () => {
    const slots = [
      'display_name',
      'nationality',
      'vessel_class',
      'vessel_type',
      'vessel_role',
      'domain',
    ] as const;

    for (const slot of slots) {
      it(`uses data-testid="revert-${slot}" for slot ${slot}`, () => {
        render(
          <RevertControl
            slot={slot}
            effectiveValue="x"
            autoDerivedValue="y"
            hasOverride={true}
            isReverted={false}
            onRevert={vi.fn()}
            onUnrevert={vi.fn()}
          />,
        );
        expect(screen.getByTestId(`revert-${slot}`)).toBeDefined();
      });
    }
  });
});
