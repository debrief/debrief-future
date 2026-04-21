import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scan } from '../scan.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, 'fixtures');
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..');

describe('scanner — auto-tagging', () => {
  it('auto-tags boundary-candidate on aliases that bottom out in Record<string, unknown>', async () => {
    const output = await scan({ repoRoot: REPO_ROOT, roots: [FIXTURES], excludes: [] });
    const looseBag = output.records.find((r) => r.declarationName === 'LooseBag');
    expect(looseBag?.autoTag).toBe('boundary-candidate');
  });

  it('auto-tags boundary-candidate on aliases that bottom out in unknown', async () => {
    const output = await scan({ repoRoot: REPO_ROOT, roots: [FIXTURES], excludes: [] });
    const anythingGoes = output.records.find((r) => r.declarationName === 'AnythingGoes');
    expect(anythingGoes?.autoTag).toBe('boundary-candidate');
  });

  it('auto-tags schema-rooted-candidate on declarations in files that import @debrief/schemas', async () => {
    const output = await scan({ repoRoot: REPO_ROOT, roots: [FIXTURES], excludes: [] });
    const trackFeature = output.records.find((r) => r.declarationName === 'TrackFeature');
    expect(trackFeature?.autoTag).toBe('schema-rooted-candidate');
    // imports field is populated for the containing file.
    expect(trackFeature?.imports).toContain('@debrief/schemas');
  });

  it('leaves autoTag=none for records that match no rule (plain interface, no drift, no schema import)', async () => {
    const output = await scan({ repoRoot: REPO_ROOT, roots: [FIXTURES], excludes: [] });
    const exportedUser = output.records.find((r) => r.declarationName === 'ExportedUser');
    expect(exportedUser?.autoTag).toBe('none');
  });

  it('auto-tags drift-shortlist on records that are members of a drift cluster', async () => {
    const output = await scan({ repoRoot: REPO_ROOT, roots: [FIXTURES], excludes: [] });
    const platformRecords = output.records.filter((r) => r.declarationName === 'Platform');
    expect(platformRecords).toHaveLength(2);
    for (const rec of platformRecords) {
      expect(rec.autoTag).toBe('drift-shortlist');
    }
  });
});
