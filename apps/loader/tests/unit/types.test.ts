/**
 * Tests for type definitions and basic type guards.
 */

import { describe, it, expect } from 'vitest';

// Import types to verify they compile correctly
import type { LoaderState, SourceFile } from '@renderer/types/state';
import type { StacStoreInfo, PlotInfo } from '@renderer/types/store';
import type { NewPlotForm } from '@renderer/types/forms';
import type { LoadResult, LoaderError } from '@renderer/types/results';

describe('Type Definitions', () => {
  describe('SourceFile', () => {
    it('should match expected shape', () => {
      const file: SourceFile = {
        path: '/path/to/file.rep',
        name: 'file.rep',
        size: 1024,
      };

      expect(file.path).toBe('/path/to/file.rep');
      expect(file.name).toBe('file.rep');
      expect(file.size).toBe(1024);
    });
  });

  describe('StacStoreInfo', () => {
    it('should match expected shape', () => {
      const store: StacStoreInfo = {
        id: 'store-1',
        name: 'Test Store',
        path: '/path/to/store',
        plotCount: 5,
        accessible: true,
      };

      expect(store.id).toBe('store-1');
      expect(store.accessible).toBe(true);
    });

    it('should support inaccessible stores', () => {
      const store: StacStoreInfo = {
        id: 'store-2',
        name: 'Inaccessible Store',
        path: '/path/not/found',
        plotCount: 0,
        accessible: false,
        errorMessage: 'Path does not exist',
      };

      expect(store.accessible).toBe(false);
      expect(store.errorMessage).toBeDefined();
    });
  });

  describe('PlotInfo', () => {
    it('should match expected shape', () => {
      const plot: PlotInfo = {
        id: 'plot-1',
        name: 'Exercise Alpha',
        created: '2026-01-13T10:00:00Z',
        featureCount: 42,
      };

      expect(plot.id).toBe('plot-1');
      expect(plot.featureCount).toBe(42);
    });
  });

  describe('LoadResult', () => {
    it('should match expected shape', () => {
      const result: LoadResult = {
        plotId: 'plot-123',
        plotName: 'New Plot',
        storeName: 'Local Store',
        featuresLoaded: 100,
        assetPath: '/store/assets/file.rep',
        provenanceId: 'prov-456',
      };

      expect(result.plotId).toBe('plot-123');
      expect(result.featuresLoaded).toBe(100);
      expect(result.provenanceId).toBe('prov-456');
    });
  });

  describe('LoaderState', () => {
    it('should support initial state', () => {
      const state: LoaderState = {
        step: 'store-selection',
        sourceFile: null,
        selectedStore: null,
        selectedPlot: null,
        newPlotForm: {
          name: '',
          description: '',
        },
        progress: null,
        error: null,
        result: null,
      };

      expect(state.step).toBe('store-selection');
      expect(state.sourceFile).toBeNull();
    });

    it('should support processing state', () => {
      const state: LoaderState = {
        step: 'processing',
        sourceFile: {
          path: '/file.rep',
          name: 'file.rep',
          size: 1024,
        },
        selectedStore: {
          id: 'store-1',
          name: 'Store',
          path: '/store',
          plotCount: 0,
          accessible: true,
        },
        selectedPlot: null,
        newPlotForm: { name: 'New Plot', description: '' },
        progress: {
          percent: 50,
          message: 'Adding features...',
        },
        error: null,
        result: null,
      };

      expect(state.step).toBe('processing');
      expect(state.progress?.percent).toBe(50);
    });
  });
});
