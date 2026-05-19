/**
 * FeatureEditorMode — shell for editing a single feature's metadata
 * (Spec 192, Phase 2, T020).
 *
 * THIS IS A SHELL ONLY. The full body — schema-driven field rendering,
 * staged-edit routing through `useStagedEdits.setFeatureField`, and the
 * revert affordance — lands in Phase 3 (T026/T027) and Phase 8 (T060/T061).
 *
 * For now: renders a header with the feature display name + a placeholder
 * body, plus a `data-testid` for Playwright + visual smoke tests.
 *
 * Article IV.5 (boundary types are derived, not rewritten): props re-use
 * the schema-generated `DebriefFeature` and the `useStagedEdits` hook's
 * exported callback shapes — no field re-listing.
 */

import React from 'react';
import type { DebriefFeature } from '@debrief/schemas';
import type { UseStagedEditsApi } from '../../ActivityPanel/useStagedEdits';
import { getFeatureLabel } from '../../utils/labels';

export interface FeatureEditorModeProps {
  /** The single feature being edited. */
  feature: DebriefFeature;
  /** True when the plot's storage is read-only — disables inputs. */
  readOnly: boolean;
  /** Staging buffer callbacks. Behaviour-light here; Phase 3 wires the
   *  inputs to `setFeatureField` and the revert affordance to
   *  `revertField` / `unrevertField`. Pulled in as a typed prop so the
   *  dispatcher's contract is explicit. */
  setFeatureField: UseStagedEditsApi['setFeatureField'];
  revertField: UseStagedEditsApi['revertField'];
  unrevertField: UseStagedEditsApi['unrevertField'];
}

export function FeatureEditorMode(
  props: FeatureEditorModeProps,
): React.ReactElement {
  const { feature, readOnly } = props;
  // The staging callbacks (setFeatureField / revertField / unrevertField)
  // are wired into the form widgets in Phase 3 (T027) and Phase 8 (T061).
  // They appear in the props surface now so the dispatcher contract is
  // already concrete — referenced via `props.*` so eslint doesn't flag
  // them as unused until the body lands.
  void props.setFeatureField;
  void props.revertField;
  void props.unrevertField;
  const displayName = getFeatureLabel(feature);

  return (
    <div
      data-testid="properties-mode-feature"
      aria-disabled={readOnly ? 'true' : undefined}
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <header
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--vscode-foreground, #ddd)',
          paddingBottom: 4,
          borderBottom: '1px solid var(--vscode-panel-border, transparent)',
        }}
      >
        {displayName}
      </header>
      <div
        data-testid="properties-mode-feature-placeholder"
        style={{
          fontSize: 11,
          color: 'var(--vscode-descriptionForeground, #888)',
          fontStyle: 'italic',
        }}
      >
        Feature editor coming in Phase 3.
      </div>
    </div>
  );
}

export default FeatureEditorMode;
