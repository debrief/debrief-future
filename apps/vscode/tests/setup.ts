// Test setup file for vitest
import { vi } from 'vitest';

// EventEmitter class for proper event handling
class MockEventEmitter<T> {
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

// TreeItem class that properly stores properties
class MockTreeItem {
  label?: string;
  description?: string;
  tooltip?: string;
  contextValue?: string;
  collapsibleState?: number;
  iconPath?: unknown;
  command?: unknown;
  resourceUri?: unknown;

  constructor(labelOrUri: string | unknown, collapsibleState?: number) {
    if (typeof labelOrUri === 'string') {
      this.label = labelOrUri;
    } else {
      this.resourceUri = labelOrUri;
    }
    this.collapsibleState = collapsibleState;
  }
}

// ThemeIcon class
class MockThemeIcon {
  id: string;
  color?: unknown;

  constructor(id: string, color?: unknown) {
    this.id = id;
    this.color = color;
  }
}

// ThemeColor class
class MockThemeColor {
  id: string;

  constructor(id: string) {
    this.id = id;
  }
}

// ─── Language Model Tools API (#284 Copilot spike) ──────────────────────────
class MockMarkdownString {
  value: string;
  constructor(value = '') {
    this.value = value;
  }
  appendMarkdown(value: string) {
    this.value += value;
    return this;
  }
}

class MockLanguageModelTextPart {
  constructor(public value: string) {}
}

class MockLanguageModelToolResult {
  constructor(public content: unknown[]) {}
}

class MockCancellationTokenSource {
  token = {
    isCancellationRequested: false,
    onCancellationRequested: () => ({ dispose: () => {} }),
  };
  cancel() {
    this.token.isCancellationRequested = true;
  }
  dispose() {}
}

// Mock VS Code API globally
vi.mock('vscode', () => ({
  window: {
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showQuickPick: vi.fn(),
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    createWebviewPanel: vi.fn(),
    createTreeView: vi.fn(),
    registerTreeDataProvider: vi.fn(),
    withProgress: vi.fn(),
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      update: vi.fn(),
    })),
    workspaceFolders: [],
    onDidChangeConfiguration: vi.fn(),
    registerFileSystemProvider: vi.fn(),
  },
  commands: {
    registerCommand: vi.fn(),
    executeCommand: vi.fn(),
  },
  languages: {
    registerDocumentSymbolProvider: vi.fn(),
  },
  Uri: {
    file: vi.fn((path: string) => ({ fsPath: path, scheme: 'file', path })),
    parse: vi.fn((uri: string) => {
      const scheme = uri.startsWith('https://') ? 'https' : uri.startsWith('http://') ? 'http' : 'file';
      return { fsPath: uri, scheme, path: uri };
    }),
    joinPath: vi.fn((base: { fsPath?: string; path?: string }, ...segments: string[]) => {
      const basePath = base.fsPath ?? base.path ?? '';
      const joined = [basePath, ...segments].join('/').replace(/\/+/g, '/');
      return { fsPath: joined, scheme: 'file', path: joined };
    }),
  },
  EventEmitter: MockEventEmitter,
  TreeItem: MockTreeItem,
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2,
  },
  ThemeIcon: MockThemeIcon,
  ThemeColor: MockThemeColor,
  ViewColumn: {
    One: 1,
    Two: 2,
    Three: 3,
  },
  ProgressLocation: {
    Notification: 15,
    Window: 10,
  },
  FileType: {
    Unknown: 0,
    File: 1,
    Directory: 2,
    SymbolicLink: 64,
  },
  Disposable: vi.fn(),
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
  env: {
    openExternal: vi.fn(),
  },
  MarkdownString: MockMarkdownString,
  LanguageModelTextPart: MockLanguageModelTextPart,
  LanguageModelToolResult: MockLanguageModelToolResult,
  CancellationTokenSource: MockCancellationTokenSource,
  lm: {
    registerTool: vi.fn(() => ({ dispose: () => {} })),
    invokeTool: vi.fn(),
  },
}));
