/**
 * Result ID Registry implementation.
 * Feature: 087-logical-result-id-registry (E04)
 *
 * Maintains a live map of logical result IDs to their current versioned
 * file paths. Populated from STAC asset metadata on plot load and updated
 * whenever tools produce new result artifacts. Emits change events for
 * downstream consumers (auto-refresh, result panels).
 */

import type { LogEntry, RecordResult, ArtifactVersion } from '../log/types.js';
import type {
  ResultIdMapping,
  ResultIdChangeEvent,
  ResultIdChangeCallback,
  ResultIdRegistry,
  StacAssetForHydration,
} from './types.js';

/**
 * Create a new Result ID Registry instance.
 * No external dependencies — the registry is a pure in-memory map
 * with callback subscriptions.
 */
export function createResultIdRegistry(): ResultIdRegistry {
  /** Internal mapping: resultId → ResultIdMapping */
  const mappings = new Map<string, ResultIdMapping>();

  /** Per-ID subscribers: resultId → Set<callback> */
  const perIdSubscribers = new Map<string, Set<ResultIdChangeCallback>>();

  /** Global subscribers that receive all change events */
  const globalSubscribers = new Set<ResultIdChangeCallback>();

  /**
   * Internal: register or update a mapping and emit change events.
   * Returns true if a mapping was created or updated, false otherwise.
   */
  function _register(
    resultId: string,
    currentPath: string,
    version: number | null,
    mimeType: string | null,
    emitEvents: boolean
  ): boolean {
    if (!resultId || !currentPath) return false;

    const existing = mappings.get(resultId);

    // Skip if nothing changed
    if (existing && existing.currentPath === currentPath && existing.version === version) {
      return false;
    }

    const mapping: ResultIdMapping = { resultId, currentPath, version, mimeType };
    mappings.set(resultId, mapping);

    if (emitEvents) {
      const event: ResultIdChangeEvent = {
        resultId,
        previousPath: existing?.currentPath ?? null,
        newPath: currentPath,
        previousVersion: existing?.version ?? null,
        newVersion: version,
      };

      // Notify per-ID subscribers
      const idSubs = perIdSubscribers.get(resultId);
      if (idSubs) {
        for (const cb of idSubs) {
          cb(event);
        }
      }

      // Notify global subscribers
      for (const cb of globalSubscribers) {
        cb(event);
      }
    }

    return true;
  }

  /**
   * Extract the first artifact path from a LogEntry's generated array.
   * Artifact paths are typically relative file paths (not feature IDs).
   */
  function extractArtifactPath(entry: LogEntry): string | null {
    if (!entry.generated || entry.generated.length === 0) return null;
    // Artifact paths contain file extensions or path separators
    for (const gen of entry.generated) {
      if (gen.includes('/') || gen.includes('.')) {
        return gen;
      }
    }
    return null;
  }

  const registry: ResultIdRegistry = {
    resolve(resultId: string): ResultIdMapping | undefined {
      return mappings.get(resultId);
    },

    listAll(): ResultIdMapping[] {
      return Array.from(mappings.values());
    },

    get size(): number {
      return mappings.size;
    },

    registerFromLogEntry(entry: LogEntry): void {
      // FR-013: Skip entries without generated_result_id
      if (!entry.generated_result_id) return;

      const artifactPath = extractArtifactPath(entry);
      if (!artifactPath) return;

      _register(entry.generated_result_id, artifactPath, null, null, true);
    },

    registerFromRecordResult(result: RecordResult): void {
      for (const entry of result.entries) {
        registry.registerFromLogEntry(entry);
      }
    },

    registerFromReplayResult(artifacts: ArtifactVersion[]): void {
      for (const artifact of artifacts) {
        if (artifact.result_id) {
          _register(
            artifact.result_id,
            artifact.path,
            artifact.version,
            null,
            true
          );
        }
      }
    },

    hydrateFromAssets(assets: Record<string, StacAssetForHydration>): void {
      // Group assets by resultId, selecting the highest version
      const best = new Map<string, { href: string; version: number; type: string | undefined }>();

      for (const asset of Object.values(assets)) {
        const resultId = asset['debrief:resultId'];
        const version = asset['debrief:version'];

        if (!resultId || version == null) continue;

        const existing = best.get(resultId);
        if (!existing || version > existing.version) {
          best.set(resultId, { href: asset.href, version, type: asset.type });
        }
      }

      // Populate registry without emitting events (bulk initialization)
      for (const [resultId, info] of best) {
        _register(resultId, info.href, info.version, info.type ?? null, false);
      }
    },

    subscribe(resultId: string, callback: ResultIdChangeCallback): () => void {
      let subs = perIdSubscribers.get(resultId);
      if (!subs) {
        subs = new Set();
        perIdSubscribers.set(resultId, subs);
      }
      subs.add(callback);

      return () => {
        subs!.delete(callback);
        if (subs!.size === 0) {
          perIdSubscribers.delete(resultId);
        }
      };
    },

    subscribeAll(callback: ResultIdChangeCallback): () => void {
      globalSubscribers.add(callback);
      return () => {
        globalSubscribers.delete(callback);
      };
    },

    clear(): void {
      mappings.clear();
      perIdSubscribers.clear();
      globalSubscribers.clear();
    },
  };

  return registry;
}
