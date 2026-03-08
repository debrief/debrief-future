/**
 * Creates a PanelRegistry for StacBrowser's 3-panel layout.
 */

import { createPanelRegistry, type PanelRegistry } from '../PanelWorkspace/panelRegistry';
import {
  BROWSER_PANEL_LIST,
  BROWSER_PANEL_MAP,
  BROWSER_PANEL_TIMELINE,
} from './browserLayout';
import {
  BrowserListPanel,
  BrowserMapPanel,
  BrowserTimelinePanel,
} from './browserPanels';

export function createBrowserRegistry(): PanelRegistry {
  const registry = createPanelRegistry();

  registry.register({
    type: BROWSER_PANEL_LIST,
    title: 'Exercises',
    component: BrowserListPanel,
    minWidth: 200,
    minHeight: 100,
  });

  registry.register({
    type: BROWSER_PANEL_MAP,
    title: 'Map',
    component: BrowserMapPanel,
    minWidth: 200,
    minHeight: 150,
  });

  registry.register({
    type: BROWSER_PANEL_TIMELINE,
    title: 'Timeline',
    component: BrowserTimelinePanel,
    minWidth: 200,
    minHeight: 100,
  });

  return registry;
}
