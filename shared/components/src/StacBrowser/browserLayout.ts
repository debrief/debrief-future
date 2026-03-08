/**
 * GoldenLayout configuration for StacBrowser's 3-panel layout.
 *
 * Layout:
 * ```
 * Root (row)
 * ├── Exercise List (30% width)
 * └── Right Column (70% width)
 *     ├── Map View (70% height)
 *     └── Timeline View (30% height)
 * ```
 */

import type { LayoutConfig } from 'golden-layout';

export const BROWSER_PANEL_LIST = 'browser-list';
export const BROWSER_PANEL_MAP = 'browser-map';
export const BROWSER_PANEL_TIMELINE = 'browser-timeline';

export const BROWSER_LAYOUT_CONFIG: LayoutConfig = {
  settings: {
    popoutWholeStack: false,
  },
  header: {
    close: 'close',
  },
  root: {
    type: 'row',
    content: [
      {
        type: 'stack',
        width: 30,
        content: [
          {
            type: 'component',
            componentType: BROWSER_PANEL_LIST,
            title: 'Exercises',
            minWidth: 200,
            minHeight: 100,
          },
        ],
      },
      {
        type: 'column',
        width: 70,
        content: [
          {
            type: 'stack',
            height: 70,
            content: [
              {
                type: 'component',
                componentType: BROWSER_PANEL_MAP,
                title: 'Map',
                minWidth: 200,
                minHeight: 150,
              },
            ],
          },
          {
            type: 'stack',
            height: 30,
            content: [
              {
                type: 'component',
                componentType: BROWSER_PANEL_TIMELINE,
                title: 'Timeline',
                minWidth: 200,
                minHeight: 100,
              },
            ],
          },
        ],
      },
    ],
  },
};
