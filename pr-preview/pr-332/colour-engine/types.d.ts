import { StacBrowserItem } from '../filter-engine/types';

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
     */
    readonly resolve: (item: StacBrowserItem) => string | null;
}
/** An ordered set of perceptually distinct colours. */
export interface ColourPalette {
    /** Ordered categorical palette (minimum 12 entries) */
    readonly colours: readonly string[];
    /** Neutral colour for items without metadata for the active dimension */
    readonly unclassifiedColour: string;
    /** Colour used when no dimension is active */
    readonly defaultColour: string;
}
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
    readonly legend: LegendModel | null;
}
/** Built-in dimension IDs (for type-safe references). */
export type BuiltInDimensionId = 'age' | 'tag';
/** Props for the ColourDimensionSelector component. */
export interface ColourDimensionSelectorProps {
    /** Available dimensions to choose from */
    readonly dimensions: readonly ColourDimension[];
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
export type { StacBrowserItem } from '../filter-engine/types';
//# sourceMappingURL=types.d.ts.map