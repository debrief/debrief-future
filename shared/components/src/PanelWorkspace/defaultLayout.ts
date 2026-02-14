/**
 * Default 5-panel layout configuration for GoldenLayout v2.
 *
 * Layout structure:
 * ```
 * Root (row)
 * ├── Sidebar Column (column, width: 25%)
 * │   ├── Navigation Panel (STAC File Tree) — 25% height
 * │   ├── Activity Panel (Time, Tools, Layers) — 50% height
 * │   └── Log Panel — 25% height
 * └── Content Column (column, width: 75%)
 *     ├── Map Panel — 65% height
 *     └── Chart Panel — 35% height
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
          // Activity Panel (50% height)
          {
            type: 'stack',
            height: 50,
            content: [
              {
                type: 'component',
                componentType: PANEL_ACTIVITY,
                title: 'Activity',
                minWidth: 240,
                minHeight: 200,
              },
            ],
          },
          // Log Panel (25% height)
          {
            type: 'stack',
            height: 25,
            content: [
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
      // Content Column (75% width)
      {
        type: 'column',
        width: 75,
        content: [
          // Map Panel (65% height)
          {
            type: 'stack',
            height: 65,
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
          // Chart Panel (35% height)
          {
            type: 'stack',
            height: 35,
            content: [
              {
                type: 'component',
                componentType: PANEL_CHART,
                title: 'Chart',
                minWidth: 200,
                minHeight: 150,
              },
            ],
          },
        ],
      },
    ],
  },
};
