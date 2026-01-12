/**
 * Hook for fetching and managing STAC stores.
 */

import { useState, useEffect, useCallback } from 'react';
import type { StacStoreInfo } from '../types/store';

interface UseStoresResult {
  stores: StacStoreInfo[] | null;
  loading: boolean;
  error: Error | null;
  refreshStores: () => Promise<void>;
}

/**
 * Fetches available STAC stores from debrief-config.
 */
export function useStores(): UseStoresResult {
  const [stores, setStores] = useState<StacStoreInfo[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refreshStores = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.getStores();
      setStores(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load stores'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStores();
  }, [refreshStores]);

  return { stores, loading, error, refreshStores };
}
