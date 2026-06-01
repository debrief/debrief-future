/**
 * Per-feature visibility helpers (feature 261, FR-005/FR-009, US3).
 *
 * Visibility is a property of the feature itself: `properties.visible === false`
 * means hidden; absent or `true` means visible. These replace the sidecar's
 * `hiddenFeatureIds` denylist. All functions are pure (no mutation, new FC).
 *
 * `applyVisibilityToFeatureCollection` writes only the flags. The
 * provenance-aware `applyVisibilityWithProvenance` (FR-013/FR-021) additionally
 * appends a visibility-change `LogEntry` to the *affected feature's own*
 * `provenance[]`, bounded to saved states — it is called by the host at save
 * time, comparing the FeatureCollection's current `visible` flags against the
 * new hidden set, so only genuine transitions are logged (not every transient
 * toggle). The growth this produces is an accepted rough edge (FR-014 / NG-003).
 */
import { buildVisibilityChangeLogEntry } from '../log/entryBuilder.js';
import type { LogEntry } from '../log/types.js';
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

/** Options for {@link applyVisibilityWithProvenance} (feature 261, FR-013). */
export interface VisibilityProvenanceOptions {
  /** Human actor recorded on each visibility-change provenance entry. */
  readonly actor: string;
  /** ISO-8601 timestamp for the change (defaults to `now`). */
  readonly timestamp?: string;
}

/**
 * Like {@link applyVisibilityToFeatureCollection}, but ALSO appends a
 * visibility-change `LogEntry` to the `provenance[]` of every feature whose
 * visibility genuinely changes relative to its current `visible` flag
 * (FR-013/FR-021). Bounded to saved states: a feature already at the target
 * visibility gets no entry, so repeated saves of an unchanged plot append
 * nothing. Pure — the input is not mutated; features without an id are passed
 * through unchanged (they cannot be addressed by the hidden set).
 */
export function applyVisibilityWithProvenance(
  fc: PlotFeatureCollection,
  hiddenIds: string[],
  opts: VisibilityProvenanceOptions,
): PlotFeatureCollection {
  const hiddenSet = new Set(hiddenIds);
  const timestamp = opts.timestamp ?? new Date().toISOString();
  const features = (fc.features ?? []).map((f) => {
    const id = featureIdString(f);
    const props = (f.properties ?? {}) as Record<string, unknown>;
    const priorVisible = props.visible !== false;
    const shouldHide = id !== null && hiddenSet.has(id);
    const newVisible = !shouldHide;

    // Set/clear the flag exactly as the flag-only helper does.
    let nextProps: Record<string, unknown>;
    if (shouldHide) {
      nextProps = { ...props, visible: false };
    } else if ('visible' in props) {
      const { visible: _omit, ...rest } = props;
      void _omit;
      nextProps = rest;
    } else {
      nextProps = props;
    }

    // FR-013/FR-021: log only a genuine transition on an addressable feature.
    if (id !== null && priorVisible !== newVisible) {
      const existing = Array.isArray(nextProps.provenance)
        ? (nextProps.provenance as LogEntry[])
        : [];
      const entry = buildVisibilityChangeLogEntry({
        feature_id: id,
        visible: newVisible,
        actor: opts.actor,
        timestamp,
      });
      nextProps = { ...nextProps, provenance: [...existing, entry] };
    }

    return nextProps === props ? f : { ...f, properties: nextProps };
  });
  return { ...fc, features };
}
