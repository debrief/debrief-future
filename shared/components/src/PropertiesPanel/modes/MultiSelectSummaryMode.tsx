/**
 * MultiSelectSummaryMode — shell for the multi-feature read-only summary
 * (Spec 192, Phase 2, T022).
 *
 * THIS IS A SHELL ONLY. The full derivation (shared values vs `(differs)`)
 * lands in Phase 7 (T053/T054).
 *
 * For now: renders "N features selected" + a placeholder body.
 *
 * Article IV.5 (boundary types are derived, not rewritten): props re-use
 * the schema-generated `DebriefFeature` union directly via the
 * `featuresById` ReadonlyMap — no DTO with re-listed fields.
 */

import React from 'react';
import type { DebriefFeature } from '@debrief/schemas';

export interface MultiSelectSummaryModeProps {
  /** Feature ids in the multi-select. */
  featureIds: string[];
  /** Resolved feature map. The shell only reads `.size`; Phase 7 uses it
   *  for the shared-vs-differs derivation. */
  featuresById: ReadonlyMap<string, DebriefFeature>;
}

export function MultiSelectSummaryMode(
  props: MultiSelectSummaryModeProps,
): React.ReactElement {
  const { featureIds } = props;
  // The map is consumed by the shared-vs-differs derivation in Phase 7.
  void props.featuresById;
  const count = featureIds.length;

  return (
    <div
      data-testid="properties-mode-multiselect"
      aria-disabled="true"
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
        {count} feature{count === 1 ? '' : 's'} selected
      </header>
      <div
        data-testid="properties-mode-multiselect-placeholder"
        style={{
          fontSize: 11,
          color: 'var(--vscode-descriptionForeground, #888)',
          fontStyle: 'italic',
        }}
      >
        Multi-select summary coming in Phase 7.
      </div>
    </div>
  );
}

export default MultiSelectSummaryMode;
