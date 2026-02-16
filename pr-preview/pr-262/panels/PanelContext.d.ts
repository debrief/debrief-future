import { ComponentType } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { ActivityPanelProps } from '../ActivityPanel/types';
import { MapViewProps } from '../MapView';
import { LogPanelProps } from '../LogPanel';
import { StacFileTreeProps } from '../StacFileTree';
import { ChartRendererProps } from '../ChartRenderer';

/** Content type for result tabs — dataset (chart), image, or fallback */
export type ResultArtifactType = 'dataset' | 'image' | 'other';
/** Chart/result tab data passed to the Chart panel wrapper */
export interface ChartTabData {
    id: string;
    title: string;
    /** Type of content in this tab. Defaults to 'dataset' for backwards compat. */
    artifactType?: ResultArtifactType;
    /** Base64 data URI for image tabs */
    imageDataUri?: string;
    /** File metadata for fallback ('other') tabs */
    fileMeta?: {
        filename: string;
        mimeType: string;
        sizeBytes: number;
    };
}
/** Chart-related props passed via context */
export interface ChartContextProps {
    chartSpec: ChartRendererProps['spec'] | null;
    chartTabs: ChartTabData[];
    activeChartTabId: string | null;
    onChartTabSelect: (tabId: string) => void;
    onChartTabClose: (tabId: string) => void;
}
/** Components that panels need to render — passed as component types to avoid circular imports */
export interface PanelComponents {
    ActivityPanel: ComponentType<ActivityPanelProps>;
    MapView: ComponentType<MapViewProps>;
    LogPanel: ComponentType<LogPanelProps>;
    StacFileTree: ComponentType<StacFileTreeProps>;
    ChartRenderer: ComponentType<ChartRendererProps>;
}
/** Full context shape provided to all panel wrappers */
export interface PanelContextValue {
    components: PanelComponents;
    activityPanelProps: ActivityPanelProps | null;
    mapViewProps: MapViewProps | null;
    logPanelProps: LogPanelProps | null;
    stacFileTreeProps: StacFileTreeProps | null;
    chartProps: ChartContextProps | null;
}
export declare const PanelContextProvider: import('../../../../node_modules/.pnpm/react@18.3.1/node_modules/react').Provider<PanelContextValue | null>;
export declare function usePanelContext(): PanelContextValue;
//# sourceMappingURL=PanelContext.d.ts.map