import { Theme } from './ThemeContext';

/**
 * Check if running in a VS Code webview environment.
 */
export declare function isVSCodeEnvironment(): boolean;
/**
 * Extract VS Code theme tokens from CSS variables.
 */
export declare function extractVSCodeTokens(): Record<string, string>;
/**
 * Apply VS Code theme tokens to document.
 * Copies VS Code CSS variables to Debrief CSS variables.
 */
export declare function applyVSCodeTokens(): void;
/**
 * Detect if VS Code is in dark mode.
 */
export declare function isVSCodeDarkMode(): boolean;
/**
 * Create a VS Code-adapted theme configuration.
 */
export declare function createVSCodeTheme(): Theme;
/**
 * Set up VS Code theme synchronization.
 * Listens for theme changes and updates tokens accordingly.
 *
 * @returns Cleanup function to remove listeners
 */
export declare function setupVSCodeThemeSync(onThemeChange: (theme: Theme) => void): () => void;
//# sourceMappingURL=vsCodeAdapter.d.ts.map