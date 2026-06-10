import { LayoutConfig } from 'golden-layout';

/**
 * Panel component type constants
 */
export declare const PANEL_NAVIGATION = "navigation";
export declare const PANEL_ACTIVITY = "activity";
export declare const PANEL_LOG = "log";
export declare const PANEL_MAP = "map";
export declare const PANEL_CHART = "chart";
/**
 * Baseline container width used to derive the static DEFAULT_LAYOUT_CONFIG.
 * This represents a "typical" wide-laptop / desktop viewport.
 */
export declare const BASELINE_WIDTH = 1440;
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
export declare function getDefaultLayout(containerWidth: number): LayoutConfig;
/**
 * Static default layout config derived from BASELINE_WIDTH.
 *
 * This constant exists so that code that needs a concrete LayoutConfig
 * reference (e.g. type tests, Storybook stories) can import it without
 * having access to a real container element. All three call sites in
 * PanelWorkspace call `getDefaultLayout(containerWidth)` instead — this
 * export is intentionally derived, not the primary source. (Decision #1)
 */
export declare const DEFAULT_LAYOUT_CONFIG: LayoutConfig;
//# sourceMappingURL=defaultLayout.d.ts.map