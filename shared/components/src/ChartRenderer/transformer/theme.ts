import type { Config } from 'vega-lite';

/**
 * Read a CSS custom property value, falling back to a default.
 *
 * Works in browser environments where `getComputedStyle` is available.
 * In non-browser environments (e.g., tests, SSR), returns the fallback.
 */
function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

/**
 * Build a Vega-Lite config object from Debrief CSS design tokens.
 *
 * This ensures charts automatically match the active theme
 * (light / dark / VS Code).
 */
export function buildThemeConfig(): Config {
  const bg = cssVar('--vscode-editor-background', '#ffffff');
  const fg = cssVar('--vscode-editor-foreground', '#333333');
  const gridColor = cssVar('--vscode-editorWidget-border', '#e0e0e0');

  return {
    background: bg,
    title: { color: fg, fontSize: 14, fontWeight: 'normal' },
    axis: {
      labelColor: fg,
      titleColor: fg,
      gridColor,
      domainColor: fg,
      tickColor: fg,
    },
    legend: { labelColor: fg, titleColor: fg },
    view: { stroke: 'transparent' },
  };
}
