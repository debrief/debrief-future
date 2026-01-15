// VS Code API mock for testing
import { vi } from 'vitest';

export const window = {
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
};

export const EventEmitter = vi.fn(() => ({
  event: vi.fn(),
  fire: vi.fn(),
  dispose: vi.fn(),
}));

export const TreeItem = vi.fn();

export const TreeItemCollapsibleState = {
  None: 0,
  Collapsed: 1,
  Expanded: 2,
};

export const ThemeIcon = vi.fn();

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
