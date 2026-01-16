import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StacTreeProvider } from '../../src/providers/stacTreeProvider';
import type { ConfigService } from '../../src/services/configService';
import type { StacService } from '../../src/services/stacService';
import type { StacStore, Catalog, StacItemSummary } from '../../src/types/stac';

describe('StacTreeProvider', () => {
  let provider: StacTreeProvider;
  let mockConfigService: ConfigService;
  let mockStacService: StacService;

  const mockStore: StacStore = {
    id: 'store-1',
    path: '/path/to/store',
    displayName: 'Test Store',
    status: 'available',
  };

  const mockCatalog: Catalog = {
    id: 'catalog-1',
    title: 'Test Catalog',
    description: 'A test catalog',
    catalogPath: 'catalog.json',
    storeId: 'store-1',
    itemCount: 2,
  };

  const mockItem: StacItemSummary = {
    id: 'item-1',
    title: 'Test Plot',
    datetime: '2024-01-15T10:00:00Z',
    itemPath: 'items/item-1.json',
    catalogId: 'catalog-1',
  };

  beforeEach(() => {
    mockConfigService = {
      getStores: vi.fn().mockReturnValue([mockStore]),
      getStore: vi.fn().mockReturnValue(mockStore),
      onConfigChange: vi.fn().mockReturnValue(() => {}),
      updateStoreStatus: vi.fn(),
    } as unknown as ConfigService;

    mockStacService = {
      validateStorePath: vi.fn().mockResolvedValue({ valid: true }),
      listCatalogs: vi.fn().mockResolvedValue([mockCatalog]),
      listItems: vi.fn().mockResolvedValue([mockItem]),
    } as unknown as StacService;

    provider = new StacTreeProvider(mockConfigService, mockStacService);
  });

  describe('getChildren', () => {
    it('returns stores at root level', async () => {
      const children = await provider.getChildren(undefined);

      expect(children).toHaveLength(1);
      expect(children[0]).toEqual(mockStore);
    });

    it('returns catalogs for a store', async () => {
      const children = await provider.getChildren(mockStore);

      expect(mockStacService.listCatalogs).toHaveBeenCalledWith(mockStore);
      expect(children).toHaveLength(1);
      expect(children[0]).toEqual(mockCatalog);
    });

    it('returns items for a catalog', async () => {
      const children = await provider.getChildren(mockCatalog);

      expect(mockStacService.listItems).toHaveBeenCalledWith(
        mockStore,
        mockCatalog
      );
      expect(children).toHaveLength(1);
      expect(children[0]).toEqual(mockItem);
    });
  });

  describe('getTreeItem', () => {
    it('creates tree item for store with STAC prefix', () => {
      const treeItem = provider.getTreeItem(mockStore);

      expect(treeItem.label).toBe('STAC: Test Store');
      expect(treeItem.contextValue).toBe('store');
    });

    it('creates tree item for unavailable store with warning', () => {
      const unavailableStore: StacStore = {
        ...mockStore,
        status: 'unavailable',
        errorMessage: 'Path not found',
      };

      const treeItem = provider.getTreeItem(unavailableStore);

      expect(treeItem.contextValue).toBe('storeInvalid');
      expect(treeItem.description).toBe('Path not found');
    });

    it('creates tree item for catalog', () => {
      const treeItem = provider.getTreeItem(mockCatalog);

      expect(treeItem.label).toBe('Test Catalog');
      expect(treeItem.description).toBe('2 plots');
      expect(treeItem.contextValue).toBe('catalog');
    });

    it('creates tree item for plot with command', () => {
      const treeItem = provider.getTreeItem(mockItem);

      expect(treeItem.label).toBe('Test Plot');
      expect(treeItem.contextValue).toBe('plot');
      expect(treeItem.command).toBeDefined();
      expect(treeItem.command?.command).toBe('debrief.openPlot');
    });
  });

  describe('refresh', () => {
    it('fires change event on refresh', () => {
      const listener = vi.fn();
      provider.onDidChangeTreeData(listener);

      provider.refresh();

      expect(listener).toHaveBeenCalledWith(undefined);
    });
  });
});
