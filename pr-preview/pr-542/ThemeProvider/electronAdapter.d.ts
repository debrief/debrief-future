import { Theme, ThemeVariant } from './ThemeContext';

/**
 * Electron IPC channel names for theme communication.
 */
export declare const THEME_CHANNELS: {
    readonly GET_THEME: "debrief:theme:get";
    readonly SET_THEME: "debrief:theme:set";
    readonly THEME_CHANGED: "debrief:theme:changed";
    readonly GET_SYSTEM_THEME: "debrief:theme:system";
};
/**
 * Check if running in an Electron renderer process.
 */
export declare function isElectronEnvironment(): boolean;
/**
 * Get the current system theme preference.
 */
export declare function getSystemTheme(): Promise<'light' | 'dark'>;
/**
 * Get the stored theme from Electron's main process.
 */
export declare function getStoredTheme(): Promise<Theme | null>;
/**
 * Save theme to Electron's main process.
 */
export declare function saveTheme(theme: Theme): Promise<void>;
/**
 * Resolve 'system' theme variant to actual light/dark value.
 */
export declare function resolveThemeVariant(variant: ThemeVariant): Promise<'light' | 'dark' | 'vscode'>;
/**
 * Get default tokens for a theme variant.
 */
export declare function getDefaultTokens(variant: 'light' | 'dark' | 'vscode'): Record<string, string>;
/**
 * Create an Electron-adapted theme configuration.
 */
export declare function createElectronTheme(): Promise<Theme>;
/**
 * Set up Electron theme synchronization.
 * Listens for theme changes from main process and system.
 *
 * @returns Cleanup function to remove listeners
 */
export declare function setupElectronThemeSync(onThemeChange: (theme: Theme) => void): () => void;
/**
 * Apply Electron theme tokens to document CSS variables.
 */
export declare function applyElectronTheme(theme: Theme): void;
//# sourceMappingURL=electronAdapter.d.ts.map