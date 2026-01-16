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

export class TreeItem {
  label?: string;
  description?: string;
  tooltip?: string;
  contextValue?: string;
  collapsibleState?: number;
  iconPath?: any;
  command?: any;
  resourceUri?: any;

  constructor(labelOrUri: string | any, collapsibleState?: number) {
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
  color?: any;

  constructor(id: string, color?: any) {
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
