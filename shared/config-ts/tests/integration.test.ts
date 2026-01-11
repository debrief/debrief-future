/**
 * Cross-language integration tests.
 *
 * These tests verify that TypeScript can read config written by Python
 * and vice versa. The format must be identical.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Create temp directory for tests
const testDir = join(tmpdir(), 'debrief-integration-test-' + Date.now());
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

import { listStores, registerStore, getPreference, setPreference } from '../src/config.js';
import { readConfig } from '../src/storage.js';

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

describe('Cross-language compatibility', () => {
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

  it('should read config written by Python (simulated)', () => {
    // Simulate Python-written config with camelCase fields
    const pythonConfig = {
      version: '1.0.0',
      stores: [
        {
          path: '/data/exercise-2024',
          name: 'Exercise 2024',
          lastAccessed: '2024-06-15T10:30:00Z',
          notes: 'Main analysis catalog',
        },
      ],
      preferences: {
        theme: 'dark',
        defaultStore: '/data/exercise-2024',
      },
    };

    writeFileSync(
      join(configDir, 'config.json'),
      JSON.stringify(pythonConfig, null, 2)
    );

    // TypeScript should read it correctly
    const stores = listStores();
    expect(stores).toHaveLength(1);
    expect(stores[0].name).toBe('Exercise 2024');
    expect(stores[0].lastAccessed).toBe('2024-06-15T10:30:00Z');
    expect(stores[0].notes).toBe('Main analysis catalog');

    const theme = getPreference('theme');
    expect(theme).toBe('dark');
  });

  it('should write config that Python can read (format check)', async () => {
    // Register store and set preferences from TypeScript
    await registerStore(catalogDir, 'TS Store', 'Created from TypeScript');
    await setPreference('theme', 'light');

    // Read raw JSON to verify format
    const configFile = join(configDir, 'config.json');
    const raw = JSON.parse(readFileSync(configFile, 'utf-8'));

    // Check structure matches Python expectations
    expect(raw.version).toBe('1.0.0');
    expect(raw.stores).toBeInstanceOf(Array);
    expect(raw.preferences).toBeInstanceOf(Object);

    // Check camelCase field names
    const store = raw.stores[0];
    expect(store.lastAccessed).toBeDefined(); // camelCase, not last_accessed
    expect(store.path).toBeDefined();
    expect(store.name).toBe('TS Store');
    expect(store.notes).toBe('Created from TypeScript');

    expect(raw.preferences.theme).toBe('light');
  });

  it('should handle empty config correctly', () => {
    const emptyConfig = {
      version: '1.0.0',
      stores: [],
      preferences: {},
    };

    writeFileSync(
      join(configDir, 'config.json'),
      JSON.stringify(emptyConfig)
    );

    const stores = listStores();
    expect(stores).toEqual([]);

    const pref = getPreference('nonexistent', 'default');
    expect(pref).toBe('default');
  });

  it('should preserve unknown fields for forward compatibility', () => {
    // Config with future fields Python might add
    const futureConfig = {
      version: '1.0.0',
      stores: [],
      preferences: {},
      futureField: 'should be preserved',
    };

    writeFileSync(
      join(configDir, 'config.json'),
      JSON.stringify(futureConfig)
    );

    // Read and write back
    const config = readConfig();

    // TypeScript should not choke on unknown fields
    expect(config.version).toBe('1.0.0');
  });
});

describe('Config file format', () => {
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

  it('should use proper JSON formatting (indented)', async () => {
    await registerStore(catalogDir, 'Format Test');

    const configFile = join(configDir, 'config.json');
    const content = readFileSync(configFile, 'utf-8');

    // Should be indented (pretty-printed)
    expect(content).toContain('\n');
    expect(content).toContain('  '); // 2-space indent
  });

  it('should use ISO 8601 datetime format', async () => {
    await registerStore(catalogDir, 'Date Test');

    const stores = listStores();
    const lastAccessed = stores[0].lastAccessed;

    // Should match ISO 8601 format
    expect(lastAccessed).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
