import { ColourDimension, ColourPalette, ColourAssignment, StacBrowserItem } from './types';

/**
 * Compute colour assignments for a set of items and a given dimension.
 */
export declare function computeColourAssignment(items: readonly StacBrowserItem[], dimension: ColourDimension, palette: ColourPalette): ColourAssignment;
/**
 * Get the default colour assignment (no dimension active).
 * All items receive the default colour; legend is null.
 */
export declare function getDefaultColourAssignment(items: readonly StacBrowserItem[], palette: ColourPalette): ColourAssignment;
//# sourceMappingURL=engine.d.ts.map