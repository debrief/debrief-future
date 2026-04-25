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