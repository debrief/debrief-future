/**
 * Log Service implementation.
 * Feature: 071-log-recording-service (E02, Phase 1)
 * Updated: 076-replay-tune (E02, Phase 6)
 *
 * Orchestrates Log entry creation, provenance writes, dirty tracking,
 * timeline assembly, and replay/tune operations.
 */

import type {
  LogEntry,
  LogService,
  RecordResult,
  TimelineOptions,
  ToolResultForLog,
  ExpandedToolResultFields,
  FeatureProvenance,
  GeoJsonFeatureCollection,
  ReplayResult,
  ReplayEngineDeps,
  ReplayEngine,
  ToolExecutor,
  SnapshotLoader,
  ToolVersionResolver,
} from './types.js';
import {
  buildLogEntry,
  extractActivityIdFromOutputFeatures,
} from './entryBuilder.js';
import { assembleTimeline } from './timeline.js';
import { createReplayEngine } from './replayEngine.js';

/**
 * Dependencies injected into the Log Service.
 * Avoids direct imports of stacService or store (keeps it testable).
 */
export interface LogServiceDeps {
  /** Append provenance entries to existing features on disk */
  appendProvenance: (
    storePath: string,
    itemPath: string,
    provenance: FeatureProvenance[]
  ) => Promise<number>;

  /** Load a GeoJSON FeatureCollection from a STAC item */
  loadGeoJson: (
    storePath: string,
    itemPath: string
  ) => Promise<{ features: Array<Record<string, unknown>> } | null>;

  /** Mark the session document as dirty */
  markDirty: () => void;

  // Phase 6 optional deps (Feature: 076-replay-tune)

  /** Write a GeoJSON FeatureCollection back to a STAC item */
  writeGeoJson?: (
    storePath: string,
    itemPath: string,
    featureCollection: GeoJsonFeatureCollection
  ) => Promise<void>;

  /** Execute a tool during replay */
  executeTool?: ToolExecutor;

  /** Load a snapshot GeoJSON for cross-snapshot replay */
  loadSnapshot?: SnapshotLoader;

  /** Resolve the installed version of a tool */
  resolveToolVersion?: ToolVersionResolver;
}

/**
 * Normalise a provenance value to an array.
 * Handles: undefined, null, single object, array.
 */
function normaliseProvenanceArray(raw: unknown): unknown[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') return [raw];
  return [];
}

/**
 * Assert that replay dependencies are available.
 * Throws if any required replay dep is missing.
 */
function assertReplayDeps(
  deps: LogServiceDeps
): asserts deps is LogServiceDeps & {
  writeGeoJson: NonNullable<LogServiceDeps['writeGeoJson']>;
  executeTool: NonNullable<LogServiceDeps['executeTool']>;
  loadSnapshot: NonNullable<LogServiceDeps['loadSnapshot']>;
  resolveToolVersion: NonNullable<LogServiceDeps['resolveToolVersion']>;
} {
  if (!deps.executeTool) {
    throw new Error('Replay not available: executeTool dependency not provided');
  }
  if (!deps.writeGeoJson) {
    throw new Error('Replay not available: writeGeoJson dependency not provided');
  }
  if (!deps.loadSnapshot) {
    throw new Error('Replay not available: loadSnapshot dependency not provided');
  }
  if (!deps.resolveToolVersion) {
    throw new Error('Replay not available: resolveToolVersion dependency not provided');
  }
}

/**
 * Create a ReplayEngine with the given LogServiceDeps plus an AbortController.
 */
function makeReplayEngine(
  deps: LogServiceDeps & {
    executeTool: ToolExecutor;
    loadSnapshot: SnapshotLoader;
    resolveToolVersion: ToolVersionResolver;
  },
  signal: AbortSignal
): ReplayEngine {
  const engineDeps: ReplayEngineDeps = {
    executeTool: deps.executeTool,
    loadSnapshot: deps.loadSnapshot,
    resolveToolVersion: deps.resolveToolVersion,
    onProgress: () => {}, // Default no-op progress reporter
    signal,
  };
  return createReplayEngine(engineDeps);
}

