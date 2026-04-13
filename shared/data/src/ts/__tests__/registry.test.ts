import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../registry.js';
import type { ResolvedPlatform } from '../registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REGISTRY_PATH = resolvePath(__dirname, '..', '..', '..', 'platform-registry.json');
const GOLDEN_PATH = resolvePath(__dirname, '..', '..', '..', 'tests', 'fixtures', 'expected-platforms.json');

interface GoldenPlatform {
  id: string;
  name: string;
  short_name: string | null;
  nationality: string;
  vessel_class: string;
  vessel_type: string;
  vessel_role: string;
  domain: string;
}

function loadGolden(): GoldenPlatform[] {
  return JSON.parse(readFileSync(GOLDEN_PATH, 'utf-8')) as GoldenPlatform[];
}

// --- User Story 1: Resolve Platform Identity ---

describe('resolve', () => {
  it('resolves a known platform with all fields', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    const result = registry.resolve('NELSON');
    expect(result).toBeDefined();
    expect(result!.id).toBe('NELSON');
    expect(result!.name).toBe('HMS Nelson');
    expect(result!.short_name).toBe('NLSN');
    expect(result!.nationality).toBe('GB');
    expect(result!.vessel_class).toBe('surface/warship/frigate/type23');
    expect(result!.vessel_type).toBe('type23');
    expect(result!.vessel_role).toBe('frigate');
    expect(result!.domain).toBe('surface');
  });

  it('returns undefined for unknown platform', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    expect(registry.resolve('UNKNOWN_SHIP')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    expect(registry.resolve('')).toBeUndefined();
  });

  it('returns undefined for whitespace-only', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    expect(registry.resolve('   ')).toBeUndefined();
  });

  it('is case-sensitive', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    expect(registry.resolve('nelson')).toBeUndefined();
    expect(registry.resolve('Nelson')).toBeUndefined();
  });

  it('resolves subsurface platform', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    const result = registry.resolve('SUBJECT');
    expect(result).toBeDefined();
    expect(result!.domain).toBe('subsurface');
    expect(result!.vessel_role).toBe('ssn');
    expect(result!.vessel_type).toBe('astute');
    expect(result!.vessel_class).toBe('subsurface/submarine/ssn/astute');
  });

  it('resolves US platform', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    const result = registry.resolve('OWNSHIP_B');
    expect(result).toBeDefined();
    expect(result!.nationality).toBe('US');
    expect(result!.name).toBe('USS Mason');
  });
});

// --- User Story 2: Enumerate All Platforms + Cross-Language Parity ---

describe('listPlatforms', () => {
  it('returns all 10 platforms', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    expect(registry.listPlatforms()).toHaveLength(10);
  });

  it('returns platforms sorted by ID', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    const ids = registry.listPlatforms().map(p => p.id);
    expect(ids).toEqual([...ids].sort());
  });

  it('includes surface and subsurface domains', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    const domains = new Set(registry.listPlatforms().map(p => p.domain));
    expect(domains).toEqual(new Set(['surface', 'subsurface']));
  });

  it('matches golden fixture field-by-field', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    const platforms = registry.listPlatforms();
    const golden = loadGolden();
    expect(platforms).toHaveLength(golden.length);

    for (let i = 0; i < platforms.length; i++) {
      const p = platforms[i]!;
      const g = golden[i]!;
      expect(p.id).toBe(g.id);
      expect(p.name).toBe(g.name);
      expect(p.short_name ?? null).toBe(g.short_name);
      expect(p.nationality).toBe(g.nationality);
      expect(p.vessel_class).toBe(g.vessel_class);
      expect(p.vessel_type).toBe(g.vessel_type);
      expect(p.vessel_role).toBe(g.vessel_role);
      expect(p.domain).toBe(g.domain);
    }
  });

  it('all platforms have required fields', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    for (const p of registry.listPlatforms()) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.nationality).toBeTruthy();
      expect(p.vessel_class).toBeTruthy();
      expect(p.vessel_type).toBeTruthy();
      expect(p.domain).toBeTruthy();
    }
  });
});

// --- User Story 3: Navigate Vessel Class Taxonomy Tree ---

describe('findByClass', () => {
  it('finds all surface platforms', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    const results = registry.findByClass('surface');
    expect(results).toHaveLength(7);
    expect(results.every(p => p.domain === 'surface')).toBe(true);
  });

  it('finds all subsurface platforms', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    const results = registry.findByClass('subsurface');
    expect(results).toHaveLength(3);
    expect(results.every(p => p.domain === 'subsurface')).toBe(true);
  });

  it('finds frigates by role', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    const results = registry.findByClass('surface/warship/frigate');
    const ids = new Set(results.map(p => p.id));
    expect(ids).toEqual(new Set(['NELSON', 'FRIGATE', 'SENSOR', 'OWNSHIP_A']));
    expect(results.every(p => p.vessel_role === 'frigate')).toBe(true);
  });

  it('finds destroyers by role', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    const results = registry.findByClass('surface/warship/destroyer');
    const ids = new Set(results.map(p => p.id));
    expect(ids).toEqual(new Set(['COLLINGWOOD', 'OWNSHIP', 'OWNSHIP_B']));
  });

  it('finds platforms by type', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    const results = registry.findByClass('surface/warship/frigate/type23');
    const ids = new Set(results.map(p => p.id));
    expect(ids).toEqual(new Set(['NELSON', 'FRIGATE', 'SENSOR', 'OWNSHIP_A']));
  });

  it('returns results sorted by ID', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    const results = registry.findByClass('surface');
    const ids = results.map(p => p.id);
    expect(ids).toEqual([...ids].sort());
  });

  it('returns empty for invalid path', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    expect(registry.findByClass('nonexistent')).toHaveLength(0);
  });

  it('returns empty for empty string', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    expect(registry.findByClass('')).toHaveLength(0);
  });
});

