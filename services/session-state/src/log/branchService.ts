/**
 * Branch Service — create alternative analysis paths from history points.
 * Feature: 075-branching (E02, Phase 5)
 */

import type {
  BranchServiceDeps,
  BranchService,
  BranchFromOptions,
  BranchResult,
  BranchOrigin,
  BranchRecord,
  BranchPointLocation,
  FileProvEntry,
  GeoJsonFeatureCollection,
  SnapshotLinks,
} from './types.js';
import {
  findSystemRecord,
  createSystemRecord,
  normaliseProvenance,
} from './snapshotHelpers.js';

// ─── Pure Helper Functions ──────────────────────────────────────────────

/**
 * Search for an activityId across all spatial features' provenance arrays.
 * Returns the 0-based index within the first feature where it's found, or -1.
 */
export function findEntryInFeatures(
  fc: GeoJsonFeatureCollection,
  activityId: string
): number {
  for (const f of fc.features) {
    if (f.properties?.featureType === 'system') continue;
    const prov = normaliseProvenance(f.properties?.provenance);
    for (let i = 0; i < prov.length; i++) {
      const e = prov[i] as Record<string, unknown>;
      if (e.activityId === activityId) return i;
    }
  }
  return -1;
}

/**
 * Deep-copy a FeatureCollection and trim provenance arrays on spatial features
 * to include only entries up to (and including) the specified activityId.
 * System record provenance is NOT trimmed.
 */
export function trimProvenanceToEntry(
  fc: GeoJsonFeatureCollection,
  branchPointActivityId: string
): GeoJsonFeatureCollection {
  // Find the timestamp of the branch point entry
  let splitTimestamp: string | null = null;
  for (const f of fc.features) {
    if (f.properties?.featureType === 'system') continue;
    const prov = normaliseProvenance(f.properties?.provenance);
    for (const entry of prov) {
      const e = entry as Record<string, unknown>;
      if (e.activityId === branchPointActivityId) {
        splitTimestamp = e.timestamp as string;
        break;
      }
    }
    if (splitTimestamp) break;
  }

  if (!splitTimestamp) {
    throw new Error(`Entry with activityId "${branchPointActivityId}" not found`);
  }

  // Deep-copy and trim
  const copy: GeoJsonFeatureCollection = JSON.parse(JSON.stringify(fc));
  for (const f of copy.features) {
    if (f.properties?.featureType === 'system') continue;
    if (!f.properties) continue;
    const prov = normaliseProvenance(f.properties.provenance);
    f.properties.provenance = prov.filter((entry) => {
      const e = entry as Record<string, unknown>;
      return (e.timestamp as string) <= splitTimestamp!;
    });
  }

  return copy;
}

/** Build a BranchRecord for the source plot's system record. */
export function createBranchRecord(
  branchId: string,
  branchedFrom: string,
  branchedAt: string,
  targetAsset: string
): BranchRecord {
  return { branchId, branchedFrom, branchedAt, targetAsset };
}

/** Build a BranchOrigin for the branch plot's system record. */
export function createBranchOrigin(
  sourceAsset: string,
  branchedFrom: string,
  branchedAt: string,
  branchId: string
): BranchOrigin {
  return { sourceAsset, branchedFrom, branchedAt, branchId };
}

/** Build a FileProvEntry for a branch event. */
export function createBranchProvEntry(
  activityId: string,
  timestamp: string,
  asset: string | null,
  branchId: string,
  direction: 'source' | 'target'
): FileProvEntry {
  return { activityId, type: 'branch', timestamp, asset, branchId, direction };
}

/**
 * Count unique Log entries across spatial features in a FeatureCollection.
 * Deduplicates on activityId. Excludes system record.
 */
function countEntries(fc: GeoJsonFeatureCollection): number {
  const seen = new Set<string>();
  for (const f of fc.features) {
    if (f.properties?.featureType === 'system') continue;
    const prov = normaliseProvenance(f.properties?.provenance);
    for (const entry of prov) {
      const e = entry as Record<string, unknown>;
      if (typeof e.activityId === 'string') seen.add(e.activityId);
    }
  }
  return seen.size;
}

// ─── Branch Service Factory ─────────────────────────────────────────────

/**
 * Create a branch service with injected dependencies.
 */
