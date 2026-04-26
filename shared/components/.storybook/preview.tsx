import type { Preview, Decorator } from '@storybook/react';
import React from 'react';
import 'leaflet/dist/leaflet.css';
import 'vscrui/dist/codicon.css';
import '../src/styles/tokens.css';
import { ThemeProvider, staticSource } from '../src/ThemeProvider';
import type { ThemeVariant } from '../src/ThemeProvider/ThemeContext';
import type { ResolvedVariant } from '../src/ThemeProvider/ThemeSource';

/**
 * Storybook root theme decorator.
 *
 * Wraps every story in a single `<ThemeProvider>` driven by the toolbar's
 * variant global. The provider itself injects the per-variant `--vscode-*`
 * token map and applies `data-theme` to `document.documentElement`, so the
 * decorator does not need to do that work separately (#220).
 *
 * For an explicit variant, we pin the source so the toolbar is the source
 * of truth. For `'system'`, we leave the source unspecified so it falls
 * through to `mediaQuerySource()` (OS prefers-color-scheme +
 * prefers-contrast).
 */
function StorybookThemeWrapper({
  variant,
  children,
}: {
  variant: ThemeVariant;
  children: React.ReactNode;
}): React.ReactElement {
  const isExplicit = variant !== 'system';

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
