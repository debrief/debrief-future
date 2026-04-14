/**
 * Contract: Unresolvable-Path Log Entry Schema
 * Feature: 186-nested-child-selection
 *
 * Structured log entry emitted via LogService every time a selection
 * path is found to be unresolvable (FR-027). Entries flow through the
 * existing `@debrief/session-state` LogService channel and render in
 * the Log Panel (feature 176).
 */

import type { UnresolvableReason } from './selection-path';

/**
 * Namespaced event name. All selection-related log events share the
 * `selection.` prefix.
 */
export const LOG_EVENT_UNRESOLVABLE = 'selection.unresolvable-path' as const;

/**
 * Structured payload attached to the log entry's `data` field.
 * Conforms to the LogService structured-entry shape (see
 * `services/session-state/src/log/types.ts`).
 */
export interface UnresolvablePathLogPayload {
  /** Fully-qualified selection path that could not be resolved. */
  readonly path: string;

  /** Specific failure reason. */
  readonly reason: UnresolvableReason;

  /**
   * When the failure was discovered.
   *  - 'click-time':   user tried to add/select a path that cannot resolve
   *                    against current data (rare; usually a bug or race).
   *  - 'restore-time': persisted selection was loaded and a path no longer
   *                    resolves against current data (expected when data
   *                    has been reloaded with changes).
   */
  readonly discoveredAt: 'click-time' | 'restore-time';

  /** Plot identifier the path belongs to, for filtering by plot. */
  readonly plotId: string;

  /**
   * Root feature ID extracted from `path`. Duplicated from `path` for
   * convenience — analysts filtering the log by feature should not have
   * to re-parse paths in query predicates.
   */
  readonly rootFeatureId: string;
}

/**
 * Full log entry shape. The LogService assigns `id` and `timestamp`;
 * the caller provides `level`, `event`, and `data`.
 */
export interface UnresolvablePathLogEntry {
  readonly level: 'warning';
  readonly event: typeof LOG_EVENT_UNRESOLVABLE;
  readonly data: UnresolvablePathLogPayload;
}

/**
 * Helper used by `store/slices/features.ts` and
 * `persistence/resolve.ts` to emit entries consistently. The return
 * value is the payload before LogService assigns `id` / `timestamp`.
 */
export declare function buildUnresolvablePathEntry(params: {
  path: string;
  reason: UnresolvableReason;
  discoveredAt: 'click-time' | 'restore-time';
  plotId: string;
}): UnresolvablePathLogEntry;
