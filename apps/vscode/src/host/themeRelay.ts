/**
 * Extension-host theme relay.
 *
 * Listens to `vscode.window.onDidChangeActiveColorTheme` and forwards the
 * event to every active webview as a typed `vscode-theme-changed` message.
 * The webviews themselves consume the message via the `vsCodeBodyClassSource`
 * adapter, which re-reads the body class as the source of truth.
 *
 * Why both signals?
 *   - The body class mutation is the primary signal. VS Code applies it
 *     directly to every webview's `<body>` so a `MutationObserver` already
 *     sees the change — no relay would technically be required.
 *   - The postMessage relay is a redundant signal so that future VS Code
 *     versions (or themes that fail to mutate the body class for any
 *     reason) still drive the React subtree. See ADR for rationale.
 *
 * Per `contracts/theme-source.md` §2:
 *   - Registers ONE disposable on `context.subscriptions`.
 *   - Posts to every panel returned by `getActivePanels()` on every event.
 *   - Per-panel `postMessage` failures are caught at debug level (a
 *     disposed panel between get-and-post is normal).
 *   - `getActivePanels()` throws → caught at warn level; relay continues.
 *
 * Feature: 220-fix-theme-responsiveness
 */

import * as vscode from 'vscode';

/**
 * Object that exposes a `webview` with `postMessage`. We accept both
 * `vscode.WebviewPanel` (created via `createWebviewPanel`) and
 * `vscode.WebviewView` (registered via `registerWebviewViewProvider`)
 * via this structural type.
 */
export interface PostableWebview {
  readonly webview: {
    postMessage(message: unknown): Thenable<boolean>;
  };
}

export interface VsCodeThemeChangedMessage {
  readonly type: 'vscode-theme-changed';
  /** VS Code's enum value, forwarded verbatim. */
  readonly kind: vscode.ColorThemeKind;
}

/**
 * Wire `onDidChangeActiveColorTheme` to every active panel/view returned
 * by `getActivePanels`. Pushes the disposable onto `context.subscriptions`
 * so VS Code disposes the listener when the extension deactivates.
 *
 * @param context        the extension activation context
 * @param getActivePanels accessor returning the current set of panels/views
 */
export function startThemeRelay(
  context: vscode.ExtensionContext,
  getActivePanels: () => readonly PostableWebview[]
): void {
  const disposable = vscode.window.onDidChangeActiveColorTheme((theme) => {
    let panels: readonly PostableWebview[];
    try {
      panels = getActivePanels();
    } catch (err) {
      console.warn('[themeRelay] getActivePanels() threw — skipping event', err);
      return;
    }

    const message: VsCodeThemeChangedMessage = {
      type: 'vscode-theme-changed',
      kind: theme.kind,
    };

    for (const panel of panels) {
      try {
        // `postMessage` returns a Thenable; swallow rejections so a single
        // disposed-panel error doesn't break sibling panels.
        Promise.resolve(panel.webview.postMessage(message)).catch((err) => {
          console.debug('[themeRelay] postMessage rejected', err);
        });
      } catch (err) {
        console.debug('[themeRelay] postMessage threw', err);
      }
    }
  });

  context.subscriptions.push(disposable);
}
