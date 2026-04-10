/**
 * Extension Content Generator
 *
 * Generates HTML content matching the extension's webview templates,
 * with the bundled JS inlined to avoid vscode-resource URL resolution.
 *
 * Used by the Hybrid A+D approach: CDN interceptor loads pre/index.html,
 * MessagePort injector sends this content via the captured port.
 *
 * @see docs/project_notes/webview-e2e-research.md — Hybrid A+D
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const EXTENSION_DIST = join(__dirname, '../../../apps/vscode/dist/webview');

/** Available webview bundle names */
export type WebviewBundle =
  | 'activityPanel'
  | 'mapView'
  | 'catalogOverview'
  | 'logPanel'
  | 'timeController'
  | 'resultsPanel';

/**
 * Generate HTML for a webview bundle with the JS inlined.
 * Includes a mock VS Code API so the extension's React entry point
 * can call acquireVsCodeApi() without errors.
 */
export function generateWebviewHtml(bundle: WebviewBundle): string {
  const scriptPath = join(EXTENSION_DIST, `${bundle}.js`);
  if (!existsSync(scriptPath)) {
    throw new Error(`Webview bundle not found: ${scriptPath}`);
  }

  const extensionJs = readFileSync(scriptPath, 'utf-8');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      --debrief-bg-primary: var(--vscode-sideBar-background, #252526);
      --debrief-bg-secondary: var(--vscode-input-background, #3c3c3c);
      --debrief-bg-tertiary: var(--vscode-list-hoverBackground, #2a2d2e);
      --debrief-text-primary: var(--vscode-foreground, #cccccc);
      --debrief-text-secondary: var(--vscode-descriptionForeground, #999);
      --debrief-border-color: var(--vscode-panel-border, #444);
      --debrief-border-color-focus: var(--vscode-focusBorder, #007fd4);
      --debrief-accent: var(--vscode-focusBorder, #007fd4);
      --debrief-accent-hover: var(--vscode-focusBorder, #007fd4);
    }
    body {
      margin: 0;
      padding: 0;
      background: var(--vscode-sideBar-background, #252526);
      font-family: var(--vscode-font-family, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      color: var(--vscode-foreground, #cccccc);
      overflow: hidden;
    }
    #root { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    // Mock VS Code API for E2E testing.
    // The real API is provided by pre/index.html's service worker,
    // but since we inject content via MessagePort, we provide a mock.
    window.acquireVsCodeApi = function() {
      var _state = null;
      return {
        postMessage: function(msg) {
          // Forward to parent for potential test interception
          window.parent.postMessage({ type: 'vscode-webview-message', data: msg }, '*');
        },
        getState: function() { return _state; },
        setState: function(s) { _state = s; return s; },
      };
    };
  </script>
  <script>${extensionJs}</script>
</body>
</html>`;
}

/** Check if a webview bundle exists on disk */
export function hasWebviewBundle(bundle: WebviewBundle): boolean {
  return existsSync(join(EXTENSION_DIST, `${bundle}.js`));
}
