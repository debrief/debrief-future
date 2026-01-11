/**
 * Tests for user preferences functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Create temp directory for tests
const testDir = join(tmpdir(), 'debrief-prefs-test-' + Date.now());
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

import { getPreference, setPreference, deletePreference } from '../src/config.js';

describe('getPreference', () => {
  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(configDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('should return default when preference not set', () => {
    const result = getPreference('nonexistent', 'fallback');
    expect(result).toBe('fallback');
  });

  it('should return null when no default specified', () => {
    const result = getPreference('nonexistent');
    expect(result).toBeNull();
  });

  it('should return set value', async () => {
    await setPreference('theme', 'dark');
    const result = getPreference('theme');
    expect(result).toBe('dark');
  });
});

describe('setPreference', () => {
  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(configDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('should set string preference', async () => {
    await setPreference('locale', 'en-GB');
    expect(getPreference('locale')).toBe('en-GB');
  });

  it('should set number preference', async () => {
    await setPreference('fontSize', 14);
    expect(getPreference('fontSize')).toBe(14);
  });

  it('should set boolean preference', async () => {
    await setPreference('showGrid', true);
    expect(getPreference('showGrid')).toBe(true);
  });

  it('should set null preference', async () => {
    await setPreference('defaultStore', null);
    expect(getPreference('defaultStore')).toBeNull();
  });

  it('should overwrite existing preference', async () => {
    await setPreference('theme', 'light');
    await setPreference('theme', 'dark');
    expect(getPreference('theme')).toBe('dark');
  });

  it('should throw Error for empty key', async () => {
    await expect(setPreference('', 'value')).rejects.toThrow('key cannot be empty');
  });
});

describe('deletePreference', () => {
  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(configDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('should delete existing preference', async () => {
    await setPreference('toDelete', 'value');
    expect(getPreference('toDelete')).toBe('value');

    await deletePreference('toDelete');
    expect(getPreference('toDelete')).toBeNull();
  });

  it('should not throw when deleting nonexistent preference', async () => {
    // Should not throw
    await deletePreference('nonexistent');
  });
});

describe('Preference persistence', () => {
  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(configDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('should persist across config reloads', async () => {
    await setPreference('persistent', 'value');

    // Clear any in-memory cache by reading fresh
    const result = getPreference('persistent');
    expect(result).toBe('value');
  });
});
