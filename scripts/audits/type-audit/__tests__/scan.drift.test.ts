import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scan } from '../scan.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, 'fixtures');
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..');

describe('scanner — drift clusters', () => {
  it('groups same-name-different-shape declarations into a driftCluster', async () => {
    const output = await scan({ repoRoot: REPO_ROOT, roots: [FIXTURES], excludes: [] });

    const platformCluster = output.driftClusters.find((c) => c.declarationName === 'Platform');
    expect(platformCluster).toBeDefined();
    expect(platformCluster?.memberIds).toHaveLength(2);

    // Each member id must match an actual record id.
    const ids = new Set(output.records.map((r) => r.id));
    for (const memberId of platformCluster?.memberIds ?? []) {
      expect(ids.has(memberId)).toBe(true);
    }

    // Cluster members must have different shapeHashes.
    const memberHashes = output.records
      .filter((r) => platformCluster?.memberIds.includes(r.id))
      .map((r) => r.shapeHash);
    expect(new Set(memberHashes).size).toBe(2);
  });

  it('does NOT emit a cluster when same-name declarations share the same shape', async () => {
    const output = await scan({ repoRoot: REPO_ROOT, roots: [FIXTURES], excludes: [] });
    const sameShapeCluster = output.driftClusters.find((c) => c.declarationName === 'SameShape');
    expect(sameShapeCluster).toBeUndefined();

    // And the two records must share a shapeHash.
    const sameShapeRecords = output.records.filter((r) => r.declarationName === 'SameShape');
    expect(sameShapeRecords).toHaveLength(2);
    const hashes = new Set(sameShapeRecords.map((r) => r.shapeHash));
    expect(hashes.size).toBe(1);
  });

  it('does NOT emit a cluster when a declaration name appears only once', async () => {
    const output = await scan({ repoRoot: REPO_ROOT, roots: [FIXTURES], excludes: [] });
    // ExportedUser only appears in a-exported-interface.ts.
    const cluster = output.driftClusters.find((c) => c.declarationName === 'ExportedUser');
    expect(cluster).toBeUndefined();
  });

  it('emits exactly one drift cluster for the fixtures folder (Platform)', async () => {
    const output = await scan({ repoRoot: REPO_ROOT, roots: [FIXTURES], excludes: [] });
    expect(output.driftClusters).toHaveLength(1);
    expect(output.driftClusters[0]?.declarationName).toBe('Platform');
  });
});
