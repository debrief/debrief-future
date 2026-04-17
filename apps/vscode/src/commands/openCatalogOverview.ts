/**
 * Command: debrief.openCatalogOverview
 *
 * Opens a catalog overview panel showing map + timeline for all items.
 *
 * Feature: 042-stac-catalog-overview-panel
 */

import * as vscode from 'vscode';
import type { ConfigService } from '../services/configService';
import type { StacService } from '../services/stacService';
import type { Catalog } from '../types/stac';
import { CatalogOverviewPanel } from '../panels/catalogOverviewPanel';

export function createOpenCatalogOverviewCommand(
  context: vscode.ExtensionContext,
  configService: ConfigService,
  stacService: StacService,
): (args?: { catalogId: string; storeId: string }) => Promise<void> {
  return async (args) => {
    if (!args?.catalogId || !args?.storeId) {
      void vscode.window.showErrorMessage('Missing catalog or store ID');
      return;
    }

    const store = configService.getStore(args.storeId);
    if (!store) {
      void vscode.window.showErrorMessage(`Store not found: ${args.storeId}`);
      return;
    }

    // Find the catalog
    const catalogs = await stacService.listCatalogs(store);
    const catalog = catalogs.find((c: Catalog) => c.id === args.catalogId);
    if (!catalog) {
      void vscode.window.showErrorMessage(`Catalog not found: ${args.catalogId}`);
      return;
    }

    // Load items
    const items = await stacService.listItems(store, catalog);

    // Create or show the panel
    const panel = CatalogOverviewPanel.createOrShow(
      context.extensionUri,
      context,
      catalog.id,
      catalog.title,
      store.path,
    );

    panel.setStacService(stacService);
    panel.loadCatalog(catalog, store.path, items, store.id);
  };
}
