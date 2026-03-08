/**
 * API Contract: Colour Scheme Engine (#134)
 *
 * Defines the public interface of the colour engine module
 * for the STAC Stack Browser Discovery UI (E08).
 *
 * Location: shared/components/src/colour-engine/
 */

import type { StacBrowserItem } from '../../shared/components/src/filter-engine/types';

// ============================================================================
// Core Types
// ============================================================================

/** Rendering mode for a colour dimension. */
export type DimensionType = 'gradient' | 'categorical';

/**
 * A colour dimension definition — a named strategy for mapping
 * exercise metadata to colours.
 */
export interface ColourDimension {
  /** Unique identifier (e.g., "age", "vessel-class", "tag") */
  readonly id: string;
  /** Display label for the selector (e.g., "Age", "Vessel Class") */
  readonly label: string;
  /** Rendering mode — determines legend appearance */
  readonly type: DimensionType;
  /**
   * Extract the dimension value from a STAC item.
   * Returns null if the item lacks the relevant metadata.
   * MUST NOT throw — callers wrap in try/catch (Art. V.1).
   */
  readonly resolve: (item: StacBrowserItem) => string | null;
}

// ============================================================================
// Palette
// ============================================================================

/** An ordered set of perceptually distinct colours. */
export interface ColourPalette {
  /** Ordered categorical palette (minimum 12 entries) */
  readonly colours: readonly string[];
  /** Neutral colour for items without metadata for the active dimension */
  readonly unclassifiedColour: string;
  /** Colour used when no dimension is active */
  readonly defaultColour: string;
}

// ============================================================================
// Legend Model
// ============================================================================

/** A single entry in a categorical legend. */
export interface LegendEntry {
  /** Category label (e.g., "Destroyer", "Submarine") */
  readonly label: string;
  /** CSS colour string */
  readonly colour: string;
  /** Number of items in this category */
  readonly count: number;
}

/** Specification for rendering a gradient legend. */
export interface GradientSpec {
  /** Label for the low end (e.g., "Jan 2020") */
  readonly minLabel: string;
  /** Label for the high end (e.g., "Dec 2025") */
  readonly maxLabel: string;
  /** CSS colour for the low end (faded) */
  readonly minColour: string;
  /** CSS colour for the high end (vivid) */
  readonly maxColour: string;
}

/** Description of the current colour encoding, suitable for rendering. */
export interface LegendModel {
  /** The active dimension */
  readonly dimension: ColourDimension;
  /** Entries for categorical dimensions (empty for gradient) */
  readonly entries: readonly LegendEntry[];
  /** Gradient specification for gradient dimensions (null for categorical) */
  readonly gradient: GradientSpec | null;
  /** Whether any items lacked metadata for the active dimension */
  readonly hasUnclassified: boolean;
}

// ============================================================================
// Colour Assignment (engine output)
// ============================================================================

/** The complete output of applying a colour dimension to a set of items. */
export interface ColourAssignment {
  /**
   * Pre-computed map from item ID to CSS colour string.
   * Consumed by CatalogOverview (#130) via `colorMap` prop.
   */
  readonly colorMap: ReadonlyMap<string, string>;

  /**
   * Function mapping an item to a CSS colour string (or null for default).
   * Consumed by TimelineView (#131) via `colourFn` prop.
   */
  readonly colourFn: (item: StacBrowserItem) => string | null;

  /** Legend model for rendering the ColourLegend component. */
  readonly legend: LegendModel;
}

// ============================================================================
// Engine API
// ============================================================================

/**
 * Compute colour assignments for a set of items and a given dimension.
 *
 * @param items - All exercises currently loaded
 * @param dimension - The active colour dimension
 * @param palette - The colour palette to use
 * @returns Complete colour assignment including map, function, and legend
 */
export type ComputeColourAssignment = (
  items: readonly StacBrowserItem[],
  dimension: ColourDimension,
  palette: ColourPalette,
) => ColourAssignment;

/**
 * Get the default colour assignment (no dimension active).
 * All items receive the default colour; legend is empty.
 *
 * @param items - All exercises currently loaded
 * @param palette - The colour palette to use
 * @returns Colour assignment with default colour for all items
 */
export type GetDefaultColourAssignment = (
  items: readonly StacBrowserItem[],
  palette: ColourPalette,
) => ColourAssignment;

// ============================================================================
// Dimension Registry
// ============================================================================

/**
 * Registry of available colour dimensions.
 * New dimensions are added by appending to the registry.
 * The selector and legend components read from this registry.
 */
export type ColourDimensionRegistry = readonly ColourDimension[];

/**
 * Built-in dimension IDs (for type-safe references).
 */
export type BuiltInDimensionId = 'age' | 'vessel-class' | 'tag';

// ============================================================================
// React Component Props
// ============================================================================

/** Props for the ColourDimensionSelector component. */
export interface ColourDimensionSelectorProps {
  /** Available dimensions to choose from */
  readonly dimensions: ColourDimensionRegistry;
  /** Currently active dimension ID (null = no dimension) */
  readonly activeDimensionId: string | null;
  /** Callback when the user selects a dimension */
  readonly onDimensionChange: (dimensionId: string | null) => void;
  /** Additional CSS class name */
  readonly className?: string;
}

/** Props for the ColourLegend component. */
export interface ColourLegendProps {
  /** Legend model to render (null = no legend shown) */
  readonly legend: LegendModel | null;
  /** Colour for "Unclassified" items (shown when legend.hasUnclassified) */
  readonly unclassifiedColour: string;
  /** Additional CSS class name */
  readonly className?: string;
}
