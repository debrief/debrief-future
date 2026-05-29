/**
 * Read SystemState features from a FeatureCollection (feature 261, FR-007).
 *
 * Pure, order-independent, no mutation. Returns `{ map: {}, playheadClamps: [] }`
 * when there are no SYSTEM features. Throws `SystemStateLoadError`
 * (strict-on-import, Article XIV.4) on:
 *   - two features sharing a state_type        → multiple-features-with-same-state-type
 *   - a SYSTEM feature with no/blank state_type → missing-discriminator
 *   - an unrecognised state_type value          → unknown-state-type
 *   - a feature failing its variant Zod schema  → malformed-feature
 *   - a FATAL temporal cross-field violation    → cross-field-invariant
 * Absence of a variant is NOT an error (FR-008).
 *
 * Spec 267: a temporal `SystemState` whose `current_time` falls outside an
 * otherwise-coherent `[start_time, end_time]` window is NOT fatal — the playhead
 * is clamped to the nearest edge in `map.temporal` and reported in
 * `playheadClamps` (the sanctioned Article XIV.4 relaxation). An incoherent
 * window (`start_time > end_time`) still throws.
 */
import { SystemStateLoadError } from './errors.js';
import type {
  PlayheadClampDiagnostic,
  PlotFeature,
  PlotFeatureCollection,
  SystemStateMap,
  SystemStateType,
  TemporalVariant,
} from './types.js';
import { checkTemporalCrossField, VARIANT_SCHEMAS } from './validate.js';

/**
 * Result of reading SystemState features from a FeatureCollection (spec 267).
 *
 * The explicit `playheadClamps` array (review decision 1A — chosen over an
 * optional mutable out-param) surfaces any tolerant clamp as a visible value,
 * so a caller cannot silently drop the diagnostic. `[]` when nothing clamped.
 */
export interface ReadSystemStateResult {
  map: SystemStateMap;
  playheadClamps: PlayheadClampDiagnostic[];
}

const KNOWN_STATE_TYPES: readonly SystemStateType[] = [
  'temporal',
  'spatial',
  'selection',
  'active_storyboard',
];

function featureId(f: PlotFeature): string {
  return f.id !== undefined && f.id !== null ? String(f.id) : '<no-id>';
}

function isSystemFeature(f: PlotFeature): boolean {
  return !!f.properties && (f.properties as { kind?: unknown }).kind === 'SYSTEM';
}

export function readSystemStateFromFeatureCollection(
  fc: PlotFeatureCollection,
): ReadSystemStateResult {
  const systemFeatures = (fc.features ?? []).filter(isSystemFeature);
  const map: SystemStateMap = {};
  const playheadClamps: PlayheadClampDiagnostic[] = [];

  // First pass: detect duplicate state_types (FR-003) before validating, so a
  // duplicate is reported as such even if one copy is also malformed.
  const byType = new Map<string, PlotFeature[]>();
  for (const f of systemFeatures) {
    const props = f.properties as Record<string, unknown>;
    const st = props.state_type;
    if (typeof st === 'string' && st.length > 0) {
      const list = byType.get(st) ?? [];
      list.push(f);
      byType.set(st, list);
    }
  }
  for (const [st, list] of byType) {
    if (list.length > 1) {
      throw new SystemStateLoadError({
        kind: 'multiple-features-with-same-state-type',
        featureIds: list.map(featureId),
        message: `Plot contains ${list.length} SystemState features with state_type="${st}"; at most one is allowed.`,
      });
    }
  }

  for (const f of systemFeatures) {
    const props = f.properties as Record<string, unknown>;
    const st = props.state_type;

    if (typeof st !== 'string' || st.length === 0) {
      throw new SystemStateLoadError({
        kind: 'missing-discriminator',
        featureIds: [featureId(f)],
        message: `SystemState feature "${featureId(f)}" is missing a state_type discriminator.`,
      });
    }

    if (!KNOWN_STATE_TYPES.includes(st as SystemStateType)) {
      throw new SystemStateLoadError({
        kind: 'unknown-state-type',
        featureIds: [featureId(f)],
        message: `SystemState feature "${featureId(f)}" has unknown state_type="${st}".`,
      });
    }

    const stateType = st as SystemStateType;
    const result = VARIANT_SCHEMAS[stateType].safeParse(props);
    if (!result.success) {
      throw new SystemStateLoadError({
        kind: 'malformed-feature',
        featureIds: [featureId(f)],
        details: result.error.issues,
        message: `SystemState feature "${featureId(f)}" (state_type="${st}") is malformed: ${result.error.issues
          .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
          .join('; ')}`,
      });
    }

    if (stateType === 'temporal') {
      // result.data is the validated temporal variant (state_type narrowed
      // above); the indexed-schema parse widens the static type to the union.
      const temporal = result.data as TemporalVariant;
      const verdict = checkTemporalCrossField(temporal);
      if (verdict.status === 'fatal') {
        throw new SystemStateLoadError({
          kind: 'cross-field-invariant',
          featureIds: [featureId(f)],
          message: `SystemState feature "${featureId(f)}" violates a temporal invariant: ${verdict.message}.`,
        });
      }
      if (verdict.status === 'recoverable-playhead') {
        // Spec 267 (FR-001/002): clamp the orphaned playhead to the nearest
        // window edge BEFORE it enters the map (a typed copy — no mutation of
        // the Zod-parsed object, no `as`-cast; review decision 2A). The
        // original is non-null here because the verdict only recovers a
        // present, out-of-range current_time.
        const clamped: TemporalVariant = { ...temporal, current_time: verdict.clampedCurrentTime };
        playheadClamps.push({
          kind: 'playhead-clamped',
          feature_id: featureId(f),
          edge: verdict.edge,
          originalCurrentTime: temporal.current_time ?? verdict.clampedCurrentTime,
          clampedCurrentTime: verdict.clampedCurrentTime,
        });
        map.temporal = clamped;
        continue;
      }
    }

    // result.data is the validated, fully-typed variant.
    (map as Record<SystemStateType, unknown>)[stateType] = result.data;
  }

  return { map, playheadClamps };
}
