/**
 * Web-shell wiring helpers for #237 active-Storyboard selection persistence.
 *
 * The actual upsert / remove / scan logic is in the shared @debrief/components
 * helpers; these wrappers adapt them to the web-shell's
 * `(featureCollection, setFeatureCollection)` plot-edit boundary so the
 * `StoryboardPanelMount` component can stay declarative.
 *
 * Pure — no React, no DOM. Testable in plain vitest.
 */

import type { Feature, FeatureCollection } from 'geojson';
import {
  getActiveStoryboardSelection,
  isStoryboardFeature,
  setActiveStoryboardSelection,
  type StoryboardPlot,
} from '@debrief/components';

type StoryboardPlotFeature = StoryboardPlot['features'][number];

function asPlot(fc: FeatureCollection): StoryboardPlot {
  return {
    type: 'FeatureCollection',
    // eslint-disable-next-line no-restricted-syntax -- #235 web-shell mirror of #216 ADR-019.
    features: fc.features as unknown as StoryboardPlotFeature[],
  };
}

function asFeatureCollection(plot: StoryboardPlot): FeatureCollection {
  return {
    type: 'FeatureCollection',
    // eslint-disable-next-line no-restricted-syntax -- #235 web-shell mirror of #216 ADR-019.
    features: plot.features as unknown as Feature[],
  };
}

/**
 * Read the persisted active-Storyboard ID from the plot.
 * Returns null when no SystemState entry exists OR when the recorded ID
 * is not present in the plot's Storyboards (V-2 stale guard).
 */
export function readPersistedActiveStoryboardId(
  fc: FeatureCollection,
): { kind: 'absent' | 'stale' | 'valid'; id: string | null } {
  const plot = asPlot(fc);
  const persisted = getActiveStoryboardSelection(plot);
  if (persisted === null) {
    return { kind: 'absent', id: null };
  }
  const stillExists = plot.features.some(
    (f) => isStoryboardFeature(f) && f.properties.id === persisted,
  );
  if (!stillExists) {
    return { kind: 'stale', id: null };
  }
  return { kind: 'valid', id: persisted };
}

/**
 * Persist the active-Storyboard ID through the edit pipeline.
 * Writes a SystemState feature with state_type=active_storyboard via
 * setFeatureCollection. Pass `null` to clear the pin.
 */
export function persistActiveStoryboardId(
  fc: FeatureCollection,
  id: string | null,
  setFeatureCollection: (next: FeatureCollection) => void,
): void {
  const plot = asPlot(fc);
  const next = setActiveStoryboardSelection(plot, id);
  setFeatureCollection(asFeatureCollection(next));
}
