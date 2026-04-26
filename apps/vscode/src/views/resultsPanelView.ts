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

  /**
   * Public accessor for the active webview (#220 theme relay).
   */
  public get webview(): vscode.Webview | undefined {
    return this._view?.webview;
  }

  private _view?: vscode.WebviewView;
  private _pendingMessages: Array<Record<string, unknown>> = [];
  private _isReady = false;
  private _service?: ResultsPanelService;
  private _outputChannel?: vscode.OutputChannel;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  /**
   * Two-phase wiring: the service and the view provider reference each
   * other, so we inject the service after construction.
   */
  public setService(service: ResultsPanelService): void {
    this._service = service;
  }

  /**
   * Wire the Debrief output channel so lifecycle events (resolve,
   * dispose, message send, flush) get logged to the user-visible
   * output.  Enables field diagnosis of "tool completed but no graph"
   * without requiring the user to run a debugger.
   */
  public setOutputChannel(channel: vscode.OutputChannel): void {
    this._outputChannel = channel;
  }

  private _log(message: string): void {
    const line = `[debrief/results] ${message}`;
    this._outputChannel?.appendLine(line);
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._log(
      `resolveWebviewView called (pending=${this._pendingMessages.length})`,
    );
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
      this._log(`onDidReceiveMessage: ${message.type}`);
      this._handleMessage(message);
    });

    // Safety net: even with retainContextWhenHidden = true, a webview
    // view CAN still be disposed if the user explicitly removes the
    // view container, the extension reloads, or the window is closed
    // while the view was never opened.  Reset local state on dispose
    // so the next `postMessage` call queues instead of sending to a
    // stale reference.
    webviewView.onDidDispose(() => {
      this._log('onDidDispose fired — resetting _view and _isReady');
      this._view = undefined;
      this._isReady = false;
    });
  }

  /**
   * Post a message to the webview.  If the React app has not yet signalled
   * `results:webviewReady` we queue the message and flush on ready.
   *
   * Note: this relies on `onDidDispose` to reset `_view` /
   * `_isReady` when VS Code tears the webview down.  Without that
   * handler, this method would happily call postMessage on a dead
   * webview reference and silently drop the message.
   */
  public postMessage(message: Record<string, unknown>): void {
    const type = (message as { type?: string }).type ?? '(no-type)';
    if (this._isReady && this._view) {
      this._log(`postMessage(${type}) — delivering to webview`);
      void this._view.webview.postMessage(message);
    } else {
      this._log(
        `postMessage(${type}) — queued (isReady=${this._isReady}, hasView=${!!this._view})`,
      );
      this._pendingMessages.push(message);
    }
  }

  /**
   * Focus the Results panel view container so it becomes visible after
   * the first result arrives.
   *
   * Uses VS Code's auto-generated `<viewId>.focus` command
   * (`debrief.resultsPanel.focus`) rather than `this._view.show(true)`.
   * `show()` is a no-op when `this._view` is `undefined`, which is the
   * case until the user has manually opened the panel area at least
   * once — so calling it here would silently fail on first-ever-result.
   *
   * Executing the focus command causes VS Code to:
   *   1. Reveal the panel dock (making it visible),
   *   2. Activate the Debrief Results view container,
   *   3. Fire `resolveWebviewView` on this provider (which sets
   *      `this._view`, loads the HTML, and triggers the webview-ready
   *      handshake),
   *   4. Flush any messages queued in `_pendingMessages` once the
   *      React app posts `results:webviewReady`.
   *
   * This is the path the user expects: "run a tool → see the result
   * appear in the Results panel, even if the panel wasn't open".
   */
  public async reveal(): Promise<void> {
    this._log(
      `reveal() called (hasView=${!!this._view}, isReady=${this._isReady}, pending=${this._pendingMessages.length})`,
    );
    try {
      await vscode.commands.executeCommand('debrief.resultsPanel.focus');
      this._log('reveal() — focus command completed');
    } catch (err) {
      // Non-fatal — the command might not be registered yet during
      // very early activation.  Log and carry on.
      const msg = err instanceof Error ? err.message : String(err);
      this._log(`reveal() — focus command failed: ${msg}`);
      console.warn('[debrief/results] reveal: focus command failed', err);
    }
  }

  private _handleMessage(message: IncomingMessage): void {
    if (!this._service) {
      return;
    }
    switch (message.type) {
      case 'results:webviewReady': {
        this._isReady = true;
        this._log(
          `flushing ${this._pendingMessages.length} pending message(s) to webview`,
        );
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' 'unsafe-eval'; font-src ${cspSource} data:; img-src ${cspSource} data:;">
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
