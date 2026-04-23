import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scan } from '../scan.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, 'fixtures');
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..');

describe('scanner — determinism', () => {
  it('two runs on identical inputs produce identical records + driftClusters', async () => {
    const first = await scan({
      repoRoot: REPO_ROOT,
      roots: [FIXTURES],
      excludes: [],
    });
    const second = await scan({
      repoRoot: REPO_ROOT,
      roots: [FIXTURES],
      excludes: [],
    });

    // Drop the non-deterministic top-level metadata fields.
    const stripMeta = (o: {
      records: unknown;
      driftClusters: unknown;
    }): { records: unknown; driftClusters: unknown } => ({
      records: o.records,
      driftClusters: o.driftClusters,
    });

    expect(JSON.stringify(stripMeta(first))).toEqual(JSON.stringify(stripMeta(second)));
  });

  it('shapeHash is stable across runs for the same declaration text', async () => {
    const first = await scan({ repoRoot: REPO_ROOT, roots: [FIXTURES], excludes: [] });
    const second = await scan({ repoRoot: REPO_ROOT, roots: [FIXTURES], excludes: [] });

    const firstHashes = new Map(first.records.map((r) => [r.id, r.shapeHash]));
    const secondHashes = new Map(second.records.map((r) => [r.id, r.shapeHash]));
    expect(firstHashes).toEqual(secondHashes);
  });

  it('shapeHash matches the SHA-1 hex pattern', async () => {
    const output = await scan({ repoRoot: REPO_ROOT, roots: [FIXTURES], excludes: [] });
    for (const r of output.records) {
      expect(r.shapeHash).toMatch(/^[0-9a-f]{40}$/);
    }
  });
});
