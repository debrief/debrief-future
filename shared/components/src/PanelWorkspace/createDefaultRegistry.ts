/**
 * Creates a PanelRegistry pre-populated with the 5 default panel types.
 */

import { createPanelRegistry, type PanelRegistry } from './panelRegistry';
import {
  PANEL_NAVIGATION,
  PANEL_ACTIVITY,
  PANEL_LOG,
  PANEL_MAP,
  PANEL_CHART,
} from './defaultLayout';
import { NavigationPanel } from '../panels/NavigationPanel';
import { ActivityPanelWrapper } from '../panels/ActivityPanelWrapper';
import { LogPanelWrapper } from '../panels/LogPanelWrapper';
import { MapPanel } from '../panels/MapPanel';
import { ChartPanelWrapper } from '../panels/ChartPanelWrapper';

export function createDefaultRegistry(): PanelRegistry {
  const registry = createPanelRegistry();

  registry.register({
    type: PANEL_NAVIGATION,
    title: 'Navigation',
    component: NavigationPanel,
    icon: 'list-tree',
    minWidth: 200,
    minHeight: 100,
  });

  registry.register({
    type: PANEL_ACTIVITY,
    title: 'Activity',
    component: ActivityPanelWrapper,
    icon: 'dashboard',
    minWidth: 240,
    minHeight: 200,
  });

  registry.register({
    type: PANEL_LOG,
    title: 'Log',
    component: LogPanelWrapper,
    icon: 'output',
    minWidth: 200,
    minHeight: 100,
  });

  registry.register({
    type: PANEL_MAP,
    title: 'Map',
    component: MapPanel,
    icon: 'map',
    minWidth: 300,
    minHeight: 200,
  });

  registry.register({
    type: PANEL_CHART,
    title: 'Chart',
    component: ChartPanelWrapper,
    icon: 'graph',
    minWidth: 200,
    minHeight: 150,
  });

  return registry;
}
