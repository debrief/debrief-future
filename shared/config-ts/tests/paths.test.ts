/**
 * Tests for path resolution module.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

// We need to mock before importing
vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof import('node:os')>('node:os');
  return {
    ...actual,
    platform: vi.fn(() => actual.platform()),
    homedir: vi.fn(() => actual.homedir()),
  };
});

import { getConfigDir, getConfigFile, getLockFile } from '../src/paths.js';

describe('getConfigDir', () => {
  const testDir = join(tmpdir(), 'debrief-config-test-' + Date.now());

  beforeEach(() => {
    // Clean up any test directories
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    vi.restoreAllMocks();
  });

  it('should return a string path', () => {
    const result = getConfigDir(false);
    expect(typeof result).toBe('string');
  });

  it('should include debrief in path', () => {
    const result = getConfigDir(false);
    expect(result).toContain('debrief');
  });

  it('should create directory when ensureExists is true', () => {
    const result = getConfigDir(true);
    expect(existsSync(result)).toBe(true);
  });

  it('should respect XDG_CONFIG_HOME on Linux', async () => {
    const currentPlatform = platform();
    if (currentPlatform !== 'linux') {
      return; // Skip on non-Linux
    }

    const customConfig = join(testDir, 'custom_config');
    const originalXdg = process.env.XDG_CONFIG_HOME;

    try {
      process.env.XDG_CONFIG_HOME = customConfig;

      // Re-import to pick up new env
      vi.resetModules();
      const paths = await import('../src/paths.js');
      const result = paths.getConfigDir(true);

      expect(result).toContain('debrief');
      expect(result.startsWith(customConfig)).toBe(true);
    } finally {
      if (originalXdg !== undefined) {
        process.env.XDG_CONFIG_HOME = originalXdg;
      } else {
        delete process.env.XDG_CONFIG_HOME;
      }
    }
  });
});

describe('getConfigFile', () => {
  it('should return path ending with config.json', () => {
    const result = getConfigFile(false);
    expect(result.endsWith('config.json')).toBe(true);
  });

  it('should be inside config directory', () => {
    const configDir = getConfigDir(false);
    const configFile = getConfigFile(false);
    expect(configFile.startsWith(configDir)).toBe(true);
  });
});

describe('getLockFile', () => {
  it('should return path ending with .lock', () => {
    const result = getLockFile();
    expect(result.endsWith('.lock')).toBe(true);
  });

  it('should be based on config file path', () => {
    const configFile = getConfigFile(false);
    const lockFile = getLockFile();
    expect(lockFile).toBe(configFile.replace('.json', '.lock'));
  });
});

describe('Platform-specific paths', () => {
  it('should use correct path on current platform', () => {
    const result = getConfigDir(false);
    const currentPlatform = platform();
    const home = homedir();

    if (currentPlatform === 'darwin') {
      expect(result).toContain('Library/Application Support');
    } else if (currentPlatform === 'win32') {
      expect(result.toLowerCase()).toContain('appdata');
    } else {
      // Linux/Unix
      expect(result).toContain('.config');
    }
  });
});
