import React from 'react';
import type { Decorator } from '@storybook/react';
import { ThemeProvider } from '../../src/ThemeProvider';
import type { Theme } from '../../src/ThemeProvider/ThemeContext';

/**
 * VS Code-like theme tokens.
 * Simulates running in a VS Code webview.
 */
const VS_CODE_DARK_TOKENS: Theme = {
  variant: 'vscode',
  tokens: {
    bgPrimary: '#1e1e1e',
    bgSecondary: '#252526',
    textPrimary: '#cccccc',
    textSecondary: '#858585',
    borderColor: '#454545',
    borderColorLight: '#3c3c3c',
    selectionBg: '#094771',
    selectionText: '#ffffff',
    hoverBg: '#2a2d2e',
    focusRing: '#007fd4',
    buttonBg: '#0e639c',
    buttonText: '#ffffff',
    buttonHoverBg: '#1177bb',
    badgeBg: '#4d4d4d',
    badgeText: '#cccccc',
    scrollbarThumb: '#424242',
    scrollbarThumbHover: '#4f4f4f',
  },
};

/**
 * Electron light theme tokens.
 * Simulates running in Electron with light theme.
 */
const ELECTRON_LIGHT_TOKENS: Theme = {
  variant: 'light',
  tokens: {
    bgPrimary: '#ffffff',
    bgSecondary: '#f8f9fa',
    textPrimary: '#212529',
    textSecondary: '#6c757d',
    borderColor: '#dee2e6',
    borderColorLight: '#f1f3f4',
    selectionBg: 'rgba(13, 110, 253, 0.15)',
    selectionText: '#212529',
    hoverBg: 'rgba(0, 0, 0, 0.04)',
    focusRing: 'rgba(13, 110, 253, 0.5)',
    buttonBg: '#0d6efd',
    buttonText: '#ffffff',
    buttonHoverBg: '#0b5ed7',
    badgeBg: '#e9ecef',
    badgeText: '#495057',
    scrollbarThumb: '#c4c4c4',
    scrollbarThumbHover: '#a6a6a6',
  },
};

/**
 * Electron dark theme tokens.
 * Simulates running in Electron with dark theme.
 */
const ELECTRON_DARK_TOKENS: Theme = {
  variant: 'dark',
  tokens: {
    bgPrimary: '#212529',
    bgSecondary: '#343a40',
    textPrimary: '#f8f9fa',
    textSecondary: '#adb5bd',
    borderColor: '#495057',
    borderColorLight: '#3d4349',
    selectionBg: 'rgba(13, 110, 253, 0.3)',
    selectionText: '#ffffff',
    hoverBg: 'rgba(255, 255, 255, 0.08)',
    focusRing: 'rgba(13, 110, 253, 0.6)',
    buttonBg: '#0d6efd',
    buttonText: '#ffffff',
    buttonHoverBg: '#3d8bfd',
    badgeBg: '#495057',
    badgeText: '#e9ecef',
    scrollbarThumb: '#585858',
    scrollbarThumbHover: '#6c6c6c',
  },
};

export type ContextType = 'electron-light' | 'electron-dark' | 'vscode';

interface ContextDecoratorProps {
  context: ContextType;
  children: React.ReactNode;
}

/**
 * Get theme configuration for a specific context.
 */
function getThemeForContext(context: ContextType): Theme {
  switch (context) {
    case 'vscode':
      return VS_CODE_DARK_TOKENS;
    case 'electron-dark':
      return ELECTRON_DARK_TOKENS;
    case 'electron-light':
    default:
      return ELECTRON_LIGHT_TOKENS;
  }
}

/**
 * Context simulation decorator component.
 * Wraps children in appropriate theme for the specified context.
 */
export function ContextSimulator({ context, children }: ContextDecoratorProps) {
  const theme = getThemeForContext(context);

  return (
    <div
      className={`debrief-context-${context}`}
      style={{
        backgroundColor: theme.tokens?.bgPrimary ?? '#ffffff',
        color: theme.tokens?.textPrimary ?? '#000000',
        padding: '16px',
        borderRadius: '8px',
        minHeight: '200px',
      }}
    >
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </div>
  );
}

/**
 * Multi-context comparison decorator.
 * Shows component in all contexts side by side.
 */
export function MultiContextDecorator({ children }: { children: React.ReactNode }) {
  const contexts: ContextType[] = ['electron-light', 'electron-dark', 'vscode'];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px',
      }}
    >
      {contexts.map((context) => (
        <div key={context}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 'bold',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {context.replace('-', ' ')}
          </div>
          <ContextSimulator context={context}>{children}</ContextSimulator>
        </div>
      ))}
    </div>
  );
}

/**
 * Storybook decorator factory for specific context.
 */
export function withContext(context: ContextType): Decorator {
  return (Story) => (
    <ContextSimulator context={context}>
      <Story />
    </ContextSimulator>
  );
}

/**
 * Storybook decorator for multi-context comparison.
 */
export const withMultiContext: Decorator = (Story) => (
  <MultiContextDecorator>
    <Story />
  </MultiContextDecorator>
);

export { VS_CODE_DARK_TOKENS, ELECTRON_LIGHT_TOKENS, ELECTRON_DARK_TOKENS };
