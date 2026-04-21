/**
 * Storyboard panel view provider (Feature 216).
 *
 * Mirrors `logPanelView.ts` for CSP / nonce / message wiring. Responsibilities:
 *  - Register a webview view at `debrief.storyboardPanel`.
 *  - Compute `SceneRowViewModel`s from the active session's Plot on demand.
 *  - Forward `capture-clicked` to the capture command.
 *  - Expose `refresh()` + `setCaptureInFlight(boolean)` for the capture
 *    handler's progress-reporting callbacks.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import {
  formatDtg,
  getActiveStoryboardDefault,
  isSceneFeature,
  type StoryboardPlot,
  type SceneFeature,
} from '@debrief/components';
type StoryboardPlotFeature = StoryboardPlot['features'][number];
import type { SceneRowViewModel } from '@debrief/components';
import type { SessionStoreApi } from '@debrief/session-state';
import type { SessionManager } from '../services/sessionManager';
import type { MapPanel } from '../webview/mapPanel';
import type {
  StoryboardPanelMessage,
  ExtensionToStoryboardPanelMessage,
} from '../types/storyboardPanelMessages';

const VIEW_TYPE = 'debrief.storyboardPanel';

export class StoryboardPanelViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = VIEW_TYPE;

  private view: vscode.WebviewView | undefined;
  private webviewReady = false;
  private pendingMessages: ExtensionToStoryboardPanelMessage[] = [];
  private sessionChangeDisposable: vscode.Disposable | undefined;
  private getMapPanel: () => MapPanel | undefined = () => undefined;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly sessionManager: SessionManager,
  ) {
    this.sessionChangeDisposable = this.sessionManager.onActiveSessionChange(() => {
      this.refresh();
    });
  }

  public setMapPanelResolver(fn: () => MapPanel | undefined): void {
    this.getMapPanel = fn;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _resolveContext: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;
    this.webviewReady = false;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'dist'),
        vscode.Uri.joinPath(this.extensionUri, 'node_modules'),
      ],
    };
    webviewView.webview.html = this.buildHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((message: StoryboardPanelMessage) => {
      this.handleMessage(message);
    });

    webviewView.onDidDispose(() => {
      this.view = undefined;
      this.webviewReady = false;
    });
  }

  public refresh(): void {
    if (!this.view) {return;}
    const plotFeatures = this.getMapPanel()?.getCurrentFeatures() ?? [];
    const plot: StoryboardPlot = {
      type: 'FeatureCollection',
      // eslint-disable-next-line no-restricted-syntax -- #216: DebriefFeature ↔ StoryboardPlotFeature boundary — both are GeoJSON Features (see ADR-019).
      features: plotFeatures as unknown as StoryboardPlotFeature[],
    };
    const activeStoryboard = getActiveStoryboardDefault(plot);
    const activeId = activeStoryboard?.properties.id ?? null;
    const activeName = activeStoryboard?.properties.name ?? null;
    const scenes: SceneRowViewModel[] = this.computeSceneRowViewModels(
      plot,
      activeId,
      this.view.webview,
    );
    this.post({
      type: 'scenes',
      scenes,
      activeStoryboardName: activeName,
      activeStoryboardId: activeId,
    });
  }

  public setCaptureInFlight(inFlight: boolean): void {
    this.post({ type: 'captureInFlight', inFlight });
  }

  private computeSceneRowViewModels(
    plot: StoryboardPlot,
    activeStoryboardId: string | null,
    webview: vscode.Webview,
  ): SceneRowViewModel[] {
    if (activeStoryboardId === null) {return [];}
    const stacItemPath = this.getStacItemDirectory();
    const scenes: SceneFeature[] = [];
    for (const f of plot.features) {
      if (isSceneFeature(f) && f.properties.storyboard_id === activeStoryboardId) {
        scenes.push(f);
      }
    }
    scenes.sort((a, b) =>
      a.properties.timestamp < b.properties.timestamp ? -1 : a.properties.timestamp > b.properties.timestamp ? 1 : 0,
    );
    return scenes.map((scene) => {
      const thumbnailHref = this.resolveThumbnailHref(
        webview,
        stacItemPath,
        scene.properties.id,
      );
      return {
        sceneId: scene.properties.id,
        title: scene.properties.title,
        timestampIso: scene.properties.timestamp,
        dtgLabel: formatDtg(scene.properties.timestamp),
        thumbnailHref,
        state: { kind: 'ok' as const },
      };
    });
  }

  private resolveThumbnailHref(
    webview: vscode.Webview,
    stacItemPath: string | null,
    sceneId: string,
  ): string {
    if (stacItemPath === null) {return '';}
    const largePath = path.join(
      stacItemPath,
      'scene-thumbnails',
      `scene-${sceneId}.png`,
    );
    return webview.asWebviewUri(vscode.Uri.file(largePath)).toString();
  }

  private getStacItemDirectory(): string | null {
    const panel = this.getMapPanel();
    const plot = panel?.getCurrentPlot();
    const store = panel?.getCurrentStore?.();
    if (!plot || !store?.path || !plot.itemPath) {return null;}
    const full = path.join(store.path, plot.itemPath);
    return path.dirname(full);
  }

  private handleMessage(message: StoryboardPanelMessage): void {
    switch (message.type) {
      case 'ready':
        this.webviewReady = true;
        this.flushPending();
        this.refresh();
        break;
      case 'capture-clicked':
        void vscode.commands.executeCommand('debrief.captureScene');
        break;
      case 'scene-row-clicked':
        // #216 logs only. #217 will replace with flyTo behaviour.
        void this.getSession(); // no-op read, keeps the dep graph honest
        break;
      case 'log':
        if (message.level === 'error') {
          console.error(`[StoryboardPanel webview] ${message.message}`);
        } else if (message.level === 'warn') {
          console.warn(`[StoryboardPanel webview] ${message.message}`);
        }
        // debug-level logs are intentionally dropped in production builds.
        break;
    }
  }

  private getSession(): SessionStoreApi | null {
    return this.sessionManager.getActiveSession();
  }

  private post(message: ExtensionToStoryboardPanelMessage): void {
    if (this.view && this.webviewReady) {
      void this.view.webview.postMessage(message);
    } else {
      this.pendingMessages.push(message);
    }
  }

  private flushPending(): void {
    if (!this.view) {return;}
    for (const msg of this.pendingMessages) {
      void this.view.webview.postMessage(msg);
    }
    this.pendingMessages = [];
  }

  private buildHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'storyboardPanel.js'),
    );
    const cspSource = webview.cspSource;
    const nonce = createNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${cspSource} data:; img-src ${cspSource} data: vscode-resource:;">
  <title>Storyboard</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: var(--vscode-sideBar-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      overflow: hidden;
    }
    #root { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }

  public dispose(): void {
    this.sessionChangeDisposable?.dispose();
    this.sessionChangeDisposable = undefined;
    this.view = undefined;
  }
}

function createNonce(): string {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
