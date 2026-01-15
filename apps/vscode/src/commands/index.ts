/**
 * Command Registration - Central registration for all extension commands
 */

import * as vscode from 'vscode';
import type { ConfigService } from '../services/configService';
import type { StacService } from '../services/stacService';
import type { CalcService } from '../services/calcService';
import type { RecentPlotsService } from '../services/recentPlotsService';
import type { StacTreeProvider } from '../providers/stacTreeProvider';
import type { ToolsTreeProvider } from '../providers/toolsTreeProvider';
import type { LayersTreeProvider } from '../providers/layersTreeProvider';
import type { MapPanel } from '../webview/mapPanel';

import { createOpenPlotCommand } from './openPlot';
import { createAddStoreCommand, createRemoveStoreCommand, createUpdateStorePathCommand } from './addStore';
import { createSelectAllCommand, createClearSelectionCommand } from './selectAll';
import { createExecuteToolCommand, createCancelToolExecutionCommand } from './executeTool';
import { createExportPngCommand } from './exportPng';
import { createChangeTrackColorCommand } from './changeTrackColor';

export function registerCommands(
  context: vscode.ExtensionContext,
  configService: ConfigService,
  stacService: StacService,
  calcService: CalcService,
  recentPlotsService: RecentPlotsService,
  stacTreeProvider: StacTreeProvider,
  toolsTreeProvider: ToolsTreeProvider,
  layersTreeProvider: LayersTreeProvider,
  getMapPanel: () => MapPanel | undefined,
  setMapPanel: (panel: MapPanel | undefined) => void
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
        recentPlotsService,
        toolsTreeProvider,
        layersTreeProvider,
        getMapPanel,
        setMapPanel
      )
    )
  );

  disposables.push(
    vscode.commands.registerCommand('debrief.closePlot', () => {
      const panel = getMapPanel();
      if (panel) {
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
      (args: { storeId: string }) => {
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

  // Tool commands
  disposables.push(
    vscode.commands.registerCommand(
      'debrief.executeTool',
      createExecuteToolCommand(calcService, getMapPanel, layersTreeProvider)
    )
  );

  disposables.push(
    vscode.commands.registerCommand(
      'debrief.cancelToolExecution',
      createCancelToolExecutionCommand(calcService)
    )
  );

  // Layer commands
  disposables.push(
    vscode.commands.registerCommand(
      'debrief.toggleLayerVisibility',
      (args: { layerId: string }) => {
        const panel = getMapPanel();
        if (panel && args?.layerId) {
          // Toggle visibility - need to track current state
          const tracks = panel.getTracks();
          const locations = panel.getLocations();
          const results = panel.getResultLayers();

          if (args.layerId.startsWith('track-')) {
            const trackId = args.layerId.replace('track-', '');
            const track = tracks.find((t) => t.id === trackId);
            if (track) {
              track.visible = !track.visible;
              panel.setLayerVisibility(args.layerId, track.visible);
              layersTreeProvider.setTracks(tracks);
            }
          } else if (args.layerId.startsWith('location-')) {
            const locationId = args.layerId.replace('location-', '');
            const location = locations.find((l) => l.id === locationId);
            if (location) {
              location.visible = !location.visible;
              panel.setLayerVisibility(args.layerId, location.visible);
              layersTreeProvider.setLocations(locations);
            }
          } else {
            const layer = results.find((l) => l.id === args.layerId);
            if (layer) {
              layer.visible = !layer.visible;
              panel.setLayerVisibility(args.layerId, layer.visible);
              layersTreeProvider.setResultLayers(results);
            }
          }
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
      (args: { start: string; end: string }) => {
        const panel = getMapPanel();
        if (panel && args?.start && args?.end) {
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
        // TODO: Implement full range reset
      }
    })
  );

  // Export commands
  disposables.push(
    vscode.commands.registerCommand(
      'debrief.exportPng',
      createExportPngCommand(getMapPanel)
    )
  );

  return disposables;
}
