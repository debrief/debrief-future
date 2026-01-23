/**
 * Time Range View - Sidebar webview for time range control
 */

import * as vscode from 'vscode';

export class TimeRangeViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'debrief.timeRange';

  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _timeRange: { start: string; end: string; dataStart: string; dataEnd: string } | null = null;

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlContent();

    webviewView.webview.onDidReceiveMessage((message: { type: string; start?: string; end?: string }) => {
      switch (message.type) {
        case 'setTimeRange':
          void vscode.commands.executeCommand('debrief.setTimeRange', {
            start: message.start,
            end: message.end,
          });
          break;
        case 'resetTimeRange':
          void vscode.commands.executeCommand('debrief.resetTimeRange');
          break;
        case 'fitToSelection':
          void vscode.commands.executeCommand('debrief.fitToSelection');
          break;
      }
    });
  }

  /**
   * Update the time range display
   */
  public updateTimeRange(
    start: string,
    end: string,
    dataStart: string,
    dataEnd: string
  ): void {
    this._timeRange = { start, end, dataStart, dataEnd };
    if (this._view) {
      void this._view.webview.postMessage({
        type: 'updateTimeRange',
        ...this._timeRange,
      });
    }
  }

  private _getHtmlContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      padding: 10px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
    }
    .slider-container {
      margin: 10px 0;
    }
    .time-labels {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
    }
    .slider {
      width: 100%;
      height: 20px;
      cursor: pointer;
    }
    .buttons {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }
    button {
      flex: 1;
      padding: 6px 12px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border: none;
      cursor: pointer;
      font-size: 12px;
    }
    button:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .empty-state {
      text-align: center;
      color: var(--vscode-descriptionForeground);
      padding: 20px;
    }
  </style>
</head>
<body>
  <div id="content">
    <div class="empty-state">
      Open a plot to see time controls
    </div>
  </div>
  <script>
    const vscode = acquireVsCodeApi();

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'updateTimeRange') {
        updateUI(message);
      }
    });

    function updateUI(data) {
      const content = document.getElementById('content');
      content.innerHTML = \`
        <div class="slider-container">
          <input type="range" class="slider" id="slider" min="0" max="100" value="0">
          <div class="time-labels">
            <span>\${formatTime(data.dataStart)}</span>
            <span>\${formatTime(data.dataEnd)}</span>
          </div>
        </div>
        <div class="buttons">
          <button onclick="resetRange()">Full Range</button>
          <button onclick="fitSelection()">Fit to Selection</button>
        </div>
      \`;
    }

    function formatTime(iso) {
      if (!iso) return '--:--';
      const date = new Date(iso);
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }

    function resetRange() {
      vscode.postMessage({ type: 'resetTimeRange' });
    }

    function fitSelection() {
      vscode.postMessage({ type: 'fitToSelection' });
    }
  </script>
</body>
</html>`;
  }
}
