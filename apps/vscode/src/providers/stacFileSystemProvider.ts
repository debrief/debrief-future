/**
 * STAC File System Provider - Virtual file system for stac:// URIs
 *
 * Enables STAC items to appear as virtual files in VS Code Explorer,
 * supporting drag-and-drop and file-based operations.
 */

import * as vscode from 'vscode';
import type { StacService } from '../services/stacService';

export class StacFileSystemProvider implements vscode.FileSystemProvider {
  private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile = this._emitter.event;

  private stacService: StacService;

  constructor(stacService: StacService) {
    this.stacService = stacService;
  }

  /**
   * Watch for changes (not implemented for read-only provider)
   */
  watch(
    _uri: vscode.Uri,
    _options: { readonly recursive: boolean; readonly excludes: readonly string[] }
  ): vscode.Disposable {
    // Read-only, no watching needed
    return new vscode.Disposable(() => {});
  }

  /**
   * Get file/directory stats
   */
  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    const parsed = this.parseUri(uri);
    if (!parsed) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }

    // All STAC items are treated as files
    return {
      type: vscode.FileType.File,
      ctime: 0,
      mtime: 0,
      size: 0,
    };
  }

  /**
   * Read directory contents
   */
  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    // Not implemented for this provider
    return [];
  }

  /**
   * Read file contents
   */
  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const parsed = this.parseUri(uri);
    if (!parsed) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }

    // Return minimal JSON representation
    const content = JSON.stringify(
      {
        storeId: parsed.storeId,
        itemPath: parsed.itemPath,
        scheme: 'stac',
      },
      null,
      2
    );

    return new TextEncoder().encode(content);
  }

  /**
   * Create directory (not supported - read-only)
   */
  createDirectory(_uri: vscode.Uri): void {
    throw vscode.FileSystemError.NoPermissions('STAC stores are read-only');
  }

  /**
   * Write file (not supported - read-only)
   */
  writeFile(
    _uri: vscode.Uri,
    _content: Uint8Array,
    _options: { readonly create: boolean; readonly overwrite: boolean }
  ): void {
    throw vscode.FileSystemError.NoPermissions('STAC stores are read-only');
  }

  /**
   * Delete file (not supported - read-only)
   */
  delete(_uri: vscode.Uri, _options: { readonly recursive: boolean }): void {
    throw vscode.FileSystemError.NoPermissions('STAC stores are read-only');
  }

  /**
   * Rename file (not supported - read-only)
   */
  rename(
    _oldUri: vscode.Uri,
    _newUri: vscode.Uri,
    _options: { readonly overwrite: boolean }
  ): void {
    throw vscode.FileSystemError.NoPermissions('STAC stores are read-only');
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private parseUri(
    uri: vscode.Uri
  ): { storeId: string; itemPath: string } | null {
    // URI format: stac://storeId/path/to/item.json
    if (uri.scheme !== 'stac') {
      return null;
    }

    const storeId = uri.authority;
    const itemPath = uri.path.replace(/^\//, '');

    if (!storeId || !itemPath) {
      return null;
    }

    return { storeId, itemPath };
  }
}