export function createBranchService(deps: BranchServiceDeps): BranchService {
  return {
    // ── US1: Branch from a Log Entry ────────────────────────────────
    async branchFrom(
      storePath: string,
      itemPath: string,
      options: BranchFromOptions
    ): Promise<BranchResult> {
      const { activityId } = options;

      // 1. Load source plot
      const source = await deps.loadGeoJson(storePath, itemPath);
      if (!source) {
        const err = new Error(`Source GeoJSON not found for item: ${itemPath}`);
        (err as unknown as Record<string, unknown>).code = 'SOURCE_LOAD_FAILED';
        throw err;
      }

      // 2. Ensure system record exists
      let sourceSysRec = findSystemRecord(source);
      if (!sourceSysRec) {
        sourceSysRec = createSystemRecord();
        source.features.push(sourceSysRec);
      }

      // 3. Locate branch point
      const location = await this.locateBranchPoint(storePath, itemPath, activityId);
      if (!location) {
        const err = new Error(`Entry with activityId "${activityId}" not found in history`);
        (err as unknown as Record<string, unknown>).code = 'ENTRY_NOT_FOUND';
        throw err;
      }

      // 4. Build branch FeatureCollection based on location type
      let branchFc: GeoJsonFeatureCollection;

      if (location.type === 'current-segment') {
        // Deep-copy and trim provenance to the branch point
        branchFc = trimProvenanceToEntry(source, activityId);
      } else if (location.type === 'snapshot-boundary') {
        // Load snapshot and use its features (already clean)
        const snapshotFc = await deps.loadSnapshotGeoJson(
          storePath, itemPath, location.snapshotAsset
        );
        if (!snapshotFc) {
          const err = new Error(`Snapshot file not found: ${location.snapshotAsset}`);
          (err as unknown as Record<string, unknown>).code = 'SNAPSHOT_NOT_FOUND';
          throw err;
        }
        branchFc = JSON.parse(JSON.stringify(snapshotFc));
      } else {
        // pre-snapshot-arbitrary: requires replay (Phase 6)
        const err = new Error(
          'Branching from arbitrary entries within a snapshot range requires ' +
          'the replay engine (Phase 6, not yet available). ' +
          'Branch from a snapshot boundary or current-segment entry instead.'
        );
        (err as unknown as Record<string, unknown>).code = 'REPLAY_NOT_AVAILABLE';
        throw err;
      }

      // 5. Generate branch ID and timestamp
      const branchId = deps.generateBranchId();
      const timestamp = new Date();
      const timestampStr = timestamp.toISOString();

      // 6. Set up branch plot system record
      let branchSysRec = findSystemRecord(branchFc);
      if (!branchSysRec) {
        branchSysRec = createSystemRecord();
        branchFc.features.push(branchSysRec);
      }
      if (branchSysRec.properties) {
        // Derive relative path from source to branch
        const sourceDir = itemPath.replace(/\/[^/]+$/, '');
        const branchOrigin = createBranchOrigin(
          `../${sourceDir}/plot.geojson`,
          activityId,
          timestampStr,
          branchId
        );
        branchSysRec.properties.branchOrigin = branchOrigin;
        branchSysRec.properties.snapshotLinks = { prev: null, next: null };
        branchSysRec.properties.branches = [];

        // File-level provenance on branch
        const branchProvEntry = createBranchProvEntry(
          crypto.randomUUID(),
          timestampStr,
          `../${sourceDir}/plot.geojson`,
          branchId,
          'target'
        );
        const existing = normaliseProvenance(branchSysRec.properties.provenance);
        branchSysRec.properties.provenance = [branchProvEntry, ...existing.filter(
          e => (e as Record<string, unknown>).type !== 'snapshot'
        )];
      }

      // 7. Create new STAC Item for the branch plot
      const sourceTitle = itemPath.replace(/\/item\.json$/, '');
      const branchTitle = `${sourceTitle}-${branchId}`;

      let branchItemPath: string;
      let branchItemDir: string;
      try {
        const created = deps.createItem(storePath, branchTitle);
        branchItemPath = created.itemPath;
        branchItemDir = created.itemDir;
      } catch (writeErr) {
        const err = new Error(`Failed to create branch item: ${(writeErr as Error).message}`);
        (err as unknown as Record<string, unknown>).code = 'WRITE_FAILED';
        throw err;
      }

      // 8. Write branch GeoJSON
      try {
        await deps.writeGeoJson(storePath, branchItemPath, branchFc);
      } catch (writeErr) {
        const err = new Error(`Failed to write branch GeoJSON: ${(writeErr as Error).message}`);
        (err as unknown as Record<string, unknown>).code = 'WRITE_FAILED';
        throw err;
      }

      // 9. Update source system record
      if (sourceSysRec.properties) {
        // Compute relative path from source to branch
        const branchRecord = createBranchRecord(
          branchId,
          activityId,
          timestampStr,
          `../${branchTitle}/plot.geojson`
        );
        const existingBranches = (sourceSysRec.properties.branches ?? []) as BranchRecord[];
        sourceSysRec.properties.branches = [...existingBranches, branchRecord];

        // File-level provenance on source
        const sourceProvEntry = createBranchProvEntry(
          crypto.randomUUID(),
          timestampStr,
          `../${branchTitle}/plot.geojson`,
          branchId,
          'source'
        );
        const existingProv = normaliseProvenance(sourceSysRec.properties.provenance);
        sourceSysRec.properties.provenance = [...existingProv, sourceProvEntry];
      }

      // 10. Write updated source GeoJSON
      await deps.writeGeoJson(storePath, itemPath, source);

      // 11. Mark dirty
      deps.markDirty();

      // Count entries in branch
      const entriesIncluded = countEntries(branchFc);

      return {
        branchId,
        branchItemPath,
        branchGeoJsonPath: `${branchItemDir}/plot.geojson`,
        branchedFrom: activityId,
        entriesIncluded,
        timestamp: timestampStr,
      };
    },

    // ── Locate Branch Point ─────────────────────────────────────────
    async locateBranchPoint(
      storePath: string,
      itemPath: string,
      activityId: string
    ): Promise<BranchPointLocation | null> {
      // Check current segment first
      const fc = await deps.loadGeoJson(storePath, itemPath);
      if (!fc) return null;

      const idx = findEntryInFeatures(fc, activityId);
      if (idx >= 0) {
        return { type: 'current-segment', entryIndex: idx };
      }

      // Walk snapshot chain
      const sysRec = findSystemRecord(fc);
      if (!sysRec?.properties) return null;

      const links = sysRec.properties.snapshotLinks as SnapshotLinks | null;
      let currentAsset = links?.prev?.asset ?? null;

      while (currentAsset) {
        const snapshotFc = await deps.loadSnapshotGeoJson(storePath, itemPath, currentAsset);
        if (!snapshotFc) return null;

        // Check if the entry is in this snapshot
        const snapIdx = findEntryInFeatures(snapshotFc, activityId);
        if (snapIdx >= 0) {
          // Determine if this is the last entry (snapshot boundary) or arbitrary
          const snapSysRec = findSystemRecord(snapshotFc);
          const snapLinks = snapSysRec?.properties?.snapshotLinks as SnapshotLinks | null;
          const _nextRef = snapLinks?.next;

          // It's a snapshot boundary if the snapshot has entries and
          // this entry is the "last" one captured (we check by seeing if there are
          // entries after this one in the snapshot)
          const totalEntries = countEntries(snapshotFc);
          // For snapshots, spatial features have empty provenance (stripped).
          // Entries are only available if we reconstruct via loadSnapshotEntries.
          // Since snapshot features have provenance stripped to [], the fact
          // we found the entry means this snapshot has NOT been stripped
          // (it's an older-style snapshot or the entry count approach).
          //
          // In practice, snapshot spatial features have provenance: [],
          // so findEntryInFeatures would return -1 for stripped snapshots.
          // This means we can only find entries in non-stripped files.
          //
          // For the snapshot chain, we need to look at file-level provenance
          // and the snapshot boundary to determine the entry location.

          // Since we found the entry in a snapshot file, it means the
          // snapshot hasn't been fully stripped (or we loaded entries).
          // Treat as snapshot-boundary if it's the last activity in the snapshot.
          if (totalEntries <= 1 || snapIdx === 0) {
            return { type: 'snapshot-boundary', snapshotAsset: currentAsset };
          }

          // Check if there are entries after this one
          let hasEntriesAfter = false;
          for (const f of snapshotFc.features) {
            if (f.properties?.featureType === 'system') continue;
            const prov = normaliseProvenance(f.properties?.provenance);
            for (let i = 0; i < prov.length; i++) {
              const e = prov[i] as Record<string, unknown>;
              if (e.activityId === activityId) {
                // Check if there are entries after this in the same feature
                if (i < prov.length - 1) {
                  hasEntriesAfter = true;
                }
                break;
              }
            }
            if (hasEntriesAfter) break;
          }

          if (hasEntriesAfter) {
            return {
              type: 'pre-snapshot-arbitrary',
              snapshotAsset: currentAsset,
              entryIndex: snapIdx,
            };
          }

          return { type: 'snapshot-boundary', snapshotAsset: currentAsset };
        }

        // Follow the chain backward
        const snapSysRec = findSystemRecord(snapshotFc);
        const snapLinks = snapSysRec?.properties?.snapshotLinks as SnapshotLinks | null;
        currentAsset = snapLinks?.prev?.asset ?? null;
      }

      return null;
    },

    // ── US2: Two-Way Navigation ─────────────────────────────────────

    async getBranches(
      storePath: string,
      itemPath: string
    ): Promise<BranchRecord[]> {
      const fc = await deps.loadGeoJson(storePath, itemPath);
      if (!fc) return [];

      const sysRec = findSystemRecord(fc);
      if (!sysRec?.properties) return [];

      return (sysRec.properties.branches ?? []) as BranchRecord[];
    },

    async getBranchOrigin(
      storePath: string,
      itemPath: string
    ): Promise<BranchOrigin | null> {
      const fc = await deps.loadGeoJson(storePath, itemPath);
      if (!fc) return null;

      const sysRec = findSystemRecord(fc);
      if (!sysRec?.properties) return null;

      return (sysRec.properties.branchOrigin ?? null) as BranchOrigin | null;
    },
  };
}
