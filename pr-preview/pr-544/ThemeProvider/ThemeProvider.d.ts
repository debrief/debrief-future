import { ReactNode } from '../../../../node_modules/.pnpm/react@18.3.1/node_modules/react';
import { Theme } from './ThemeContext';

export interface ThemeProviderProps {
    /** Initial theme configuration */
    theme?: Theme;
    /** Child components */
    children: ReactNode;
    /** Container element to apply theme data attribute */
    container?: HTMLElement;
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
 */
export declare function ThemeProvider({ theme: initialTheme, children, container }: ThemeProviderProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ThemeProvider.d.ts.map