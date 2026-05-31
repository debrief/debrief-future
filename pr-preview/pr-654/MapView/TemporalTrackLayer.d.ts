import { DisplayMode, DebriefFeature } from '../utils/types';
import { HighlightMarkerStyle } from './TrackHighlightMarker';
import { SelectionClickEvent } from '../utils/applyClickToSelection';

export interface TemporalTrackLayerProps {
    feature: DebriefFeature;
    currentTime: number;
    displayMode: DisplayMode;
    isSelected?: boolean;
    /** Full set of selected IDs — forwarded to PositionSymbolsLayer for per-position highlighting */
    selectedIds?: Set<string>;
    markerStyle?: Partial<HighlightMarkerStyle>;
    /**
     * Click callback — uses the same `SelectionClickEvent` shape as
     * `MapView.onSelect` so the multi-select emitter stays consistent
     * between static and temporal track layers (#192 Phase 5).
     */
    onClick?: (event: SelectionClickEvent) => void;
}
export declare function TemporalTrackLayer({ feature, currentTime, displayMode, isSelected, selectedIds, markerStyle, onClick, }: TemporalTrackLayerProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=TemporalTrackLayer.d.ts.map