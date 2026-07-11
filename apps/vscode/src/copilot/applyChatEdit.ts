/**
 * Dirty-only edit applier for chat-driven mutations (#284, R5 / FR-011).
 *
 * The Tools-panel command applies a mutation via `panel.updatePlotFeatures`
 * **and immediately writes it to disk** (`stacService.writeGeoJson`). The chat
 * path deliberately diverges: it reuses `createResultLayer` +
 * `updatePlotFeatures` to land the edit in live in-memory state and marks the
 * session dirty, but **omits the disk write** — the edit is persisted only by
 * the analyst's normal Save (FR-011: "chat-driven edits MUST NOT write
 * STAC/GeoJSON files directly").
 */

import type { ToolExecutionResult } from '../types/tool';
import type {
  CalcServiceLike,
  PlotPanelLike,
  SessionManagerLike,
} from './deps';
import type { ChatEditOutcome } from './types';

/** Dependencies for {@link applyChatEdit}. */
export interface ApplyChatEditDeps {
  calcService: CalcServiceLike;
  sessionManager: SessionManagerLike;
}

/**
 * Apply a mutating tool result to the open editor as a dirty, undoable edit.
 *
 * @param deps            - calc (layer construction) + session (dirty flag).
 * @param panel           - the resolved active plot panel.
 * @param toolId          - the tool that produced the result.
 * @param result          - the successful mutation result.
 * @param sourceFeatureIds - the operating feature set (for provenance).
 * @returns the applied outcome, or `applied: false` when no layer was built.
 */
export function applyChatEdit(
  deps: ApplyChatEditDeps,
  panel: PlotPanelLike,
  toolId: string,
  result: ToolExecutionResult,
  sourceFeatureIds: string[],
): ChatEditOutcome {
  const execution = deps.calcService.getCurrentExecution();
  const layer = deps.calcService.createResultLayer(
    toolId,
    execution?.id ?? `exec-${Date.now()}`,
    result,
    sourceFeatureIds,
  );

  if (!layer) {
    return {
      applied: false,
      resultType: result.resultType ?? '',
      modifiedFeatureIds: [],
      dirty: true,
    };
  }

  // Live in-memory update + webview refresh — NO disk write (the FR-011
  // divergence from the Tools-panel path).
  panel.updatePlotFeatures(layer);

  // Mark the session dirty so the normal Save flow persists the edit.
  deps.sessionManager.getActiveSession()?.getState().markDirty();

  const modifiedFeatureIds =
    result.modifiedFeatures?.map((m) => m.feature_id) ??
    layer.features.features.map((f) => String(f.id));

  return {
    applied: true,
    resultType: result.resultType ?? '',
    modifiedFeatureIds,
    dirty: true,
  };
}
