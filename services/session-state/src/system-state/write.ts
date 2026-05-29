/**
 * Write SystemState features into a FeatureCollection (feature 261, FR-009).
 *
 * For each populated key in `input`, upsert the `state.<type>` Feature: replace
 * the matching feature's properties in place (by state_type) if present, else
 * insert a new feature with the deterministic id and empty-Point geometry.
 * Absent keys are left unchanged (no delete API). Returns a NEW FeatureCollection
 * — the input is never mutated. NO `provenance` is written on `state.*` features
 * (FR-013 — view-state markers are lean).
 */
import type {
  PlotFeature,
  PlotFeatureCollection,
  SystemStateType,
  SystemStateWriteInput,
} from './types.js';
import { STATE_FEATURE_ID } from './types.js';

const ORDERED_TYPES: readonly SystemStateType[] = [
  'temporal',
  'spatial',
  'selection',
  'active_storyboard',
];

function buildStateFeature(
  stateType: SystemStateType,
  payload: Record<string, unknown>,
): PlotFeature {
  return {
    type: 'Feature',
    id: STATE_FEATURE_ID[stateType],
    geometry: { type: 'Point', coordinates: [] },
    properties: {
      kind: 'SYSTEM',
      state_type: stateType,
      ...payload,
    },
  };
}

export function writeSystemStateIntoFeatureCollection(
  fc: PlotFeatureCollection,
  input: SystemStateWriteInput,
): PlotFeatureCollection {
  // Pass-through copy of every feature that is NOT a SYSTEM feature whose
  // state_type we are about to upsert. Other SYSTEM features (if any) are
  // preserved untouched.
  const upsertingTypes = new Set<string>(
    ORDERED_TYPES.filter((t) => input[t] !== undefined),
  );

  const retained = (fc.features ?? []).filter((f) => {
    const props = f.properties as { kind?: unknown; state_type?: unknown } | null;
    if (!props || props.kind !== 'SYSTEM') return true;
    return !upsertingTypes.has(String(props.state_type));
  });

  const upserted: PlotFeature[] = [];
  for (const stateType of ORDERED_TYPES) {
    const payload = input[stateType];
    if (payload === undefined) continue;
    upserted.push(buildStateFeature(stateType, payload as Record<string, unknown>));
  }

  return {
    ...fc,
    features: [...retained, ...upserted],
  };
}
