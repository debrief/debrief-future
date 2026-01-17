import type { Theme, ThemeTokens, ThemeVariant } from './ThemeContext';

/**
 * Electron IPC channel names for theme communication.
 */
export const THEME_CHANNELS = {
  GET_THEME: 'debrief:theme:get',
  SET_THEME: 'debrief:theme:set',
  THEME_CHANGED: 'debrief:theme:changed',
  GET_SYSTEM_THEME: 'debrief:theme:system',
} as const;

/**
 * Interface for Electron's contextBridge-exposed theme API.
 */
interface ElectronThemeAPI {
  getTheme: () => Promise<Theme>;
  setTheme: (theme: Theme) => Promise<void>;
  getSystemTheme: () => Promise<'light' | 'dark'>;
  onThemeChange: (callback: (theme: Theme) => void) => () => void;
}

/**
 * Check if running in an Electron renderer process.
 */
export function isElectronEnvironment(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for Electron's process object
  if (typeof process !== 'undefined' && process.versions?.electron) {
    return true;
  }

  // Check for exposed Electron API
  if ('electronTheme' in window || 'electron' in window) {
    return true;
  }

  // Check for Electron's user agent
  if (navigator.userAgent.includes('Electron')) {
    return true;
  }

  return false;
}

/**
 * Get the Electron theme API if available.
 */
function getElectronAPI(): ElectronThemeAPI | null {
  if (typeof window === 'undefined') return null;

  // Check for exposed theme API
  if ('electronTheme' in window) {
    return (window as unknown as { electronTheme: ElectronThemeAPI }).electronTheme;
  }

  return null;
}

/**
 * Get the current system theme preference.
 */
export async function getSystemTheme(): Promise<'light' | 'dark'> {
  const api = getElectronAPI();

  if (api?.getSystemTheme) {
    return api.getSystemTheme();
  }

  // Fallback to media query
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return 'light';
}

/**
 * Get the stored theme from Electron's main process.
 */
export async function getStoredTheme(): Promise<Theme | null> {
  const api = getElectronAPI();

  if (api?.getTheme) {
    try {
      return await api.getTheme();
    } catch {
      return null;
    }
  }

  // Fallback to localStorage
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('debrief-theme');
    if (stored) {
      try {
        return JSON.parse(stored) as Theme;
      } catch {
        return null;
      }
    }
  }

  return null;
}

/**
 * Save theme to Electron's main process.
 */
export async function saveTheme(theme: Theme): Promise<void> {
  const api = getElectronAPI();

  if (api?.setTheme) {
    await api.setTheme(theme);
    return;
  }

  // Fallback to localStorage
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('debrief-theme', JSON.stringify(theme));
  }
}

/**
 * Resolve 'system' theme variant to actual light/dark value.
 */
export async function resolveThemeVariant(
  variant: ThemeVariant
): Promise<'light' | 'dark' | 'vscode'> {
  if (variant === 'system') {
    return getSystemTheme();
  }
  return variant;
}

/**
 * Default Electron theme tokens for light mode.
 */
const LIGHT_TOKENS: ThemeTokens = {
  bgPrimary: '#ffffff',
  bgSecondary: '#f5f5f5',
  textPrimary: '#1a1a1a',
  textSecondary: '#666666',
  borderColor: '#e0e0e0',
  borderColorLight: '#f0f0f0',
  selectionBg: 'rgba(0, 102, 204, 0.1)',
  selectionText: '#1a1a1a',
  hoverBg: 'rgba(0, 0, 0, 0.04)',
  focusRing: 'rgba(0, 102, 204, 0.4)',
  buttonBg: '#0066cc',
  buttonText: '#ffffff',
  buttonHoverBg: '#0055aa',
  badgeBg: '#e8e8e8',
  badgeText: '#555555',
  scrollbarThumb: '#c1c1c1',
  scrollbarThumbHover: '#a8a8a8',
};

/**
 * Default Electron theme tokens for dark mode.
 */
const DARK_TOKENS: ThemeTokens = {
  bgPrimary: '#1e1e1e',
  bgSecondary: '#252526',
  textPrimary: '#e0e0e0',
  textSecondary: '#888888',
  borderColor: '#3a3a3a',
  borderColorLight: '#2d2d2d',
  selectionBg: 'rgba(0, 102, 204, 0.3)',
  selectionText: '#ffffff',
  hoverBg: 'rgba(255, 255, 255, 0.06)',
  focusRing: 'rgba(0, 102, 204, 0.6)',
  buttonBg: '#0066cc',
  buttonText: '#ffffff',
  buttonHoverBg: '#0077ee',
  badgeBg: '#3a3a3a',
  badgeText: '#b0b0b0',
  scrollbarThumb: '#555555',
  scrollbarThumbHover: '#666666',
};

/**
 * Get default tokens for a theme variant.
 */
export function getDefaultTokens(variant: 'light' | 'dark' | 'vscode'): ThemeTokens {
  if (variant === 'dark' || variant === 'vscode') {
    return DARK_TOKENS;
  }
  return LIGHT_TOKENS;
}

/**
 * Create an Electron-adapted theme configuration.
 */
export async function createElectronTheme(): Promise<Theme> {
  // Try to get stored theme first
  const stored = await getStoredTheme();
  if (stored) {
    return stored;
  }

  // Fall back to system theme
  const systemTheme = await getSystemTheme();
  return {
    variant: systemTheme,
    tokens: getDefaultTokens(systemTheme),
  };
}

/**
 * Set up Electron theme synchronization.
 * Listens for theme changes from main process and system.
 *
 * @returns Cleanup function to remove listeners
 */
export function setupElectronThemeSync(onThemeChange: (theme: Theme) => void): () => void {
  const cleanups: (() => void)[] = [];

  // Listen for Electron theme changes
  const api = getElectronAPI();
  if (api?.onThemeChange) {
    const unsubscribe = api.onThemeChange(onThemeChange);
    cleanups.push(unsubscribe);
  }

  // Listen for system theme changes
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = async () => {
      const stored = await getStoredTheme();
      if (stored?.variant === 'system') {
        const systemTheme = mediaQuery.matches ? 'dark' : 'light';
        onThemeChange({
          ...stored,
          tokens: {
            ...getDefaultTokens(systemTheme),
            ...stored.tokens,
          },
        });
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    cleanups.push(() => mediaQuery.removeEventListener('change', handleChange));
  }

  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}

/**
 * Apply Electron theme tokens to document CSS variables.
 */
export function applyElectronTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const tokens = theme.tokens ?? {};

  // Set data-theme attribute
  root.setAttribute('data-theme', theme.variant);

  // Apply tokens as CSS variables
  for (const [key, value] of Object.entries(tokens)) {
    if (value) {
      // Convert camelCase to kebab-case
      const cssVar = `--debrief-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, value);
    }
  }
}
