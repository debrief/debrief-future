import { default as React } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';

/**
 * The six per-platform override slots on `TrackProperties`. Hand-listed
 * here as a literal union so the testid `revert-<slot>` is type-safe and
 * matches the FeatureEditorMode's `PER_PLATFORM_OVERRIDE_SLOTS` constant.
 * If a slot is added or removed, both lists must move in lockstep —
 * `FeatureEditorMode`'s exhaustiveness guard catches the mismatch on the
 * staging-buffer side; this widget's call sites catch it on the render side.
 */
export type RevertControlSlot = 'display_name' | 'nationality' | 'vessel_class' | 'vessel_type' | 'vessel_role' | 'domain';
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
export declare function RevertControl(props: RevertControlProps): React.ReactElement | null;
export default RevertControl;
//# sourceMappingURL=revertControl.d.ts.map