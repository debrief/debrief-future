export { ThemeProvider } from './ThemeProvider';
export type { ThemeProviderProps } from './ThemeProvider';

export { ThemeContext, defaultThemeContext } from './ThemeContext';
export type {
  Theme,
  ThemeVariant,
  ThemeTokens,
  ThemeContextValue,
} from './ThemeContext';

export {
  defaultTheme,
  lightThemeTokens,
  darkThemeTokens,
  highContrastLightThemeTokens,
  highContrastDarkThemeTokens,
  getThemeTokens,
  mergeThemeTokens,
} from './defaultTheme';

export type { ResolvedVariant, ThemeSource } from './ThemeSource';

export {
  vsCodeBodyClassSource,
  bodyClassToVariant,
  isVSCodeEnvironment,
  setupVSCodeThemeSync,
  createVSCodeTheme,
  applyVSCodeTokens,
  extractVSCodeTokens,
  isVSCodeDarkMode,
} from './vsCodeAdapter';

export { mediaQuerySource, staticSource } from './browserAdapter';
