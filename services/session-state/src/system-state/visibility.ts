/**
 * Per-feature visibility helpers (feature 261, FR-005/FR-009, US3).
 *
 * Visibility is a property of the feature itself: `properties.visible === false`
 * means hidden; absent or `true` means visible. These replace the sidecar's
 * `hiddenFeatureIds` denylist. Both functions are pure (no mutation, new FC).
 *
 * Provenance for visibility transitions is appended by the HOST action via the
 * existing `LogService` (R-012), not by this pure helper.
 */
import type { PlotFeature, PlotFeatureCollection } from './types.js';

function featureIdString(f: PlotFeature): string | null {
  return f.id !== undefined && f.id !== null ? String(f.id) : null;
}

/** Ids of features carrying `properties.visible === false`. */
export function readHiddenFeatureIds(fc: PlotFeatureCollection): string[] {
  const hidden: string[] = [];
  for (const f of fc.features ?? []) {
    const props = f.properties as { visible?: unknown } | null;
    if (props && props.visible === false) {
      const id = featureIdString(f);
      if (id !== null) hidden.push(id);
    }
  }
  return hidden;
}

/**
 * Return a NEW FeatureCollection with `properties.visible = false` set on every
 * feature whose id is in `hiddenIds`, and the flag cleared (omitted) on all
 * others. Features with null/absent ids are passed through unchanged.
 */
export function applyVisibilityToFeatureCollection(
  fc: PlotFeatureCollection,
  hiddenIds: string[],
): PlotFeatureCollection {
  const hiddenSet = new Set(hiddenIds);
  const features = (fc.features ?? []).map((f) => {
    const id = featureIdString(f);
    const props = (f.properties ?? {}) as Record<string, unknown>;
    const shouldHide = id !== null && hiddenSet.has(id);

    if (shouldHide) {
      return { ...f, properties: { ...props, visible: false } };
    }
    // Clear the flag when visible (omit `visible` entirely; absent = visible).
    if ('visible' in props) {
      const { visible: _omit, ...rest } = props;
      void _omit;
      return { ...f, properties: rest };
    }
    return f;
  });
  return { ...fc, features };
}