describe('isValidClass', () => {
  it('recognises valid domain', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    expect(registry.isValidClass('surface')).toBe(true);
  });

  it('recognises valid deep path', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    expect(registry.isValidClass('surface/warship/frigate/type23')).toBe(true);
  });

  it('rejects invalid path', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    expect(registry.isValidClass('nonexistent')).toBe(false);
  });

  it('rejects empty string', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    expect(registry.isValidClass('')).toBe(false);
  });

  it('rejects partial valid path with invalid end', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    expect(registry.isValidClass('surface/warship/frigate/nonexistent')).toBe(false);
  });

  it('recognises class node with no direct platforms', () => {
    const registry = loadRegistry(REGISTRY_PATH);
    expect(registry.isValidClass('subsurface/submarine')).toBe(true);
  });
});

// --- Load-Time Validation ---

describe('validation', () => {
  it('throws for missing file', () => {
    expect(() => loadRegistry('/tmp/nonexistent-registry.json')).toThrow(
      'Registry file not found',
    );
  });

  it('throws for invalid JSON', () => {
    const { writeFileSync, mkdtempSync } = require('node:fs') as typeof import('node:fs');
    const { join } = require('node:path') as typeof import('node:path');
    const tmpDir = mkdtempSync(join(require('node:os').tmpdir(), 'reg-'));
    const badFile = join(tmpDir, 'bad.json');
    writeFileSync(badFile, 'not json at all', 'utf-8');
    expect(() => loadRegistry(badFile)).toThrow('Invalid registry format');
  });

  it('throws for missing vessel_classes root', () => {
    const { writeFileSync, mkdtempSync } = require('node:fs') as typeof import('node:fs');
    const { join } = require('node:path') as typeof import('node:path');
    const tmpDir = mkdtempSync(join(require('node:os').tmpdir(), 'reg-'));
    const badFile = join(tmpDir, 'no-root.json');
    writeFileSync(badFile, JSON.stringify({ platforms: {} }), 'utf-8');
    expect(() => loadRegistry(badFile)).toThrow("vessel_classes");
  });

  it('throws for duplicate platform ID', () => {
    const { writeFileSync, mkdtempSync } = require('node:fs') as typeof import('node:fs');
    const { join } = require('node:path') as typeof import('node:path');
    const tmpDir = mkdtempSync(join(require('node:os').tmpdir(), 'reg-'));
    const badFile = join(tmpDir, 'dupes.json');
    writeFileSync(
      badFile,
      JSON.stringify({
        vessel_classes: {
          surface: {
            branch_a: { DUPE: { name: 'First', nationality: 'GB' } },
            branch_b: { DUPE: { name: 'Second', nationality: 'GB' } },
          },
        },
      }),
      'utf-8',
    );
    expect(() => loadRegistry(badFile)).toThrow("Duplicate platform ID 'DUPE'");
  });

  it('throws for platform missing name', () => {
    const { writeFileSync, mkdtempSync } = require('node:fs') as typeof import('node:fs');
    const { join } = require('node:path') as typeof import('node:path');
    const tmpDir = mkdtempSync(join(require('node:os').tmpdir(), 'reg-'));
    const badFile = join(tmpDir, 'no-name.json');
    writeFileSync(
      badFile,
      JSON.stringify({
        vessel_classes: {
          surface: {
            type_a: { NONAME: { nationality: 'GB' } },
          },
        },
      }),
      'utf-8',
    );
    expect(() => loadRegistry(badFile)).toThrow("missing required field 'name'");
  });

  it('throws for platform missing nationality', () => {
    const { writeFileSync, mkdtempSync } = require('node:fs') as typeof import('node:fs');
    const { join } = require('node:path') as typeof import('node:path');
    const tmpDir = mkdtempSync(join(require('node:os').tmpdir(), 'reg-'));
    const badFile = join(tmpDir, 'no-nat.json');
    writeFileSync(
      badFile,
      JSON.stringify({
        vessel_classes: {
          surface: {
            type_a: { NONAT: { name: 'Some Ship' } },
          },
        },
      }),
      'utf-8',
    );
    expect(() => loadRegistry(badFile)).toThrow("missing required field 'nationality'");
  });

  it('loads the default bundled registry', () => {
    const registry = loadRegistry();
    expect(registry.listPlatforms()).toHaveLength(10);
  });
});
