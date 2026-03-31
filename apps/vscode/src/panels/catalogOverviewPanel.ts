/**
 * Catalog Overview Panel — WebviewPanel for displaying STAC catalog overview
 * with map (bounding boxes) and timeline (temporal ranges).
 *
 * Feature: 042-stac-catalog-overview-panel
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
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
      thumbnailHref: string | null;
      thumbnailSmHref: string | null;
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

/** Message sent from webview when map viewport changes (Feature: 130-map-spatial-filtering) */
interface OverviewViewportChangedMessage {
  type: 'overviewViewportChanged';
  bounds: [number, number, number, number] | null;
}

type OverviewToExtensionMessage = OverviewItemSelectedMessage | OverviewWebviewReadyMessage | OverviewViewportChangedMessage;

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
  private viewportBounds: [number, number, number, number] | null = null;

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
    storePath?: string,
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

    const localResourceRoots = [
      vscode.Uri.joinPath(extensionUri, 'dist'),
      vscode.Uri.joinPath(extensionUri, 'node_modules'),
    ];
    // Allow webview to load thumbnail images from the STAC store directory
    if (storePath) {
      localResourceRoots.push(vscode.Uri.file(storePath));
    }

    const panel = vscode.window.createWebviewPanel(
      CatalogOverviewPanel.viewType,
      `Overview: ${catalogTitle}`,
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots,
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

    const overviewItems = items.map((item) => {
      // Resolve relative thumbnail hrefs to data URIs for reliable display in
      // code-server webviews where asWebviewUri may not serve local files (#174).
      const itemDir = path.dirname(path.join(storePath, item.itemPath));
      const thumbnailHref = readThumbnailAsDataUri(itemDir, item.thumbnailHref);
      const thumbnailSmHref = readThumbnailAsDataUri(itemDir, item.thumbnailSmHref);

      return {
        id: item.id,
        title: item.title,
        itemPath: item.itemPath,
        bbox: item.bbox ?? null,
        datetime: item.datetime ?? null,
        startDatetime: item.startDatetime ?? null,
        endDatetime: item.endDatetime ?? null,
        vesselClasses: item.vesselClasses ?? [],
        tags: item.tags ?? [],
        featureTags: item.featureTags ?? [],
        nationalities: item.nationalities ?? [],
        trackNames: item.trackNames ?? [],
        thumbnailHref,
        thumbnailSmHref,
      };
    });

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

      case 'overviewViewportChanged':
        // Store viewport bounds for cross-view synchronisation (Feature: 130)
        this.viewportBounds = message.bounds;
        break;
    }
  }

  /** Get the current map viewport bounds, or null if not yet initialised. */
  public getViewportBounds(): [number, number, number, number] | null {
    return this.viewportBounds;
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
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${cspSource} data: https:;">
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
  <script nonce="${nonce}" src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }
}

/**
 * Read a thumbnail file relative to an item directory and return a data URI.
 * Returns null if the href is missing or the file cannot be read.
 */
function readThumbnailAsDataUri(itemDir: string, href: string | null): string | null {
  if (!href) {
    return null;
  }
  try {
    const filePath = path.resolve(itemDir, href);
    const data = fs.readFileSync(filePath);
    return `data:image/png;base64,${data.toString('base64')}`;
  } catch {
    return null;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
