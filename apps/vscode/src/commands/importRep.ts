/**
 * Import REP Command - Import REP file via context menu
 *
 * This command provides the right-click context menu flow for importing
 * REP files. It shows a picker for selecting the target STAC catalog and item.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import type { ConfigService } from '../services/configService';
import type { StacService } from '../services/stacService';
import type { IoService } from '../services/ioService';
import type { StacTreeProvider } from '../providers/stacTreeProvider';
import { DuplicateImportError } from '../types/import';

interface ImportRepArgs {
  fsPath?: string;
}

interface ItemQuickPickItem extends vscode.QuickPickItem {
  storeId: string;
  itemPath: string;
}

export function createImportRepCommand(
  configService: ConfigService,
  stacService: StacService,
  ioService: IoService,
  stacTreeProvider: StacTreeProvider
): (args?: ImportRepArgs) => Promise<void> {
  return async (args?: ImportRepArgs) => {
    // Get file path - args come from right-click context menu
    let filePath: string;

    if (args?.fsPath) {
      filePath = args.fsPath;
    } else if ((args as { path?: string })?.path) {
      // Sometimes VS Code passes path instead of fsPath
      filePath = (args as { path: string }).path;
    } else {
      // No file provided, show file picker
      const uris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: { 'REP Files': ['rep'] },
        title: 'Select REP file to import',
      });

      if (!uris || uris.length === 0) {
        return;
      }

      const selectedUri = uris[0];
      if (!selectedUri) {
        return;
      }
      filePath = selectedUri.fsPath;
    }

    // Validate file extension
    if (!filePath.toLowerCase().endsWith('.rep')) {
      void vscode.window.showErrorMessage(
        'Only .rep files can be imported.'
      );
      return;
    }

    // Get stores
    const stores = configService.getStores();
    const availableStores = stores.filter((s) => s.status === 'available');

    if (availableStores.length === 0) {
      void vscode.window.showErrorMessage(
        'No STAC stores available. Add a store first.'
      );
      return;
    }

    // Step 1: Select target item
    const selectedItem = await showItemPicker(
      configService,
      stacService,
      availableStores
    );

    if (!selectedItem) {
      return;
    }

    // Get store
    const store = configService.getStore(selectedItem.storeId);
    if (!store) {
      void vscode.window.showErrorMessage('Store not found');
      return;
    }

    // Import the file
    await importRepFile(
      filePath,
      store.path,
      selectedItem.itemPath,
      ioService,
      stacService,
      stacTreeProvider
    );
  };
}

/**
 * Show two-step picker: first catalog, then item
 */
async function showItemPicker(
  configService: ConfigService,
  stacService: StacService,
  stores: ReturnType<typeof configService.getStores>
): Promise<ItemQuickPickItem | undefined> {
  // Build items list directly (simplified from two-step)
  const items: ItemQuickPickItem[] = [];

  for (const store of stores) {
    const catalogs = await stacService.listCatalogs(store);

    for (const catalog of catalogs) {
      const stacItems = await stacService.listItems(store, catalog);

      for (const item of stacItems) {
        items.push({
          label: `$(graph) ${item.title}`,
          description: new Date(item.datetime).toLocaleDateString(),
          detail: `${store.displayName ?? store.path} / ${catalog.title}`,
          storeId: store.id,
          itemPath: item.itemPath,
        });
      }
    }
  }

  if (items.length === 0) {
    void vscode.window.showInformationMessage(
      'No plots found. Create a plot first.'
    );
    return undefined;
  }

  return vscode.window.showQuickPick(items, {
    placeHolder: 'Select target plot for import',
    matchOnDescription: true,
    matchOnDetail: true,
  });
}

/**
 * Import REP file to STAC item
 */
async function importRepFile(
  filePath: string,
  storePath: string,
  itemPath: string,
  ioService: IoService,
  stacService: StacService,
  stacTreeProvider: StacTreeProvider
): Promise<void> {
  const filename = path.basename(filePath);
  const assetKey = path.parse(filename).name;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Importing ${filename}...`,
      cancellable: false,
    },
    async (progress) => {
      try {
        // Check for duplicate
        progress.report({ message: 'Checking for duplicates...' });

        const isDuplicate = await stacService.hasAsset(
          storePath,
          itemPath,
          assetKey
        );

        if (isDuplicate) {
          // Show warning - only option is Cancel, so any result means abort
          await vscode.window.showWarningMessage(
            `File "${filename}" has already been imported to this plot.`,
            'Cancel'
          );
          return;
        }

        // Parse
        progress.report({ message: 'Parsing REP file...' });
        const parseResult = await ioService.parseRep(filePath);

        if (parseResult.warnings.length > 0) {
          const warningMessages = parseResult.warnings
            .slice(0, 3)
            .map((w) => w.message)
            .join('; ');
          void vscode.window.showWarningMessage(
            `Parsed with warnings: ${warningMessages}`
          );
        }

        if (parseResult.features.length === 0) {
          void vscode.window.showWarningMessage(
            `No features found in ${filename}`
          );
          return;
        }

        // Store asset
        progress.report({ message: 'Storing asset...' });
        await stacService.addAsset(storePath, itemPath, filePath, assetKey);

        // Store features
        progress.report({ message: 'Storing features...' });
        const safeFeatures = parseResult.features.map((f) => ({
          type: 'Feature' as const,
          geometry: {
            type: f.geometry.type,
            coordinates: f.geometry.coordinates as number[] | number[][],
          },
          properties: f.properties,
        }));

        await stacService.addFeatures(storePath, itemPath, safeFeatures);

        // Success
        void vscode.window.showInformationMessage(
          `Imported ${parseResult.features.length} feature(s) from ${filename}`
        );

        // Refresh tree
        stacService.clearCache();
        stacTreeProvider.refresh();

      } catch (error) {
        if (error instanceof DuplicateImportError) {
          void vscode.window.showWarningMessage(error.message);
        } else {
          const message = error instanceof Error ? error.message : String(error);
          void vscode.window.showErrorMessage(`Import failed: ${message}`);
        }
      }
    }
  );
}
