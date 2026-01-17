import type { Theme, ThemeTokens } from './ThemeContext';

/**
 * VS Code CSS variable mappings to Debrief tokens.
 * Maps VS Code's built-in theme variables to our component tokens.
 */
const VS_CODE_VARIABLE_MAP: Record<string, string> = {
  // Colors
  '--vscode-editor-background': '--debrief-bg-primary',
  '--vscode-editor-foreground': '--debrief-text-primary',
  '--vscode-sideBar-background': '--debrief-bg-secondary',
  '--vscode-sideBar-foreground': '--debrief-text-secondary',
  '--vscode-list-activeSelectionBackground': '--debrief-selection-bg',
  '--vscode-list-activeSelectionForeground': '--debrief-selection-text',
  '--vscode-list-hoverBackground': '--debrief-hover-bg',
  '--vscode-focusBorder': '--debrief-focus-ring',
  '--vscode-contrastBorder': '--debrief-border-color',
  '--vscode-widget-border': '--debrief-border-color-light',
  '--vscode-button-background': '--debrief-button-bg',
  '--vscode-button-foreground': '--debrief-button-text',
  '--vscode-button-hoverBackground': '--debrief-button-hover-bg',
  '--vscode-badge-background': '--debrief-badge-bg',
  '--vscode-badge-foreground': '--debrief-badge-text',
  '--vscode-scrollbarSlider-background': '--debrief-scrollbar-thumb',
  '--vscode-scrollbarSlider-hoverBackground': '--debrief-scrollbar-thumb-hover',
  '--vscode-scrollbarSlider-activeBackground': '--debrief-scrollbar-thumb-active',

  // Font
  '--vscode-font-family': '--debrief-font-family',
  '--vscode-font-size': '--debrief-font-size',
  '--vscode-editor-font-family': '--debrief-font-family-mono',
};

/**
 * Check if running in a VS Code webview environment.
 */
export function isVSCodeEnvironment(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for VS Code webview API
  if ('acquireVsCodeApi' in window) return true;

  // Check for VS Code CSS variables
  const computedStyle = getComputedStyle(document.documentElement);
  const hasVSCodeVar = computedStyle.getPropertyValue('--vscode-editor-background');

  return Boolean(hasVSCodeVar);
}

/**
 * Extract VS Code theme tokens from CSS variables.
 */
export function extractVSCodeTokens(): ThemeTokens {
  if (typeof window === 'undefined') return {};

  const computedStyle = getComputedStyle(document.documentElement);
  const tokens: ThemeTokens = {};

  // Map VS Code variables to our token names
  for (const [vsCodeVar, debriefVar] of Object.entries(VS_CODE_VARIABLE_MAP)) {
    const value = computedStyle.getPropertyValue(vsCodeVar).trim();
    if (value) {
      // Convert --debrief-token-name to tokenName
      const tokenName = debriefVar
        .replace('--debrief-', '')
        .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()) as keyof ThemeTokens;
      (tokens as Record<string, string>)[tokenName] = value;
    }
  }

  return tokens;
}

/**
 * Apply VS Code theme tokens to document.
 * Copies VS Code CSS variables to Debrief CSS variables.
 */
export function applyVSCodeTokens(): void {
  if (typeof window === 'undefined') return;

  const computedStyle = getComputedStyle(document.documentElement);
  const root = document.documentElement;

  for (const [vsCodeVar, debriefVar] of Object.entries(VS_CODE_VARIABLE_MAP)) {
    const value = computedStyle.getPropertyValue(vsCodeVar).trim();
    if (value) {
      root.style.setProperty(debriefVar, value);
    }
  }
}

/**
 * Detect if VS Code is in dark mode.
 */
export function isVSCodeDarkMode(): boolean {
  if (typeof window === 'undefined') return false;

  const computedStyle = getComputedStyle(document.documentElement);
  const bgColor = computedStyle.getPropertyValue('--vscode-editor-background').trim();

  if (!bgColor) return false;

  // Parse color to determine if dark
  // Simple heuristic: check if luminance is low
  const hexMatch = bgColor.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }

  // Check for rgb/rgba format
  const rgbMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }

  // Default to dark if can't determine
  return true;
}

/**
 * Create a VS Code-adapted theme configuration.
 */
export function createVSCodeTheme(): Theme {
  const tokens = extractVSCodeTokens();
  const isDark = isVSCodeDarkMode();

  return {
    variant: 'vscode',
    tokens,
  };
}

/**
 * Set up VS Code theme synchronization.
 * Listens for theme changes and updates tokens accordingly.
 *
 * @returns Cleanup function to remove listeners
 */
export function setupVSCodeThemeSync(onThemeChange: (theme: Theme) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  // Initial sync
  applyVSCodeTokens();

  // Watch for theme changes via MutationObserver
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        applyVSCodeTokens();
        onThemeChange(createVSCodeTheme());
      }
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['style', 'class'],
  });

  // Also listen for VS Code theme change messages
  const messageHandler = (event: MessageEvent) => {
    if (event.data?.type === 'vscode-theme-changed') {
      applyVSCodeTokens();
      onThemeChange(createVSCodeTheme());
    }
  };

  window.addEventListener('message', messageHandler);

  return () => {
    observer.disconnect();
    window.removeEventListener('message', messageHandler);
  };
}
