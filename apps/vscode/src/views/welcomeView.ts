/**
 * Welcome View - Shows welcome screen with recent plots
 */

import * as vscode from 'vscode';
import type { RecentPlotsService } from '../services/recentPlotsService';

export class WelcomeViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'debrief.welcome';

  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _recentPlotsService: RecentPlotsService;

  constructor(
    extensionUri: vscode.Uri,
    recentPlotsService: RecentPlotsService
  ) {
    this._extensionUri = extensionUri;
    this._recentPlotsService = recentPlotsService;
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

    this.updateContent();

    webviewView.webview.onDidReceiveMessage((message: { type: string; uri?: string }) => {
      switch (message.type) {
        case 'openPlot':
          void vscode.commands.executeCommand('debrief.openPlot', {
            uri: message.uri,
          });
          break;
        case 'openPlotPicker':
          void vscode.commands.executeCommand('debrief.openPlot');
          break;
        case 'addStore':
          void vscode.commands.executeCommand('debrief.addStore');
          break;
      }
    });
  }

  /**
   * Update the welcome view content
   */
  public updateContent(): void {
    if (!this._view) {
      return;
    }

    this._view.webview.html = this._getHtmlContent();
  }

  private _getHtmlContent(): string {
    const recentPlots = this._recentPlotsService.getRecentPlots();

    const recentPlotsHtml = recentPlots.length > 0
      ? recentPlots
          .slice(0, 5)
          .map(
            (plot) => `
            <div class="recent-item" onclick="openPlot('${plot.uri}')">
              <span class="icon">$(graph)</span>
              <span class="name">${this.escapeHtml(plot.title)}</span>
              <span class="time">${this._recentPlotsService.getRelativeTime(plot.lastOpened)}</span>
            </div>
          `
          )
          .join('')
      : '<div class="empty-text">No recent plots</div>';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      padding: 16px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
    }
    h2 {
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 12px 0;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
    }
    .actions {
      margin-bottom: 20px;
    }
    .action-button {
      display: block;
      width: 100%;
      padding: 8px 12px;
      margin-bottom: 8px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      cursor: pointer;
      text-align: left;
      font-size: 13px;
    }
    .action-button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .action-button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .action-button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .recent-section {
      margin-top: 20px;
    }
    .recent-item {
      display: flex;
      align-items: center;
      padding: 6px 8px;
      margin: 4px 0;
      cursor: pointer;
      border-radius: 4px;
    }
    .recent-item:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .recent-item .icon {
      margin-right: 8px;
      opacity: 0.7;
    }
    .recent-item .name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .recent-item .time {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }
    .empty-text {
      color: var(--vscode-descriptionForeground);
      font-style: italic;
      padding: 8px;
    }
  </style>
</head>
<body>
  <div class="actions">
    <button class="action-button" onclick="openPlotPicker()">
      Open Plot...
    </button>
    <button class="action-button secondary" onclick="addStore()">
      Add STAC Store
    </button>
  </div>

  <div class="recent-section">
    <h2>Recent Plots</h2>
    ${recentPlotsHtml}
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function openPlot(uri) {
      vscode.postMessage({ type: 'openPlot', uri });
    }

    function openPlotPicker() {
      vscode.postMessage({ type: 'openPlotPicker' });
    }

    function addStore() {
      vscode.postMessage({ type: 'addStore' });
    }
  </script>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    const div = { innerHTML: '' };
    div.innerHTML = text;
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
