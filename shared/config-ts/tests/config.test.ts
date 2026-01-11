/**
 * Tests for config read functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Create temp directory for tests
const testDir = join(tmpdir(), 'debrief-config-test-' + Date.now());
const configDir = join(testDir, 'config');

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

import { readConfig } from '../src/storage.js';
import { createDefaultConfig } from '../src/types.js';

describe('readConfig', () => {
  beforeEach(() => {
    // Clean up and create test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(configDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('should return default config when file does not exist', () => {
    const config = readConfig();
    expect(config).toEqual(createDefaultConfig());
  });

  it('should read valid config from file', () => {
    const testConfig = {
      version: '1.0.0',
      stores: [
        {
          path: '/test/path',
          name: 'Test Store',
          lastAccessed: '2024-01-01T00:00:00Z',
        },
      ],
      preferences: { theme: 'dark' },
    };

    writeFileSync(join(configDir, 'config.json'), JSON.stringify(testConfig));

    const config = readConfig();
    expect(config.version).toBe('1.0.0');
    expect(config.stores).toHaveLength(1);
    expect(config.stores[0].name).toBe('Test Store');
    expect(config.preferences.theme).toBe('dark');
  });

  it('should return default config for invalid JSON', () => {
    writeFileSync(join(configDir, 'config.json'), '{ not valid json }');

    const config = readConfig();
    expect(config).toEqual(createDefaultConfig());
  });

  it('should return default config for invalid schema', () => {
    writeFileSync(
      join(configDir, 'config.json'),
      JSON.stringify({ version: 'not-semver', stores: 'not-array' })
    );

    const config = readConfig();
    expect(config).toEqual(createDefaultConfig());
  });
});
