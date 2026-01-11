/**
 * Tests for store registration functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Create temp directory for tests
const testDir = join(tmpdir(), 'debrief-stores-test-' + Date.now());
const configDir = join(testDir, 'config');
const catalogDir = join(testDir, 'catalog');

// Mock paths module
vi.mock('../src/paths.js', () => ({
  getConfigDir: (ensureExists = true) => {
    if (ensureExists && !existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    return configDir;
  },
  getConfigFile: (ensureDirExists = true) => {
    if (ensureDirExists && !existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
    return join(configDir, 'config.json');
  },
  getLockFile: () => join(configDir, 'config.lock'),
  getConfigDirSync: () => configDir,
  getConfigFileSync: () => join(configDir, 'config.json'),
}));

import { registerStore, listStores, removeStore } from '../src/config.js';
import { StoreExistsError, StoreNotFoundError, InvalidCatalogError } from '../src/errors.js';

function createValidCatalog(path: string): void {
  mkdirSync(path, { recursive: true });
  writeFileSync(
    join(path, 'catalog.json'),
    JSON.stringify({
      type: 'Catalog',
      stac_version: '1.0.0',
      id: 'test',
      description: 'Test catalog',
      links: [],
    })
  );
}

describe('registerStore', () => {
  beforeEach(() => {
    // Clean up and create test directories
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(configDir, { recursive: true });
    createValidCatalog(catalogDir);
  });

  afterEach(() => {
    // Clean up
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('should register a valid catalog', async () => {
    const store = await registerStore(catalogDir, 'Test Catalog');

    expect(store.name).toBe('Test Catalog');
    expect(store.path).toContain('catalog');
    expect(store.lastAccessed).toBeDefined();
  });

  it('should include notes when provided', async () => {
    const store = await registerStore(catalogDir, 'Test', 'Important catalog');

    expect(store.notes).toBe('Important catalog');
  });

  it('should throw StoreExistsError for duplicate registration', async () => {
    await registerStore(catalogDir, 'First');

    await expect(registerStore(catalogDir, 'Second')).rejects.toThrow(StoreExistsError);
  });

  it('should throw InvalidCatalogError for invalid catalog', async () => {
    const invalidDir = join(testDir, 'invalid');
    mkdirSync(invalidDir);

    await expect(registerStore(invalidDir, 'Invalid')).rejects.toThrow(InvalidCatalogError);
  });

  it('should throw Error for empty name', async () => {
    await expect(registerStore(catalogDir, '')).rejects.toThrow('name cannot be empty');
  });

  it('should skip validation when validate=false', async () => {
    const emptyDir = join(testDir, 'empty');
    mkdirSync(emptyDir);

    const store = await registerStore(emptyDir, 'No Validation', undefined, false);
    expect(store.name).toBe('No Validation');
  });
});

describe('listStores', () => {
  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(configDir, { recursive: true });
    createValidCatalog(catalogDir);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('should return empty array when no stores registered', () => {
    const stores = listStores();
    expect(stores).toEqual([]);
  });

  it('should return registered stores', async () => {
    await registerStore(catalogDir, 'Test Store');

    const stores = listStores();
    expect(stores).toHaveLength(1);
    expect(stores[0].name).toBe('Test Store');
  });
});

describe('removeStore', () => {
  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(configDir, { recursive: true });
    createValidCatalog(catalogDir);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('should remove registered store', async () => {
    await registerStore(catalogDir, 'To Remove');
    expect(listStores()).toHaveLength(1);

    await removeStore(catalogDir);
    expect(listStores()).toHaveLength(0);
  });

  it('should throw StoreNotFoundError for unregistered path', async () => {
    await expect(removeStore('/nonexistent')).rejects.toThrow(StoreNotFoundError);
  });

  it('should not delete catalog files', async () => {
    const catalogJson = join(catalogDir, 'catalog.json');

    await registerStore(catalogDir, 'Keep Files');
    await removeStore(catalogDir);

    // Catalog files should still exist
    expect(existsSync(catalogJson)).toBe(true);
  });
});
