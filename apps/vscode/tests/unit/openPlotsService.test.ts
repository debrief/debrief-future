/**
 * Unit tests for OpenPlotsService
 *
 * Feature: 052-restore-plots-session
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenPlotsService } from '../../src/services/openPlotsService';
import type { OpenPlotsState } from '../../src/types/openPlots';
import { commands } from 'vscode';

/**
 * Create a mock ExtensionContext with an in-memory workspaceState.
 */
function createMockContext(): { context: any; store: Map<string, unknown> } {
  const store = new Map<string, unknown>();

  const context = {
    workspaceState: {
      get: vi.fn(<T>(key: string): T | undefined => {
        return store.get(key) as T | undefined;
      }),
      update: vi.fn(async (key: string, value: unknown): Promise<void> => {
        store.set(key, value);
      }),
    },
  };

  return { context, store };
}

describe('OpenPlotsService', () => {
  let service: OpenPlotsService;
  let mockCtx: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    mockCtx = createMockContext();
    service = new OpenPlotsService(mockCtx.context);
  });

  // ==========================================================================
  // Phase 2: Foundation — CRUD operations (T003)
  // ==========================================================================

  describe('getOpenPlots', () => {
    it('should return empty array when no state exists', () => {
      expect(service.getOpenPlots()).toEqual([]);
    });

    it('should return plots from persisted state', async () => {
      await service.addPlot(
        'stac://store-a/catalog/plot-1',
        'Plot 1',
        'store-a',
        'catalog/plot-1'
      );

      const plots = service.getOpenPlots();
      expect(plots).toHaveLength(1);
      expect(plots[0].uri).toBe('stac://store-a/catalog/plot-1');
      expect(plots[0].title).toBe('Plot 1');
      expect(plots[0].storeId).toBe('store-a');
      expect(plots[0].itemPath).toBe('catalog/plot-1');
    });
  });

  describe('addPlot', () => {
    it('should add a plot to the list', async () => {
      await service.addPlot(
        'stac://store-a/catalog/plot-1',
        'Plot 1',
        'store-a',
        'catalog/plot-1'
      );

      expect(service.getOpenPlots()).toHaveLength(1);
    });

    it('should set openedAt timestamp', async () => {
      await service.addPlot(
        'stac://store-a/catalog/plot-1',
        'Plot 1',
        'store-a',
        'catalog/plot-1'
      );

      const plots = service.getOpenPlots();
      expect(plots[0].openedAt).toBeDefined();
      // Verify it's a valid ISO date
      expect(new Date(plots[0].openedAt).toISOString()).toBe(plots[0].openedAt);
    });

    it('should handle duplicate URI by moving to end with updated timestamp', async () => {
      await service.addPlot(
        'stac://store-a/catalog/plot-1',
        'Plot 1',
        'store-a',
        'catalog/plot-1'
      );
      await service.addPlot(
        'stac://store-a/catalog/plot-2',
        'Plot 2',
        'store-a',
        'catalog/plot-2'
      );

      // Re-add plot-1
      await service.addPlot(
        'stac://store-a/catalog/plot-1',
        'Plot 1 Updated',
        'store-a',
        'catalog/plot-1'
      );

      const plots = service.getOpenPlots();
      expect(plots).toHaveLength(2);
      // Plot-1 should now be at the end
      expect(plots[0].uri).toBe('stac://store-a/catalog/plot-2');
      expect(plots[1].uri).toBe('stac://store-a/catalog/plot-1');
    });

    it('should persist immediately via workspaceState', async () => {
      await service.addPlot(
        'stac://store-a/catalog/plot-1',
        'Plot 1',
        'store-a',
        'catalog/plot-1'
      );

      expect(mockCtx.context.workspaceState.update).toHaveBeenCalledWith(
        'debrief.openPlots',
        expect.objectContaining({
          version: 1,
          plots: expect.arrayContaining([
            expect.objectContaining({ uri: 'stac://store-a/catalog/plot-1' }),
          ]),
        })
      );
    });
  });

  describe('removePlot', () => {
    it('should remove a plot by URI', async () => {
      await service.addPlot('stac://s/p1', 'P1', 's', 'p1');
      await service.addPlot('stac://s/p2', 'P2', 's', 'p2');

      await service.removePlot('stac://s/p1');

      const plots = service.getOpenPlots();
      expect(plots).toHaveLength(1);
      expect(plots[0].uri).toBe('stac://s/p2');
    });

    it('should be a no-op if URI not found', async () => {
      await service.addPlot('stac://s/p1', 'P1', 's', 'p1');

      const updateCountBefore = mockCtx.context.workspaceState.update.mock.calls.length;
      await service.removePlot('stac://s/nonexistent');
      const updateCountAfter = mockCtx.context.workspaceState.update.mock.calls.length;

      // Should not have persisted (no change)
      expect(updateCountAfter).toBe(updateCountBefore);
      expect(service.getOpenPlots()).toHaveLength(1);
    });
  });

  describe('isOpen', () => {
    it('should return true for an open plot', async () => {
      await service.addPlot('stac://s/p1', 'P1', 's', 'p1');
      expect(service.isOpen('stac://s/p1')).toBe(true);
    });

    it('should return false for a non-open plot', () => {
      expect(service.isOpen('stac://s/nonexistent')).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('should remove all plots', async () => {
      await service.addPlot('stac://s/p1', 'P1', 's', 'p1');
      await service.addPlot('stac://s/p2', 'P2', 's', 'p2');

      await service.clearAll();

      expect(service.getOpenPlots()).toHaveLength(0);
    });

    it('should persist empty state', async () => {
      await service.addPlot('stac://s/p1', 'P1', 's', 'p1');
      await service.clearAll();

      const persisted = mockCtx.store.get('debrief.openPlots') as OpenPlotsState;
      expect(persisted.plots).toHaveLength(0);
      expect(persisted.version).toBe(1);
    });
  });

  // ==========================================================================
  // Phase 2: Foundation — restoreOpenPlots (T004)
  // ==========================================================================

  describe('restoreOpenPlots', () => {
    it('should return empty array when no plots persisted', async () => {
      const result = await service.restoreOpenPlots();
      expect(result).toEqual([]);
    });

    it('should execute openPlot command for each persisted plot', async () => {
      await service.addPlot('stac://s/p1', 'P1', 's', 'p1');
      await service.addPlot('stac://s/p2', 'P2', 's', 'p2');

      // Mock successful command execution
      vi.mocked(commands.executeCommand).mockResolvedValue(undefined);

      const result = await service.restoreOpenPlots();

      expect(result).toEqual(['stac://s/p1', 'stac://s/p2']);
      expect(commands.executeCommand).toHaveBeenCalledWith(
        'debrief.openPlot',
        { uri: 'stac://s/p1' }
      );
      expect(commands.executeCommand).toHaveBeenCalledWith(
        'debrief.openPlot',
        { uri: 'stac://s/p2' }
      );
    });

    it('should silently skip plots that fail to restore', async () => {
      await service.addPlot('stac://s/p1', 'P1', 's', 'p1');
      await service.addPlot('stac://s/p2', 'P2', 's', 'p2');
      await service.addPlot('stac://s/p3', 'P3', 's', 'p3');

      // p2 fails
      vi.mocked(commands.executeCommand)
        .mockResolvedValueOnce(undefined) // p1 succeeds
        .mockRejectedValueOnce(new Error('STAC item not found')) // p2 fails
        .mockResolvedValueOnce(undefined); // p3 succeeds

      const result = await service.restoreOpenPlots();

      expect(result).toEqual(['stac://s/p1', 'stac://s/p3']);
    });

    it('should persist cleaned list after restoration (failed entries removed)', async () => {
      await service.addPlot('stac://s/p1', 'P1', 's', 'p1');
      await service.addPlot('stac://s/p2', 'P2', 's', 'p2');

      // p2 fails
      vi.mocked(commands.executeCommand)
        .mockResolvedValueOnce(undefined) // p1 succeeds
        .mockRejectedValueOnce(new Error('missing')); // p2 fails

      await service.restoreOpenPlots();

      // After restore, only p1 should be persisted
      const plots = service.getOpenPlots();
      expect(plots).toHaveLength(1);
      expect(plots[0].uri).toBe('stac://s/p1');
    });

    it('should handle corrupt state by falling back to empty list', () => {
      // Inject corrupt state directly
      mockCtx.store.set('debrief.openPlots', 'not-valid-json-object');

      const plots = service.getOpenPlots();
      expect(plots).toEqual([]);
    });

    it('should handle state with missing plots array', () => {
      mockCtx.store.set('debrief.openPlots', { version: 1 });

      const plots = service.getOpenPlots();
      expect(plots).toEqual([]);
    });

    it('should return empty when all plots fail to restore', async () => {
      await service.addPlot('stac://s/p1', 'P1', 's', 'p1');
      await service.addPlot('stac://s/p2', 'P2', 's', 'p2');

      vi.mocked(commands.executeCommand)
        .mockRejectedValueOnce(new Error('missing'))
        .mockRejectedValueOnce(new Error('missing'));

      const result = await service.restoreOpenPlots();

      expect(result).toEqual([]);
      expect(service.getOpenPlots()).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Phase 3: US1 — Single Plot Restoration (T012)
  // ==========================================================================

  describe('US1: single plot round-trip', () => {
    it('should persist and restore a single plot via addPlot then restoreOpenPlots', async () => {
      await service.addPlot(
        'stac://local-store/exercise-alpha/track-data',
        'Track Data',
        'local-store',
        'exercise-alpha/track-data'
      );

      // Create a fresh service instance to simulate VS Code restart
      const freshService = new OpenPlotsService(mockCtx.context);
      vi.mocked(commands.executeCommand).mockResolvedValue(undefined);

      const result = await freshService.restoreOpenPlots();

      expect(result).toEqual(['stac://local-store/exercise-alpha/track-data']);
    });
  });

  // ==========================================================================
  // Phase 4: US2 — Multiple Plot Restoration (T018-T019)
  // ==========================================================================

  describe('US2: multiple plots ordering', () => {
    it('should return 3 plots in correct open order', async () => {
      await service.addPlot('stac://s/alpha', 'Alpha', 's', 'alpha');
      await service.addPlot('stac://s/bravo', 'Bravo', 's', 'bravo');
      await service.addPlot('stac://s/charlie', 'Charlie', 's', 'charlie');

      const plots = service.getOpenPlots();
      expect(plots).toHaveLength(3);
      expect(plots[0].uri).toBe('stac://s/alpha');
      expect(plots[1].uri).toBe('stac://s/bravo');
      expect(plots[2].uri).toBe('stac://s/charlie');
    });

    it('should restore plots sequentially in original order', async () => {
      await service.addPlot('stac://s/alpha', 'Alpha', 's', 'alpha');
      await service.addPlot('stac://s/bravo', 'Bravo', 's', 'bravo');
      await service.addPlot('stac://s/charlie', 'Charlie', 's', 'charlie');

      const callOrder: string[] = [];
      vi.mocked(commands.executeCommand).mockImplementation(async (_cmd: string, args: any) => {
        callOrder.push(args.uri);
        return undefined;
      });

      await service.restoreOpenPlots();

      expect(callOrder).toEqual([
        'stac://s/alpha',
        'stac://s/bravo',
        'stac://s/charlie',
      ]);
    });
  });

  // ==========================================================================
  // Phase 5: US3 — Graceful Missing Plots (T022-T025)
  // ==========================================================================

  describe('US3: graceful handling of missing plots', () => {
    it('should silently skip missing STAC items', async () => {
      await service.addPlot('stac://s/good', 'Good', 's', 'good');
      await service.addPlot('stac://s/missing', 'Missing', 's', 'missing');

      vi.mocked(commands.executeCommand)
        .mockResolvedValueOnce(undefined) // good succeeds
        .mockRejectedValueOnce(new Error('Failed to load plot')); // missing fails

      const result = await service.restoreOpenPlots();

      expect(result).toEqual(['stac://s/good']);
      // No errors thrown
    });

    it('should remove failed entries from persisted list', async () => {
      await service.addPlot('stac://s/good', 'Good', 's', 'good');
      await service.addPlot('stac://s/missing', 'Missing', 's', 'missing');

      vi.mocked(commands.executeCommand)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('not found'));

      await service.restoreOpenPlots();

      const persisted = service.getOpenPlots();
      expect(persisted).toHaveLength(1);
      expect(persisted[0].uri).toBe('stac://s/good');
    });

    it('should fall back to empty list on corrupt workspaceState', () => {
      mockCtx.store.set('debrief.openPlots', { version: 1, plots: 'not-an-array' });

      expect(service.getOpenPlots()).toEqual([]);
    });

    it('should result in empty state when all plots are missing', async () => {
      await service.addPlot('stac://s/a', 'A', 's', 'a');
      await service.addPlot('stac://s/b', 'B', 's', 'b');

      vi.mocked(commands.executeCommand)
        .mockRejectedValueOnce(new Error('not found'))
        .mockRejectedValueOnce(new Error('not found'));

      const result = await service.restoreOpenPlots();

      expect(result).toEqual([]);
      expect(service.getOpenPlots()).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Phase 6: US4 — Explicit Plot Closure (T029-T030)
  // ==========================================================================

  describe('US4: explicit plot closure', () => {
    it('should remove correct entry from persisted list', async () => {
      await service.addPlot('stac://s/p1', 'P1', 's', 'p1');
      await service.addPlot('stac://s/p2', 'P2', 's', 'p2');
      await service.addPlot('stac://s/p3', 'P3', 's', 'p3');

      await service.removePlot('stac://s/p2');

      const plots = service.getOpenPlots();
      expect(plots).toHaveLength(2);
      expect(plots.map((p) => p.uri)).toEqual(['stac://s/p1', 'stac://s/p3']);
    });

    it('should yield empty list when all plots are closed then restored', async () => {
      await service.addPlot('stac://s/p1', 'P1', 's', 'p1');
      await service.addPlot('stac://s/p2', 'P2', 's', 'p2');

      await service.removePlot('stac://s/p1');
      await service.removePlot('stac://s/p2');

      const result = await service.restoreOpenPlots();
      expect(result).toEqual([]);
    });
  });
});
