/**
 * Default colour palette for the Colour Scheme Engine (#134).
 *
 * Hand-curated palette of 12 perceptually distinct colours,
 * plus gradient stops for continuous dimensions.
 * Zero external dependencies (Constitution Art. IX).
 */

import type { ColourPalette } from './types';

/**
 * 12-colour categorical palette optimised for perceptual distinctness.
 * Based on the Okabe-Ito palette with adjustments for screen rendering.
 */
const CATEGORICAL_COLOURS: readonly string[] = [
  '#4477AA', // blue
  '#EE6677', // red/pink
  '#228833', // green
  '#CCBB44', // yellow
  '#66CCEE', // cyan
  '#AA3377', // purple
  '#BBBBBB', // grey
  '#EE8866', // orange
  '#44BB99', // teal
  '#FFAABB', // pink
  '#99DDFF', // light blue
  '#AAAA00', // olive
];

/** Default colour palette used across all dimensions. */
export const defaultPalette: ColourPalette = {
  colours: CATEGORICAL_COLOURS,
  unclassifiedColour: '#999999',
  defaultColour: '#5B8DEF',
};

/** Gradient colour stops for the Age dimension (faded → vivid). */
export const AGE_GRADIENT = {
  minColour: '#C8D6E5', // faded blue-grey (oldest)
  maxColour: '#2E86DE', // vivid blue (most recent)
} as const;

/**
 * Interpolate between two hex colours.
 * @param colour1 - Start colour (hex)
 * @param colour2 - End colour (hex)
 * @param t - Interpolation factor (0 = colour1, 1 = colour2)
 * @returns Interpolated hex colour string
 */
export function interpolateColour(colour1: string, colour2: string, t: number): string {
  const clampedT = Math.max(0, Math.min(1, t));

  const r1 = parseInt(colour1.slice(1, 3), 16);
  const g1 = parseInt(colour1.slice(3, 5), 16);
  const b1 = parseInt(colour1.slice(5, 7), 16);

  const r2 = parseInt(colour2.slice(1, 3), 16);
  const g2 = parseInt(colour2.slice(3, 5), 16);
  const b2 = parseInt(colour2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * clampedT);
  const g = Math.round(g1 + (g2 - g1) * clampedT);
  const b = Math.round(b1 + (b2 - b1) * clampedT);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Get a categorical colour by index, recycling with modified brightness
 * when the palette is exhausted (FR-011).
 */
export function getCategoricalColour(index: number, palette: ColourPalette): string {
  const baseColours = palette.colours;
  if (index < baseColours.length) {
    return baseColours[index] as string;
  }

  // Recycle with brightness shift
  const baseIndex = index % baseColours.length;
  const cycle = Math.floor(index / baseColours.length);
  const baseColour = baseColours[baseIndex] as string;

  // Darken by 15% per cycle
  const factor = Math.max(0.4, 1 - cycle * 0.15);
  const r = Math.round(parseInt(baseColour.slice(1, 3), 16) * factor);
  const g = Math.round(parseInt(baseColour.slice(3, 5), 16) * factor);
  const b = Math.round(parseInt(baseColour.slice(5, 7), 16) * factor);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
