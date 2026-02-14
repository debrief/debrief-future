import { TrackFeature } from '@debrief/schemas';

export interface PositionSymbolsLayerProps {
    feature: TrackFeature;
    currentTime?: number;
    displayMode?: 'full' | 'trail';
    isSelected?: boolean;
}
export declare function PositionSymbolsLayer({ feature, currentTime, displayMode, isSelected, }: PositionSymbolsLayerProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=PositionSymbolsLayer.d.ts.map