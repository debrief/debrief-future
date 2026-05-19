/**
 * SubFeatureEditorMode — shell for editing a single vertex / sub-feature
 * (Spec 192, Phase 2, T021).
 *
 * THIS IS A SHELL ONLY. The full body — the label/tags/note form, the
 * memoised vertex_metadata lookup, the out-of-range "stale" notice — lands
 * in Phase 4 (T032/T033) and is extended for all four annotation
 * geometries in Phase 9 (T067-T070).
 *
 * For now: renders "<parentDisplayName> — <path>" + a placeholder body.
 *
 * Article IV.5 (boundary types are derived, not rewritten): props re-use
 * the schema-generated `DebriefFeature` and the `useStagedEdits` hook's
 * exported callback shapes — no field re-listing.
 */

import React from 'react';
import type { DebriefFeature } from '@debrief/schemas';
import type { UseStagedEditsApi } from '../../ActivityPanel/useStagedEdits';
import { getFeatureLabel } from '../../utils/labels';

export interface SubFeatureEditorModeProps {
  /** The parent feature carrying the vertex_metadata array. */
  feature: DebriefFeature;
  /** Selection path identifying the vertex (e.g. `positions/4`,
   *  `rings/0/vertices/3`, `vertices/2`, `vertex/0`). */
  path: string;
  /** True when the plot's storage is read-only — disables inputs. */
  readOnly: boolean;
  /** Staging buffer callback for vertex edits. Wired in Phase 4. */
  setVertexField: UseStagedEditsApi['setVertexField'];
}

export function SubFeatureEditorMode(
  props: SubFeatureEditorModeProps,
): React.ReactElement {
  const { feature, path, readOnly } = props;
  // The vertex setter is wired into the form in Phase 4 (T033).
  void props.setVertexField;
  const parentName = getFeatureLabel(feature);

  return (
    <div
      data-testid="properties-mode-subfeature"
      data-path={path}
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
        {parentName} — {path}
      </header>
      <div
        data-testid="properties-mode-subfeature-placeholder"
        style={{
          fontSize: 11,
          color: 'var(--vscode-descriptionForeground, #888)',
          fontStyle: 'italic',
        }}
      >
        Sub-feature editor coming in Phase 4.
      </div>
    </div>
  );
}

export default SubFeatureEditorMode;
