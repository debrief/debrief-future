/**
 * Storyboard CRUD provenance helpers.
 *
 * Every CRUD mutation appends one LogEntry to the target Feature's
 * inherited `BaseFeatureProperties.provenance[]` slot. Encoding:
 *   - was_generated_by.tool = "storyboard-crud"
 *   - was_generated_by.tool_version = "1.0.0"
 *   - was_generated_by.parameters[0].value = op
 *   - was_generated_by.parameters[1].value = summary (when provided)
 *   - agent = caller-supplied actor string
 *   - execution_duration = "PT0S"
 *
 * Derived read accessors (`getCreatedAt`, `getLastModifiedAt`,
 * `getCreatedBy`, `getLastModifiedBy`) read the first/last entry in
 * `provenance[]` — there are no separate `created_*` / `last_modified_*`
 * slots.
 */

import type { LogEntry } from "@debrief/schemas";

import type { SceneFeature, StoryboardFeature } from "./types";

export const STORYBOARD_CRUD_TOOL = "storyboard-crud";
export const STORYBOARD_CRUD_TOOL_VERSION = "1.0.0";
export const STORYBOARD_CRUD_EXECUTION_DURATION = "PT0S";

export type StoryboardCrudOp =
  | "create"
  | "rename"
  | "describe"
  | "delete"
  | "restore"
  | "update-to-current"
  | "duplicate"
  | "copy-in"
  | "insert-middle"
  | "refresh-thumbnail";

export interface StoryboardCrudLogEntryInput {
  op: StoryboardCrudOp;
  actor: string;
  now: string;
  summary: string;
  used: string[];
  generated: string[];
  activityId: string;
  rationale?: string;
}

/**
 * Build a LogEntry encoding a single storyboard CRUD mutation.
 * Pure — no I/O, no mutation of inputs.
 */
export function buildStoryboardCrudLogEntry(
  input: StoryboardCrudLogEntryInput,
): LogEntry {
  const entry: LogEntry = {
    activity_id: input.activityId,
    timestamp: input.now,
    was_generated_by: {
      tool: STORYBOARD_CRUD_TOOL,
      tool_version: STORYBOARD_CRUD_TOOL_VERSION,
      parameters: [
        { value: input.op },
        { value: input.summary },
      ],
    },
    used: input.used,
    generated: input.generated,
    execution_duration: STORYBOARD_CRUD_EXECUTION_DURATION,
    agent: input.actor,
  };
  if (input.rationale !== undefined) {
    entry.rationale = input.rationale;
  }
  return entry;
}

/**
 * Read the `op` string from a storyboard-crud-emitted LogEntry. Returns
 * null if the entry was not emitted by this module.
 */
export function readStoryboardCrudOp(
  entry: LogEntry,
): StoryboardCrudOp | null {
  if (entry.was_generated_by?.tool !== STORYBOARD_CRUD_TOOL) return null;
  const firstParam = entry.was_generated_by.parameters?.[0]?.value;
  if (typeof firstParam !== "string") return null;
  return firstParam as StoryboardCrudOp;
}

/** Derived accessor: first provenance entry timestamp (= created_at). */
export function getCreatedAt(
  feature: StoryboardFeature | SceneFeature,
): string {
  const first = feature.properties.provenance?.[0];
  if (!first) {
    throw new Error(
      `Feature ${feature.properties.id} has empty provenance[] — cannot derive created_at`,
    );
  }
  return first.timestamp;
}

/** Derived accessor: last provenance entry timestamp (= last_modified_at). */
export function getLastModifiedAt(
  feature: StoryboardFeature | SceneFeature,
): string {
  const entries = feature.properties.provenance ?? [];
  const last = entries[entries.length - 1];
  if (!last) {
    throw new Error(
      `Feature ${feature.properties.id} has empty provenance[] — cannot derive last_modified_at`,
    );
  }
  return last.timestamp;
}

/** Derived accessor: agent on the first provenance entry (= created_by). */
export function getCreatedBy(
  feature: StoryboardFeature | SceneFeature,
): string | null {
  return feature.properties.provenance?.[0]?.agent ?? null;
}

/** Derived accessor: agent on the last provenance entry (= last_modified_by). */
export function getLastModifiedBy(
  feature: StoryboardFeature | SceneFeature,
): string | null {
  const entries = feature.properties.provenance ?? [];
  const last = entries[entries.length - 1];
  if (!last) return null;
  return last.agent ?? null;
}
