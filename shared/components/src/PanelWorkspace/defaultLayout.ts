/**
 * Default 5-panel layout configuration for GoldenLayout v2.
 *
 * Layout structure:
 * ```
 * Root (row)
 * ├── Sidebar Column (column, width: 25%)
 * │   ├── Navigation Panel (STAC File Tree) — 25% height
 * │   └── Activity / Log (tabbed stack) — 75% height
 * └── Content Column (column, width: 75%)
 *     └── Map Panel — 100% height
 * (Chart panel added dynamically when result datasets are plotted)
 * ```
 */

import type { LayoutConfig } from 'golden-layout';

/**
 * Panel component type constants
 */
export const PANEL_NAVIGATION = 'navigation';
export const PANEL_ACTIVITY = 'activity';
export const PANEL_LOG = 'log';
export const PANEL_MAP = 'map';
export const PANEL_CHART = 'chart';

/**
 * Default layout configuration for the workspace.
 *
 * Defines a 5-panel layout with sidebar (navigation, activity, log)
 * and content area (map, chart).
 */
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  settings: {
    // Enable pop-out for panels (US3)
    popoutWholeStack: false,
  },
  header: {
    // Show pop-out button on panel headers
    popout: 'pop out',
    // Show close button on panel headers
    close: 'close',
  },
  root: {
    type: 'row',
    content: [
      // Sidebar Column (25% width)
      {
        type: 'column',
        width: 25,
        content: [
          // Navigation Panel (25% height)
          {
            type: 'stack',
            height: 25,
            content: [
              {
                type: 'component',
                componentType: PANEL_NAVIGATION,
                title: 'Navigation',
                minWidth: 200,
                minHeight: 100,
              },
            ],
          },
          // Activity + Log (tabbed stack, 75% height — Activity tab active by default)
          {
            type: 'stack',
            height: 75,
            activeItemIndex: 0,
            content: [
              {
                type: 'component',
                componentType: PANEL_ACTIVITY,
                title: 'Activity',
                minWidth: 240,
                minHeight: 200,
              },
              {
                type: 'component',
                componentType: PANEL_LOG,
                title: 'Log',
                minWidth: 200,
                minHeight: 100,
              },
            ],
          },
        ],
      },
      // Content Column (75% width) — Map only; Chart added dynamically
      {
        type: 'column',
        width: 75,
        content: [
          {
            type: 'stack',
            content: [
              {
                type: 'component',
                componentType: PANEL_MAP,
                title: 'Map',
                minWidth: 300,
                minHeight: 200,
              },
            ],
          },
        ],
      },
    ],
  },
};
