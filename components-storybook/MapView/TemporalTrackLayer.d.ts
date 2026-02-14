import { DisplayMode, DebriefFeature } from '../utils/types';
import { HighlightMarkerStyle } from './TrackHighlightMarker';

export interface TemporalTrackLayerProps {
    feature: DebriefFeature;
    currentTime: number;
    displayMode: DisplayMode;
    isSelected?: boolean;
    /** Full set of selected IDs — forwarded to PositionSymbolsLayer for per-position highlighting */
    selectedIds?: Set<string>;
    markerStyle?: Partial<HighlightMarkerStyle>;
    onClick?: (featureId: string, event: React.MouseEvent) => void;
}
export declare function TemporalTrackLayer({ feature, currentTime, displayMode, isSelected, selectedIds, markerStyle, onClick, }: TemporalTrackLayerProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=TemporalTrackLayer.d.ts.map