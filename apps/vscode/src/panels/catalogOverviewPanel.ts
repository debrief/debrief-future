/**
 * Catalog Overview Panel — WebviewPanel for displaying STAC catalog overview
 * with map (bounding boxes) and timeline (temporal ranges).
 *
 * Feature: 042-stac-catalog-overview-panel
 */

import * as vscode from 'vscode';
import type { StacItemSummary, Catalog } from '../types/stac';

/** Message sent from extension to webview */
interface LoadCatalogOverviewMessage {
  type: 'loadCatalogOverview';
  catalog: {
    id: string;
    title: string;
    storePath: string;
    items: Array<{
      id: string;
      title: string;
      itemPath: string;
      bbox: [number, number, number, number] | null;
      datetime: string | null;
      startDatetime: string | null;
      endDatetime: string | null;
    }>;
  };
}

type ExtensionToOverviewMessage = LoadCatalogOverviewMessage;

/** Message sent from webview to extension */
interface OverviewItemSelectedMessage {
  type: 'overviewItemSelected';
  itemPath: string;
  storePath: string;
}

interface OverviewWebviewReadyMessage {
  type: 'overviewWebviewReady';
}

type OverviewToExtensionMessage = OverviewItemSelectedMessage | OverviewWebviewReadyMessage;

export class CatalogOverviewPanel {
  public static readonly viewType = 'debrief.catalogOverview';

  private static panels: Map<string, CatalogOverviewPanel> = new Map();

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly context: vscode.ExtensionContext;
  private disposables: vscode.Disposable[] = [];
  private isWebviewReady = false;
  private pendingMessages: ExtensionToOverviewMessage[] = [];
  private catalogId = '';
  private storeId = '';

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext,
  ) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.context = context;

    this.panel.webview.html = this.getHtmlForWebview();

    this.panel.webview.onDidReceiveMessage(
      (message: OverviewToExtensionMessage) => {
        this.handleWebviewMessage(message);
      },
      null,
      this.disposables,
    );

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  /**
   * Create or show an overview panel for a specific catalog.
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    context: vscode.ExtensionContext,
    catalogId: string,
    catalogTitle: string,
  ): CatalogOverviewPanel {
    const key = catalogId;

    // Reuse existing panel if open
    const existing = CatalogOverviewPanel.panels.get(key);
    if (existing) {
      existing.panel.reveal();
      return existing;
    }

    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : vscode.ViewColumn.One;

    const panel = vscode.window.createWebviewPanel(
      CatalogOverviewPanel.viewType,
      `Overview: ${catalogTitle}`,
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist'),
          vscode.Uri.joinPath(extensionUri, 'node_modules'),
        ],
      },
    );

    const instance = new CatalogOverviewPanel(panel, extensionUri, context);
    instance.catalogId = catalogId;
    CatalogOverviewPanel.panels.set(key, instance);
    return instance;
  }

  /**
   * Load catalog data into the panel.
   */
  public loadCatalog(
    catalog: Catalog,
    storePath: string,
    items: StacItemSummary[],
    storeId?: string,
  ): void {
    this.catalogId = catalog.id;
    if (storeId) {
      this.storeId = storeId;
    }

    const overviewItems = items.map((item) => ({
      id: item.id,
      title: item.title,
      itemPath: item.itemPath,
      bbox: item.bbox ?? null,
      datetime: item.datetime ?? null,
      startDatetime: item.startDatetime ?? null,
      endDatetime: item.endDatetime ?? null,
    }));

    this.postMessage({
      type: 'loadCatalogOverview',
      catalog: {
        id: catalog.id,
        title: catalog.title,
        storePath,
        items: overviewItems,
      },
    });
  }

  private postMessage(message: ExtensionToOverviewMessage): void {
    if (this.isWebviewReady) {
      void this.panel.webview.postMessage(message);
    } else {
      this.pendingMessages.push(message);
    }
  }

  private handleWebviewMessage(message: OverviewToExtensionMessage): void {
    switch (message.type) {
      case 'overviewWebviewReady':
        this.isWebviewReady = true;
        // Restore split ratio from memento
        {
          const savedRatio = this.context.workspaceState.get<number>(
            `catalogOverview.splitRatio.${this.catalogId}`
          );
          if (savedRatio !== undefined) {
            void this.panel.webview.postMessage({
              type: 'setSplitRatio',
              ratio: savedRatio,
            });
          }
        }
        // Flush pending messages
        for (const pending of this.pendingMessages) {
          void this.panel.webview.postMessage(pending);
        }
        this.pendingMessages = [];
        break;

      case 'overviewItemSelected':
        // Open the selected item in the existing plot view
        // URI format: stac://store-id/relative-item-path
        void vscode.commands.executeCommand('debrief.openPlot', {
          uri: `stac://${this.storeId}/${message.itemPath}`,
        });
        break;
    }
  }

  public dispose(): void {
    CatalogOverviewPanel.panels.delete(this.catalogId);

    this.panel.dispose();

    while (this.disposables.length) {
      const d = this.disposables.pop();
      d?.dispose();
    }
  }

  /**
   * Save split ratio to workspace memento.
   */
  public saveSplitRatio(ratio: number): void {
    void this.context.workspaceState.update(
      `catalogOverview.splitRatio.${this.catalogId}`,
      ratio,
    );
  }

  private getHtmlForWebview(): string {
    const webview = this.panel.webview;

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'catalogOverview.js'),
    );
    const leafletCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        'node_modules',
        'leaflet',
        'dist',
        'leaflet.css',
      ),
    );

    const cspSource = webview.cspSource;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource}; img-src ${cspSource} data: https:;">
  <title>Catalog Overview</title>
  <link rel="stylesheet" href="${leafletCssUri.toString()}">
  <style>
    html, body, #root {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }
}
