/**
 * Snapshot Service — clean-state checkpoints with doubly-linked chain.
 * Feature: 074-snapshots (E02, Phase 4)
 */

import type {
  LogEntry,
  SnapshotServiceDeps,
  SnapshotService,
  SnapshotResult,
  SnapshotBoundary,
  SnapshotEntriesResult,
  CreateSnapshotOptions,
  GeoJsonFeatureCollection,
  CrossSnapshotTimelineOptions,
  SnapshotLinks,
  FileProvEntry,
} from './types.js';
import {
  findSystemRecord,
  createSystemRecord,
  stripSpatialProvenance,
  countLogEntries,
  generateSnapshotFilename,
  normaliseProvenance,
  trimProvenanceAfterEntry,
} from './snapshotHelpers.js';
import { assembleTimeline } from './timeline.js';

/**
 * Create a snapshot service with injected dependencies.
 */
export function createSnapshotService(deps: SnapshotServiceDeps): SnapshotService {
  return {
    // ── US1: Create a Snapshot Checkpoint ────────────────────────────
    async createSnapshot(
      storePath: string,
      itemPath: string,
      options?: CreateSnapshotOptions
    ): Promise<SnapshotResult> {
      // 1. Load working GeoJSON
      const working = await deps.loadGeoJson(storePath, itemPath);
      if (!working) {
        throw new Error(`Working GeoJSON not found for item: ${itemPath}`);
      }

      // 2. Ensure system record exists (FR-008)
      let sysRec = findSystemRecord(working);
      if (!sysRec) {
        sysRec = createSystemRecord();
        working.features.push(sysRec);
      }

      // 3. Count entries before snapshot
      const totalEntries = countLogEntries(working);

      // 4. Build clean copy (strip provenance from spatial features)
      const cleanCopy = stripSpatialProvenance(working);

      // 5. Handle "capture from here" (US3)
      let entriesCaptured = totalEntries;
      let entriesRemaining = 0;

      if (options?.fromEntryId) {
        // Trim working file provenance to keep only entries after the split point
        const { entriesBefore, entriesAfter } = trimProvenanceAfterEntry(working, options.fromEntryId);
        entriesCaptured = entriesBefore;
        entriesRemaining = entriesAfter;
      }

      // 6. Generate filename and timestamp
      const timestamp = new Date();
      const filename = generateSnapshotFilename(timestamp);
      const timestampStr = timestamp.toISOString();

      // 7. Get previous snapshot link from working file's system record
      const currentLinks = (sysRec.properties?.snapshotLinks ?? null) as SnapshotLinks | null;
      const prevSnapshotRef = currentLinks?.prev ?? null;

      // 8. Set snapshot's system record links
      const cleanSysRec = findSystemRecord(cleanCopy);
      if (cleanSysRec && cleanSysRec.properties) {
        cleanSysRec.properties.snapshotLinks = {
          prev: prevSnapshotRef,
          next: { asset: 'plot.geojson', provEntryCount: entriesRemaining },
        };

        // Record file-level provenance on snapshot (FR-007)
        const snapshotProvEntry: FileProvEntry = {
          activityId: crypto.randomUUID(),
          type: 'snapshot',
          timestamp: timestampStr,
          asset: filename,
          branchId: null,
          direction: null,
        };
        const existingProv = normaliseProvenance(cleanSysRec.properties.provenance);
        cleanSysRec.properties.provenance = [...existingProv, snapshotProvEntry];
      }

      // 9. Write snapshot file as STAC asset (ATOMIC POINT — FR-015)
      await deps.writeSnapshotAsset(
        storePath,
        itemPath,
        filename,
        JSON.stringify(cleanCopy, null, 2)
      );
      // If writeSnapshotAsset throws, nothing below executes

      // 10. Update previous snapshot's next link (if exists)
      if (prevSnapshotRef) {
        const prevSnapshot = await deps.loadSnapshotGeoJson(storePath, itemPath, prevSnapshotRef.asset);
        if (prevSnapshot) {
          const prevSysRec = findSystemRecord(prevSnapshot);
          if (prevSysRec && prevSysRec.properties) {
            const prevLinks = (prevSysRec.properties.snapshotLinks ?? { prev: null, next: null }) as SnapshotLinks;
            prevSysRec.properties.snapshotLinks = {
              prev: prevLinks.prev,
              next: { asset: filename, provEntryCount: entriesCaptured },
            };
            // Write updated previous snapshot back
            await deps.writeSnapshotAsset(
              storePath,
              itemPath,
              prevSnapshotRef.asset,
              JSON.stringify(prevSnapshot, null, 2)
            );
          }
        }
      }

      // 11. Update working file system record
      if (sysRec.properties) {
        sysRec.properties.snapshotLinks = {
          prev: { asset: filename, provEntryCount: entriesCaptured },
          next: null,
        };

        // Record file-level provenance on working file (FR-007)
        const workingProvEntry: FileProvEntry = {
          activityId: crypto.randomUUID(),
          type: 'snapshot',
          timestamp: timestampStr,
          asset: filename,
          branchId: null,
          direction: null,
        };
        const existingWorkingProv = normaliseProvenance(sysRec.properties.provenance);
        sysRec.properties.provenance = [...existingWorkingProv, workingProvEntry];
      }

      // 12. Clear provenance on working file spatial features (FR-005)
      if (!options?.fromEntryId) {
        // Standard snapshot: clear all
        for (const f of working.features) {
          if (f.properties && f.properties.featureType !== 'system') {
            f.properties.provenance = [];
          }
        }
      }
      // If fromEntryId was provided, trimProvenanceAfterEntry already trimmed in step 5

      // 13. Write updated working file
      await deps.writeGeoJson(storePath, itemPath, working);

      // 14. Mark dirty (FR-016)
      deps.markDirty();

      return {
        snapshotAsset: filename,
        entriesCaptured,
        entriesRemaining,
        timestamp: timestampStr,
      };
    },

    // ── US2: Navigate Earlier History ────────────────────────────────
    async getSnapshotBoundary(
      storePath: string,
      itemPath: string
    ): Promise<SnapshotBoundary | null> {
      const fc = await deps.loadGeoJson(storePath, itemPath);
      if (!fc) return null;

      const sysRec = findSystemRecord(fc);
      if (!sysRec || !sysRec.properties) return null;

      const links = sysRec.properties.snapshotLinks as SnapshotLinks | null;
      if (!links || !links.prev) return null;

      return {
        asset: links.prev.asset,
        provEntryCount: links.prev.provEntryCount,
      };
    },

    async loadSnapshotEntries(
      storePath: string,
      itemPath: string,
      assetFilename: string
    ): Promise<SnapshotEntriesResult> {
      const snapshotFc = await deps.loadSnapshotGeoJson(storePath, itemPath, assetFilename);
      if (!snapshotFc) {
        throw new Error(`Snapshot file not found: ${assetFilename}`);
      }

      // Extract entries using existing timeline assembly
      const entries = assembleTimeline(
        snapshotFc as unknown as { features: Array<Record<string, unknown>> }
      );

      // Check for next boundary (the snapshot's own prev link)
      const sysRec = findSystemRecord(snapshotFc);
      let nextBoundary: SnapshotBoundary | null = null;
      if (sysRec && sysRec.properties) {
        const links = sysRec.properties.snapshotLinks as SnapshotLinks | null;
        if (links && links.prev) {
          nextBoundary = {
            asset: links.prev.asset,
            provEntryCount: links.prev.provEntryCount,
          };
        }
      }

      return { entries, nextBoundary };
    },

    // ── US4: Cross-Snapshot Timeline Assembly ────────────────────────
    assembleCrossSnapshotTimeline(
      currentFeatures: GeoJsonFeatureCollection,
      options?: CrossSnapshotTimelineOptions
    ): LogEntry[] {
      const seen = new Map<string, LogEntry>();

      // Add previous snapshot entries first (oldest first)
      if (options?.previousEntries) {
        for (const entry of options.previousEntries) {
          if (entry.activityId && !seen.has(entry.activityId)) {
            seen.set(entry.activityId, entry);
          }
        }
      }

      // Add current entries
      for (const feature of currentFeatures.features) {
        const props = feature.properties;
        if (!props) continue;
        const entries = normaliseProvenance(props.provenance);
        for (const raw of entries) {
          const entry = raw as Record<string, unknown>;
          const activityId = entry.activityId;
          if (typeof activityId === 'string' && activityId.length > 0) {
            if (!seen.has(activityId)) {
              seen.set(activityId, entry as unknown as LogEntry);
            }
          }
        }
      }

      // Sort by timestamp ascending
      const timeline = Array.from(seen.values());
      timeline.sort((a, b) => {
        if (a.timestamp < b.timestamp) return -1;
        if (a.timestamp > b.timestamp) return 1;
        return 0;
      });

      return timeline;
    },
  };
}
