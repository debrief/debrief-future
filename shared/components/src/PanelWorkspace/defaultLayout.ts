/**
 * Default 5-panel layout configuration for GoldenLayout v2.
 *
 * Layout structure:
 * ```
 * Root (row)
 * ├── Sidebar Column (column, width: responsive %)
 * │   ├── Navigation Panel (STAC File Tree) — 25% height
 * │   └── Activity / Log (tabbed stack) — 75% height
 * └── Content Column (column, width: responsive %)
 *     └── Map Panel — 100% height
 * (Chart panel added dynamically when result datasets are plotted)
 * ```
 */

import type { LayoutConfig, RowOrColumnItemConfig } from 'golden-layout';

/** Child item of a row/column — the golden-layout v2 content union. */
type LayoutItemConfig = RowOrColumnItemConfig.ChildItemConfig;

/**
 * Panel component type constants
 */
export const PANEL_NAVIGATION = 'navigation';
export const PANEL_ACTIVITY = 'activity';
export const PANEL_LOG = 'log';
export const PANEL_MAP = 'map';
export const PANEL_CHART = 'chart';

/**
 * Baseline container width used to derive the static DEFAULT_LAYOUT_CONFIG.
 * This represents a "typical" wide-laptop / desktop viewport.
 */
export const BASELINE_WIDTH = 1440;

/**
 * Minimum and maximum sidebar percentage, ensuring the map always keeps
 * the majority of the horizontal space (FR-010).
 */
const SIDEBAR_PCT_MIN = 18;
const SIDEBAR_PCT_MAX = 40;

/**
 * Compute the sidebar column percentage width for a given container width.
 *
 * Discrete bands — Decision #7 (no interpolation):
 *   containerWidth <= 1366  → target ~280 px rail
 *   containerWidth in 1367..1599  → target ~320 px rail
 *   containerWidth >= 1600  → target ~380 px rail
 *
 * The percentage is derived by dividing the target px by the container
 * width, rounding, and clamping to [SIDEBAR_PCT_MIN, SIDEBAR_PCT_MAX].
 *
 * This function is PURE — it reads no globals, only its argument.
 *
 * @param containerWidth  Container clientWidth in pixels.
 * @returns Sidebar width as an integer percentage (18..40).
 */
function computeSidebarPct(containerWidth: number): number {
  let targetPx: number;
  if (containerWidth <= 1366) {
    targetPx = 280;
  } else if (containerWidth >= 1600) {
    targetPx = 380;
  } else {
    // Middle band: 1367..1599
    targetPx = 320;
  }
  const raw = Math.round((targetPx / containerWidth) * 100);
  return Math.max(SIDEBAR_PCT_MIN, Math.min(SIDEBAR_PCT_MAX, raw));
}

/**
 * Build the 5-panel layout configuration for the given container width.
 *
 * The sidebar column width (percentage) is computed from discrete bands so
 * the rail stays visually ~280–380 px regardless of screen size, and the map
 * always keeps the majority (> 60 %) of the horizontal space.
 *
 * Decision #1: this is the single panel-tree source — all three call sites in
 * PanelWorkspace (parse-fail fallback, no-saved-layout, Reset Layout) call
 * this function rather than referencing a static constant.
 *
 * @param containerWidth  Container clientWidth in pixels (read once at GL
 *                        init / reset from `containerRef.current.clientWidth`).
 */
export function getDefaultLayout(containerWidth: number): LayoutConfig {
  const sidebarPct = computeSidebarPct(containerWidth);
  const contentPct = 100 - sidebarPct;

  const sidebarContent: LayoutItemConfig[] = [
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
  ];

  const contentContent: LayoutItemConfig[] = [
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
  ];

  return {
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
        // Sidebar Column — responsive width
        {
          type: 'column',
          width: sidebarPct,
          content: sidebarContent,
        },
        // Content Column — Map only; Chart added dynamically
        {
          type: 'column',
          width: contentPct,
          content: contentContent,
        },
      ],
    },
  };
}

/**
 * Static default layout config derived from BASELINE_WIDTH.
 *
 * This constant exists so that code that needs a concrete LayoutConfig
 * reference (e.g. type tests, Storybook stories) can import it without
 * having access to a real container element. All three call sites in
 * PanelWorkspace call `getDefaultLayout(containerWidth)` instead — this
 * export is intentionally derived, not the primary source. (Decision #1)
 */
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = getDefaultLayout(BASELINE_WIDTH);
