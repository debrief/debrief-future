/**
 * useSavedFilters — CRUD hook for saved filter configurations (#128).
 *
 * Manages save/load/delete/overwrite of named filter configurations
 * using a platform-agnostic SavedFiltersStorage interface.
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  FilterBarState,
  SavedFilterConfiguration,
  SavedFiltersCollection,
  SavedFiltersStorage,
} from './types';
import { SAVED_FILTERS_MAX, SAVED_FILTERS_NAME_MAX_LENGTH } from './constants';
import { getFilterTypeLabel } from './constants';

/** Generate a default name from active filter values */
function generateDefaultName(filterBarState: FilterBarState): string {
  const parts: string[] = [];
  for (const item of filterBarState.items) {
    if (item.kind === 'lozenge') {
      parts.push(`${getFilterTypeLabel(item.filterType)}: ${item.value}`);
    } else if (item.kind === 'or-container') {
      const children = item.children
        .map((c) => `${getFilterTypeLabel(c.filterType)}: ${c.value}`)
        .join(' | ');
      if (children) parts.push(`(${children})`);
    }
  }
  const name = parts.join(' + ');
  if (name.length > SAVED_FILTERS_NAME_MAX_LENGTH) {
    return name.slice(0, SAVED_FILTERS_NAME_MAX_LENGTH - 1) + '\u2026';
  }
  return name || 'Untitled Filter';
}

export interface UseSavedFiltersResult {
  readonly configurations: readonly SavedFilterConfiguration[];
  readonly saveConfiguration: (
    filterBarState: FilterBarState,
    cql2Json: Record<string, unknown>,
    name?: string,
  ) => void;
  readonly deleteConfiguration: (id: string) => void;
  readonly nameExists: (name: string) => boolean;
  readonly overwriteConfiguration: (
    id: string,
    filterBarState: FilterBarState,
    cql2Json: Record<string, unknown>,
  ) => void;
}

export function useSavedFilters(storage: SavedFiltersStorage): UseSavedFiltersResult {
  const [collection, setCollection] = useState<SavedFiltersCollection>(() => storage.load());

  const persist = useCallback(
    (next: SavedFiltersCollection) => {
      storage.save(next);
      setCollection(next);
    },
    [storage],
  );

  const saveConfiguration = useCallback(
    (filterBarState: FilterBarState, cql2Json: Record<string, unknown>, name?: string) => {
      const resolvedName = name?.trim() || generateDefaultName(filterBarState);
      const now = new Date().toISOString();
      const config: SavedFilterConfiguration = {
        id: crypto.randomUUID(),
        name: resolvedName,
        filterBarState,
        cql2Json,
        createdAt: now,
        updatedAt: now,
      };
      const configs = [config, ...collection.configurations];
      const trimmed = configs.slice(0, SAVED_FILTERS_MAX);
      persist({ version: collection.version, configurations: trimmed });
    },
    [collection, persist],
  );

  const deleteConfiguration = useCallback(
    (id: string) => {
      const configs = collection.configurations.filter((c) => c.id !== id);
      persist({ version: collection.version, configurations: configs });
    },
    [collection, persist],
  );

  const nameExists = useCallback(
    (name: string) =>
      collection.configurations.some(
        (c) => c.name.toLowerCase() === name.toLowerCase(),
      ),
    [collection],
  );

  const overwriteConfiguration = useCallback(
    (id: string, filterBarState: FilterBarState, cql2Json: Record<string, unknown>) => {
      const now = new Date().toISOString();
      const configs = collection.configurations.map((c) =>
        c.id === id
          ? { ...c, filterBarState, cql2Json, updatedAt: now }
          : c,
      );
      // Move updated config to front (newest first)
      const updated = configs.find((c) => c.id === id);
      const rest = configs.filter((c) => c.id !== id);
      const ordered = updated ? [updated, ...rest] : configs;
      persist({ version: collection.version, configurations: ordered });
    },
    [collection, persist],
  );

  return useMemo(
    () => ({
      configurations: collection.configurations,
      saveConfiguration,
      deleteConfiguration,
      nameExists,
      overwriteConfiguration,
    }),
    [collection.configurations, saveConfiguration, deleteConfiguration, nameExists, overwriteConfiguration],
  );
}

export { generateDefaultName };
