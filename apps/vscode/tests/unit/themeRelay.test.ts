/**
 * T031 — Tests for the extension-host theme relay.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

interface ListenerCb {
  (theme: { kind: number }): void;
}

const onDidChangeActiveColorThemeListeners: ListenerCb[] = [];
const fireThemeChange = (kind: number) => {
  for (const cb of [...onDidChangeActiveColorThemeListeners]) {
    cb({ kind });
  }
};

vi.mock('vscode', () => ({
  ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3, HighContrastLight: 4 },
  window: {
    onDidChangeActiveColorTheme(cb: ListenerCb) {
      onDidChangeActiveColorTheme.calls.push(cb);
      onDidChangeActiveColorThemeListeners.push(cb);
      return {
        dispose() {
          const idx = onDidChangeActiveColorThemeListeners.indexOf(cb);
          if (idx >= 0) onDidChangeActiveColorThemeListeners.splice(idx, 1);
        },
      };
    },
  },
}));

const onDidChangeActiveColorTheme = { calls: [] as ListenerCb[] };

import { startThemeRelay } from '../../src/host/themeRelay';

function makeContext() {
  return { subscriptions: [] as Array<{ dispose(): void }> };
}

function makePanel() {
  return {
    webview: {
      postMessage: vi.fn().mockResolvedValue(true),
    },
  };
}

describe('startThemeRelay', () => {
  beforeEach(() => {
    onDidChangeActiveColorThemeListeners.length = 0;
    onDidChangeActiveColorTheme.calls.length = 0;
  });

  it('registers exactly one disposable on context.subscriptions', () => {
    const ctx = makeContext();
    startThemeRelay(ctx as never, () => []);
    expect(ctx.subscriptions).toHaveLength(1);
  });

  it('posts vscode-theme-changed to every active panel on theme change', () => {
    const ctx = makeContext();
    const a = makePanel();
    const b = makePanel();
    startThemeRelay(ctx as never, () => [a, b]);

    fireThemeChange(2);

    expect(a.webview.postMessage).toHaveBeenCalledWith({
      type: 'vscode-theme-changed',
      kind: 2,
    });
    expect(b.webview.postMessage).toHaveBeenCalledWith({
      type: 'vscode-theme-changed',
      kind: 2,
    });
  });

  it('per-panel postMessage failures do not break sibling panels', () => {
    const ctx = makeContext();
    const failing = {
      webview: { postMessage: vi.fn().mockRejectedValue(new Error('boom')) },
    };
    const ok = makePanel();
    startThemeRelay(ctx as never, () => [failing, ok]);

    expect(() => fireThemeChange(1)).not.toThrow();
    expect(failing.webview.postMessage).toHaveBeenCalled();
    expect(ok.webview.postMessage).toHaveBeenCalled();
  });

  it('getActivePanels() throwing is caught and logged at warn level', () => {
    const ctx = makeContext();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    startThemeRelay(ctx as never, () => {
      throw new Error('registry blew up');
    });

    expect(() => fireThemeChange(2)).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('subsequent theme changes still reach panels after a transient registry failure', () => {
    const ctx = makeContext();
    let throwOnce = true;
    const panel = makePanel();
    startThemeRelay(ctx as never, () => {
      if (throwOnce) {
        throwOnce = false;
        throw new Error('registry transiently failed');
      }
      return [panel];
    });

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fireThemeChange(1);
    fireThemeChange(2);

    expect(panel.webview.postMessage).toHaveBeenCalledTimes(1);
    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      type: 'vscode-theme-changed',
      kind: 2,
    });
    warn.mockRestore();
  });

  it('passes ColorThemeKind verbatim (no mapping done by the relay)', () => {
    const ctx = makeContext();
    const panel = makePanel();
    startThemeRelay(ctx as never, () => [panel]);

    fireThemeChange(3);
    fireThemeChange(4);

    expect(panel.webview.postMessage).toHaveBeenNthCalledWith(1, {
      type: 'vscode-theme-changed',
      kind: 3,
    });
    expect(panel.webview.postMessage).toHaveBeenNthCalledWith(2, {
      type: 'vscode-theme-changed',
      kind: 4,
    });
  });
});
