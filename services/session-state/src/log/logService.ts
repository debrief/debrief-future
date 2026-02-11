/**
 * Log Service implementation.
 * Feature: 071-log-recording-service (E02, Phase 1)
 *
 * Orchestrates Log entry creation, provenance writes, dirty tracking,
 * and timeline assembly.
 */

import type {
  LogEntry,
  LogService,
  RecordResult,
  TimelineOptions,
  ToolResultForLog,
  ExpandedToolResultFields,
  FeatureProvenance,
} from './types.js';
import {
  buildLogEntry,
  extractActivityIdFromOutputFeatures,
} from './entryBuilder.js';
import { assembleTimeline } from './timeline.js';

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

    // Phase 4-6 stubs (FR-017)
    async tuneEntry(
      _activityId: string,
      _parameter: string,
      _newValue: unknown
    ): Promise<void> {
      throw new Error('tuneEntry is not implemented (Phase 6)');
    },

    async revertTo(_activityId: string): Promise<void> {
      throw new Error('revertTo is not implemented (Phase 6)');
    },

    async revertThis(_activityId: string): Promise<void> {
      throw new Error('revertThis is not implemented (Phase 6)');
    },

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
