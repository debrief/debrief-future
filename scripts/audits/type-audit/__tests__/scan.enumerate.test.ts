import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scan } from '../scan.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, 'fixtures');
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..');

describe('scanner — enumeration', () => {
  it('emits one record per named interface/type/enum in the fixtures folder (no exclusions)', async () => {
    const output = await scan({
      repoRoot: REPO_ROOT,
      roots: [FIXTURES],
      excludes: [],
    });
    // Fixture inventory (no exclusions applied):
    //   a: ExportedUser            (interface)
    //   b: InternalHelper          (interface)
    //   c: Coordinate              (type)
    //   d: PlaybackState           (enum)
    //   e: LooseBag, AnythingGoes  (2 × type)
    //   f: Platform                (interface)
    //   g: Platform                (interface)
    //   h: TrackFeature            (type)
    //   i: SameShape               (interface)
    //   j: SameShape               (interface)
    //   k: TestLocalHelper         (interface, .test.ts)
    expect(output.records).toHaveLength(12);

    const names = output.records.map((r) => r.declarationName).sort();
    expect(names).toEqual([
      'AnythingGoes',
      'Coordinate',
      'ExportedUser',
      'InternalHelper',
      'LooseBag',
      'Platform',
      'Platform',
      'PlaybackState',
      'SameShape',
      'SameShape',
      'TestLocalHelper',
      'TrackFeature',
    ]);

    // Non-exported fixture must be flagged.
    const nonExported = output.records.find((r) => r.declarationName === 'InternalHelper');
    expect(nonExported?.isExported).toBe(false);

    // Exported fixture must be flagged.
    const exported = output.records.find((r) => r.declarationName === 'ExportedUser');
    expect(exported?.isExported).toBe(true);
  });

  it('excludes .test.ts files when the **/*.test.ts glob is supplied', async () => {
    const output = await scan({
      repoRoot: REPO_ROOT,
      roots: [FIXTURES],
      excludes: ['**/*.test.ts'],
    });
    expect(output.records.map((r) => r.declarationName)).not.toContain('TestLocalHelper');
    expect(output.records).toHaveLength(11);
  });

  it('produces stable sorted output (by id)', async () => {
    const output = await scan({
      repoRoot: REPO_ROOT,
      roots: [FIXTURES],
      excludes: [],
    });
    const ids = output.records.map((r) => r.id);
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });

  it('records kind, lineNumber, and filePath correctly', async () => {
    const output = await scan({
      repoRoot: REPO_ROOT,
      roots: [FIXTURES],
      excludes: [],
    });
    const enumRecord = output.records.find((r) => r.declarationName === 'PlaybackState');
    expect(enumRecord).toBeDefined();
    expect(enumRecord?.kind).toBe('enum');
    expect(enumRecord?.lineNumber).toBeGreaterThanOrEqual(1);
    expect(enumRecord?.filePath.replace(/\\/g, '/')).toContain(
      'scripts/audits/type-audit/__tests__/fixtures/d-enum.ts',
    );

    const interfaceRecord = output.records.find((r) => r.declarationName === 'ExportedUser');
    expect(interfaceRecord?.kind).toBe('interface');

    const typeRecord = output.records.find((r) => r.declarationName === 'Coordinate');
    expect(typeRecord?.kind).toBe('type');
  });

  it('rhsSummary is null for interface/enum and a string for type aliases', async () => {
    const output = await scan({
      repoRoot: REPO_ROOT,
      roots: [FIXTURES],
      excludes: [],
    });
    const iface = output.records.find((r) => r.declarationName === 'ExportedUser');
    expect(iface?.rhsSummary).toBeNull();

    const en = output.records.find((r) => r.declarationName === 'PlaybackState');
    expect(en?.rhsSummary).toBeNull();

    const alias = output.records.find((r) => r.declarationName === 'Coordinate');
    expect(typeof alias?.rhsSummary).toBe('string');
    expect((alias?.rhsSummary ?? '').length).toBeGreaterThan(0);
  });
});
