/**
 * Store Management Commands - Add, remove, and update STAC stores
 */

import * as vscode from 'vscode';
import type { ConfigService } from '../services/configService';
import type { StacService } from '../services/stacService';
import type { StacTreeProvider } from '../providers/stacTreeProvider';

/**
 * Create the add store command
 */
export function createAddStoreCommand(
  configService: ConfigService,
  stacService: StacService,
  stacTreeProvider: StacTreeProvider
): () => Promise<void> {
  return async () => {
    // Show folder picker
    const result = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Select STAC Store',
      title: 'Select a folder containing a STAC catalog',
    });

    if (!result || result.length === 0) {
      return;
    }

    const folderPath = result[0].fsPath;

    // Validate the folder contains a STAC catalog
    const validation = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Validating STAC catalog...',
        cancellable: false,
      },
      async () => {
        return stacService.validateStorePath(folderPath);
      }
    );

    if (!validation.valid) {
      void vscode.window.showErrorMessage(
        `Invalid STAC store: ${validation.error}`
      );
      return;
    }

    // Prompt for display name
    const displayName = await vscode.window.showInputBox({
      prompt: 'Enter a display name for this store (optional)',
      placeHolder: folderPath.split('/').pop() ?? 'STAC Store',
    });

    // Add the store
    try {
      await configService.addStore(folderPath, displayName ?? undefined);
      stacTreeProvider.refresh();
      void vscode.window.showInformationMessage(
        `Added STAC store: ${displayName ?? folderPath}`
      );
    } catch (err) {
      void vscode.window.showErrorMessage(
        `Failed to add store: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };
}

/**
 * Create the remove store command
 */
export function createRemoveStoreCommand(
  configService: ConfigService,
  stacTreeProvider: StacTreeProvider
): (args: { storeId: string }) => Promise<void> {
  return async (args: { storeId: string }) => {
    if (!args?.storeId) {
      return;
    }

    const store = configService.getStore(args.storeId);
    if (!store) {
      return;
    }

    // Confirm removal
    const confirm = await vscode.window.showWarningMessage(
      `Remove STAC store "${store.displayName ?? store.path}"?`,
      { modal: true },
      'Remove'
    );

    if (confirm !== 'Remove') {
      return;
    }

    // Remove the store
    const removed = await configService.removeStore(args.storeId);

    if (removed) {
      stacTreeProvider.refresh();
      void vscode.window.showInformationMessage('Store removed');
    }
  };
}

/**
 * Create the update store path command
 */
export function createUpdateStorePathCommand(
  configService: ConfigService,
  stacService: StacService,
  stacTreeProvider: StacTreeProvider
): (args: { storeId: string }) => Promise<void> {
  return async (args: { storeId: string }) => {
    if (!args?.storeId) {
      return;
    }

    const store = configService.getStore(args.storeId);
    if (!store) {
      return;
    }

    // Show folder picker
    const result = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Select New Location',
      title: 'Select the new location for this STAC store',
      defaultUri: vscode.Uri.file(store.path),
    });

    if (!result || result.length === 0) {
      return;
    }

    const newPath = result[0].fsPath;

    // Validate the new path
    const validation = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Validating STAC catalog...',
        cancellable: false,
      },
      async () => {
        return stacService.validateStorePath(newPath);
      }
    );

    if (!validation.valid) {
      void vscode.window.showErrorMessage(
        `Invalid STAC store: ${validation.error}`
      );
      return;
    }

    // Update the path
    try {
      await configService.updateStorePath(args.storeId, newPath);
      stacService.clearCache();
      stacTreeProvider.refresh();
      void vscode.window.showInformationMessage('Store path updated');
    } catch (err) {
      void vscode.window.showErrorMessage(
        `Failed to update store: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  };
}
