/**
 * Read SystemState features from a FeatureCollection (feature 261, FR-007).
 *
 * Pure, order-independent, no mutation. Returns `{}` when there are no SYSTEM
 * features. Throws `SystemStateLoadError` (strict-on-import, Article XIV.4) on:
 *   - two features sharing a state_type        → multiple-features-with-same-state-type
 *   - a SYSTEM feature with no/blank state_type → missing-discriminator
 *   - an unrecognised state_type value          → unknown-state-type
 *   - a feature failing its variant Zod schema  → malformed-feature
 *   - a temporal cross-field violation          → cross-field-invariant
 * Absence of a variant is NOT an error (FR-008).
 */
import { SystemStateLoadError } from './errors.js';
import type {
  PlotFeature,
  PlotFeatureCollection,
  SystemStateMap,
  SystemStateType,
} from './types.js';
import { checkTemporalCrossField, VARIANT_SCHEMAS } from './validate.js';

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
): SystemStateMap {
  const systemFeatures = (fc.features ?? []).filter(isSystemFeature);
  const map: SystemStateMap = {};

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
      const violation = checkTemporalCrossField(result.data as import('./types.js').TemporalVariant);
      if (violation) {
        throw new SystemStateLoadError({
          kind: 'cross-field-invariant',
          featureIds: [featureId(f)],
          message: `SystemState feature "${featureId(f)}" violates a temporal invariant: ${violation}.`,
        });
      }
    }

    // result.data is the validated, fully-typed variant.
    (map as Record<SystemStateType, unknown>)[stateType] = result.data;
  }

  return map;
}
