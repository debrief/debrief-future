/**
 * Type contract for feature 208 — Kind discriminator for TimelineEntry.
 *
 * This file is a spec artefact, not runtime code. It captures the exact
 * type-surface change consumers of `TimelineEntry` will see after the
 * feature ships. The production types live in:
 *   - shared/components/src/LogPanel/types.ts (TimelineEntry, TimelineEntryKind)
 *   - shared/schemas/src/generated/typescript/types.ts (LogEntry.activity_type, ActivityType)
 *
 * Do not import this file from runtime code.
 */

// ─── Schema-side (LogEntry) ─────────────────────────────────────────────

/**
 * Closed enum mirrored from LinkML `ActivityType`.
 * Source of truth: shared/schemas/src/linkml/log-entry.yaml
 */
export type ActivityType = 'snapshot' | 'tool' | 'tune';

/**
 * Schema LogEntry after feature 208. Only the new field is shown; other
 * fields are unchanged from the existing schema.
 */
export interface LogEntryShapeAfter208 {
  activity_id: string;
  timestamp: string;
  // ...other existing fields...

  /**
   * Semantic discriminator added by feature 208. Optional for backward
   * compatibility with pre-208 records — absent records are treated as
   * `'tool'` by consumers.
   */
  activity_type?: ActivityType;
}

// ─── UI-side (TimelineEntry) ────────────────────────────────────────────

/**
 * Closed union mirroring `ActivityType` on the UI side.
 * Source of truth: shared/components/src/LogPanel/types.ts
 */
export type TimelineEntryKind = 'snapshot' | 'tool' | 'tune';

/**
 * TimelineEntry after feature 208. Only the new field is shown; other
 * fields are unchanged from the existing interface.
 */
export interface TimelineEntryShapeAfter208 {
  activity_id: string;
  toolName: string;
  // ...other existing fields...

  /**
   * Semantic kind. Populated by the VS Code host projection. Optional
   * because Storybook fixtures and legacy mocks may omit it — consumers
   * treat `undefined` the same as `'tool'`.
   */
  kind?: TimelineEntryKind;
}

// ─── Projection contract ────────────────────────────────────────────────

/**
 * Contract for the mapping performed by the VS Code host's
 * `toTimelineEntry` function (in apps/vscode/src/views/logPanelView.ts).
 *
 * Guarantees:
 * - Totality: `kind` is always a member of `TimelineEntryKind`, never undefined.
 * - Non-throwing: any `activity_type` value (including absent, null,
 *   or unrecognised) resolves to a defined kind — fallback is `'tool'`.
 * - No tool-name matching: implementation reads only `activity_type`,
 *   never `toolName` or any tool-ID literal.
 */
export type KindFromActivityType = (
  activityType: ActivityType | undefined | null | string
) => TimelineEntryKind;

/**
 * Reference implementation shape. Production code in logPanelView.ts
 * SHOULD match this shape exactly (see data-model.md §4).
 */
export const kindFromActivityType: KindFromActivityType = (activityType) => {
  switch (activityType) {
    case 'snapshot':
      return 'snapshot';
    case 'tune':
      return 'tune';
    case 'tool':
      return 'tool';
    default:
      return 'tool';
  }
};

// ─── Consumer contract ──────────────────────────────────────────────────

/**
 * After feature 208, consumer code that gates on "is this a snapshot
 * entry?" MUST read `entry.kind === 'snapshot'`. The pattern
 * `resolveToolCategory(entry.toolName).category === 'snapshot'` MUST NOT
 * be used as a semantic gate. (It may still appear inside the rendering
 * layer — ToolCategoryIcon, colour chips, etc. — where it is correctly
 * scoped to visual decisions.)
 */
export const SEMANTIC_SNAPSHOT_CHECK = (entry: TimelineEntryShapeAfter208): boolean =>
  entry.kind === 'snapshot';

// ─── Exhaustiveness contract ────────────────────────────────────────────

/**
 * Demonstrates the exhaustiveness guarantee from SC-004. If a fourth
 * value is added to `TimelineEntryKind`, the TypeScript compiler reports
 * a non-exhaustive switch here. Used as a canary in a unit test.
 */
export function exhaustiveKindSwitch(k: TimelineEntryKind): string {
  switch (k) {
    case 'snapshot':
      return 'manual checkpoint';
    case 'tool':
      return 'tool invocation';
    case 'tune':
      return 'standalone tune';
    default: {
      // If this branch is reachable, the union grew — update every consumer.
      const _exhaustive: never = k;
      return _exhaustive;
    }
  }
}
