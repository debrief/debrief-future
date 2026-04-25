/**
 * NL Search commands (#191 T061-T062).
 *
 * `debrief.nlSearch.setApiKey` and `debrief.nlSearch.clearApiKey` give the
 * analyst the only two user-facing paths for provisioning / rotating the
 * Anthropic API key. The key lives exclusively in `context.secrets`; the
 * webview never sees it.
 *
 * Both commands fire the proxy's key-cache invalidation path via the
 * SecretStorage `onDidChange` event — the proxy's own subscription does the
 * work, so these commands are pure I/O.
 */

import * as vscode from 'vscode';

const SECRET_KEY = 'debrief.nlSearch.anthropicApiKey';

/**
 * Prompt the analyst for an Anthropic API key and store it in SecretStorage.
 *
 * The input box is password-masked so the value never appears on screen; the
 * key is trimmed of whitespace before storage. Cancelling the input (Esc)
 * is a silent no-op. If a key already exists, the stored value is
 * overwritten — callers intending to clear should use `clearApiKey` for
 * clarity.
 */
export function createSetApiKeyCommand(
  context: vscode.ExtensionContext,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'debrief.nlSearch.setApiKey',
    async () => {
      const input = await vscode.window.showInputBox({
        title: 'NL Search — Set Anthropic API Key',
        prompt:
          'Paste your Anthropic API key. Stored in VS Code SecretStorage only; never written to workspace files or logs.',
        password: true,
        ignoreFocusOut: true,
        placeHolder: 'sk-ant-…',
        validateInput: (value) => {
          const v = value.trim();
          if (v.length === 0) {
            return 'API key cannot be empty';
          }
          if (v.length < 8) {
            return 'API key looks too short';
          }
          return null;
        },
      });
      if (input === undefined) {
        // User cancelled.
        return;
      }
      await context.secrets.store(SECRET_KEY, input.trim());
      void vscode.window.showInformationMessage(
        'NL Search: Anthropic API key saved. Enable `debrief.nlSearch.enabled` to use it.',
      );
    },
  );
}

/**
 * Delete the stored Anthropic API key. The webview's `nlConfig` snapshot
 * updates via the proxy's `secrets.onDidChange` subscription — no extra
 * plumbing needed.
 */
export function createClearApiKeyCommand(
  context: vscode.ExtensionContext,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    'debrief.nlSearch.clearApiKey',
    async () => {
      const existing = await context.secrets.get(SECRET_KEY);
      if (existing === undefined) {
        void vscode.window.showInformationMessage(
          'NL Search: no Anthropic API key was stored.',
        );
        return;
      }
      const confirm = await vscode.window.showWarningMessage(
        'Clear the Anthropic API key used by NL Search?',
        { modal: true },
        'Clear',
      );
      if (confirm !== 'Clear') {
        return;
      }
      await context.secrets.delete(SECRET_KEY);
      void vscode.window.showInformationMessage(
        'NL Search: Anthropic API key cleared.',
      );
    },
  );
}

/** Register both commands in one call; returns the push-subscriptions array. */
export function registerNlSearchCommands(
  context: vscode.ExtensionContext,
): readonly vscode.Disposable[] {
  return [
    createSetApiKeyCommand(context),
    createClearApiKeyCommand(context),
  ];
}
