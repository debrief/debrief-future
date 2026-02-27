import { DrawingMode } from '../LeafletToolbar';
import { CreateDrawnFeatureOptions } from './createDrawnFeature';

/**
 * Sequential colour palette for drawn shapes.
 * 8 colours chosen for cartographic visibility on both light and dark map tiles.
 * Feature: 096-drawing-ux-persistence (FR-007, FR-008, FR-009)
 */
export declare const DRAWING_PALETTE: readonly string[];
/**
 * Get the palette colour at a given index, wrapping around palette length.
 */
export declare function getPaletteColour(index: number): string;
/**
 * Get palette-derived style overrides for a given drawing mode and palette index.
 * Returns partial options compatible with CreateDrawnFeatureOptions.
 */
export declare function getPaletteStyleOverrides(mode: DrawingMode, paletteIndex: number): Partial<CreateDrawnFeatureOptions>;
//# sourceMappingURL=drawingPalette.d.ts.map