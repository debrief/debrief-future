/**
 * ResultsPanel View - Bottom panel for viewing tool result artifacts in tabs
 *
 * Implements WebviewViewProvider pattern matching LogPanelViewProvider.
 * Manages tab state, file watchers, and content preparation.
 * Routes messages between webview and extension.
 *
 * Feature: 095-results-bottom-panel
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import type {
  ResultArtifactType,
  TabContentPayload,
  ResultsWebviewToExtensionMessage,
} from '../webview/messages';
// Locally-defined types matching @debrief/components transformer types.
// Defined here to avoid ESM-from-CJS import issues with @debrief/components.
interface DatasetMetadata {
  xAxis?: { field: string; label?: string };
  yAxis?: { field: string; label?: string };
  [key: string]: unknown;
}
interface DatasetEnvelope {
  type: string;
  title: string;
  metadata: DatasetMetadata;
  data?: Record<string, unknown>[];
  series?: Array<{ name: string; data: Record<string, unknown>[] }>;
}
type TransformResult =
  | { ok: true; spec: Record<string, unknown> }
  | { ok: false; error: { type: string; message: string } };

/** In-memory tab record maintained by the provider. */
interface ResultTabRecord {
  id: string;
  plotItemPath: string;
  plotTitle: string;
  resultFilePath: string;
  absolutePath: string;
  title: string;
  artifactType: ResultArtifactType;
  mimeType: string;
}

