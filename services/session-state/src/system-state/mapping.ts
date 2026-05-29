/**
 * Store-slice <-> SystemState variant field mappings (feature 261).
 *
 * The single source for "what migrates" — `read.ts`/`write.ts` never duplicate
 * field lists. These are NOT pure identity maps: the store uses epoch numbers
 * and a `FeatureSelection` object; the feature uses ISO-8601 strings and flat
 * arrays. See contracts/slice-mappings.md (binding).
 *
 * Conversions:
 *   temporal  — epoch <-> ISO via epochToISO/isoToEpoch; null/absent => omit
 *   spatial   — viewport/rotation identity; viewport === null => omit
 *   selection — FeatureSelection.{featureIds,primary} <-> selected_ids/
 *               selected_primary; timestamp regenerated on load; empty => omit
 *   active_storyboard — id identity; null => omit (delegates wire shape to
 *               write.ts/read.ts, same shape as #237, NG-002)
 */
import { createTimeInstant, epochToISO, isoToEpoch } from '../types/temporal.js';
import type { TemporalSlice } from '../types/temporal.js';
import type { SpatialSlice } from '../types/spatial.js';
import type { FeaturesSlice, FeatureSelection } from '../types/features.js';
import type {
  ActiveStoryboardVariant,
  SelectionVariant,
  SpatialVariant,
  SystemStateWriteInput,
  TemporalVariant,
} from './types.js';

// ── Temporal ──────────────────────────────────────────────────────────

/** Store TemporalSlice -> write-input fragment. `timeRange === null` => omit. */
export function temporalSliceToInput(
  s: TemporalSlice,
): SystemStateWriteInput['temporal'] | undefined {
  if (s.timeRange === null) return undefined;
  const out: NonNullable<SystemStateWriteInput['temporal']> = {
    start_time: epochToISO(s.timeRange.start),
    end_time: epochToISO(s.timeRange.end),
    display_mode: s.displayMode,
    step_size: s.stepSize,
    playback_rate: s.playbackRate,
  };
  if (s.currentTime !== null) out.current_time = epochToISO(s.currentTime);
  if (s.timeFilter) {
    if (s.timeFilter.start != null) out.filter_start_time = epochToISO(s.timeFilter.start);
    if (s.timeFilter.end != null) out.filter_end_time = epochToISO(s.timeFilter.end);
  }
  return out;
}

/** SystemState temporal variant -> store-slice fragment. */
export function temporalVariantToSlice(
  v: TemporalVariant | undefined,
): Partial<TemporalSlice> {
  if (!v) return {};
  const slice: Partial<TemporalSlice> = {
    timeRange: { start: isoToEpoch(v.start_time), end: isoToEpoch(v.end_time) },
    currentTime: v.current_time !== undefined ? isoToEpoch(v.current_time) : null,
  };
  if (v.display_mode !== undefined) slice.displayMode = v.display_mode;
  if (v.step_size !== undefined) slice.stepSize = v.step_size;
  if (v.playback_rate !== undefined) slice.playbackRate = v.playback_rate;
  if (v.filter_start_time !== undefined || v.filter_end_time !== undefined) {
    slice.timeFilter = {
      start: v.filter_start_time !== undefined ? isoToEpoch(v.filter_start_time) : undefined,
      end: v.filter_end_time !== undefined ? isoToEpoch(v.filter_end_time) : undefined,
    };
  }
  return slice;
}

// ── Spatial ───────────────────────────────────────────────────────────

/** Store SpatialSlice -> write-input fragment. `viewport === null` => omit. */
export function spatialSliceToInput(
  s: SpatialSlice,
): SystemStateWriteInput['spatial'] | undefined {
  if (s.viewport === null) return undefined;
  const out: NonNullable<SystemStateWriteInput['spatial']> = { viewport: s.viewport };
  if (s.rotation !== undefined && s.rotation !== null) out.rotation = s.rotation;
  return out;
}

/** SystemState spatial variant -> store-slice fragment. */
export function spatialVariantToSlice(v: SpatialVariant | undefined): Partial<SpatialSlice> {
  if (!v) return {};
  const slice: Partial<SpatialSlice> = { viewport: v.viewport };
  if (v.rotation !== undefined) slice.rotation = v.rotation;
  return slice;
}

// ── Selection ─────────────────────────────────────────────────────────

/**
 * Store FeaturesSlice -> selection write-input fragment. Empty selection
 * (`featureIds.length === 0`) => omit (absence and empty are equivalent for
 * selection; "nothing selected" is the default).
 */
export function selectionSliceToInput(
  s: FeaturesSlice,
): SystemStateWriteInput['selection'] | undefined {
  if (!s.selection || s.selection.featureIds.length === 0) return undefined;
  const out: NonNullable<SystemStateWriteInput['selection']> = {
    selected_ids: [...s.selection.featureIds],
  };
  if (s.selection.primary !== null) out.selected_primary = s.selection.primary;
  return out;
}

/**
 * SystemState selection variant -> store selection. `timestamp` is regenerated
 * on load (ephemeral). Returns a fragment carrying the new `selection`.
 */
export function selectionVariantToSlice(
  v: SelectionVariant | undefined,
): Partial<Pick<FeaturesSlice, 'selection'>> {
  if (!v) return {};
  const selection: FeatureSelection = {
    featureIds: [...v.selected_ids],
    primary: v.selected_primary ?? null,
    timestamp: createTimeInstant(Date.now()),
  };
  return { selection };
}

// ── active_storyboard ───────────────────────────────────────────────────

/** Active-storyboard id -> write-input fragment. `null` => omit. */
export function activeStoryboardIdToInput(
  id: string | null,
): SystemStateWriteInput['active_storyboard'] | undefined {
  if (id === null) return undefined;
  return { active_storyboard_id: id };
}

/** Active-storyboard variant -> id (or null when absent). */
export function activeStoryboardVariantToId(
  v: ActiveStoryboardVariant | undefined,
): string | null {
  return v ? v.active_storyboard_id : null;
}
