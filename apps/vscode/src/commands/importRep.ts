/**
 * Import REP Command - Import REP file via context menu
 *
 * This command provides the right-click context menu flow for importing
 * REP files. It shows a picker for selecting the target STAC catalog and item,
 * or creating a new plot in a store.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { ConfigService } from '../services/configService';
import type { StacService } from '../services/stacService';
import type { IoService } from '../services/ioService';
import type { StacTreeProvider } from '../providers/stacTreeProvider';
import { DuplicateImportError } from '../types/import';
import type { ParseResult } from '../types/import';
import type { IngressFeature } from '@debrief/schemas';

interface ImportRepArgs {
  fsPath?: string;
}

/** Discriminated union for picker items */
interface ExistingPlotPickItem extends vscode.QuickPickItem {
  pickKind: 'existingPlot';
  storeId: string;
  storePath: string;
  itemPath: string;
}

interface NewPlotPickItem extends vscode.QuickPickItem {
  pickKind: 'newPlot';
  storeId: string;
  storePath: string;
}

type ImportPickItem = ExistingPlotPickItem | NewPlotPickItem;

export function createImportRepCommand(
  configService: ConfigService,
  stacService: StacService,
  ioService: IoService,
  stacTreeProvider: StacTreeProvider
): (args?: ImportRepArgs) => Promise<void> {
  return async (args?: ImportRepArgs) => {
    // Get file path(s) - args come from right-click context menu
    let filePaths: string[];

    if (args?.fsPath) {
      filePaths = [args.fsPath];
    } else if ((args as { path?: string })?.path) {
      filePaths = [(args as { path: string }).path];
    } else {
      // No file provided, show file picker
      const uris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: true,
        filters: { 'REP Files': ['rep'] },
        title: 'Select REP file(s) to import',
      });

      if (!uris || uris.length === 0) {
        return;
      }

      filePaths = uris.map((u) => u.fsPath);
    }

    // Validate file extensions
    const invalidFiles = filePaths.filter(
      (f) => !f.toLowerCase().endsWith('.rep')
    );
    if (invalidFiles.length > 0) {
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

    // Show picker with both "new plot" and existing plot options
    const selectedItem = await showItemPicker(
      configService,
      stacService,
      availableStores
    );

    if (!selectedItem) {
      return;
    }

    if (selectedItem.pickKind === 'newPlot') {
      // New plot flow
      await createNewPlotFromRep(
        filePaths,
        selectedItem.storePath,
        selectedItem.storeId,
        ioService,
        stacService,
        stacTreeProvider
      );
    } else {
      // Existing plot flow (single file only, as per #021)
      const store = configService.getStore(selectedItem.storeId);
      if (!store) {
        void vscode.window.showErrorMessage('Store not found');
        return;
      }

      await importRepFile(
        filePaths[0]!,
        store.path,
        selectedItem.itemPath,
        ioService,
        stacService,
        stacTreeProvider
      );
    }
  };
}

/**
 * Show picker with "Add to new plot" options and existing plots
 */
async function showItemPicker(
  configService: ConfigService,
  stacService: StacService,
  stores: ReturnType<typeof configService.getStores>
): Promise<ImportPickItem | undefined> {
  const items: ImportPickItem[] = [];

  // Add "new plot" options first — one per store
  for (const store of stores) {
    items.push({
      label: `$(add) Add to new plot in "${store.displayName ?? store.path}"`,
      description: '',
      detail: 'Create a new STAC Item in this store',
      pickKind: 'newPlot',
      storeId: store.id,
      storePath: store.path,
    });
  }

  // Add existing plots
  for (const store of stores) {
    const catalogs = await stacService.listCatalogs(store);

    for (const catalog of catalogs) {
      const stacItems = await stacService.listItems(store, catalog);

      for (const item of stacItems) {
        items.push({
          label: `$(graph) ${item.title}`,
          description: new Date(item.datetime).toLocaleDateString(),
          detail: `${store.displayName ?? store.path} / ${catalog.title}`,
          pickKind: 'existingPlot',
          storeId: store.id,
          storePath: store.path,
          itemPath: item.itemPath,
        });
      }
    }
  }

  // If only "new plot" options exist (no existing plots), still show picker
  return vscode.window.showQuickPick(items, {
    placeHolder: 'Select target plot or create a new one',
    matchOnDescription: true,
    matchOnDetail: true,
  }) as Promise<ImportPickItem | undefined>;
}

