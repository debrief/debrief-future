/**
 * Current-plot and selection resolution for the Copilot LM tools (#284, R6).
 *
 * Resolves "the current plot" as: an explicit `plotId` override when supplied
 * and matching the active plot, else the active `MapPanel`. Open plots and
 * their ids come from `openPlotsService` so a summary/list tool can surface
 * them and Copilot can pass an override (FR-009). Selection is read
 * synchronously from the tool-match adapter (FR-010).
 *
 * VS Code's Debrief editor keeps a single live `MapPanel` (the focused plot),
 * so an explicit `plotId` that names a *different* open plot cannot be operated
 * on without focusing it first — that case resolves to `unfocusedPlot`, which
 * the tools relay rather than guessing.
 */

import type { DebriefFeature } from '@debrief/schemas';
import type { Plot } from '../types/plot';
import type { StacStore } from '../types/stac';
import type {
  CopilotToolDeps,
  PlotPanelLike,
  PlotKeyLike,
} from './deps';
import type { OpenPlotView } from './types';

/** Build the `stac://<storeId>/<itemPath>` id that `debrief.openPlot` accepts. */
export function buildPlotId(store: StacStore, plot: Plot): string {
  return `stac://${store.id}/${plot.itemPath}`;
}

/** The active plot resolved to everything a tool needs. */
export interface ResolvedPlot {
  kind: 'resolved';
  panel: PlotPanelLike;
  plotId: string;
  title: string;
  store: StacStore;
  plot: Plot;
  plotKey: PlotKeyLike;
}

/** Discriminated resolution outcomes. */
export type PlotResolution =
  | ResolvedPlot
  | { kind: 'noPlotOpen'; openPlots: OpenPlotView[] }
  | { kind: 'unknownPlotId'; requestedPlotId: string; openPlots: OpenPlotView[] }
  | {
      kind: 'unfocusedPlot';
      requestedPlotId: string;
      activePlotId: string;
      openPlots: OpenPlotView[];
    };

/** List all open plots, flagging which one is currently focused (FR-009). */
export function listOpenPlots(deps: CopilotToolDeps): OpenPlotView[] {
  const activeId = activePlotId(deps);
  return deps.openPlotsService.getOpenPlots().map((p) => ({
    plotId: p.uri,
    title: p.title,
    active: p.uri === activeId,
  }));
}

/** The `stac://` id of the focused plot, or null when none is open. */
export function activePlotId(deps: CopilotToolDeps): string | null {
  const panel = deps.getMapPanel();
  if (!panel) {
    return null;
  }
  const store = panel.getCurrentStore();
  const plot = panel.getCurrentPlot();
  if (!store || !plot) {
    return null;
  }
  return buildPlotId(store, plot);
}

/**
 * Resolve the target plot for a tool call.
 *
 * @param deps    - injected service seams.
 * @param plotId  - optional explicit override (a `stac://` id).
 */
export function resolvePlotContext(
  deps: CopilotToolDeps,
  plotId?: string,
): PlotResolution {
  const openPlots = listOpenPlots(deps);
  const panel = deps.getMapPanel();
  const store = panel?.getCurrentStore() ?? null;
  const plot = panel?.getCurrentPlot() ?? null;

  if (!panel || !store || !plot) {
    return { kind: 'noPlotOpen', openPlots };
  }

  const activeId = buildPlotId(store, plot);

  if (plotId !== undefined && plotId !== activeId) {
    // The override names a plot that is not the focused one.
    const known = openPlots.some((p) => p.plotId === plotId);
    if (known) {
      return {
        kind: 'unfocusedPlot',
        requestedPlotId: plotId,
        activePlotId: activeId,
        openPlots,
      };
    }
    return { kind: 'unknownPlotId', requestedPlotId: plotId, openPlots };
  }

  return {
    kind: 'resolved',
    panel,
    plotId: activeId,
    title: plot.title,
    store,
    plot,
    plotKey: { storePath: store.path, itemPath: plot.itemPath },
  };
}

/** The current selection: ids plus the resolved selected features. */
export interface SelectionContext {
  ids: string[];
  features: DebriefFeature[];
}

/**
 * Read the current selection from a resolved plot.
 *
 * @param deps  - injected service seams.
 * @param panel - the resolved active panel (source of live features).
 */
export function resolveSelection(
  deps: CopilotToolDeps,
  panel: PlotPanelLike,
): SelectionContext {
  const ids = deps.toolMatchAdapter.getSelectedFeatureIds();
  const idSet = new Set(ids);
  const features = panel
    .getFeatures()
    .filter((f) => idSet.has(String(f.id)));
  return { ids, features };
}
