import { TrackFeature } from '@debrief/schemas';

export interface PositionSymbolsLayerProps {
    feature: TrackFeature;
    currentTime?: number;
    displayMode?: 'full' | 'trail';
    isSelected?: boolean;
    /** Full set of selected IDs — enables per-position highlighting via paths like 'track-001/positions/4' */
    selectedIds?: Set<string>;
}
export declare function PositionSymbolsLayer({ feature, currentTime, displayMode, isSelected, selectedIds, }: PositionSymbolsLayerProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=PositionSymbolsLayer.d.ts.map