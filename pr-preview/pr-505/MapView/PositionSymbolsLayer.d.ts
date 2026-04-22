import { TrackFeature } from '../../../schemas/src/generated/typescript/index.ts';
import { PointShape } from '@debrief/utils';

/**
 * @deprecated Use `PointShape` from `@debrief/utils` (re-exported from
 * `@debrief/components`). Preserved as an alias for any out-of-tree consumer
 * that imported the name directly from this module.
 */
export type SymbolShape = PointShape;
export interface PositionSymbolsLayerProps {
    feature: TrackFeature;
    currentTime?: number;
    displayMode?: 'full' | 'trail';
    isSelected?: boolean;
    /** Full set of selected IDs — enables per-position highlighting via paths like 'track-001/positions/4' */
    selectedIds?: Set<string>;
}
/**
 * Build an SVG path `d` attribute for a given shape, centred at (size, size)
 * within a (size*2 × size*2) viewBox.
 */
export declare function svgPathForShape(shape: PointShape, size: number): string;
export declare function PositionSymbolsLayer({ feature, currentTime, displayMode, isSelected, selectedIds, }: PositionSymbolsLayerProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=PositionSymbolsLayer.d.ts.map