export class ResultsPanelViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'debrief.resultsPanel';

  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _isWebviewReady = false;
  private _pendingMessages: Array<Record<string, unknown>> = [];

  // Tab state
  private _tabs = new Map<string, ResultTabRecord>();
  private _activeTabId: string | null = null;
  private _tabOrder: string[] = [];
  private _watchers = new Map<string, vscode.Disposable>();

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
  }

  // ─── Public API ──────────────────────────────────────────────────

  /**
   * Open a result artifact in the panel.
   * If the tab already exists, activates it (de-duplication).
   */
  public openResult(
    plotItemPath: string,
    plotTitle: string,
    resultFilePath: string,
    absolutePath: string
  ): void {
    const tabId = `${plotItemPath}::${resultFilePath}`;

    // De-duplication: activate existing tab
    if (this._tabs.has(tabId)) {
      this._activeTabId = tabId;
      this._postMessage({ type: 'results:activateTab', tabId });
      return;
    }

    // Determine artifact type and prepare content
    const artifactType = this._determineArtifactType(absolutePath);
    const content = this._prepareContent(absolutePath, artifactType);
    const title = this._deriveTitle(absolutePath, artifactType, content);

    // Create tab record
    const tab: ResultTabRecord = {
      id: tabId,
      plotItemPath,
      plotTitle,
      resultFilePath,
      absolutePath,
      title,
      artifactType,
      mimeType: this._getMimeType(absolutePath),
    };

    this._tabs.set(tabId, tab);
    this._tabOrder.push(tabId);
    this._activeTabId = tabId;

    // Determine if we need plot prefixes (tabs from multiple plots)
    const showPlotPrefix = this._hasMultiplePlots();

    // Send to webview
    this._postMessage({
      type: 'results:addTab',
      tab: {
        id: tabId,
        title: tab.title,
        plotTitle: tab.plotTitle,
        artifactType: tab.artifactType,
      },
      content,
      showPlotPrefix,
    });

    // Update plot prefixes if needed
    if (showPlotPrefix) {
      this._postMessage({
        type: 'results:updatePlotPrefixes',
        showPlotPrefix: true,
      });
    }

    // Create file watcher for live updates
    this._createFileWatcher(tabId, absolutePath, artifactType);

    // Reveal the panel
    if (this._view) {
      this._view.show(true);
    }
  }

  /**
   * Reveal the results panel (for the show command).
   */
  public reveal(): void {
    if (this._view) {
      this._view.show(true);
    }
  }

  // ─── WebviewViewProvider ──────────────────────────────────────────

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;
    this._isWebviewReady = false;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'dist'),
        vscode.Uri.joinPath(this._extensionUri, 'node_modules'),
      ],
    };

    webviewView.webview.html = this._getHtmlContent(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(
      (message: ResultsWebviewToExtensionMessage) => {
        switch (message.type) {
          case 'results:webviewReady':
            this._isWebviewReady = true;
            // Flush pending messages
            for (const pending of this._pendingMessages) {
              void webviewView.webview.postMessage(pending);
            }
            this._pendingMessages = [];
            break;

          case 'results:selectTab':
            this._activeTabId = message.tabId;
            break;

          case 'results:closeTab':
            this._handleCloseTab(message.tabId);
            break;

          case 'results:openExternal':
            this._handleOpenExternal(message.tabId);
            break;
        }
      }
    );
  }

  // ─── Tab Management ──────────────────────────────────────────────

  private _handleCloseTab(tabId: string): void {
    // Dispose file watcher
    const watcher = this._watchers.get(tabId);
    if (watcher) {
      watcher.dispose();
      this._watchers.delete(tabId);
    }

    // Remove from state
    this._tabs.delete(tabId);
    const idx = this._tabOrder.indexOf(tabId);
    if (idx >= 0) {
      this._tabOrder.splice(idx, 1);
    }

    // Determine new active tab
    let newActiveTabId: string | null = null;
    if (this._activeTabId === tabId && this._tabOrder.length > 0) {
      // Prefer right neighbor, then left
      const newIdx = Math.min(idx, this._tabOrder.length - 1);
      newActiveTabId = this._tabOrder[newIdx] ?? null;
    } else if (this._activeTabId !== tabId) {
      newActiveTabId = this._activeTabId;
    }
    this._activeTabId = newActiveTabId;

    // Send to webview
    this._postMessage({
      type: 'results:removeTab',
      tabId,
      newActiveTabId,
    });

    // Update plot prefixes
    const showPlotPrefix = this._hasMultiplePlots();
    this._postMessage({
      type: 'results:updatePlotPrefixes',
      showPlotPrefix,
    });
  }

  private _handleOpenExternal(tabId: string): void {
    const tab = this._tabs.get(tabId);
    if (!tab) {
      return;
    }
    const uri = vscode.Uri.file(tab.absolutePath);
    void vscode.commands.executeCommand('vscode.open', uri);
  }

  // ─── Content Preparation ──────────────────────────────────────────

  private _determineArtifactType(filePath: string): ResultArtifactType {
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = this._getMimeType(filePath);

    if (mimeType.startsWith('image/')) {
      return 'image';
    }
    if (ext === '.json') {
      return 'dataset';
    }
    return 'other';
  }

  private _prepareContent(
    filePath: string,
    artifactType: ResultArtifactType
  ): TabContentPayload {
    try {
      switch (artifactType) {
        case 'dataset':
          return this._prepareDatasetContent(filePath);
        case 'image':
          return this._prepareImageContent(filePath);
        case 'other':
          return this._prepareOtherContent(filePath);
      }
    } catch (err) {
      // Fallback to 'other' on error
      return {
        artifactType: 'other',
        filename: path.basename(filePath),
        mimeType: this._getMimeType(filePath),
        sizeBytes: 0,
      };
    }
  }

  private _prepareDatasetContent(filePath: string): TabContentPayload {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw) as DatasetEnvelope;

      // Use require() for @debrief/components since it's ESM and this file is CJS.
      // esbuild bundles this correctly at build time.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { transformDataset } = require('@debrief/components') as {
        transformDataset: (d: DatasetEnvelope) => TransformResult;
      };
      const result = transformDataset(data);
      if (result.ok) {
        return { artifactType: 'dataset', spec: result.spec };
      }
      return { artifactType: 'dataset', spec: null, error: result.error.message };
    } catch (err) {
      return {
        artifactType: 'dataset',
        spec: null,
        error: err instanceof Error ? err.message : 'Failed to read dataset',
      };
    }
  }

  private _prepareImageContent(filePath: string): TabContentPayload {
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    const mimeType = this._getMimeType(filePath);
    return {
      artifactType: 'image',
      dataUri: `data:${mimeType};base64,${base64}`,
    };
  }

  private _prepareOtherContent(filePath: string): TabContentPayload {
    const stats = fs.statSync(filePath);
    return {
      artifactType: 'other',
      filename: path.basename(filePath),
      mimeType: this._getMimeType(filePath),
      sizeBytes: stats.size,
    };
  }

  // ─── Title Derivation ──────────────────────────────────────────

  private _deriveTitle(
    filePath: string,
    artifactType: ResultArtifactType,
    content: TabContentPayload
  ): string {
    if (artifactType === 'dataset' && content.artifactType === 'dataset' && content.spec) {
      // Try to extract title from the Vega-Lite spec
      const spec = content.spec as Record<string, unknown>;
      if (typeof spec.title === 'string' && spec.title) {
        return spec.title;
      }
      // Try nested title object
      if (spec.title !== null && spec.title !== undefined && typeof spec.title === 'object') {
        const titleObj = spec.title as Record<string, unknown>;
        if (typeof titleObj.text === 'string') {
          return titleObj.text;
        }
      }
    }

    // Also try reading the dataset envelope title from the raw JSON
    if (artifactType === 'dataset') {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data: unknown = JSON.parse(raw);
        const envelope = data as Record<string, unknown>;
        if (typeof envelope.title === 'string' && envelope.title !== '') {
          return envelope.title;
        }
      } catch {
        // Fall through to filename
      }
    }

    // Fallback: filename without extension
    return path.basename(filePath, path.extname(filePath));
  }

  // ─── File Watching ──────────────────────────────────────────────

  private _createFileWatcher(
    tabId: string,
    filePath: string,
    artifactType: ResultArtifactType
  ): void {
    const pattern = new vscode.RelativePattern(
      vscode.Uri.file(path.dirname(filePath)),
      path.basename(filePath)
    );
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);

    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const handleChange = (): void => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        const content = this._prepareContent(filePath, artifactType);
        this._postMessage({
          type: 'results:updateContent',
          tabId,
          content,
        });
      }, 200);
    };

    watcher.onDidChange(handleChange);
    watcher.onDidCreate(handleChange);

    this._watchers.set(tabId, watcher);
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private _hasMultiplePlots(): boolean {
    const plots = new Set<string>();
    for (const tab of this._tabs.values()) {
      plots.add(tab.plotItemPath);
    }
    return plots.size > 1;
  }

  private _getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp',
      '.csv': 'text/csv',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.xml': 'application/xml',
      '.pdf': 'application/pdf',
    };
    return mimeMap[ext] ?? 'application/octet-stream';
  }

  private _postMessage(message: Record<string, unknown>): void {
    if (this._isWebviewReady && this._view) {
      void this._view.webview.postMessage(message);
    } else {
      this._pendingMessages.push(message);
    }
  }

  private _getHtmlContent(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'resultsPanel.js')
    );

    const cspSource = webview.cspSource;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource}; font-src ${cspSource} data:; img-src ${cspSource} data:;">
  <title>Results Panel</title>
  <style>
    :root {
      --debrief-bg-primary: var(--vscode-panel-background);
      --debrief-bg-secondary: var(--vscode-input-background);
      --debrief-bg-tertiary: var(--vscode-list-hoverBackground);
      --debrief-text-primary: var(--vscode-foreground);
      --debrief-text-secondary: var(--vscode-descriptionForeground);
      --debrief-border-color: var(--vscode-panel-border);
      --debrief-accent: var(--vscode-focusBorder);
    }
    body {
      margin: 0;
      padding: 0;
      background: var(--vscode-panel-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      overflow: hidden;
    }
    #root {
      width: 100%;
      height: 100vh;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }

  public dispose(): void {
    // Dispose all file watchers
    for (const watcher of this._watchers.values()) {
      watcher.dispose();
    }
    this._watchers.clear();
    this._tabs.clear();
    this._tabOrder = [];
    this._activeTabId = null;
  }
}
