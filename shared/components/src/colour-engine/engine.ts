/**
 * Core colour assignment engine (#134).
 *
 * Computes colour mappings for a set of STAC items based on a
 * selected colour dimension. Produces both a pre-computed Map
 * (for CatalogOverview) and a function (for TimelineView).
 */

import type {
  ColourDimension,
  ColourPalette,
  ColourAssignment,
  LegendModel,
  LegendEntry,
  GradientSpec,
  StacBrowserItem,
} from './types';
import { interpolateColour, getCategoricalColour, AGE_GRADIENT } from './palette';

/**
 * Format an ISO datetime string for legend display.
 */
function formatDateLabel(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
    });
  } catch {
    return isoString;
  }
}

/**
 * Compute colour assignments for gradient dimensions.
 */
function computeGradientAssignment(
  items: readonly StacBrowserItem[],
  dimension: ColourDimension,
  palette: ColourPalette,
): ColourAssignment {
  // Resolve values and find date range
  const resolved: Array<{ item: StacBrowserItem; value: string | null }> = [];
  let minTime = Infinity;
  let maxTime = -Infinity;
  let hasUnclassified = false;

  for (const item of items) {
    let value: string | null;
    try {
      value = dimension.resolve(item);
    } catch {
      value = null;
    }
    resolved.push({ item, value });

    if (value !== null) {
      const time = new Date(value).getTime();
      if (!isNaN(time)) {
        minTime = Math.min(minTime, time);
        maxTime = Math.max(maxTime, time);
      } else {
        hasUnclassified = true;
      }
    } else {
      hasUnclassified = true;
    }
  }

  const range = maxTime - minTime;
  const colorMap = new Map<string, string>();

  for (const { item, value } of resolved) {
    if (value === null) {
      colorMap.set(item.id, palette.unclassifiedColour);
      continue;
    }
    const time = new Date(value).getTime();
    if (isNaN(time)) {
      colorMap.set(item.id, palette.unclassifiedColour);
      continue;
    }
    const t = range > 0 ? (time - minTime) / range : 1;
    colorMap.set(item.id, interpolateColour(AGE_GRADIENT.minColour, AGE_GRADIENT.maxColour, t));
  }

  const gradient: GradientSpec | null =
    minTime !== Infinity
      ? {
          minLabel: formatDateLabel(new Date(minTime).toISOString()),
          maxLabel: formatDateLabel(new Date(maxTime).toISOString()),
          minColour: AGE_GRADIENT.minColour,
          maxColour: AGE_GRADIENT.maxColour,
        }
      : null;

  const legend: LegendModel = {
    dimension,
    entries: [],
    gradient,
    hasUnclassified,
  };

  return {
    colorMap,
    colourFn: (item) => colorMap.get(item.id) ?? null,
    legend,
  };
}

/**
 * Compute colour assignments for categorical dimensions.
 */
function computeCategoricalAssignment(
  items: readonly StacBrowserItem[],
  dimension: ColourDimension,
  palette: ColourPalette,
): ColourAssignment {
  // First pass: collect unique categories and their counts
  const categoryCounts = new Map<string, number>();
  const itemCategories = new Map<string, string | null>();
  let hasUnclassified = false;

  for (const item of items) {
    let value: string | null;
    try {
      value = dimension.resolve(item);
    } catch {
      value = null;
    }
    itemCategories.set(item.id, value);

    if (value === null) {
      hasUnclassified = true;
    } else {
      categoryCounts.set(value, (categoryCounts.get(value) ?? 0) + 1);
    }
  }

  // Assign colours to categories in discovery order
  const categoryColours = new Map<string, string>();
  let colourIndex = 0;
  for (const category of categoryCounts.keys()) {
    categoryColours.set(category, getCategoricalColour(colourIndex, palette));
    colourIndex++;
  }

  // Build colour map
  const colorMap = new Map<string, string>();
  for (const item of items) {
    const category = itemCategories.get(item.id) ?? null;
    if (category === null) {
      colorMap.set(item.id, palette.unclassifiedColour);
    } else {
      colorMap.set(item.id, categoryColours.get(category) ?? palette.unclassifiedColour);
    }
  }

  // Build legend entries
  const entries: LegendEntry[] = [];
  for (const [label, count] of categoryCounts.entries()) {
    entries.push({
      label,
      colour: categoryColours.get(label)!,
      count,
    });
  }

  const legend: LegendModel = {
    dimension,
    entries,
    gradient: null,
    hasUnclassified,
  };

  return {
    colorMap,
    colourFn: (item) => colorMap.get(item.id) ?? null,
    legend,
  };
}

/**
 * Compute colour assignments for a set of items and a given dimension.
 */
export function computeColourAssignment(
  items: readonly StacBrowserItem[],
  dimension: ColourDimension,
  palette: ColourPalette,
): ColourAssignment {
  if (dimension.type === 'gradient') {
    return computeGradientAssignment(items, dimension, palette);
  }
  return computeCategoricalAssignment(items, dimension, palette);
}

/**
 * Get the default colour assignment (no dimension active).
 * All items receive the default colour; legend is null.
 */
export function getDefaultColourAssignment(
  items: readonly StacBrowserItem[],
  palette: ColourPalette,
): ColourAssignment {
  const colorMap = new Map<string, string>();
  for (const item of items) {
    colorMap.set(item.id, palette.defaultColour);
  }

  return {
    colorMap,
    colourFn: () => null,
    legend: null,
  };
}
