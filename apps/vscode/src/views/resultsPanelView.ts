/**
 * Results Panel View Provider — hosts the `debrief.resultsPanel` webview
 * in the VS Code panel area and routes messages between the webview
 * React app and the ResultsPanelService extension-host singleton.
 *
 * Feature: 178-vscode-tabular-results (R1, R2, R5)
 */

import * as vscode from 'vscode';
import type { ResultsPanelService } from '../services/resultsPanelService';

interface IncomingMessage {
  type: string;
  payload?: Record<string, unknown>;
}

export class ResultsPanelViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'debrief.resultsPanel';

  private _view?: vscode.WebviewView;
  private _pendingMessages: Array<Record<string, unknown>> = [];
  private _isReady = false;
  private _service?: ResultsPanelService;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  /**
   * Two-phase wiring: the service and the view provider reference each
   * other, so we inject the service after construction.
   */
  public setService(service: ResultsPanelService): void {
    this._service = service;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;
    this._isReady = false;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'dist'),
      ],
    };

    webviewView.webview.html = this._getHtmlContent(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((message: IncomingMessage) => {
      this._handleMessage(message);
    });
  }

  /**
   * Post a message to the webview.  If the React app has not yet signalled
   * `results:webviewReady` we queue the message and flush on ready.
   */
  public postMessage(message: Record<string, unknown>): void {
    if (this._isReady && this._view) {
      void this._view.webview.postMessage(message);
    } else {
      this._pendingMessages.push(message);
    }
  }

  /**
   * Focus the Results panel view container so it becomes visible after
   * the first result arrives.
   */
  public reveal(): void {
    if (this._view) {
      try {
        this._view.show(true);
      } catch {
        /* non-fatal — show() throws if the view isn't currently visible */
      }
    }
  }

  private _handleMessage(message: IncomingMessage): void {
    if (!this._service) {
      return;
    }
    switch (message.type) {
      case 'results:webviewReady': {
        this._isReady = true;
        // Flush any queued messages.
        for (const pending of this._pendingMessages) {
          void this._view?.webview.postMessage(pending);
        }
        this._pendingMessages = [];
        break;
      }
      case 'results:save': {
        const tabId = message.payload?.['tabId'];
        if (typeof tabId === 'string') {
          void this._service.handleSave(tabId);
        }
        break;
      }
      case 'results:saveAs': {
        const tabId = message.payload?.['tabId'];
        const baseName = message.payload?.['baseName'];
        const tag = message.payload?.['tag'];
        if (typeof tabId === 'string' && typeof baseName === 'string') {
          void this._service.handleSaveAs(
            tabId,
            baseName,
            typeof tag === 'string' ? tag : undefined,
          );
        }
        break;
      }
      case 'results:retry': {
        const tabId = message.payload?.['tabId'];
        if (typeof tabId === 'string') {
          this._service.handleRetry(tabId);
        }
        break;
      }
      case 'results:closeTab': {
        const tabId = message.payload?.['tabId'];
        if (typeof tabId === 'string') {
          this._service.handleCloseTab(tabId);
        }
        break;
      }
      default:
        break;
    }
  }

  private _getHtmlContent(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'resultsPanel.js'),
    );
    const cspSource = webview.cspSource;
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${cspSource} data:; img-src ${cspSource} data:;">
  <title>Results</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: var(--vscode-panel-background, var(--vscode-editor-background));
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
  <script nonce="${nonce}" src="${scriptUri.toString()}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
