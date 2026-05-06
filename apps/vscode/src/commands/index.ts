/**
 * Command Registration - Central registration for all extension commands
 */

import * as vscode from 'vscode';
import * as path from 'path';
import type { ConfigService } from '../services/configService';
import type { StacService } from '../services/stacService';
import type { CalcService } from '../services/calcService';
import type { RecentPlotsService } from '../services/recentPlotsService';
import type { OpenPlotsService } from '../services/openPlotsService';
import type { IoService } from '../services/ioService';
import type { SessionManager } from '../services/sessionManager';
import type { ToolMatchAdapter } from '../services/toolMatchAdapter';
import type { SessionStoreApi, SessionStoreWithUndo, ResultIdRegistry } from '@debrief/session-state';
import type { StacTreeProvider } from '../providers/stacTreeProvider';
import type { ToolsTreeProvider } from '../providers/toolsTreeProvider';
import type { LayersTreeProvider } from '../providers/layersTreeProvider';
import type { TimeRangeViewProvider } from '../views/timeRangeView';
import type { ActivityPanelViewProvider } from '../views/activityPanelView';
import type { LogPanelViewProvider } from '../views/logPanelView';
import type { ResultsPanelService } from '../services/resultsPanelService';
import type { MapPanel } from '../webview/mapPanel';

import { createOpenPlotCommand } from './openPlot';
import { createAddStoreCommand, createRemoveStoreCommand, createUpdateStorePathCommand } from './addStore';
import { createSelectAllCommand, createClearSelectionCommand } from './selectAll';
import {
  createExecuteToolCommand,
  createCancelToolExecutionCommand,
  createShowToolRequirementsCommand,
  createToggleInactiveToolsCommand,
} from './executeTool';
import { createExportPngCommand } from './exportPng';
import { createChangeTrackColorCommand } from './changeTrackColor';
import { createImportRepCommand } from './importRep';
import { createUndoCommand, createRedoCommand } from './undoRedo';
import { createSaveSessionCommand } from './saveSession';
import { createDeleteSelectionCommand } from './deleteSelection';
import { createOpenCatalogOverviewCommand } from './openCatalogOverview';
import { createStacWriterFs } from '../services/stacWriterFs';

