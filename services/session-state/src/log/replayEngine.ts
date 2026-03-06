/**
 * Replay Engine — sequential tool re-invocation for parameter tuning.
 * Feature: 076-replay-tune (E02, Phase 6)
 *
 * Design: This is a THIN ORCHESTRATOR that coordinates MCP tool calls.
 * It does NOT manipulate features directly — all computation happens in
 * Python tools invoked via the ToolExecutor callback. The ReplayPlan is
 * a plain serialisable JSON structure so the replay coordinator can move
 * to Python in a future phase without changing the data contract.
 *
 * Pure engine: receives callbacks for tool execution, snapshot loading,
 * version resolution, and progress reporting via dependency injection.
 */

import type {
  LogEntry,
  TuneTarget,
  TuneAnnotation,
  ReplayEntry,
  ReplayPlan,
  ReplayResult,
  ReplayEngineDeps,
  ReplayEngine,
  ArtifactVersion,
  GeoJsonFeatureCollection,
  ParameterValue,
} from './types.js';

/**
 * Unwrap a parameter map from ParameterValue wrappers to raw values.
 * If a parameter is already a raw value (no `.value` wrapper), pass it through.
 */
function unwrapParameters(
  params: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(params)) {
    if (
      val !== null &&
      typeof val === 'object' &&
      'value' in (val as Record<string, unknown>)
    ) {
      result[key] = (val as ParameterValue).value;
    } else {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Deep-clone a GeoJSON FeatureCollection for rollback purposes.
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Create a ReplayEngine instance with the given dependencies.
 */
export function createReplayEngine(deps: ReplayEngineDeps): ReplayEngine {
  return {
    buildPlan(
      timeline: LogEntry[],
      tuneTarget: TuneTarget | null,
      deletedActivityIds: string[],
      currentState: GeoJsonFeatureCollection,
      snapshotAsset: string | null
    ): ReplayPlan {
      const deletedSet = new Set(deletedActivityIds);

      // Find the index of the tune target entry (or the first entry for full replay)
      let startIndex = 0;
      if (tuneTarget) {
        const tuneIdx = timeline.findIndex(
          (e) => e.activityId === tuneTarget.activityId
        );
        if (tuneIdx >= 0) {
          startIndex = tuneIdx;
        }
      }

      // Collect entries from startIndex onward, skipping deleted and disabled
      const entries: ReplayEntry[] = [];
      for (let i = startIndex; i < timeline.length; i++) {
        const entry = timeline[i];
        if (deletedSet.has(entry.activityId)) continue;
        if (entry.disabled === true) continue;

        const rawParams = unwrapParameters(
          entry.wasGeneratedBy.parameters as Record<string, unknown>
        );

        // If this is the tune target entry, apply the new parameter value
        const isTune =
          tuneTarget !== null && entry.activityId === tuneTarget.activityId;
        if (isTune) {
          rawParams[tuneTarget.parameter] = tuneTarget.newValue;
        }

        entries.push({
          activityId: entry.activityId,
          timestamp: entry.timestamp,
          toolId: entry.wasGeneratedBy.tool,
          toolVersion: entry.wasGeneratedBy.toolVersion,
          parameters: rawParams,
          featureIds: [...entry.used],
          isTuneTarget: isTune,
        });
      }

      return {
        startFromSnapshot: snapshotAsset,
        entries,
        tuneTarget,
        preReplayState: deepClone(currentState),
      };
    },

    async execute(plan: ReplayPlan): Promise<ReplayResult> {
      const artifactsCreated: ArtifactVersion[] = [];
      let entriesReplayed = 0;
      const totalEntries = plan.entries.length;

      // Phase 1: Load snapshot if needed
      if (plan.startFromSnapshot) {
        if (deps.signal.aborted) {
          return {
            status: 'cancelled',
            entriesReplayed: 0,
            totalEntries,
            haltReason: null,
            tuneAnnotation: null,
            artifactsCreated: [],
          };
        }

        deps.onProgress({
          current: 0,
          total: totalEntries,
          currentToolId: '',
          phase: 'loading-snapshot',
        });

        // Load snapshot via deps - the caller is responsible for applying it
        // We just report the phase; actual loading is handled externally
      }

      // Phase 2: Replay each entry in order
      for (let i = 0; i < plan.entries.length; i++) {
        // Check abort signal
        if (deps.signal.aborted) {
          return {
            status: 'cancelled',
            entriesReplayed,
            totalEntries,
            haltReason: null,
            tuneAnnotation: null,
            artifactsCreated,
          };
        }

        const entry = plan.entries[i];

        // Resolve installed tool version.
        // "0.0.0" is the fallback placeholder used when the recording side
        // didn't know the real version (e.g. MCP annotations missing).
        // Treat it as "any version" so replay isn't blocked.
        const installedVersion = await deps.resolveToolVersion(entry.toolId);
        if (
          installedVersion !== null &&
          installedVersion !== entry.toolVersion &&
          entry.toolVersion !== '0.0.0'
        ) {
          return {
            status: 'halted',
            entriesReplayed,
            totalEntries,
            haltReason: {
              type: 'version-mismatch',
              entryActivityId: entry.activityId,
              toolId: entry.toolId,
              message: `Tool "${entry.toolId}" version mismatch: expected ${entry.toolVersion}, installed ${installedVersion}`,
            },
            tuneAnnotation: null,
            artifactsCreated,
          };
        }

        // Report progress
        deps.onProgress({
          current: i + 1,
          total: totalEntries,
          currentToolId: entry.toolId,
          phase: 'replaying',
        });

        // Execute the tool, passing the original activityId so the callee
        // can stamp it on output provenance (prevents duplicate timeline entries).
        const result = await deps.executeTool(
          entry.toolId,
          entry.featureIds,
          entry.parameters,
          entry.activityId,
          entry.timestamp
        );

        if (!result.success) {
          return {
            status: 'halted',
            entriesReplayed,
            totalEntries,
            haltReason: {
              type: 'execution-error',
              entryActivityId: entry.activityId,
              toolId: entry.toolId,
              message: `Tool "${entry.toolId}" execution failed during replay`,
            },
            tuneAnnotation: null,
            artifactsCreated,
          };
        }

        // Track artifacts
        if (result.artifactHref && result.resultId) {
          artifactsCreated.push({
            resultId: result.resultId,
            version: artifactsCreated.length + 1,
            path: result.artifactHref,
            previousPath: '',
          });
        }

        entriesReplayed++;
      }

      // Phase 3: Finalise
      deps.onProgress({
        current: totalEntries,
        total: totalEntries,
        currentToolId: '',
        phase: 'finalising',
      });

      // Build tune annotation if there was a tune target
      let tuneAnnotation: TuneAnnotation | null = null;
      if (plan.tuneTarget) {
        tuneAnnotation = {
          timestamp: new Date().toISOString(),
          parameter: plan.tuneTarget.parameter,
          previousValue: plan.tuneTarget.previousValue,
          newValue: plan.tuneTarget.newValue,
        };
      }

      return {
        status: 'completed',
        entriesReplayed,
        totalEntries,
        haltReason: null,
        tuneAnnotation,
        artifactsCreated,
      };
    },
  };
}
