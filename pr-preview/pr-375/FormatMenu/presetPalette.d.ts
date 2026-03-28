/**
 * Preset palette definitions for the FormatMenu component.
 *
 * These presets provide standard values for styling geometric features
 * (points, lines, polygons) in maritime tactical analysis scenarios.
 */
export interface PresetValue {
    readonly id: string;
    readonly label: string;
    readonly value: string | number;
    readonly swatch?: string;
}
/**
 * Standard colour palette aligned with naval tactical conventions.
 * Includes primary colours, darker variants, and grayscale options.
 */
export declare const COLOUR_PALETTE: readonly PresetValue[];
/**
 * Line weight presets (stroke width in pixels).
 * Range from fine lines suitable for detail to bold lines for emphasis.
 */
export declare const LINE_WEIGHT_PRESETS: readonly PresetValue[];
/**
 * Opacity presets (alpha channel values).
 * Range from translucent overlays to fully opaque.
 */
export declare const OPACITY_PRESETS: readonly PresetValue[];
/**
 * Point marker radius presets (in pixels).
 * Suitable for map markers at typical zoom levels.
 */
export declare const RADIUS_PRESETS: readonly PresetValue[];
/**
 * Dash pattern presets (SVG dashArray format).
 * Empty string = solid line; comma-separated values = dash/gap lengths.
 */
export declare const DASH_PATTERN_PRESETS: readonly PresetValue[];
/**
 * Point shape presets.
 * Matches PointShapeEnum values from schema.
 */
export declare const SHAPE_PRESETS: readonly PresetValue[];
/**
 * Boolean toggle presets for show/hide properties.
 */
export declare const BOOLEAN_PRESETS: readonly PresetValue[];
//# sourceMappingURL=presetPalette.d.ts.map