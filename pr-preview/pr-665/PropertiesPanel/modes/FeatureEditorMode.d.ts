import { default as React } from '../../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { DebriefFeature } from '../../../../schemas/src/generated/typescript/index.ts';
import { FeatureEditableProperties, UseStagedEditsApi } from '../../ActivityPanel/useStagedEdits';
import { FieldKey } from '../types';

/**
 * The six per-platform override slots on `TrackProperties`. Used to drive
 * the `derivation: 'override'` chip per FR-005.
 */
declare const PER_PLATFORM_OVERRIDE_SLOTS: readonly ["display_name", "nationality", "vessel_class", "vessel_type", "vessel_role", "domain"];
type PerPlatformOverrideSlot = (typeof PER_PLATFORM_OVERRIDE_SLOTS)[number];
export interface FeatureEditorModeProps {
    /** The single feature being edited. */
    feature: DebriefFeature;
    /** True when the plot's storage is read-only — disables inputs. */
    readOnly: boolean;
    /** Staging buffer setter; receives `(featureId, slot, next, current)`. */
    setFeatureField: UseStagedEditsApi['setFeatureField'];
    /** Revert / un-revert — wired to staging buffer (Phase 8 / T060–T061). */
    revertField: UseStagedEditsApi['revertField'];
    unrevertField: UseStagedEditsApi['unrevertField'];
    /**
     * Staged (uncommitted) field edits for this feature, overlaid on top of
     * `feature.properties` for display purposes (US-3 AS-3 hydration on
     * re-selection). When the analyst re-selects a feature that has
     * unsaved edits, the form must show the staged value — not the saved
     * one — so the in-flight edit is visible. Keyed by slot.
     */
    stagedFeatureEdits?: Partial<FeatureEditableProperties>;
    /**
     * Slots the analyst has clicked Revert on but not yet saved. Reverted
     * slots render as if the override were absent (auto-derived chip) even
     * if `feature.properties[slot]` still carries the value — US-3 AS-3.
     */
    stagedRevertedFields?: ReadonlySet<FieldKey>;
    /**
     * Optional override of the platform-registry resolver used to compute
     * each slot's `autoDerivedValue`. Defaults to the inline mirror walker
     * (`resolvePlatform`). Hosts that need to swap the registry source
     * (test fixtures, organisational extension registries) can inject one.
     * Returning `null` from this function for a given slot tells the revert
     * widget to render in the disabled "no auto-derived value" state (FR-024).
     */
    resolveAutoDerivedValue?: (feature: DebriefFeature, slot: PerPlatformOverrideSlot) => string | null;
}
export declare function FeatureEditorMode(props: FeatureEditorModeProps): React.ReactElement;
export default FeatureEditorMode;
//# sourceMappingURL=FeatureEditorMode.d.ts.map