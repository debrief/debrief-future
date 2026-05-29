/**
 * Zod validators for the four SystemState variants + the temporal cross-field
 * invariants (feature 261, FR-004/FR-011/FR-012, R-003).
 *
 * The generated `SystemStateProperties` is a flat interface (`kind: string`,
 * `state_type: string`) — an `Extract<…>` against it resolves to `never`. So
 * the per-variant value types are produced by `z.infer` of the schemas below,
 * and a compile-time drift guard (bottom of this file) asserts that every
 * inferred variant key is a real `SystemStateProperties` slot, so a renamed or
 * removed schema field fails `tsc`.
 */
import { z } from 'zod';
import type { SystemStateProperties } from '@debrief/schemas';
import type {
  ActiveStoryboardVariant,
  SelectionVariant,
  SpatialVariant,
  TemporalVariant,
} from './types.js';

const coordinateSchema = z
  .object({
    longitude: z.number().min(-180).max(180),
    latitude: z.number().min(-90).max(90),
  })
  .strict();

const viewportSchema = z
  .object({
    coordinates: z.array(coordinateSchema).length(4),
    zoom: z.number().optional(),
  })
  .strict();

const timeStepSchema = z
  .object({
    value: z.number(),
    unit: z.enum(['millisecond', 'second', 'minute', 'hour', 'day']),
  })
  .strict();

export const temporalSchema = z
  .object({
    kind: z.literal('SYSTEM'),
    state_type: z.literal('temporal'),
    start_time: z.string(),
    end_time: z.string(),
    current_time: z.string().optional(),
    filter_start_time: z.string().optional(),
    filter_end_time: z.string().optional(),
    display_mode: z.enum(['full', 'trail']).optional(),
    step_size: timeStepSchema.optional(),
    playback_rate: z.number().min(0.1).max(100).optional(),
  })
  .strict();

export const spatialSchema = z
  .object({
    kind: z.literal('SYSTEM'),
    state_type: z.literal('spatial'),
    viewport: viewportSchema,
    rotation: z.number().min(0).max(360).optional(),
  })
  .strict();

export const selectionSchema = z
  .object({
    kind: z.literal('SYSTEM'),
    state_type: z.literal('selection'),
    selected_ids: z.array(z.string()),
    selected_primary: z.string().optional(),
  })
  .strict();

export const activeStoryboardSchema = z
  .object({
    kind: z.literal('SYSTEM'),
    state_type: z.literal('active_storyboard'),
    active_storyboard_id: z.string(),
  })
  .strict();

export const VARIANT_SCHEMAS = {
  temporal: temporalSchema,
  spatial: spatialSchema,
  selection: selectionSchema,
  active_storyboard: activeStoryboardSchema,
} as const;

/**
 * Temporal cross-field invariants (FR-011). Returns a human-readable violation
 * message, or `null` when the variant is internally consistent. No clamping.
 */
export function checkTemporalCrossField(v: TemporalVariant): string | null {
  const start = Date.parse(v.start_time);
  const end = Date.parse(v.end_time);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return `start_time/end_time must be parseable ISO-8601 datetimes`;
  }
  if (start > end) {
    return `start_time (${v.start_time}) must be <= end_time (${v.end_time})`;
  }
  if (v.current_time !== undefined) {
    const current = Date.parse(v.current_time);
    if (Number.isNaN(current)) {
      return `current_time must be a parseable ISO-8601 datetime`;
    }
    if (current < start || current > end) {
      return `current_time (${v.current_time}) must lie within [${v.start_time}, ${v.end_time}]`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Compile-time drift guard (R-003): every inferred-variant key must be a real
// SystemStateProperties slot. A renamed/removed generated field fails tsc here.
// ---------------------------------------------------------------------------
type _SystemStateKey = keyof SystemStateProperties;
type _AssertKeysAreSlots<T> = keyof T extends _SystemStateKey ? true : never;

const _temporalKeysOk: _AssertKeysAreSlots<TemporalVariant> = true;
const _spatialKeysOk: _AssertKeysAreSlots<SpatialVariant> = true;
const _selectionKeysOk: _AssertKeysAreSlots<SelectionVariant> = true;
const _activeKeysOk: _AssertKeysAreSlots<ActiveStoryboardVariant> = true;

export const SYSTEM_STATE_SCHEMA_DRIFT_OK: boolean =
  _temporalKeysOk && _spatialKeysOk && _selectionKeysOk && _activeKeysOk;