/**
 * Create a LogService instance with the given dependencies.
 */
export function createLogService(deps: LogServiceDeps): LogService {
  return {
    async recordToolResult(
      toolResult: ToolResultForLog,
      expandedFields: ExpandedToolResultFields | undefined,
      storePath: string,
      itemPath: string
    ): Promise<RecordResult> {
      // FR-009: Do not record entries for failed executions
      if (!toolResult.success) {
        return { activityId: '', featuresUpdated: 0, entries: [] };
      }

      // Try to reuse activityId from output features (set by Python executor)
      const outputFeatures = toolResult.features?.features ?? [];
      const existingActivityId = extractActivityIdFromOutputFeatures(
        outputFeatures as Array<Record<string, unknown>>
      );

      // Build the Log entry
      const entry = buildLogEntry(toolResult, expandedFields, existingActivityId);

      // Determine which input features need Log entries appended.
      // Output features already have provenance from Python.
      // Input features (used) need entries appended via stacService.
      const inputFeatureIds = entry.used;

      const provenance: FeatureProvenance[] = inputFeatureIds.map(
        (featureId) => ({
          featureId,
          entry: entry as unknown as Record<string, unknown>,
        })
      );

      let featuresUpdated = 0;
      if (provenance.length > 0) {
        featuresUpdated = await deps.appendProvenance(
          storePath,
          itemPath,
          provenance
        );
      }

      // FR-008: Mark the document as dirty after writing Log entries
      if (featuresUpdated > 0 || outputFeatures.length > 0) {
        deps.markDirty();
      }

      return {
        activityId: entry.activityId,
        featuresUpdated,
        entries: [entry],
      };
    },

    async getTimeline(
      storePath: string,
      itemPath: string,
      _options?: TimelineOptions
    ): Promise<LogEntry[]> {
      const fc = await deps.loadGeoJson(storePath, itemPath);
      if (!fc) return [];

      // Normalise legacy provenance format on features before assembly
      for (const feature of fc.features) {
        const props = feature.properties as Record<string, unknown> | null;
        if (props && props.provenance !== undefined) {
          props.provenance = normaliseProvenanceArray(props.provenance);
        }
      }

      return assembleTimeline(fc);
    },

    // Phase 6 methods (Feature: 076-replay-tune)

    async tuneEntry(
      storePath: string,
      itemPath: string,
      activityId: string,
      parameter: string,
      newValue: unknown
    ): Promise<ReplayResult> {
      assertReplayDeps(deps);

      // Load GeoJSON and assemble timeline (include deleted for full picture)
      const fc = await deps.loadGeoJson(storePath, itemPath);
      if (!fc) {
        throw new Error(`Cannot load GeoJSON for ${storePath}/${itemPath}`);
      }

      const timeline = assembleTimeline(fc, { includeDeleted: true });

      // Find the target entry
      const targetEntry = timeline.find((e) => e.activityId === activityId);
      if (!targetEntry) {
        throw new Error(`Entry with activityId "${activityId}" not found`);
      }

      // Get current value of the parameter
      const paramVal = targetEntry.wasGeneratedBy.parameters[parameter];
      const currentValue =
        paramVal !== null &&
        typeof paramVal === 'object' &&
        'value' in (paramVal as unknown as Record<string, unknown>)
          ? (paramVal as { value: unknown }).value
          : paramVal;

      // No-op if value is the same
      if (JSON.stringify(currentValue) === JSON.stringify(newValue)) {
        return {
          status: 'completed',
          entriesReplayed: 0,
          totalEntries: 0,
          haltReason: null,
          tuneAnnotation: null,
          artifactsCreated: [],
        };
      }

      // Collect deleted activity IDs
      const deletedActivityIds = timeline
        .filter((e) => e.deleted === true)
        .map((e) => e.activityId);

      const tuneTarget = {
        activityId,
        parameter,
        previousValue: currentValue,
        newValue,
      };

      // Restore features to their pre-tool state using inputState
      // so the replay engine re-executes from the correct geometry.
      const inputState = targetEntry.inputState as
        | Array<{ featureId: string; geometry: unknown; properties: Record<string, unknown> | null }>
        | undefined;
      if (inputState && inputState.length > 0) {
        for (const saved of inputState) {
          const feature = fc.features.find(
            (f) => String(f.id ?? (f.properties as Record<string, unknown> | null)?.id) === saved.featureId
          );
          if (feature) {
            feature.geometry = JSON.parse(JSON.stringify(saved.geometry));
            // Restore mutation-affected properties (but preserve provenance)
            if (saved.properties) {
              const props = feature.properties as Record<string, unknown>;
              for (const [key, val] of Object.entries(saved.properties)) {
                if (key !== 'provenance') {
                  props[key] = JSON.parse(JSON.stringify(val));
                }
              }
            }
          }
        }
        // Write the restored GeoJSON so executeTool reads correct state
        await deps.writeGeoJson(
          storePath,
          itemPath,
          fc as unknown as GeoJsonFeatureCollection
        );
      }

      const controller = new AbortController();
      const engine = makeReplayEngine(deps, controller.signal);
      const plan = engine.buildPlan(
        timeline,
        tuneTarget,
        deletedActivityIds,
        fc as unknown as GeoJsonFeatureCollection,
        null
      );

      const result = await engine.execute(plan);

      // If completed, write the tune annotation to provenance
      if (result.status === 'completed' && result.tuneAnnotation) {
        // Append tune annotation to all features that have this activity
        const provEntries: FeatureProvenance[] = [];
        for (const feature of fc.features) {
          const props = feature.properties as Record<string, unknown> | null;
          if (!props) continue;
          const prov = normaliseProvenanceArray(props.provenance);
          for (const raw of prov) {
            const entry = raw as Record<string, unknown>;
            if (entry.activityId === activityId) {
              // Mark the tune annotation on the entry
              entry.tune = result.tuneAnnotation;
              break;
            }
          }
        }

        if (deps.writeGeoJson) {
          await deps.writeGeoJson(
            storePath,
            itemPath,
            fc as unknown as GeoJsonFeatureCollection
          );
        }

        deps.markDirty();
      }

      return result;
    },

    async revertTo(
      storePath: string,
      itemPath: string,
      activityId: string
    ): Promise<void> {
      if (!deps.writeGeoJson) {
        throw new Error('Replay not available: writeGeoJson dependency not provided');
      }

      const fc = await deps.loadGeoJson(storePath, itemPath);
      if (!fc) {
        throw new Error(`Cannot load GeoJSON for ${storePath}/${itemPath}`);
      }

      // Find the target entry's timestamp
      let targetTimestamp: string | null = null;
      for (const feature of fc.features) {
        const props = feature.properties as Record<string, unknown> | null;
        if (!props) continue;
        const prov = normaliseProvenanceArray(props.provenance);
        for (const raw of prov) {
          const entry = raw as Record<string, unknown>;
          if (entry.activityId === activityId) {
            targetTimestamp = entry.timestamp as string;
            break;
          }
        }
        if (targetTimestamp) break;
      }

      if (!targetTimestamp) {
        throw new Error(`Entry with activityId "${activityId}" not found`);
      }

      // Remove all provenance entries with timestamp after the target
      for (const feature of fc.features) {
        const props = feature.properties as Record<string, unknown> | null;
        if (!props) continue;
        const prov = normaliseProvenanceArray(props.provenance);
        props.provenance = prov.filter((raw) => {
          const entry = raw as Record<string, unknown>;
          const ts = entry.timestamp as string;
          return ts <= targetTimestamp!;
        });
      }

      await deps.writeGeoJson(
        storePath,
        itemPath,
        fc as unknown as GeoJsonFeatureCollection
      );
      deps.markDirty();
    },

    async revertThis(
      storePath: string,
      itemPath: string,
      activityId: string
    ): Promise<ReplayResult> {
      assertReplayDeps(deps);

      const fc = await deps.loadGeoJson(storePath, itemPath);
      if (!fc) {
        throw new Error(`Cannot load GeoJSON for ${storePath}/${itemPath}`);
      }

      // Mark entry as deleted in all features' provenance arrays
      for (const feature of fc.features) {
        const props = feature.properties as Record<string, unknown> | null;
        if (!props) continue;
        const prov = normaliseProvenanceArray(props.provenance);
        for (const raw of prov) {
          const entry = raw as Record<string, unknown>;
          if (entry.activityId === activityId) {
            entry.deleted = true;
          }
        }
      }

      // Assemble timeline including deleted to know full order
      const timeline = assembleTimeline(fc, { includeDeleted: true });

      // Collect deleted activity IDs (including the one we just marked)
      const deletedActivityIds = timeline
        .filter((e) => e.deleted === true)
        .map((e) => e.activityId);

      // Find the index of the deleted entry
      const deletedIdx = timeline.findIndex(
        (e) => e.activityId === activityId
      );
      if (deletedIdx < 0) {
        throw new Error(`Entry with activityId "${activityId}" not found`);
      }

      // Build replay plan for entries after deleted entry
      // We need to replay from the entry after the deleted one
      const remainingTimeline = timeline.slice(deletedIdx);

      const controller = new AbortController();
      const engine = makeReplayEngine(deps, controller.signal);
      const plan = engine.buildPlan(
        remainingTimeline,
        null,
        deletedActivityIds,
        fc as unknown as GeoJsonFeatureCollection,
        null
      );

      const result = await engine.execute(plan);

      if (result.status === 'completed') {
        // Write the updated GeoJSON with the deleted flag
        await deps.writeGeoJson(
          storePath,
          itemPath,
          fc as unknown as GeoJsonFeatureCollection
        );
        deps.markDirty();
      }

      return result;
    },

    async restoreEntry(
      storePath: string,
      itemPath: string,
      activityId: string
    ): Promise<ReplayResult> {
      assertReplayDeps(deps);

      const fc = await deps.loadGeoJson(storePath, itemPath);
      if (!fc) {
        throw new Error(`Cannot load GeoJSON for ${storePath}/${itemPath}`);
      }

      // Remove deleted flag from the entry in all features' provenance arrays
      for (const feature of fc.features) {
        const props = feature.properties as Record<string, unknown> | null;
        if (!props) continue;
        const prov = normaliseProvenanceArray(props.provenance);
        for (const raw of prov) {
          const entry = raw as Record<string, unknown>;
          if (entry.activityId === activityId) {
            delete entry.deleted;
          }
        }
      }

      // Assemble timeline including deleted for full order
      const timeline = assembleTimeline(fc, { includeDeleted: true });

      // Collect deleted activity IDs (the restored one should no longer be deleted)
      const deletedActivityIds = timeline
        .filter((e) => e.deleted === true)
        .map((e) => e.activityId);

      // Find the index of the restored entry to replay from it onward
      const restoredIdx = timeline.findIndex(
        (e) => e.activityId === activityId
      );
      if (restoredIdx < 0) {
        throw new Error(`Entry with activityId "${activityId}" not found`);
      }

      // Replay from the restored entry onward
      const remainingTimeline = timeline.slice(restoredIdx);

      const controller = new AbortController();
      const engine = makeReplayEngine(deps, controller.signal);
      const plan = engine.buildPlan(
        remainingTimeline,
        null,
        deletedActivityIds,
        fc as unknown as GeoJsonFeatureCollection,
        null
      );

      const result = await engine.execute(plan);

      if (result.status === 'completed') {
        await deps.writeGeoJson(
          storePath,
          itemPath,
          fc as unknown as GeoJsonFeatureCollection
        );
        deps.markDirty();
      }

      return result;
    },

    // Delegated stubs (moved to dedicated services)
    async createSnapshot(): Promise<void> {
      throw new Error(
        'createSnapshot moved to SnapshotService. ' +
        'Use createSnapshotService() from snapshot service module.'
      );
    },

    async branchFrom(_activityId: string): Promise<string> {
      throw new Error(
        'branchFrom moved to BranchService. ' +
        'Use createBranchService() from branch service module.'
      );
    },
  };
}
