/**
 * Structural dependency seams for the Copilot LM tools (#284).
 *
 * The tools depend on these minimal structural interfaces rather than the
 * concrete service classes. The real singletons (`CalcService`, `StacService`,
 * `MapPanel`, …) are assignable to them at the activation seam
 * (`registerLmTools`), while unit tests supply lightweight stubs. This keeps
 * the spike code decoupled and trivially removable (spike discipline).
 */

import type { DebriefFeature } from '@debrief/schemas';
import type { LogService } from '@debrief/session-state';
import type { Plot } from '../types/plot';
import type { StacStore, StacItemSummary, Catalog } from '../types/stac';
import type {
  Tool,
  ToolExecutionRequest,
  ToolExecutionResult,
  ResultLayer,
} from '../types/tool';
import type { OpenPlotReference } from '../types/openPlots';

/** Plot-key identifying a STAC item for the Results panel / provenance. */
export interface PlotKeyLike {
  storePath: string;
  itemPath: string;
}

/** The `MapPanel` surface the copilot tools touch (read + dirty-only apply). */
export interface PlotPanelLike {
  getFeatures(): DebriefFeature[];
  getCurrentPlot(): Plot | null;
  getCurrentStore(): StacStore | null;
  getLogService(): LogService | null;
  updatePlotFeatures(layer: ResultLayer): void;
}

/** The `CalcService` surface: registry + execution + layer construction. */
export interface CalcServiceLike {
  listTools(): Promise<Tool[]>;
  getCurrentTools(): Tool[];
  executeTool(request: ToolExecutionRequest): Promise<ToolExecutionResult>;
  createResultLayer(
    toolId: string,
    executionId: string,
    result: ToolExecutionResult,
    sourceFeatureIds: string[],
  ): ResultLayer | null;
  getCurrentExecution(): { id: string } | null;
  cancelExecution(): void;
}

/** The `StacService` surface used for catalog enumeration (search). */
export interface StacCatalogLike {
  listCatalogs(store: StacStore): Promise<Catalog[]>;
  listItems(store: StacStore, catalog: Catalog): Promise<StacItemSummary[]>;
}

/** The `ConfigService` surface used to enumerate stores. */
export interface ConfigStoresLike {
  getStores(): StacStore[];
}

/** The `OpenPlotsService` surface used for override discovery. */
export interface OpenPlotsLike {
  getOpenPlots(): OpenPlotReference[];
}

/** The `ToolMatchAdapter` surface used to read the live selection. */
export interface SelectionLike {
  getSelectedFeatureIds(): string[];
}

/** The `ResultsPanelService` surface for analytical results + errors. */
export interface ResultsPanelLike {
  addDatasetsForToolResult(args: {
    plotKey: PlotKeyLike;
    toolId: string;
    result: { features?: { type: 'FeatureCollection'; features: unknown[] } };
    sourceFeatureIds: string[];
    sourceFeatureNames?: string[];
    parameters?: Record<string, unknown>;
    parentActivityId: string;
  }): void;
  addErrorTab(args: {
    plotKey: PlotKeyLike;
    toolId: string;
    errorMessage: string;
    sourceFeatureIds: string[];
    parameters?: Record<string, unknown>;
  }): void;
}

/** The `SessionManager` surface used to mark the edited session dirty. */
export interface SessionManagerLike {
  getActiveSession(): { getState(): { markDirty(): void } } | null;
}

/** Everything the four LM tools need, injected once at registration. */
export interface CopilotToolDeps {
  calcService: CalcServiceLike;
  stacService: StacCatalogLike;
  configService: ConfigStoresLike;
  resultsPanelService: ResultsPanelLike;
  openPlotsService: OpenPlotsLike;
  toolMatchAdapter: SelectionLike;
  sessionManager: SessionManagerLike;
  getMapPanel: () => PlotPanelLike | undefined;
}