/**
 * Create a new plot from REP file(s).
 * Atomic: if any step fails after folder creation, the item folder is deleted.
 */
async function createNewPlotFromRep(
  filePaths: string[],
  storePath: string,
  storeId: string,
  ioService: IoService,
  stacService: StacService,
  stacTreeProvider: StacTreeProvider
): Promise<void> {
  // Prompt for title
  const title = await vscode.window.showInputBox({
    prompt: 'Enter plot title',
    placeHolder: 'e.g., Exercise Alpha',
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Plot title cannot be empty.';
      }
      return undefined;
    },
  });

  if (!title) {
    return; // User cancelled
  }

  const fileCount = filePaths.length;
  const label = fileCount === 1
    ? path.basename(filePaths[0]!)
    : `${fileCount} REP files`;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Creating new plot from ${label}...`,
      cancellable: false,
    },
    async (progress) => {
      // Step 1: Parse all files first (fail-fast before creating anything)
      progress.report({ message: 'Parsing REP file(s)...' });

      const parseResults: ParseResult[] = [];
      for (const filePath of filePaths) {
        try {
          const result = await ioService.parseRep(filePath);
          parseResults.push(result);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          void vscode.window.showErrorMessage(
            `Failed to parse ${path.basename(filePath)}: ${message}`
          );
          return;
        }
      }

      // Merge all features
      const allFeatures = parseResults.flatMap((r) =>
        r.features.flatMap((f: IngressFeature) => {
          if (!f.geometry) { return []; }
          return [{
            type: 'Feature' as const,
            geometry: {
              type: f.geometry.type,
              coordinates: f.geometry.coordinates as number[] | number[][],
            },
            properties: f.properties,
          }];
        })
      );

      if (allFeatures.length === 0) {
        void vscode.window.showWarningMessage(
          'No features found in the selected file(s).'
        );
        return;
      }

      // Step 2: Create the STAC Item
      progress.report({ message: 'Creating plot...' });
      let itemResult: { itemPath: string; itemId: string; itemDir: string };

      try {
        itemResult = stacService.createItem(storePath, { title: title.trim() });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(
          `Failed to create plot: ${message}`
        );
        return;
      }

      // From here on, if anything fails, clean up the item folder
      try {
        // Step 3: Add features
        progress.report({ message: 'Storing features...' });
        await stacService.addFeatures(storePath, itemResult.itemPath, allFeatures);

        // Step 4: Copy original files as assets
        progress.report({ message: 'Storing source files...' });
        for (const filePath of filePaths) {
          const assetKey = path.parse(path.basename(filePath)).name;
          await stacService.addAsset(
            storePath,
            itemResult.itemPath,
            filePath,
            assetKey
          );
        }

        // Step 5: Update temporal metadata
        progress.report({ message: 'Updating metadata...' });
        await stacService.updateTemporalMetadata(storePath, itemResult.itemPath);

        // Step 6: Show warnings from parsing
        const allWarnings = parseResults.flatMap((r) => r.warnings);
        if (allWarnings.length > 0) {
          const warningMessages = allWarnings
            .slice(0, 3)
            .map((w) => w.message)
            .join('; ');
          void vscode.window.showWarningMessage(
            `Parsed with warnings: ${warningMessages}`
          );
        }

        // Success
        void vscode.window.showInformationMessage(
          `Created plot "${title}" with ${allFeatures.length} feature(s)`
        );

        // Refresh tree
        stacService.clearCache();
        stacTreeProvider.refresh();

        // Open the new plot via command
        void vscode.commands.executeCommand('debrief.openPlot', {
          uri: `stac://${storeId}/${itemResult.itemPath}`,
        });

      } catch (error) {
        // Atomicity: clean up the item folder on failure
        try {
          fs.rmSync(itemResult.itemDir, { recursive: true, force: true });
        } catch {
          // Best-effort cleanup
        }

        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(
          `Failed to create plot: ${message}. Cleaned up partial data.`
        );
      }
    }
  );
}

/**
 * Import REP file to existing STAC item
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
        const safeFeatures = parseResult.features.flatMap((f: IngressFeature) => {
          if (!f.geometry) { return []; }
          return [{
            type: 'Feature' as const,
            geometry: {
              type: f.geometry.type,
              coordinates: f.geometry.coordinates as number[] | number[][],
            },
            properties: f.properties,
          }];
        });

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
