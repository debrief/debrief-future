/**
 * PropertiesPanelDispatch — mode-aware wrapper around the existing
 * `PropertiesForm` (Spec 192, Phase 2, T019).
 *
 * Per plan.md § Plan Refresh Notes item 4 — "wrap, not modify": the shipped
 * #447 `PropertiesForm.tsx` is the plot-mode branch and is NOT touched.
 * This component dispatches on the `EditingMode` discriminated union and
 * renders one of:
 *
 *   - `kind: 'plot'`        → existing `PropertiesForm` (unchanged surface)
 *   - `kind: 'feature'`     → `FeatureEditorMode` (shell — Phase 3)
 *   - `kind: 'subfeature'`  → `SubFeatureEditorMode` (shell — Phase 4)
 *   - `kind: 'multi'`       → `MultiSelectSummaryMode` (shell — Phase 7)
 *   - `kind: 'stale'`       → existing `PropertiesForm` (treated as plot — the
 *                             resolver hands `stale` over after pruning the
 *                             selection)
 *
 * The read-only banner is rendered above the chosen mode whenever
 * `isReadOnly === true`. The plot-mode branch also has its own read-only
 * banner from #447; the new banner sits above the dispatcher so it's mode-
 * agnostic and per the spec's "every mode renders the banner" requirement.
 *
 * Article XV: strict types; the discriminated-union switch has an
 * exhaustiveness guard so adding a future variant fails compile.
 *
 * Article IV.5: props are derived from existing surfaces (`PropertiesFormProps`,
 * `UseStagedEditsApi`, `EditingMode`) — no field re-listing.
 */

import React from 'react';
import type { DebriefFeature } from '@debrief/schemas';
import { PropertiesForm } from './PropertiesForm';
import { FeatureEditorMode } from './modes/FeatureEditorMode';
import { SubFeatureEditorMode } from './modes/SubFeatureEditorMode';
import { MultiSelectSummaryMode } from './modes/MultiSelectSummaryMode';
import { ReadOnlyBanner } from './readOnlyBanner';
import type { EditingMode } from './selectionMode';
import type { UseStagedEditsApi } from '../ActivityPanel/useStagedEdits';
import type { PropertiesFormProps } from './types';

export interface PropertiesPanelDispatchProps {
  /** Discriminated-union mode emitted by `resolveEditingMode`. */
  editingMode: EditingMode;
  /** Feature lookup map — used to hand the chosen feature(s) into the
   *  feature / sub-feature / multi shells. */
  featuresById: ReadonlyMap<string, DebriefFeature>;
  /** Read-only signal from the plot slice (`selectIsReadOnly`). */
  isReadOnly: boolean;
  /** Read-only reason from the plot slice (`selectReadOnlyReason`). */
  readOnlyReason: string | null;

  /** The existing #447 plot-editor surface. Plot mode renders the
   *  unchanged `PropertiesForm` with these props verbatim. */
  plotFormProps: PropertiesFormProps;

  /** Staging buffer callbacks — handed to the mode shells. */
  setFeatureField: UseStagedEditsApi['setFeatureField'];
  setVertexField: UseStagedEditsApi['setVertexField'];
  revertField: UseStagedEditsApi['revertField'];
  unrevertField: UseStagedEditsApi['unrevertField'];
}

export function PropertiesPanelDispatch(
  props: PropertiesPanelDispatchProps,
): React.ReactElement {
  const {
    editingMode,
    featuresById,
    isReadOnly,
    readOnlyReason,
    plotFormProps,
    setFeatureField,
    setVertexField,
    revertField,
    unrevertField,
  } = props;

  // Banner is mode-agnostic; it renders above whichever shell is chosen.
  const banner = isReadOnly ? <ReadOnlyBanner reason={readOnlyReason} /> : null;

  // ── Heart of T019: the discriminated-union dispatch ────────────────
  switch (editingMode.kind) {
    case 'plot':
    case 'stale': {
      // Plot branch — render the unchanged #447 `PropertiesForm` with the
      // exact prop surface it has today (no behaviour change). 'stale' is
      // treated as plot per the resolver contract; the host clears the
      // stale selection separately.
      return (
        <div data-testid="properties-panel-dispatch" data-mode={editingMode.kind}>
          {banner}
          <PropertiesForm
            {...plotFormProps}
            readOnly={plotFormProps.readOnly || isReadOnly}
          />
        </div>
      );
    }
    case 'feature': {
      const feature = featuresById.get(editingMode.featureId);
      if (!feature) {
        // Defensive: resolver should have downgraded to 'stale' first.
        // Fall through to the plot branch with the banner so we don't
        // crash on a transient race.
        return (
          <div data-testid="properties-panel-dispatch" data-mode="stale">
            {banner}
            <PropertiesForm
              {...plotFormProps}
              readOnly={plotFormProps.readOnly || isReadOnly}
            />
          </div>
        );
      }
      return (
        <div data-testid="properties-panel-dispatch" data-mode="feature">
          {banner}
          <FeatureEditorMode
            feature={feature}
            readOnly={isReadOnly}
            setFeatureField={setFeatureField}
            revertField={revertField}
            unrevertField={unrevertField}
          />
        </div>
      );
    }
    case 'subfeature': {
      const feature = featuresById.get(editingMode.featureId);
      if (!feature) {
        return (
          <div data-testid="properties-panel-dispatch" data-mode="stale">
            {banner}
            <PropertiesForm
              {...plotFormProps}
              readOnly={plotFormProps.readOnly || isReadOnly}
            />
          </div>
        );
      }
      return (
        <div data-testid="properties-panel-dispatch" data-mode="subfeature">
          {banner}
          <SubFeatureEditorMode
            feature={feature}
            path={editingMode.path}
            readOnly={isReadOnly}
            setVertexField={setVertexField}
          />
        </div>
      );
    }
    case 'multi': {
      return (
        <div data-testid="properties-panel-dispatch" data-mode="multi">
          {banner}
          <MultiSelectSummaryMode
            featureIds={editingMode.featureIds}
            featuresById={featuresById}
            readOnly={isReadOnly}
          />
        </div>
      );
    }
    default: {
      // Exhaustiveness guard — every EditingMode variant MUST be handled.
      const _exhaustive: never = editingMode;
      return _exhaustive;
    }
  }
}

export default PropertiesPanelDispatch;
