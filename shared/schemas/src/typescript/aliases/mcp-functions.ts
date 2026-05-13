/**
 * TS-only function-type aliases for the MCP cluster (#222).
 *
 * Per Research R-002 and spec §FR-004: LinkML describes data shapes,
 * not callable signatures. These aliases are TS-side convenience
 * wrappers whose parameter and return types ARE schema-rooted —
 * imported from the generated `@debrief/schemas` types. Per the audit's
 * R4 rule (schemas import), any file that imports from
 * `@debrief/schemas` is reclassified as schema-rooted, so the function
 * aliases below are NOT hand-typed declarations from the audit's
 * perspective.
 *
 * Two replay-engine callbacks are re-exported here:
 *
 *   - ToolExecutor:        runs a single tool during replay and
 *                          returns a `ToolExecutionResultForReplay`.
 *   - ToolVersionResolver: returns the installed version string of a
 *                          tool (null if not installed).
 *
 * Both are consumed by `services/session-state/src/log/types.ts` via
 * `import type { ToolExecutor, ToolVersionResolver } from '@debrief/schemas'`.
 */

import type {
  ToolExecutionResultForReplay,
} from '../../generated/typescript/types.js';

/**
 * Callback to execute a single tool during replay.
 *
 * Matches the live signature at
 * `services/session-state/src/log/types.ts:383-391` — the optional
 * `activity_id` / `timestamp` args are stamped onto output provenance
 * to preserve ordering.
 */
export type ToolExecutor = (
  tool_id: string,
  feature_ids: string[],
  params: Record<string, unknown>,
  activity_id?: string,
  timestamp?: string,
) => Promise<ToolExecutionResultForReplay>;

/**
 * Callback to get the installed version of a tool.
 *
 * Returns null when the tool is not present in the registry.
 */
export type ToolVersionResolver = (tool_id: string) => Promise<string | null>;
