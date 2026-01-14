/**
 * Hook for fetching plots from a STAC store.
 */

import { useState, useEffect, useCallback } from 'react';
import type { PlotInfo } from '../types/store';

interface UsePlotsResult {
  plots: PlotInfo[] | null;
  loading: boolean;
  error: Error | null;
  refreshPlots: () => Promise<void>;
}

/**
 * Fetches plots from a specific STAC store.
 */
export function usePlots(storePath: string | null): UsePlotsResult {
  const [plots, setPlots] = useState<PlotInfo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refreshPlots = useCallback(async () => {
    if (!storePath) {
      setPlots(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.listPlots(storePath);
      setPlots(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load plots'));
    } finally {
      setLoading(false);
    }
  }, [storePath]);

  useEffect(() => {
    refreshPlots();
  }, [refreshPlots]);

  return { plots, loading, error, refreshPlots };
}
