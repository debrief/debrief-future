/**
 * Colour Scheme Engine — configurable colour dimension selector
 * and shared legend for map and timeline views (#134).
 *
 * @module colour-engine
 */
export { computeColourAssignment, getDefaultColourAssignment } from './engine';
export { defaultPalette, interpolateColour, getCategoricalColour, AGE_GRADIENT } from './palette';
export { builtInDimensions } from './registry';
export { ageDimension } from './dimensions/age';
export { tagDimension } from './dimensions/tag';
export { ColourLegend } from './ColourLegend';
export { ColourDimensionSelector } from './ColourDimensionSelector';
export type { DimensionType, ColourDimension, ColourPalette, LegendEntry, GradientSpec, LegendModel, ColourAssignment, BuiltInDimensionId, ColourDimensionSelectorProps, ColourLegendProps, } from './types';
//# sourceMappingURL=index.d.ts.map