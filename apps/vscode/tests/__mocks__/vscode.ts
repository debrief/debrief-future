// VS Code API mock for testing
import { vi } from 'vitest';

export const window = {
  showInformationMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  showInputBox: vi.fn(),
  showQuickPick: vi.fn(),
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
  createWebviewPanel: vi.fn(),
  createTreeView: vi.fn(),
  registerTreeDataProvider: vi.fn(),
  withProgress: vi.fn(),
};

export const workspace = {
  getConfiguration: vi.fn(() => ({
    get: vi.fn(),
    update: vi.fn(),
  })),
  workspaceFolders: [],
  onDidChangeConfiguration: vi.fn(),
  registerFileSystemProvider: vi.fn(),
};

export const commands = {
  registerCommand: vi.fn(),
  executeCommand: vi.fn(),
};

export const languages = {
  registerDocumentSymbolProvider: vi.fn(),
};

export const Uri = {
  file: vi.fn((path: string) => ({ fsPath: path, scheme: 'file', path })),
  parse: vi.fn((uri: string) => ({ fsPath: uri, scheme: 'file', path: uri })),
  joinPath: vi.fn((base: { fsPath?: string; path?: string }, ...segments: string[]) => {
    const basePath = base.fsPath ?? base.path ?? '';
    const joined = [basePath, ...segments].join('/').replace(/\/+/g, '/');
    return { fsPath: joined, scheme: 'file', path: joined };
  }),
};

export class EventEmitter<T> {
  private listeners: ((e: T) => void)[] = [];

  event = (listener: (e: T) => void) => {
    this.listeners.push(listener);
    return { dispose: () => {} };
  };

  fire = (data: T) => {
    this.listeners.forEach(l => l(data));
  };

  dispose = () => {
    this.listeners = [];
  };
}

/** Minimal VS Code Uri shape for mocking purposes */
interface MockUri {
  fsPath: string;
  scheme: string;
  path: string;
}

/** Minimal VS Code command shape for mocking purposes */
interface MockCommand {
  command: string;
  title: string;
  arguments?: unknown[];
}

/** Minimal VS Code ThemeIcon shape for mocking purposes */
interface MockThemeIcon {
  id: string;
  color?: unknown;
}

export class TreeItem {
  label?: string;
  description?: string;
  tooltip?: string;
  contextValue?: string;
  collapsibleState?: number;
  iconPath?: MockThemeIcon | MockUri | string;
  command?: MockCommand;
  resourceUri?: MockUri;

  constructor(labelOrUri: string | MockUri, collapsibleState?: number) {
    if (typeof labelOrUri === 'string') {
      this.label = labelOrUri;
    } else {
      this.resourceUri = labelOrUri;
    }
    this.collapsibleState = collapsibleState;
  }
}

export const TreeItemCollapsibleState = {
  None: 0,
  Collapsed: 1,
  Expanded: 2,
};

export class ThemeIcon {
  id: string;
  color?: unknown;

  constructor(id: string, color?: unknown) {
    this.id = id;
    this.color = color;
  }
}

export class ThemeColor {
  id: string;

  constructor(id: string) {
    this.id = id;
  }
}

export const ViewColumn = {
  One: 1,
  Two: 2,
  Three: 3,
};

export const ProgressLocation = {
  Notification: 15,
  Window: 10,
};

export const FileType = {
  Unknown: 0,
  File: 1,
  Directory: 2,
  SymbolicLink: 64,
};

export const Disposable = vi.fn();

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3,
};

// ─── Language Model Tools API (#284 Copilot spike) ──────────────────────────
// Minimal runtime stand-ins so the copilot tools and their unit tests run
// under vitest. Only additive — existing tests are untouched.

export class MarkdownString {
  value: string;
  constructor(value = '') {
    this.value = value;
  }
  appendMarkdown(value: string): this {
    this.value += value;
    return this;
  }
}

export class LanguageModelTextPart {
  constructor(public value: string) {}
}

export class LanguageModelToolResult {
  constructor(public content: unknown[]) {}
}

export const lm = {
  registerTool: vi.fn(() => ({ dispose: (): void => {} })),
  invokeTool: vi.fn(),
};

export class CancellationTokenSource {
  token = {
    isCancellationRequested: false,
    onCancellationRequested: (): { dispose: () => void } => ({
      dispose: (): void => {},
    }),
  };
  cancel(): void {
    this.token.isCancellationRequested = true;
  }
  dispose(): void {}
}
