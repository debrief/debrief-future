import { ColourPalette } from './types';

/** Default colour palette used across all dimensions. */
export declare const defaultPalette: ColourPalette;
/** Gradient colour stops for the Age dimension (faded → vivid). */
export declare const AGE_GRADIENT: {
    readonly minColour: "#C8D6E5";
    readonly maxColour: "#2E86DE";
};
/**
 * Interpolate between two hex colours.
 * @param colour1 - Start colour (hex)
 * @param colour2 - End colour (hex)
 * @param t - Interpolation factor (0 = colour1, 1 = colour2)
 * @returns Interpolated hex colour string
 */
export declare function interpolateColour(colour1: string, colour2: string, t: number): string;
/**
 * Get a categorical colour by index, recycling with modified brightness
 * when the palette is exhausted (FR-011).
 */
export declare function getCategoricalColour(index: number, palette: ColourPalette): string;
//# sourceMappingURL=palette.d.ts.map