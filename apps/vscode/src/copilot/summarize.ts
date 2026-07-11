/**
 * Thinned, token-bounded plot summary for the Copilot spike (#284, R8).
 *
 * Builds the metadata + per-feature inventory the model reads to target an
 * edit (names, types, platforms, time spans, counts — never geometry), caps
 * the inventory to a fixed budget (flagging truncation), and reports an
 * approximate token size (FR-025). The token estimate uses a char/word
 * heuristic — a spike does not pull in a tokenizer dependency.
 */

import type { DebriefFeature } from '@debrief/schemas';
import {
  isTrackFeature,
  isReferenceLocation,
  isMultiPointFeature,
  isMultiPolygonFeature,
} from '@debrief/schemas';
import type {
  FeatureInventoryEntry,
  OpenPlotView,
  PlotSummaryView,
  TimeSpan,
} from './types';

/** Max features listed before the inventory is truncated (edge case). */
export const INVENTORY_CAP = 200;

/** Rough chars-per-token used by the FR-025 heuristic (no tokenizer dep). */
const CHARS_PER_TOKEN = 4;

/** Estimate token size of a JSON-serialisable value (char/4 heuristic). */
export function approximateTokens(value: unknown): number {
  return Math.ceil(JSON.stringify(value).length / CHARS_PER_TOKEN);
}

/** A non-empty string, or null. */
function nonEmpty(value: string | undefined): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

/** The display name for a feature (platform / label / id fallback). */
export function featureDisplayName(feature: DebriefFeature): string {
  if (isTrackFeature(feature)) {
    return (
      nonEmpty(feature.properties.display_name) ??
      nonEmpty(feature.properties.platform_name) ??
      nonEmpty(feature.properties.platform_id) ??
      String(feature.id)
    );
  }
  // Every non-track feature (POINT / MULTI_POINT / MULTI_POLYGON / annotation)
  // carries an optional `label`.
  const label = 'label' in feature.properties ? feature.properties.label : undefined;
  return nonEmpty(label) ?? String(feature.id);
}

/** The kind discriminator (TRACK / POINT / …) — present on every feature. */
function featureType(feature: DebriefFeature): string {
  return feature.properties.kind;
}

/** Track-only time span from start_time/end_time; else null. */
function featureTimeSpan(feature: DebriefFeature): TimeSpan | null {
  if (isTrackFeature(feature)) {
    const { start_time, end_time } = feature.properties;
    if (start_time && end_time) {
      return { start: start_time, end: end_time };
    }
  }
  return null;
}

/** Number of points a feature contributes, or null when not applicable. */
function featurePointCount(feature: DebriefFeature): number | null {
  if (isTrackFeature(feature)) {
    return feature.properties.positions?.length ?? null;
  }
  if (isMultiPointFeature(feature) || isMultiPolygonFeature(feature)) {
    const coords = feature.geometry.coordinates;
    return Array.isArray(coords) ? coords.length : null;
  }
  if (isReferenceLocation(feature)) {
    return 1;
  }
  return null;
}

/** Project a feature to a thinned inventory entry (no geometry). */
export function toInventoryEntry(feature: DebriefFeature): FeatureInventoryEntry {
  const platform = isTrackFeature(feature)
    ? feature.properties.platform_name ?? feature.properties.platform_id ?? null
    : null;
  return {
    id: String(feature.id),
    name: featureDisplayName(feature),
    type: featureType(feature),
    platform,
    timeSpan: featureTimeSpan(feature),
    pointCount: featurePointCount(feature),
  };
}

/** Input for {@link buildPlotSummary}. */
export interface SummaryInput {
  plotId: string;
  title: string;
  timeSpan: TimeSpan | null;
  features: DebriefFeature[];
  openPlots: OpenPlotView[];
  /** True when scoped to the current selection (US4). */
  selectionOnly?: boolean;
}

/**
 * Build a token-bounded plot summary.
 *
 * @param input - plot metadata, the features to inventory, and open plots.
 */
export function buildPlotSummary(input: SummaryInput): PlotSummaryView {
  const truncated = input.features.length > INVENTORY_CAP;
  const features = input.features
    .slice(0, INVENTORY_CAP)
    .map(toInventoryEntry);

  const summary: PlotSummaryView = {
    plotId: input.plotId,
    title: input.title,
    timeSpan: input.timeSpan,
    features,
    truncated,
    approxTokens: 0,
    openPlots: input.openPlots,
    ...(input.selectionOnly ? { selectionOnly: true } : {}),
  };

  // Stamp the probe last, over the emitted payload (self-consistent count).
  summary.approxTokens = approximateTokens({ ...summary, approxTokens: 0 });
  return summary;
}
