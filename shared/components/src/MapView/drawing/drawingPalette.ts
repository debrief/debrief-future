import type { DrawingMode } from '../LeafletToolbar';
import type { CreateDrawnFeatureOptions } from './createDrawnFeature';

/**
 * Sequential colour palette for drawn shapes.
 * 8 colours chosen for cartographic visibility on both light and dark map tiles.
 * Feature: 096-drawing-ux-persistence (FR-007, FR-008, FR-009)
 */
export const DRAWING_PALETTE: readonly string[] = [
  '#2196F3', // Blue
  '#FF9800', // Orange
  '#00BCD4', // Teal
  '#9C27B0', // Purple
  '#4CAF50', // Green
  '#F44336', // Red
  '#795548', // Brown
  '#607D8B', // Blue-grey
] as const;

/**
 * Get the palette colour at a given index, wrapping around palette length.
 */
export function getPaletteColour(index: number): string {
  return DRAWING_PALETTE[index % DRAWING_PALETTE.length]!;
}

/**
 * Get palette-derived style overrides for a given drawing mode and palette index.
 * Returns partial options compatible with CreateDrawnFeatureOptions.
 */
export function getPaletteStyleOverrides(
  mode: DrawingMode,
  paletteIndex: number,
): Partial<CreateDrawnFeatureOptions> {
  const colour = getPaletteColour(paletteIndex);

  switch (mode) {
    case 'point':
      return {
        pointStyle: { color: colour, fill_color: colour },
      };
    case 'rectangle':
      return {
        rectangleStyle: { color: colour, fill_color: colour },
      };
    case 'polygon':
      return {
        polygonStyle: { color: colour, fill_color: colour },
      };
    case 'polyline':
      return {
        polylineStyle: { color: colour },
      };
    default:
      return {};
  }
}
