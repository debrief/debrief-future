// Test setup file for vitest
import { vi } from 'vitest';

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
    parse: vi.fn((uri: string) => ({ fsPath: uri, scheme: 'file', path: uri })),
  },
  EventEmitter: vi.fn(() => ({
    event: vi.fn(),
    fire: vi.fn(),
    dispose: vi.fn(),
  })),
  TreeItem: vi.fn(),
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2,
  },
  ThemeIcon: vi.fn(),
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
}));
