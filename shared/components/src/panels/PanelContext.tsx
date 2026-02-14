/**
 * Panel Context — provides application state and callbacks to panel wrappers.
 *
 * This context is rendered by the app (web-shell) and consumed by panel wrappers.
 * It decouples panel content from the GoldenLayout infrastructure.
 */

import { createContext, useContext, type ComponentType } from 'react';
import type { ActivityPanelProps } from '../ActivityPanel/types';
import type { MapViewProps } from '../MapView';
import type { LogPanelProps } from '../LogPanel';
import type { StacFileTreeProps } from '../StacFileTree';
import type { ChartRendererProps } from '../ChartRenderer';

/** Chart tab data passed to the Chart panel wrapper */
export interface ChartTabData {
  id: string;
  title: string;
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

const PanelContextInternal = createContext<PanelContextValue | null>(null);

export const PanelContextProvider = PanelContextInternal.Provider;

export function usePanelContext(): PanelContextValue {
  const ctx = useContext(PanelContextInternal);
  if (!ctx) {
    throw new Error('usePanelContext must be used within a PanelContextProvider');
  }
  return ctx;
}
