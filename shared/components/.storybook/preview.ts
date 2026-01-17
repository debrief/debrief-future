import type { Preview, Decorator } from '@storybook/react';
import React from 'react';
import 'leaflet/dist/leaflet.css';
import '../src/styles/tokens.css';
import { ThemeProvider } from '../src/ThemeProvider';
import type { ThemeVariant } from '../src/ThemeProvider/ThemeContext';

// Theme decorator that applies the selected global theme
const withThemeProvider: Decorator = (Story, context) => {
  const theme = context.globals.theme as ThemeVariant;

  return React.createElement(
    ThemeProvider,
    { theme: { variant: theme } },
    React.createElement(Story)
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
        { name: 'vscode-dark', value: '#252526' },
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
          { value: 'vscode', title: 'VS Code', icon: 'lightning' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [withThemeProvider],
};

export default preview;