export function registerCommands(
  context: vscode.ExtensionContext,
  configService: ConfigService,
  stacService: StacService,
  calcService: CalcService,
  recentPlotsService: RecentPlotsService,
  openPlotsService: OpenPlotsService,
  ioService: IoService,
  sessionManager: SessionManager,
  stacTreeProvider: StacTreeProvider,
  toolsTreeProvider: ToolsTreeProvider,
  layersTreeProvider: LayersTreeProvider,
  timeRangeProvider: TimeRangeViewProvider,
  activityPanelProvider: ActivityPanelViewProvider,
  toolMatchAdapter: ToolMatchAdapter,
  getMapPanel: () => MapPanel | undefined,
  setMapPanel: (panel: MapPanel | undefined) => void,
  resultIdRegistry?: ResultIdRegistry,
  logPanelProvider?: LogPanelViewProvider,
  resultsPanelService?: ResultsPanelService
): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  // Plot commands
  disposables.push(
    vscode.commands.registerCommand(
      'debrief.openPlot',
      createOpenPlotCommand(
        context,
        configService,
        stacService,
        calcService,
        ioService,
        recentPlotsService,
        openPlotsService,
        sessionManager,
        toolsTreeProvider,
        toolMatchAdapter,
        layersTreeProvider,
        timeRangeProvider,
        activityPanelProvider,
        getMapPanel,
        setMapPanel,
        resultIdRegistry,
        logPanelProvider
      )
    )
  );

  disposables.push(
    vscode.commands.registerCommand('debrief.closePlot', () => {
      const panel = getMapPanel();
      if (panel) {
        // Clear open plots state before disposing (Feature: 052)
        void openPlotsService.clearAll();
        panel.dispose();
        setMapPanel(undefined);
      }
    })
  );

  // Store commands
  disposables.push(
    vscode.commands.registerCommand(
      'debrief.addStore',
      createAddStoreCommand(configService, stacService, stacTreeProvider)
    )
  );

  disposables.push(
    vscode.commands.registerCommand(
      'debrief.removeStore',
      createRemoveStoreCommand(configService, stacTreeProvider)
    )
  );

  disposables.push(
    vscode.commands.registerCommand(
      'debrief.refreshStore',
      (_args: { storeId: string }) => {
        stacService.clearCache();
        stacTreeProvider.refresh();
      }
    )
  );

  disposables.push(
    vscode.commands.registerCommand(
      'debrief.updateStorePath',
      createUpdateStorePathCommand(configService, stacService, stacTreeProvider)
    )
  );

  // Selection commands
  disposables.push(
    vscode.commands.registerCommand(
      'debrief.selectAll',
      createSelectAllCommand(getMapPanel)
    )
  );

  disposables.push(
    vscode.commands.registerCommand(
      'debrief.clearSelection',
      createClearSelectionCommand(getMapPanel)
    )
  );

  // View commands
  disposables.push(
    vscode.commands.registerCommand('debrief.fitToAll', () => {
      const panel = getMapPanel();
      if (panel) {
        panel.fitToAllTracks();
      }
    })
  );

  disposables.push(
    vscode.commands.registerCommand('debrief.fitToSelection', () => {
      const panel = getMapPanel();
      if (panel) {
        panel.fitToSelection();
      }
    })
  );

  disposables.push(
    vscode.commands.registerCommand('debrief.zoomIn', () => {
      const panel = getMapPanel();
      if (panel) {
        // Zoom in handled by webview
      }
    })
  );

  disposables.push(
    vscode.commands.registerCommand('debrief.zoomOut', () => {
      const panel = getMapPanel();
      if (panel) {
        // Zoom out handled by webview
      }
    })
  );

  // Tool commands (Feature: 038 - uses toolMatchAdapter for selection)
  disposables.push(
    vscode.commands.registerCommand(
      'debrief.executeTool',
      createExecuteToolCommand(calcService, toolMatchAdapter, getMapPanel, layersTreeProvider, stacService, activityPanelProvider, undefined, resultIdRegistry, logPanelProvider, resultsPanelService)
    )
  );

  disposables.push(
    vscode.commands.registerCommand(
      'debrief.cancelToolExecution',
      createCancelToolExecutionCommand(calcService)
    )
  );

  // Tool helper commands (Feature: 038)
  disposables.push(
    vscode.commands.registerCommand(
      'debrief.showToolRequirements',
      createShowToolRequirementsCommand()
    )
  );

  disposables.push(
    vscode.commands.registerCommand(
      'debrief.toggleInactiveTools',
      createToggleInactiveToolsCommand(toolsTreeProvider)
    )
  );

  // Tool-specific commands for command palette (FR-019, FR-020)
  // These provide direct tool execution with proper enablement
  const toolCommandMap: Record<string, string> = {
    'debrief.tool.rangeBearing': 'range-bearing',
    'debrief.tool.closestApproach': 'closest-approach',
    'debrief.tool.relativeMotion': 'relative-motion',
    'debrief.tool.trackStats': 'track-stats',
    'debrief.tool.distanceToPoint': 'distance-to-point',
  };

  for (const [command, toolId] of Object.entries(toolCommandMap)) {
    disposables.push(
      vscode.commands.registerCommand(command, async () => {
        await vscode.commands.executeCommand('debrief.executeTool', toolId);
      })
    );
  }

  // Open result artifact in editor
  disposables.push(
    vscode.commands.registerCommand(
      'debrief.openResultArtifact',
      async (layer: { artifactHref?: string }) => {
        if (!layer?.artifactHref) {
          return;
        }
        const panel = getMapPanel();
        const store = panel?.getCurrentStore?.();
        const plot = panel?.getCurrentPlot?.();
        if (!store?.path || !plot?.itemPath) {
          void vscode.window.showWarningMessage('No plot open');
          return;
        }
        const itemDir = path.dirname(
          path.join(store.path, plot.itemPath)
        );
        const filePath = path.join(itemDir, 'assets', layer.artifactHref);
        try {
          const doc = await vscode.workspace.openTextDocument(filePath);
          await vscode.window.showTextDocument(doc);
        } catch {
          void vscode.window.showErrorMessage(`Could not open artifact: ${layer.artifactHref}`);
        }
      }
    )
  );

  // Layer commands
  disposables.push(
    vscode.commands.registerCommand(
      'debrief.toggleLayerVisibility',
      (args: { layerId: string; feature_id?: string }) => {
        const panel = getMapPanel();
        if (!panel || !args?.layerId) {
          return;
        }

        // Use session state if feature_id is provided
        const featureId = args.feature_id;
        const activeSession: SessionStoreApi | null = sessionManager.getActiveSession();

        if (featureId !== undefined && activeSession !== null) {
          // Toggle via session state - this will trigger subscriptions
          const state: SessionStoreWithUndo = activeSession.getState();
          state.toggleFeatureVisibility(featureId);

          // Also update map panel for immediate visual feedback
          const hiddenIds = state.hiddenFeatureIds;
          const isVisible = !hiddenIds.includes(featureId);
          panel.setLayerVisibility(args.layerId, isVisible);
        } else {
          // Fallback: toggle visibility directly when no session is active
          panel.setLayerVisibility(args.layerId, true);
          layersTreeProvider.setFeatures(panel.getFeatures());
        }
      }
    )
  );

  disposables.push(
    vscode.commands.registerCommand(
      'debrief.removeResultLayer',
      (args: { layerId: string }) => {
        const panel = getMapPanel();
        if (panel && args?.layerId) {
          panel.removeResultLayer(args.layerId);
          layersTreeProvider.removeResultLayer(args.layerId);
        }
      }
    )
  );

  disposables.push(
    vscode.commands.registerCommand('debrief.clearAllResults', () => {
      const panel = getMapPanel();
      if (panel) {
        panel.clearResultLayers();
        layersTreeProvider.setResultLayers([]);
      }
    })
  );

  // Track commands
  disposables.push(
    vscode.commands.registerCommand(
      'debrief.changeTrackColor',
      createChangeTrackColorCommand(stacService, configService, getMapPanel)
    )
  );

  // Time range commands
  disposables.push(
    vscode.commands.registerCommand(
      'debrief.setTimeRange',
      (args: { time?: number; start?: string; end?: string }) => {
        const panel = getMapPanel();
        if (!panel) {
          return;
        }
        // Support both timestamp-based (from TimeController) and ISO string-based calls
        if (args?.time !== undefined) {
          // Convert timestamp to ISO string for map panel
          const isoTime = new Date(args.time).toISOString();
          panel.setTimeRange(isoTime, isoTime);
        } else if (args?.start && args?.end) {
          panel.setTimeRange(args.start, args.end);
        }
      }
    )
  );

  disposables.push(
    vscode.commands.registerCommand('debrief.resetTimeRange', () => {
      const panel = getMapPanel();
      if (panel) {
        // Reset to full range - need plot data
        const plot = panel.getCurrentPlot();
        if (plot) {
          const [timeStart, timeEnd] = plot.timeExtent;
          panel.setTimeRange(timeStart, timeEnd);
          timeRangeProvider.updateTimeExtent(
            new Date(timeStart).getTime(),
            new Date(timeEnd).getTime()
          );
        }
      }
    })
  );

  // Display mode command
  disposables.push(
    vscode.commands.registerCommand(
      'debrief.setDisplayMode',
      (args: { mode: 'full' | 'trail' }) => {
        const panel = getMapPanel();
        if (panel && args?.mode) {
          // Send display mode to map panel
          // The map panel will handle rendering full track or trail mode
          // For now this is a placeholder - full implementation requires map updates
        }
      }
    )
  );

  // Export commands
  disposables.push(
    vscode.commands.registerCommand(
      'debrief.exportPng',
      createExportPngCommand(getMapPanel)
    )
  );

  // Import commands
  disposables.push(
    vscode.commands.registerCommand(
      'debrief.importRep',
      createImportRepCommand(
        configService,
        stacService,
        ioService,
        stacTreeProvider
      )
    )
  );

  // Undo/Redo commands (Feature: 029 - Phase 6)
  disposables.push(
    vscode.commands.registerCommand(
      'debrief.undo',
      createUndoCommand(sessionManager)
    )
  );

  disposables.push(
    vscode.commands.registerCommand(
      'debrief.redo',
      createRedoCommand(sessionManager)
    )
  );

  // Session persistence command (Feature: 029 - Phase 7)
  disposables.push(
    vscode.commands.registerCommand(
      'debrief.saveSession',
      createSaveSessionCommand(
        sessionManager,
        (storeId) => {
          const store = configService.getStore(storeId);
          return store?.path;
        },
        getMapPanel,
        // Spec 242 — saveSession routes thumbnail writes through the
        // host-agnostic StacWriter boundary (Article IV.1 closure).
        (storePath) => createStacWriterFs({ storePath, stacService }),
      )
    )
  );

  // Delete selection command
  disposables.push(
    vscode.commands.registerCommand(
      'debrief.deleteSelection',
      createDeleteSelectionCommand(sessionManager, getMapPanel, layersTreeProvider)
    )
  );

  // Catalog overview command (Feature: 042)
  disposables.push(
    vscode.commands.registerCommand(
      'debrief.openCatalogOverview',
      createOpenCatalogOverviewCommand(context, configService, stacService)
    )
  );

  return disposables;
}
