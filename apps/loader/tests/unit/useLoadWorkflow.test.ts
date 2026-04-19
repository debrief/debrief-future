/**
 * Regression test for useLoadWorkflow.executeLoad — existing-plot branch.
 *
 * Feature 199 (FR-021, SC-006, SC-011): when the user loads a file into an
 * existing plot, the returned `LoadResult.plotName` MUST be the plot's
 * display name, not its id. The previous implementation defaulted to
 * `plotName = existingPlotId` with a `TODO`; this test fails if that
 * placeholder behaviour is ever reintroduced.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLoadWorkflow } from '../../src/renderer/hooks/useLoadWorkflow';
import type { PlotInfo, StacStoreInfo } from '../../src/renderer/types/store';
import type { SourceFile } from '../../src/renderer/types';

const PLOTS: PlotInfo[] = [
  { id: 'plot-abc-123', name: 'Alpha Exercise Run', created: '2026-04-18T00:00:00Z', featureCount: 0 },
  { id: 'plot-def-456', name: 'Bravo Exercise Run', created: '2026-04-18T00:00:00Z', featureCount: 0 },
];

const STORE: StacStoreInfo = {
  id: 'store-1',
  name: 'Local Store',
  path: '/tmp/store',
  plotCount: 2,
  accessible: true,
};

const SOURCE_FILE: SourceFile = {
  path: '/tmp/sample.rep',
  name: 'sample.rep',
  size: 1024,
};

beforeEach(() => {
  // Stub the IPC surface so the hook runs to completion without real I/O.
  const api = window.electronAPI as unknown as Record<string, ReturnType<typeof vi.fn>>;
  api.markOperationPending.mockResolvedValue(undefined);
  api.clearOperationPending.mockResolvedValue(undefined);
  api.parseFile.mockResolvedValue({
    success: true,
    features: [],
    metadata: {
      sourceHash: 'sha256-test',
      parser: 'rep',
      version: '0.0.0-test',
      timestamp: '2026-04-18T00:00:00Z',
    },
  });
  api.addFeatures.mockResolvedValue({ featuresAdded: 0, provenanceId: 'prov-test' });
  api.copyAsset.mockResolvedValue({ assetPath: '/tmp/store/plot-abc-123/sample.rep' });
});

describe('useLoadWorkflow.executeLoad — existing-plot branch', () => {
  it('returns plotName equal to display name (not id) when an existing plot is selected', async () => {
    const { result } = renderHook(() => useLoadWorkflow());

    const output = await result.current.executeLoad({
      sourceFile: SOURCE_FILE,
      store: STORE,
      mode: 'existing',
      existingPlotId: 'plot-abc-123',
      plots: PLOTS,
      onProgress: vi.fn(),
    });

    expect(output.plotName).toBe('Alpha Exercise Run');
    expect(output.plotName).not.toBe('plot-abc-123');
  });

  it('throws when the selected plot id is not present in the supplied plot list', async () => {
    const { result } = renderHook(() => useLoadWorkflow());

    await expect(
      result.current.executeLoad({
        sourceFile: SOURCE_FILE,
        store: STORE,
        mode: 'existing',
        existingPlotId: 'plot-not-in-list',
        plots: PLOTS,
        onProgress: vi.fn(),
      })
    ).rejects.toThrow();
  });
});
