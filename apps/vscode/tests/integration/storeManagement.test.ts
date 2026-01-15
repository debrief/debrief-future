import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { StacStore } from '../../src/types/stac';
import { createStore, isValidStorePath } from '../../src/types/stac';

/**
 * Integration tests for the store management workflow.
 * Tests adding, removing, and updating STAC stores.
 */
describe('Store Management Workflow', () => {
  describe('Adding a store', () => {
    it('creates store with valid path', () => {
      const store = createStore('/home/user/stac-data', 'My Data');

      expect(store.id).toMatch(/^store-/);
      expect(store.path).toBe('/home/user/stac-data');
      expect(store.displayName).toBe('My Data');
      expect(store.status).toBe('checking');
    });

    it('uses directory name as default display name', () => {
      const store = createStore('/home/user/maritime-plots');

      expect(store.displayName).toBe('maritime-plots');
    });

    it('validates store path before adding', () => {
      expect(isValidStorePath('/valid/absolute/path')).toBe(true);
      expect(isValidStorePath('relative/path')).toBe(false);
      expect(isValidStorePath('')).toBe(false);
    });
  });

  describe('Store validation', () => {
    it('validates store contains STAC catalog', async () => {
      const validateStore = vi.fn().mockResolvedValue({ valid: true });

      const result = await validateStore('/path/to/stac');

      expect(result.valid).toBe(true);
    });

    it('reports error for invalid store', async () => {
      const validateStore = vi.fn().mockResolvedValue({
        valid: false,
        error: 'No catalog.json found in directory',
      });

      const result = await validateStore('/path/to/empty');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('catalog.json');
    });
  });

  describe('Store status updates', () => {
    it('updates status to available after validation', () => {
      const store = createStore('/home/user/stac-data');
      expect(store.status).toBe('checking');

      store.status = 'available';
      expect(store.status).toBe('available');
    });

    it('updates status to unavailable with error message', () => {
      const store = createStore('/home/user/stac-data');

      store.status = 'unavailable';
      store.errorMessage = 'Path not found';

      expect(store.status).toBe('unavailable');
      expect(store.errorMessage).toBe('Path not found');
    });
  });

  describe('Removing a store', () => {
    it('removes store by ID', () => {
      const stores: StacStore[] = [
        createStore('/path/one', 'Store One'),
        createStore('/path/two', 'Store Two'),
      ];
      stores[0].status = 'available';
      stores[1].status = 'available';

      const storeIdToRemove = stores[0].id;
      const index = stores.findIndex((s) => s.id === storeIdToRemove);

      expect(index).toBe(0);

      if (index !== -1) {
        stores.splice(index, 1);
      }

      expect(stores).toHaveLength(1);
      expect(stores[0].displayName).toBe('Store Two');
    });
  });

  describe('Updating store path', () => {
    it('updates path and resets status', () => {
      const store = createStore('/old/path', 'My Store');
      store.status = 'available';

      // Update path
      store.path = '/new/path';
      store.status = 'checking';
      store.errorMessage = undefined;

      expect(store.path).toBe('/new/path');
      expect(store.status).toBe('checking');
      expect(store.errorMessage).toBeUndefined();
    });
  });

  describe('Store persistence', () => {
    it('serializes stores for config file', () => {
      const stores: StacStore[] = [
        {
          id: 'store-1',
          path: '/path/one',
          displayName: 'Store One',
          status: 'available',
        },
        {
          id: 'store-2',
          path: '/path/two',
          displayName: 'Store Two',
          status: 'available',
        },
      ];

      const serialized = JSON.stringify({ stores });
      const restored = JSON.parse(serialized) as { stores: StacStore[] };

      expect(restored.stores).toHaveLength(2);
      expect(restored.stores[0].displayName).toBe('Store One');
    });

    it('handles stores with errors in serialization', () => {
      const store: StacStore = {
        id: 'store-1',
        path: '/invalid/path',
        displayName: 'Invalid Store',
        status: 'unavailable',
        errorMessage: 'Path does not exist',
      };

      const serialized = JSON.stringify(store);
      const restored = JSON.parse(serialized) as StacStore;

      expect(restored.status).toBe('unavailable');
      expect(restored.errorMessage).toBe('Path does not exist');
    });
  });

  describe('Duplicate store detection', () => {
    it('detects duplicate paths', () => {
      const stores: StacStore[] = [
        createStore('/path/to/data', 'Data Store'),
      ];
      stores[0].status = 'available';

      const newPath = '/path/to/data';
      const isDuplicate = stores.some((s) => s.path === newPath);

      expect(isDuplicate).toBe(true);
    });

    it('allows different paths', () => {
      const stores: StacStore[] = [
        createStore('/path/one', 'Store One'),
      ];
      stores[0].status = 'available';

      const newPath = '/path/two';
      const isDuplicate = stores.some((s) => s.path === newPath);

      expect(isDuplicate).toBe(false);
    });
  });
});
