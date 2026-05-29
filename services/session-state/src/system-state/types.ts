/**
 * Shared structural GeoJSON + variant types for the SystemState helper
 * (feature 261). Defined structurally (not aliased from `geojson`) for the
 * same reason `@debrief/components` does it: the helper must pass non-SYSTEM
 * features through untouched without dragging in a `geojson.Feature` cast at
 * every boundary, and `@debrief/session-state` cannot depend on
 * `@debrief/components` (that package depends on this one — a cycle).
 *
 * The per-variant value types are the `z.infer` outputs of the Zod schemas in
 * `validate.ts` (R-003): the generated `SystemStateProperties` is a flat
 * interface (`kind: string`, `state_type: string`), so an `Extract<…>` against
 * it resolves to `never`. The Zod schemas are structurally checked against the
 * generated interface so drift fails the build.
 */

import type { ViewportPolygon } from '@debrief/schemas';

/** A GeoJSON-ish feature; properties are loose to allow pass-through. */
export interface PlotFeature {
  type: 'Feature';
  id?: string | number;
  geometry: { type: string; coordinates: unknown } | null;
  properties: Record<string, unknown> | null;
}

/** A plot FeatureCollection — the single source of truth for plot state. */
export interface PlotFeatureCollection {
  type: 'FeatureCollection';
  features: PlotFeature[];
  [key: string]: unknown;
}

export type SystemStateType = 'temporal' | 'spatial' | 'selection' | 'active_storyboard';

export interface TemporalVariant {
  kind: 'SYSTEM';
  state_type: 'temporal';
  start_time: string;
  end_time: string;
  current_time?: string;
  filter_start_time?: string;
  filter_end_time?: string;
  display_mode?: 'full' | 'trail';
  step_size?: { value: number; unit: 'millisecond' | 'second' | 'minute' | 'hour' | 'day' };
  playback_rate?: number;
}

export interface SpatialVariant {
  kind: 'SYSTEM';
  state_type: 'spatial';
  viewport: ViewportPolygon;
  rotation?: number;
}

export interface SelectionVariant {
  kind: 'SYSTEM';
  state_type: 'selection';
  selected_ids: string[];
  selected_primary?: string;
}

export interface ActiveStoryboardVariant {
  kind: 'SYSTEM';
  state_type: 'active_storyboard';
  active_storyboard_id: string;
}

export interface SystemStateMap {
  temporal?: TemporalVariant;
  spatial?: SpatialVariant;
  selection?: SelectionVariant;
  active_storyboard?: ActiveStoryboardVariant;
}

/**
 * Structured record emitted when a temporal `SystemState`'s saved playhead
 * (`current_time`) falls outside an otherwise-coherent `[start_time, end_time]`
 * window and is clamped to the nearest edge on load (spec 267, FR-001/002/003).
 *
 * It is *data*, not UI: the shared load helper produces it and the host renders
 * a non-blocking notification (Article IV.1). The `kind` discriminator
 * deliberately reserves room for further recoverable-load diagnostics (backlog
 * #276) without widening this interface.
 *
 * Invariants:
 *  - Emitted ONLY for a coherent window where `current_time` is strictly outside
 *    `[start_time, end_time]`. Never for in-range/boundary/absent `current_time`
 *    (FR-009), never for an incoherent window (FR-005 — that throws).
 *  - `clampedCurrentTime` is a window boundary's *verbatim* ISO string — exactly
 *    `start_time` (edge `'start'`) or `end_time` (edge `'end'`); no reformatting,
 *    no float drift.
 */
export interface PlayheadClampDiagnostic {
  readonly kind: 'playhead-clamped';
  readonly featureId: string;
  readonly edge: 'start' | 'end';
  readonly originalCurrentTime: string;
  readonly clampedCurrentTime: string;
}

/** Variant payloads to write — kind/state_type are supplied by the helper. */
export interface SystemStateWriteInput {
  temporal?: Omit<TemporalVariant, 'kind' | 'state_type'>;
  spatial?: Omit<SpatialVariant, 'kind' | 'state_type'>;
  selection?: Omit<SelectionVariant, 'kind' | 'state_type'>;
  active_storyboard?: Omit<ActiveStoryboardVariant, 'kind' | 'state_type'>;
}

/**
 * Deterministic on-feature id per variant. Note `active_storyboard` maps to
 * `state.activestoryboard` (no underscore) to satisfy the schema id pattern
 * `^state\.[a-z]+$` and preserve #237's shipped wire shape (NG-002).
 */
export const STATE_FEATURE_ID: Record<SystemStateType, string> = {
  temporal: 'state.temporal',
  spatial: 'state.spatial',
  selection: 'state.selection',
  active_storyboard: 'state.activestoryboard',
};
