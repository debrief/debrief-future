/**
 * Open Plot Command - Open a plot from a STAC store
 */

import * as vscode from 'vscode';
import type { ConfigService } from '../services/configService';
import type { StacService } from '../services/stacService';
import type { RecentPlotsService } from '../services/recentPlotsService';
import type { ToolsTreeProvider } from '../providers/toolsTreeProvider';
import type { LayersTreeProvider } from '../providers/layersTreeProvider';
import { MapPanel } from '../webview/mapPanel';
import { parseStacUri, buildStacUri } from '../types/stac';

interface OpenPlotArgs {
  uri?: string;
}

interface PlotQuickPickItem extends vscode.QuickPickItem {
  uri: string;
  storeId: string;
  itemPath: string;
}

export function createOpenPlotCommand(
  context: vscode.ExtensionContext,
  configService: ConfigService,
  stacService: StacService,
  recentPlotsService: RecentPlotsService,
  toolsTreeProvider: ToolsTreeProvider,
  layersTreeProvider: LayersTreeProvider,
  getMapPanel: () => MapPanel | undefined,
  setMapPanel: (panel: MapPanel | undefined) => void
): (args?: OpenPlotArgs) => Promise<void> {
  return async (args?: OpenPlotArgs) => {
    let storeId: string;
    let itemPath: string;

    if (args?.uri) {
      // URI provided directly
      const parsed = parseStacUri(args.uri);
      if (!parsed) {
        void vscode.window.showErrorMessage('Invalid plot URI');
        return;
      }
      storeId = parsed.storeId;
      itemPath = parsed.itemPath;
    } else {
      // Show quick pick
      const selection = await showPlotQuickPick(
        configService,
        stacService,
        recentPlotsService
      );

      if (!selection) {
        return;
      }

      storeId = selection.storeId;
      itemPath = selection.itemPath;
    }

    // Get store
    const store = configService.getStore(storeId);
    if (!store) {
      void vscode.window.showErrorMessage('Store not found');
      return;
    }

    // Load plot
    const plot = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Loading plot...',
        cancellable: false,
      },
      async () => {
        return stacService.loadPlot(store, itemPath);
      }
    );

    if (!plot) {
      void vscode.window.showErrorMessage('Failed to load plot');
      return;
    }

    // Load plot data
    const plotData = await stacService.loadPlotData(store, itemPath);
    if (!plotData) {
      void vscode.window.showErrorMessage('Failed to load plot data');
      return;
    }

    // Create or get map panel
    let panel = getMapPanel();
    if (!panel) {
      panel = MapPanel.createOrShow(context.extensionUri, plot.title);
      setMapPanel(panel);

      // Set up selection change handler
      panel.onSelectionChanged((selection) => {
        toolsTreeProvider.updateSelection(selection);
      });
    }

    // Load plot into panel
    panel.loadPlot(plot, plotData.tracks, plotData.locations);

    // Update layers panel
    layersTreeProvider.setTracks(plotData.tracks);
    layersTreeProvider.setLocations(plotData.locations);
    layersTreeProvider.setResultLayers([]);

    // Add to recent plots
    await recentPlotsService.addRecentPlot(
      plot.id,
      plot.title,
      storeId,
      buildStacUri(storeId, itemPath)
    );
  };
}

async function showPlotQuickPick(
  configService: ConfigService,
  stacService: StacService,
  recentPlotsService: RecentPlotsService
): Promise<PlotQuickPickItem | undefined> {
  const stores = configService.getStores();

  if (stores.length === 0) {
    const action = await vscode.window.showInformationMessage(
      'No STAC stores configured. Add a store to browse plots.',
      'Add Store'
    );

    if (action === 'Add Store') {
      await vscode.commands.executeCommand('debrief.addStore');
    }
    return undefined;
  }

  // Build quick pick items
  const items: PlotQuickPickItem[] = [];

  // Add recent plots first
  const recentPlots = recentPlotsService.getRecentPlots();
  for (const recent of recentPlots) {
    const parsed = parseStacUri(recent.uri);
    if (parsed) {
      items.push({
        label: `$(history) ${recent.title}`,
        description: recentPlotsService.getRelativeTime(recent.lastOpened),
        detail: 'Recent',
        uri: recent.uri,
        storeId: parsed.storeId,
        itemPath: parsed.itemPath,
      });
    }
  }

  // Add separator if we have recent plots
  if (items.length > 0) {
    items.push({
      label: '',
      kind: vscode.QuickPickItemKind.Separator,
      uri: '',
      storeId: '',
      itemPath: '',
    } as PlotQuickPickItem);
  }

  // Add plots from stores
  for (const store of stores) {
    if (store.status !== 'available') {
      continue;
    }

    const catalogs = await stacService.listCatalogs(store);

    for (const catalog of catalogs) {
      const storeItems = await stacService.listItems(store, catalog);

      for (const stacItem of storeItems) {
        const uri = buildStacUri(store.id, stacItem.itemPath);

        // Skip if already in recent
        if (items.some((i) => i.uri === uri)) {
          continue;
        }

        items.push({
          label: `$(graph) ${stacItem.title}`,
          description: new Date(stacItem.datetime).toLocaleDateString(),
          detail: `${store.displayName ?? store.path} / ${catalog.title}`,
          uri,
          storeId: store.id,
          itemPath: stacItem.itemPath,
        });
      }
    }
  }

  if (items.length === 0) {
    void vscode.window.showInformationMessage('No plots found in configured stores');
    return undefined;
  }

  return vscode.window.showQuickPick(items, {
    placeHolder: 'Select a plot to open',
    matchOnDescription: true,
    matchOnDetail: true,
  });
}
