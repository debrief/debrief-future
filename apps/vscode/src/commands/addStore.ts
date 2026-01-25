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

    const selectedUri = result?.[0];
    if (!selectedUri) {
      return;
    }

    const folderPath = selectedUri.fsPath;

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
 * Accepts either { storeId } or the StacStore element directly (from context menu)
 */
export function createRemoveStoreCommand(
  configService: ConfigService,
  stacTreeProvider: StacTreeProvider
): (arg: { storeId: string } | { id: string }) => Promise<void> {
  return async (arg: { storeId: string } | { id: string }) => {
    // Handle both { storeId } and direct StacStore element with { id }
    const storeId = 'storeId' in arg ? arg.storeId : arg?.id;
    if (!storeId) {
      return;
    }

    const store = configService.getStore(storeId);
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
    const removed = await configService.removeStore(storeId);

    if (removed) {
      stacTreeProvider.refresh();
      void vscode.window.showInformationMessage('Store removed');
    }
  };
}

/**
 * Create the update store path command
 * Accepts either { storeId } or the StacStore element directly (from context menu)
 */
export function createUpdateStorePathCommand(
  configService: ConfigService,
  stacService: StacService,
  stacTreeProvider: StacTreeProvider
): (arg: { storeId: string } | { id: string }) => Promise<void> {
  return async (arg: { storeId: string } | { id: string }) => {
    // Handle both { storeId } and direct StacStore element with { id }
    const storeId = 'storeId' in arg ? arg.storeId : arg?.id;
    if (!storeId) {
      return;
    }

    const store = configService.getStore(storeId);
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

    const selectedUri = result?.[0];
    if (!selectedUri) {
      return;
    }

    const newPath = selectedUri.fsPath;

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
      await configService.updateStorePath(storeId, newPath);
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
