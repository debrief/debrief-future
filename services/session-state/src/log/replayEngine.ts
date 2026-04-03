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
          (e) => e.activity_id === tuneTarget.activity_id
        );
        if (tuneIdx >= 0) {
          startIndex = tuneIdx;
        }
      }

      // Collect entries from startIndex onward, skipping deleted and disabled
      const entries: ReplayEntry[] = [];
      for (let i = startIndex; i < timeline.length; i++) {
        const entry = timeline[i]!;
        if (deletedSet.has(entry.activity_id)) continue;
        if (entry.disabled === true) continue;

        const rawParams = unwrapParameters(
          entry.was_generated_by.parameters as Record<string, unknown>
        );

        // If this is the tune target entry, apply the new parameter value
        const isTune =
          tuneTarget !== null && entry.activity_id === tuneTarget.activity_id;
        if (isTune) {
          rawParams[tuneTarget.parameter] = tuneTarget.new_value;
        }

        entries.push({
          activity_id: entry.activity_id,
          timestamp: entry.timestamp,
          tool_id: entry.was_generated_by.tool,
          tool_version: entry.was_generated_by.tool_version,
          parameters: rawParams,
          feature_ids: [...entry.used],
          is_tune_target: isTune,
        });
      }

      return {
        start_from_snapshot: snapshotAsset,
        entries,
        tune_target: tuneTarget,
        pre_replay_state: deepClone(currentState),
      };
    },

    async execute(plan: ReplayPlan): Promise<ReplayResult> {
      const artifactsCreated: ArtifactVersion[] = [];
      let entriesReplayed = 0;
      const totalEntries = plan.entries.length;

      // Phase 1: Load snapshot if needed
      if (plan.start_from_snapshot) {
        if (deps.signal.aborted) {
          return {
            status: 'cancelled',
            entries_replayed: 0,
            total_entries: totalEntries,
            halt_reason: null,
            tune_annotation: null,
            artifacts_created: [],
          };
        }

        deps.on_progress({
          current: 0,
          total: totalEntries,
          current_tool_id: '',
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
            entries_replayed: entriesReplayed,
            total_entries: totalEntries,
            halt_reason: null,
            tune_annotation: null,
            artifacts_created: artifactsCreated,
          };
        }

        const entry = plan.entries[i]!;

        // Resolve installed tool version.
        // "0.0.0" is the fallback placeholder used when the recording side
        // didn't know the real version (e.g. MCP annotations missing).
        // Treat it as "any version" so replay isn't blocked.
        const installedVersion = await deps.resolve_tool_version(entry.tool_id);
        if (
          installedVersion !== null &&
          installedVersion !== entry.tool_version &&
          entry.tool_version !== '0.0.0'
        ) {
          return {
            status: 'halted',
            entries_replayed: entriesReplayed,
            total_entries: totalEntries,
            halt_reason: {
              type: 'version-mismatch',
              entry_activity_id: entry.activity_id,
              tool_id: entry.tool_id,
              message: `Tool "${entry.tool_id}" version mismatch: expected ${entry.tool_version}, installed ${installedVersion}`,
            },
            tune_annotation: null,
            artifacts_created: artifactsCreated,
          };
        }

        // Report progress
        deps.on_progress({
          current: i + 1,
          total: totalEntries,
          current_tool_id: entry.tool_id,
          phase: 'replaying',
        });

        // Execute the tool, passing the original activityId so the callee
        // can stamp it on output provenance (prevents duplicate timeline entries).
        const result = await deps.execute_tool(
          entry.tool_id,
          entry.feature_ids,
          entry.parameters,
          entry.activity_id,
          entry.timestamp
        );

        if (!result.success) {
          return {
            status: 'halted',
            entries_replayed: entriesReplayed,
            total_entries: totalEntries,
            halt_reason: {
              type: 'execution-error',
              entry_activity_id: entry.activity_id,
              tool_id: entry.tool_id,
              message: `Tool "${entry.tool_id}" execution failed during replay`,
            },
            tune_annotation: null,
            artifacts_created: artifactsCreated,
          };
        }

        // Track artifacts
        if (result.artifact_href && result.result_id) {
          artifactsCreated.push({
            result_id: result.result_id,
            version: artifactsCreated.length + 1,
            path: result.artifact_href,
            previous_path: '',
          });
        }

        entriesReplayed++;
      }

      // Phase 3: Finalise
      deps.on_progress({
        current: totalEntries,
        total: totalEntries,
        current_tool_id: '',
        phase: 'finalising',
      });

      // Build tune annotation if there was a tune target
      let tuneAnnotation: TuneAnnotation | null = null;
      if (plan.tune_target) {
        tuneAnnotation = {
          timestamp: new Date().toISOString(),
          parameter: plan.tune_target.parameter,
          previous_value: plan.tune_target.previous_value,
          new_value: plan.tune_target.new_value,
        };
      }

      return {
        status: 'completed',
        entries_replayed: entriesReplayed,
        total_entries: totalEntries,
        halt_reason: null,
        tune_annotation: tuneAnnotation,
        artifacts_created: artifactsCreated,
      };
    },
  };
}
