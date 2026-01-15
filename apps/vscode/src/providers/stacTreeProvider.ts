/**
 * STAC Tree Provider - Explorer panel tree view for STAC stores
 *
 * Displays STAC stores and their contents in the VS Code Explorer panel.
 */

import * as vscode from 'vscode';
import type { ConfigService } from '../services/configService';
import type { StacService } from '../services/stacService';
import type { StacStore, Catalog, StacItemSummary } from '../types/stac';

type TreeItemData = StacStore | Catalog | StacItemSummary;

export class StacTreeProvider
  implements vscode.TreeDataProvider<TreeItemData>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    TreeItemData | undefined | null
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private configService: ConfigService;
  private stacService: StacService;
  private catalogCache: Map<string, Catalog[]> = new Map();
  private itemCache: Map<string, StacItemSummary[]> = new Map();

  constructor(configService: ConfigService, stacService: StacService) {
    this.configService = configService;
    this.stacService = stacService;

    // Listen for config changes
    configService.onConfigChange(() => {
      this.refresh();
    });
  }

  /**
   * Refresh the tree view
   */
  refresh(item?: TreeItemData): void {
    if (item) {
      this._onDidChangeTreeData.fire(item);
    } else {
      // Clear caches on full refresh
      this.catalogCache.clear();
      this.itemCache.clear();
      this._onDidChangeTreeData.fire(undefined);
    }
  }

  /**
   * Get tree item for an element
   */
  getTreeItem(element: TreeItemData): vscode.TreeItem {
    if (this.isStore(element)) {
      return this.createStoreItem(element);
    } else if (this.isCatalog(element)) {
      return this.createCatalogItem(element);
    } else {
      return this.createPlotItem(element);
    }
  }

  /**
   * Get children for an element
   */
  async getChildren(element?: TreeItemData): Promise<TreeItemData[]> {
    if (!element) {
      // Root level: return stores
      return this.configService.getStores();
    }

    if (this.isStore(element)) {
      // Store level: return catalogs
      return this.getCatalogsForStore(element);
    }

    if (this.isCatalog(element)) {
      // Catalog level: return items
      return this.getItemsForCatalog(element);
    }

    return [];
  }

  /**
   * Get parent of an element
   */
  getParent(element: TreeItemData): vscode.ProviderResult<TreeItemData> {
    if (this.isStore(element)) {
      return undefined;
    }

    if (this.isCatalog(element)) {
      const stores = this.configService.getStores();
      return stores.find((s) => s.id === element.storeId);
    }

    if (this.isItem(element)) {
      // Find catalog in cache
      for (const [, catalogs] of this.catalogCache) {
        const catalog = catalogs.find((c) => c.id === element.catalogId);
        if (catalog) {
          return catalog;
        }
      }
    }

    return undefined;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private isStore(element: TreeItemData): element is StacStore {
    return 'path' in element && 'status' in element;
  }

  private isCatalog(element: TreeItemData): element is Catalog {
    return 'catalogPath' in element && 'storeId' in element;
  }

  private isItem(element: TreeItemData): element is StacItemSummary {
    return 'itemPath' in element && 'catalogId' in element;
  }

  private createStoreItem(store: StacStore): vscode.TreeItem {
    const label = store.displayName ?? store.path.split('/').pop() ?? 'Store';
    const item = new vscode.TreeItem(
      `STAC: ${label}`,
      store.status === 'unavailable'
        ? vscode.TreeItemCollapsibleState.None
        : vscode.TreeItemCollapsibleState.Collapsed
    );

    if (store.status === 'unavailable') {
      item.contextValue = 'storeInvalid';
      item.description = 'Path not found';
      item.iconPath = new vscode.ThemeIcon(
        'warning',
        new vscode.ThemeColor('list.warningForeground')
      );
      item.tooltip = `Path: ${store.path}\n\nError: ${store.errorMessage ?? 'Path not accessible'}`;
    } else if (store.status === 'checking') {
      item.contextValue = 'store';
      item.description = 'Checking...';
      item.iconPath = new vscode.ThemeIcon('loading~spin');
    } else {
      item.contextValue = 'store';
      item.iconPath = new vscode.ThemeIcon('database');
      item.tooltip = store.path;
    }

    return item;
  }

  private createCatalogItem(catalog: Catalog): vscode.TreeItem {
    const item = new vscode.TreeItem(
      catalog.title,
      catalog.itemCount > 0
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );

    item.contextValue = 'catalog';
    item.iconPath = new vscode.ThemeIcon('folder');
    item.description = `${catalog.itemCount} plot${catalog.itemCount === 1 ? '' : 's'}`;
    item.tooltip = catalog.description ?? catalog.title;

    return item;
  }

  private createPlotItem(plotItem: StacItemSummary): vscode.TreeItem {
    const item = new vscode.TreeItem(
      plotItem.title,
      vscode.TreeItemCollapsibleState.None
    );

    item.contextValue = 'plot';
    item.iconPath = new vscode.ThemeIcon('graph');
    item.description = this.formatDate(plotItem.datetime);
    item.tooltip = `${plotItem.title}\n${new Date(plotItem.datetime).toLocaleString()}`;

    // Make double-click open the plot
    item.command = {
      command: 'debrief.openPlot',
      title: 'Open Plot',
      arguments: [{ uri: `stac://${plotItem.catalogId}/${plotItem.itemPath}` }],
    };

    return item;
  }

  private async getCatalogsForStore(store: StacStore): Promise<Catalog[]> {
    // Check cache
    const cached = this.catalogCache.get(store.id);
    if (cached) {
      return cached;
    }

    // Validate store first
    const validation = await this.stacService.validateStorePath(store.path);
    if (!validation.valid) {
      await this.configService.updateStoreStatus(
        store.id,
        'unavailable',
        validation.error
      );
      this.refresh();
      return [];
    }

    await this.configService.updateStoreStatus(store.id, 'available');

    // Load catalogs
    const catalogs = await this.stacService.listCatalogs(store);
    this.catalogCache.set(store.id, catalogs);

    return catalogs;
  }

  private async getItemsForCatalog(
    catalog: Catalog
  ): Promise<StacItemSummary[]> {
    // Check cache
    const cacheKey = `${catalog.storeId}/${catalog.id}`;
    const cached = this.itemCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get store
    const store = this.configService.getStore(catalog.storeId);
    if (!store) {
      return [];
    }

    // Load items
    const items = await this.stacService.listItems(store, catalog);
    this.itemCache.set(cacheKey, items);

    return items;
  }

  private formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}
