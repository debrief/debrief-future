/**
 * Safe feature property access helpers.
 *
 * DebriefFeature is a union of schema types with strongly-typed properties.
 * Some code paths need dynamic property access (e.g., reading 'style' on a
 * feature whose exact variant is unknown at compile time). These helpers
 * provide a single, audited escape hatch instead of scattering `as unknown
 * as Record<string, unknown>` throughout the codebase (ADR-011).
 */

import type { DebriefFeature } from '@debrief/components';

/**
 * Access DebriefFeature properties as a loosely-typed record.
 *
 * All DebriefFeature variants extend BaseFeatureProperties. Their property
 * objects are structurally compatible with Record<string, unknown>; this
 * helper provides a single cast site for that conversion.
 */
// eslint-disable-next-line no-restricted-syntax
export const propsRecord = (f: DebriefFeature): Record<string, unknown> => f.properties as Record<string, unknown>;

/**
 * Parse JSON string and return unknown for safe narrowing.
 * Replaces `JSON.parse(text) as unknown` throughout the codebase.
 */
export function parseJsonSafe(text: string): unknown {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return JSON.parse(text);
}
