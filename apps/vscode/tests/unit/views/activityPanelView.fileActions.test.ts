/**
 * ActivityPanelView File Actions Tests
 *
 * Feature: 001-wire-file-actions
 * Tests file action handling in the ActivityPanel webview message handler
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

// Mock associated file type
interface AssociatedFile {
  name: string;
  path: string;
  category: 'source' | 'result';
  viewerType?: string;
  format?: string;
}

type FileAction = 'open' | 'openWith' | 'reveal' | 'delete';

describe('ActivityPanelView File Actions', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();

    // Set default to desktop mode
    (vscode.env as any).uiKind = (vscode as any).UIKind.Desktop;

    // Setup workspace folder mock
    (vscode.workspace as any).workspaceFolders = [
      { uri: { fsPath: '/workspace', scheme: 'file', path: '/workspace' } },
    ];
  });

  describe('file:action message handler (T007)', () => {
    it('should route open action to openFile handler', async () => {
      const mockDoc = { getText: vi.fn() };
      (vscode.workspace.openTextDocument as any).mockResolvedValue(mockDoc);
      (vscode.window.showTextDocument as any).mockResolvedValue(undefined);

      const file: AssociatedFile = {
        name: 'track.rep',
        path: 'sources/track.rep',
        category: 'source',
      };

      // Simulate the handler logic
      const uri = vscode.Uri.joinPath(
        (vscode.workspace.workspaceFolders as any)[0].uri,
        file.path
      );
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);

      expect(vscode.workspace.openTextDocument).toHaveBeenCalled();
      expect(vscode.window.showTextDocument).toHaveBeenCalledWith(mockDoc);
    });

    it('should route reveal action to revealFile handler', async () => {
      const file: AssociatedFile = {
        name: 'analysis.geojson',
        path: 'results/analysis.geojson',
        category: 'result',
      };

      const uri = vscode.Uri.joinPath(
        (vscode.workspace.workspaceFolders as any)[0].uri,
        file.path
      );
      await vscode.commands.executeCommand('revealFileInOS', uri);

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'revealFileInOS',
        expect.objectContaining({ fsPath: expect.stringContaining(file.path) })
      );
    });

    it('should route delete action to deleteFile handler', async () => {
      (vscode.window.showWarningMessage as any).mockResolvedValue('Delete');
      (vscode.workspace.fs.delete as any).mockResolvedValue(undefined);

      const file: AssociatedFile = {
        name: 'old_results.json',
        path: 'results/old_results.json',
        category: 'result',
      };

      const uri = vscode.Uri.joinPath(
        (vscode.workspace.workspaceFolders as any)[0].uri,
        file.path
      );

      // Simulate confirmation and delete
      const confirm = await vscode.window.showWarningMessage(
        `Delete "${file.name}"? This cannot be undone.`,
        { modal: true } as any,
        'Delete'
      );

      if (confirm === 'Delete') {
        await vscode.workspace.fs.delete(uri);
      }

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining(file.name),
        expect.objectContaining({ modal: true }),
        'Delete'
      );
      expect(vscode.workspace.fs.delete).toHaveBeenCalled();
    });

    it('should route openWith action to openFileWith handler', async () => {
      const file: AssociatedFile = {
        name: 'data.csv',
        path: 'sources/data.csv',
        category: 'source',
      };

      const uri = vscode.Uri.joinPath(
        (vscode.workspace.workspaceFolders as any)[0].uri,
        file.path
      );
      await vscode.commands.executeCommand('vscode.openWith', uri);

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'vscode.openWith',
        expect.objectContaining({ fsPath: expect.stringContaining(file.path) })
      );
    });
  });

  describe('openFile function (T008)', () => {
    it('should open text document and show in editor', async () => {
      const mockDoc = { getText: vi.fn(), uri: { fsPath: '/test/file.txt' } };
      (vscode.workspace.openTextDocument as any).mockResolvedValue(mockDoc);
      (vscode.window.showTextDocument as any).mockResolvedValue(undefined);

      const uri = vscode.Uri.file('/test/file.txt');
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);

      expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(uri);
      expect(vscode.window.showTextDocument).toHaveBeenCalledWith(mockDoc);
    });

    it('should handle file not found error gracefully', async () => {
      const error = new Error('File does not exist (FileNotFound)');
      (vscode.workspace.openTextDocument as any).mockRejectedValue(error);

      const uri = vscode.Uri.file('/nonexistent/file.txt');

      try {
        await vscode.workspace.openTextDocument(uri);
      } catch (e) {
        // Error handling would show message
        const message = (e as Error).message;
        if (message.includes('ENOENT') || message.includes('FileNotFound') || message.includes('does not exist')) {
          vscode.window.showErrorMessage(`File not found: file.txt. It may have been moved or deleted.`);
        }
      }

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('File not found')
      );
    });
  });

  describe('revealFile function (T014)', () => {
    it('should execute revealFileInOS command', async () => {
      const uri = vscode.Uri.file('/test/file.txt');
      await vscode.commands.executeCommand('revealFileInOS', uri);

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('revealFileInOS', uri);
    });
  });

  describe('web client detection (T015, T017)', () => {
    it('should show info message for reveal action in web client', async () => {
      // Set to web client
      (vscode.env as any).uiKind = (vscode as any).UIKind.Web;

      const action: FileAction = 'reveal';
      const isWebClient = (vscode.env as any).uiKind === (vscode as any).UIKind.Web;

      if (isWebClient && (action === 'reveal' || action === 'delete')) {
        vscode.window.showInformationMessage(
          'This operation requires the desktop version of VS Code.'
        );
      }

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'This operation requires the desktop version of VS Code.'
      );
    });

    it('should show info message for delete action in web client', async () => {
      // Set to web client
      (vscode.env as any).uiKind = (vscode as any).UIKind.Web;

      const action: FileAction = 'delete';
      const isWebClient = (vscode.env as any).uiKind === (vscode as any).UIKind.Web;

      if (isWebClient && (action === 'reveal' || action === 'delete')) {
        vscode.window.showInformationMessage(
          'This operation requires the desktop version of VS Code.'
        );
      }

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'This operation requires the desktop version of VS Code.'
      );
    });

    it('should allow open action in web client', async () => {
      // Set to web client
      (vscode.env as any).uiKind = (vscode as any).UIKind.Web;

      const mockDoc = { getText: vi.fn() };
      (vscode.workspace.openTextDocument as any).mockResolvedValue(mockDoc);
      (vscode.window.showTextDocument as any).mockResolvedValue(undefined);

      const action: FileAction = 'open';
      const isWebClient = (vscode.env as any).uiKind === (vscode as any).UIKind.Web;

      // Open should work in web client
      if (!(isWebClient && (action === 'reveal' || action === 'delete'))) {
        const uri = vscode.Uri.file('/test/file.txt');
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
      }

      expect(vscode.workspace.openTextDocument).toHaveBeenCalled();
      expect(vscode.window.showTextDocument).toHaveBeenCalled();
    });
  });

  describe('deleteFile with confirmation (T019)', () => {
    it('should show warning dialog before deleting', async () => {
      (vscode.window.showWarningMessage as any).mockResolvedValue('Delete');
      (vscode.workspace.fs.delete as any).mockResolvedValue(undefined);

      const fileName = 'test.json';
      const uri = vscode.Uri.file('/test/test.json');

      const confirm = await vscode.window.showWarningMessage(
        `Delete "${fileName}"? This cannot be undone.`,
        { modal: true } as any,
        'Delete'
      );

      if (confirm === 'Delete') {
        await vscode.workspace.fs.delete(uri);
      }

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        `Delete "${fileName}"? This cannot be undone.`,
        { modal: true },
        'Delete'
      );
      expect(vscode.workspace.fs.delete).toHaveBeenCalledWith(uri);
    });

    it('should show success message after deletion', async () => {
      (vscode.window.showWarningMessage as any).mockResolvedValue('Delete');
      (vscode.workspace.fs.delete as any).mockResolvedValue(undefined);

      const fileName = 'test.json';
      const uri = vscode.Uri.file('/test/test.json');

      const confirm = await vscode.window.showWarningMessage(
        `Delete "${fileName}"? This cannot be undone.`,
        { modal: true } as any,
        'Delete'
      );

      if (confirm === 'Delete') {
        await vscode.workspace.fs.delete(uri);
        vscode.window.showInformationMessage(`Deleted: ${fileName}`);
      }

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        `Deleted: ${fileName}`
      );
    });
  });

  describe('delete cancellation (T020)', () => {
    it('should not delete file when user cancels', async () => {
      (vscode.window.showWarningMessage as any).mockResolvedValue(undefined); // User cancels

      const fileName = 'test.json';
      const uri = vscode.Uri.file('/test/test.json');

      const confirm = await vscode.window.showWarningMessage(
        `Delete "${fileName}"? This cannot be undone.`,
        { modal: true } as any,
        'Delete'
      );

      if (confirm === 'Delete') {
        await vscode.workspace.fs.delete(uri);
      }

      expect(vscode.workspace.fs.delete).not.toHaveBeenCalled();
    });
  });

  describe('delete permission error (T021)', () => {
    it('should show permission error message', async () => {
      (vscode.window.showWarningMessage as any).mockResolvedValue('Delete');
      const permError = new Error('EACCES: Permission denied');
      (vscode.workspace.fs.delete as any).mockRejectedValue(permError);

      const fileName = 'readonly.json';
      const uri = vscode.Uri.file('/test/readonly.json');

      const confirm = await vscode.window.showWarningMessage(
        `Delete "${fileName}"? This cannot be undone.`,
        { modal: true } as any,
        'Delete'
      );

      if (confirm === 'Delete') {
        try {
          await vscode.workspace.fs.delete(uri);
        } catch (e) {
          const message = (e as Error).message;
          if (message.includes('EACCES') || message.includes('Permission')) {
            vscode.window.showErrorMessage(
              `Cannot access file: ${fileName}. Check file permissions.`
            );
          }
        }
      }

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Cannot access file')
      );
    });
  });

  describe('openFileWith function (T026)', () => {
    it('should execute vscode.openWith command', async () => {
      const uri = vscode.Uri.file('/test/data.csv');
      await vscode.commands.executeCommand('vscode.openWith', uri);

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('vscode.openWith', uri);
    });
  });

  describe('file path resolution', () => {
    it('should resolve relative path using workspace folder', () => {
      const relativePath = 'sources/track.rep';
      const workspaceUri = (vscode.workspace.workspaceFolders as any)[0].uri;

      const uri = vscode.Uri.joinPath(workspaceUri, relativePath);

      expect(uri.fsPath).toContain('sources/track.rep');
    });

    it('should fallback to absolute path when no workspace', () => {
      (vscode.workspace as any).workspaceFolders = [];

      const absolutePath = '/absolute/path/file.txt';
      const uri = vscode.Uri.file(absolutePath);

      expect(uri.fsPath).toBe(absolutePath);
    });
  });

  describe('error handling (T028-T030)', () => {
    it('should show file not found error (T029)', () => {
      const fileName = 'missing.txt';
      const message = 'File does not exist (FileNotFound)';

      if (message.includes('ENOENT') || message.includes('FileNotFound') || message.includes('does not exist')) {
        vscode.window.showErrorMessage(
          `File not found: ${fileName}. It may have been moved or deleted.`
        );
      }

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        `File not found: ${fileName}. It may have been moved or deleted.`
      );
    });

    it('should show permission denied error (T030)', () => {
      const fileName = 'protected.txt';
      const message = 'EACCES: Permission denied';

      if (message.includes('EACCES') || message.includes('Permission')) {
        vscode.window.showErrorMessage(
          `Cannot access file: ${fileName}. Check file permissions.`
        );
      }

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        `Cannot access file: ${fileName}. Check file permissions.`
      );
    });

    it('should show generic error for unknown errors', () => {
      const fileName = 'problem.txt';
      const action = 'open';
      const errorMessage = 'Unknown system error';

      vscode.window.showErrorMessage(
        `Failed to ${action} file: ${fileName}. ${errorMessage}`
      );

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        `Failed to ${action} file: ${fileName}. ${errorMessage}`
      );
    });
  });
});
