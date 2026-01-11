/**
 * Core functionality for debrief-config.
 *
 * Provides the main API for managing STAC store registrations and user preferences.
 */

import { resolve } from 'node:path';
import { StoreRegistration, Config, PreferenceValue } from './types.js';
import { StoreExistsError, StoreNotFoundError } from './errors.js';
import { readConfig, readConfigSync, updateConfig } from './storage.js';
import { validateStacCatalog } from './validation.js';

/**
 * Register a STAC catalog location.
 *
 * @param path - Absolute path to STAC catalog directory
 * @param name - Human-readable display name
 * @param notes - Optional notes about the store
 * @param validate - If true, validate the path is a valid STAC catalog (default: true)
 * @returns The created StoreRegistration
 * @throws InvalidCatalogError if path is not a valid STAC catalog (when validate=true)
 * @throws StoreExistsError if path is already registered
 * @throws Error if path or name is empty
 */
export async function registerStore(
  path: string,
  name: string,
  notes?: string,
  validate = true
): Promise<StoreRegistration> {
  const resolvedPath = resolve(path);

  if (!resolvedPath) {
    throw new Error('path cannot be empty');
  }
  if (!name || !name.trim()) {
    throw new Error('name cannot be empty');
  }

  // Validate catalog structure
  if (validate) {
    validateStacCatalog(resolvedPath);
  }

  const registration: StoreRegistration = {
    path: resolvedPath,
    name: name.trim(),
    lastAccessed: new Date().toISOString(),
    notes: notes,
  };

  const updated = await updateConfig((config) => {
    // Check for duplicates
    for (const store of config.stores) {
      if (store.path === resolvedPath) {
        throw new StoreExistsError(resolvedPath);
      }
    }

    config.stores.push(registration);
    return config;
  });

  // Return the newly added store
  const added = updated.stores.find((s) => s.path === resolvedPath);
  if (!added) {
    throw new Error('Store was not added');
  }

  return added;
}

/**
 * List all registered STAC stores.
 *
 * @returns List of StoreRegistration objects (empty array if none registered)
 */
export function listStores(): StoreRegistration[] {
  const config = readConfig();
  return [...config.stores];
}

/**
 * Async version of listStores.
 */
export async function listStoresAsync(): Promise<StoreRegistration[]> {
  return listStores();
}

/**
 * Synchronous version of listStores.
 */
export function listStoresSync(): StoreRegistration[] {
  return listStores();
}

/**
 * Get a specific store by path.
 *
 * @param path - Path of the store to retrieve
 * @returns The StoreRegistration if found
 * @throws StoreNotFoundError if path is not registered
 */
export function getStore(path: string): StoreRegistration {
  const resolvedPath = resolve(path);
  const config = readConfig();

  for (const store of config.stores) {
    if (store.path === resolvedPath) {
      return store;
    }
  }

  throw new StoreNotFoundError(resolvedPath);
}

/**
 * Remove a store registration.
 *
 * Does not delete the underlying catalog, only removes the registration.
 *
 * @param path - Path of the store to remove
 * @throws StoreNotFoundError if path is not registered
 */
export async function removeStore(path: string): Promise<void> {
  const resolvedPath = resolve(path);

  await updateConfig((config) => {
    const index = config.stores.findIndex((s) => s.path === resolvedPath);
    if (index === -1) {
      throw new StoreNotFoundError(resolvedPath);
    }

    config.stores.splice(index, 1);
    return config;
  });
}

/**
 * Get a user preference value.
 *
 * @param key - Preference key
 * @param defaultValue - Value to return if key not found
 * @returns Preference value or default
 */
export function getPreference<T extends PreferenceValue>(
  key: string,
  defaultValue?: T
): T | PreferenceValue {
  const config = readConfig();
  const value = config.preferences[key];
  return value !== undefined ? value : (defaultValue ?? null);
}

/**
 * Async version of getPreference.
 */
export async function getPreferenceAsync<T extends PreferenceValue>(
  key: string,
  defaultValue?: T
): Promise<T | PreferenceValue> {
  return getPreference(key, defaultValue);
}

/**
 * Synchronous version of getPreference.
 */
export function getPreferenceSync<T extends PreferenceValue>(
  key: string,
  defaultValue?: T
): T | PreferenceValue {
  return getPreference(key, defaultValue);
}

/**
 * Set a user preference value.
 *
 * @param key - Preference key
 * @param value - Value to store (string, number, boolean, or null)
 */
export async function setPreference(
  key: string,
  value: PreferenceValue
): Promise<void> {
  if (!key || !key.trim()) {
    throw new Error('key cannot be empty');
  }

  await updateConfig((config) => {
    config.preferences[key.trim()] = value;
    return config;
  });
}

/**
 * Delete a user preference.
 *
 * @param key - Preference key to delete
 */
export async function deletePreference(key: string): Promise<void> {
  await updateConfig((config) => {
    delete config.preferences[key];
    return config;
  });
}
