import { ReactNode } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { Theme, ThemeVariant } from './ThemeContext';
import { ThemeSource } from './ThemeSource';

export interface ThemeProviderProps {
    /** Initial theme configuration */
    theme?: Theme;
    /** Child components */
    children: ReactNode;
    /** Container element to apply theme data attribute */
    container?: HTMLElement;
    /**
     * Override the auto-detected source.
     *
     * Default: `vsCodeBodyClassSource()` if a `vscode-*` body class is present
     * at mount, else `mediaQuerySource()`. Pinned tests / stories should pass
     * `staticSource(variant)` to opt out of live updates.
     */
    source?: ThemeSource;
}
/**
 * ThemeProvider component that provides theming context to child components.
 *
 * **Nested providers**: when one `<ThemeProvider>` is mounted inside another,
 * the inner provider scopes ALL its DOM writes (data-theme, --debrief-*,
 * --vscode-*) to a local wrapper `<div>` instead of fighting with the outer
 * provider over `document.documentElement`. The CSS cascade then applies the
 * inner variant to its subtree only — perfect for Storybook stories that
 * pin a specific variant inside a toolbar-driven decorator.
 *
 * @example
 * ```tsx
 * <ThemeProvider theme={{ variant: 'dark' }}>
 *   <MapView features={data} />
 * </ThemeProvider>
 * ```
 *
 * @example
 * ```tsx
 * // Inside a VS Code webview — auto-detects body class:
 * <ThemeProvider source={vsCodeBodyClassSource()}>
 *   <Panel />
 * </ThemeProvider>
 * ```
 */
export declare function ThemeProvider({ theme: initialTheme, children, container, source: sourceProp, }: ThemeProviderProps): import("react/jsx-runtime").JSX.Element;
export type { ThemeVariant };
//# sourceMappingURL=ThemeProvider.d.ts.map