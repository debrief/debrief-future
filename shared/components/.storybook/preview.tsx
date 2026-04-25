import type { Preview, Decorator } from '@storybook/react';
import React, { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import 'vscrui/dist/codicon.css';
import '../src/styles/tokens.css';
import { ThemeProvider, staticSource } from '../src/ThemeProvider';
import type { ThemeVariant } from '../src/ThemeProvider/ThemeContext';
import type { ResolvedVariant } from '../src/ThemeProvider/ThemeSource';
import { VSCODE_TOKEN_MAP } from './vscode-token-map';

/**
 * Apply the per-variant `--vscode-*` token map to `documentElement`.
 *
 * Inside VS Code these variables are supplied by the host. In Storybook
 * we inject them so components that style themselves with
 * `var(--vscode-..., FALLBACK)` show the right colours per variant
 * instead of falling through to the dark fallback.
 *
 * Re-runs on every render of the decorator. Cleans up keys on unmount
 * so a switch to a hypothetical no-vscode-tokens preview doesn't leave
 * stale values behind.
 */
function useVSCodeTokenInjection(variant: ResolvedVariant): void {
  useEffect(() => {
    const map = VSCODE_TOKEN_MAP[variant];
    if (!map) return;
    const root = document.documentElement;
    for (const [key, value] of Object.entries(map)) {
      root.style.setProperty(key, value);
    }
    return () => {
      for (const key of Object.keys(map)) {
        root.style.removeProperty(key);
      }
    };
  }, [variant]);
}

function StorybookThemeWrapper({
  variant,
  children,
}: {
  variant: ThemeVariant;
  children: React.ReactNode;
}): React.ReactElement {
  // For 'system', the source resolves via prefers-color-scheme + prefers-contrast
  // (the ThemeProvider default); the token map below uses the resolved value
  // observed via document.documentElement.dataset.theme when emitted.
  // For an explicit variant, we pin the source so the Storybook toolbar
  // is the source of truth.
  const isExplicit = variant !== 'system';

  // For token injection we need a concrete variant. When 'system' is
  // selected, mirror the OS preference at mount; the runtime source then
  // updates it via the ThemeProvider effect chain.
  const tokenVariant: ResolvedVariant = isExplicit
    ? (variant as ResolvedVariant)
    : (window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light');

  useVSCodeTokenInjection(tokenVariant);

  return (
    <ThemeProvider
      theme={{ variant }}
      source={isExplicit ? staticSource(variant as ResolvedVariant) : undefined}
    >
      {children}
    </ThemeProvider>
  );
}

const withThemeProvider: Decorator = (Story, context) => {
  const variant = context.globals.theme as ThemeVariant;

  return (
    <StorybookThemeWrapper variant={variant}>
      <Story />
    </StorybookThemeWrapper>
  );
};

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#1e1e1e' },
        { name: 'high-contrast-light', value: '#ffffff' },
        { name: 'high-contrast-dark', value: '#000000' },
      ],
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
          {
            value: 'high-contrast-light',
            title: 'HC Light',
            icon: 'circlehollow',
          },
          {
            value: 'high-contrast-dark',
            title: 'HC Dark',
            icon: 'contrast',
          },
          { value: 'system', title: 'System', icon: 'browser' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [withThemeProvider],
};

export default preview;
