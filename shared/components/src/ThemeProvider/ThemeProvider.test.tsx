import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider } from './ThemeProvider';
import { useTheme } from '../hooks/useTheme';
import type { Theme } from './ThemeContext';
import { VS_CODE_TOKEN_MAP } from './vsCodeTokenMap';

// Test component to access theme context
function ThemeConsumer() {
  const { theme, resolvedVariant, isDark, isHighContrast, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="variant">{theme.variant}</span>
      <span data-testid="resolved">{resolvedVariant}</span>
      <span data-testid="isDark">{isDark ? 'dark' : 'light'}</span>
      <span data-testid="isHighContrast">{isHighContrast ? 'hc' : 'normal'}</span>
      <button onClick={() => setTheme({ variant: 'dark' })} data-testid="setDark">
        Set Dark
      </button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    // Reset document attributes
    document.documentElement.removeAttribute('data-theme');
    document.body.className = '';
  });

  it('provides default light theme', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('variant')).toHaveTextContent('light');
    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    expect(screen.getByTestId('isDark')).toHaveTextContent('light');
  });

  it('accepts initial theme prop', () => {
    render(
      <ThemeProvider theme={{ variant: 'dark' }}>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('variant')).toHaveTextContent('dark');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(screen.getByTestId('isDark')).toHaveTextContent('dark');
  });

  it('allows theme to be changed via setTheme', () => {
    render(
      <ThemeProvider theme={{ variant: 'light' }}>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('variant')).toHaveTextContent('light');

    act(() => {
      screen.getByTestId('setDark').click();
    });

    expect(screen.getByTestId('variant')).toHaveTextContent('dark');
    expect(screen.getByTestId('isDark')).toHaveTextContent('dark');
  });

  it('sets data-theme attribute on document', () => {
    render(
      <ThemeProvider theme={{ variant: 'dark' }}>
        <div>Content</div>
      </ThemeProvider>
    );

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('supports high-contrast-light variant with isHighContrast flag', () => {
    render(
      <ThemeProvider theme={{ variant: 'high-contrast-light' }}>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('variant')).toHaveTextContent('high-contrast-light');
    expect(screen.getByTestId('resolved')).toHaveTextContent('high-contrast-light');
    expect(screen.getByTestId('isDark')).toHaveTextContent('light');
    expect(screen.getByTestId('isHighContrast')).toHaveTextContent('hc');
  });

  it('supports high-contrast-dark variant with isHighContrast flag', () => {
    render(
      <ThemeProvider theme={{ variant: 'high-contrast-dark' }}>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('variant')).toHaveTextContent('high-contrast-dark');
    expect(screen.getByTestId('resolved')).toHaveTextContent('high-contrast-dark');
    expect(screen.getByTestId('isDark')).toHaveTextContent('dark');
    expect(screen.getByTestId('isHighContrast')).toHaveTextContent('hc');
  });

  it('renders children', () => {
    render(
      <ThemeProvider>
        <div data-testid="child">Hello World</div>
      </ThemeProvider>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toHaveTextContent('Hello World');
  });

  it('applies custom tokens', () => {
    const customTheme: Theme = {
      variant: 'light',
      tokens: {
        colorPrimary: '#ff0000',
      },
    };

    render(
      <ThemeProvider theme={customTheme}>
        <div>Content</div>
      </ThemeProvider>
    );

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--debrief-color-primary')).toBe('#ff0000');
  });
});

describe('ThemeProvider — VS Code variable injection (Feature 209/220)', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.body.className = '';
    // Clear any previously-injected --vscode-* variables so each test starts clean.
    const root = document.documentElement;
    for (const entry of Object.values(VS_CODE_TOKEN_MAP)) {
      for (const key of Object.keys(entry)) {
        root.style.removeProperty(key);
      }
    }
  });

  it('injects light-variant --vscode-* values when variant is light (outside VS Code)', () => {
    render(
      <ThemeProvider theme={{ variant: 'light' }}>
        <div>Content</div>
      </ThemeProvider>
    );

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--vscode-foreground'))
      .toBe(VS_CODE_TOKEN_MAP.light['--vscode-foreground']);
    expect(root.style.getPropertyValue('--vscode-sideBar-background'))
      .toBe(VS_CODE_TOKEN_MAP.light['--vscode-sideBar-background']);
    expect(root.style.getPropertyValue('--vscode-editor-background'))
      .toBe(VS_CODE_TOKEN_MAP.light['--vscode-editor-background']);
  });

  it('injects dark-variant --vscode-* values when variant is dark (outside VS Code)', () => {
    render(
      <ThemeProvider theme={{ variant: 'dark' }}>
        <div>Content</div>
      </ThemeProvider>
    );

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--vscode-foreground'))
      .toBe(VS_CODE_TOKEN_MAP.dark['--vscode-foreground']);
    expect(root.style.getPropertyValue('--vscode-sideBar-background'))
      .toBe(VS_CODE_TOKEN_MAP.dark['--vscode-sideBar-background']);
    expect(root.style.getPropertyValue('--vscode-editor-background'))
      .toBe(VS_CODE_TOKEN_MAP.dark['--vscode-editor-background']);
  });

  it('injects high-contrast-light --vscode-* values when variant is high-contrast-light', () => {
    render(
      <ThemeProvider theme={{ variant: 'high-contrast-light' }}>
        <div>Content</div>
      </ThemeProvider>
    );

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--vscode-foreground'))
      .toBe(VS_CODE_TOKEN_MAP['high-contrast-light']['--vscode-foreground']);
    expect(root.style.getPropertyValue('--vscode-sideBar-background'))
      .toBe(VS_CODE_TOKEN_MAP['high-contrast-light']['--vscode-sideBar-background']);
  });

  it('injects high-contrast-dark --vscode-* values when variant is high-contrast-dark', () => {
    render(
      <ThemeProvider theme={{ variant: 'high-contrast-dark' }}>
        <div>Content</div>
      </ThemeProvider>
    );

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--vscode-foreground'))
      .toBe(VS_CODE_TOKEN_MAP['high-contrast-dark']['--vscode-foreground']);
    expect(root.style.getPropertyValue('--vscode-sideBar-background'))
      .toBe(VS_CODE_TOKEN_MAP['high-contrast-dark']['--vscode-sideBar-background']);
  });

  it('switching from light to dark re-applies the correct variant values', () => {
    function Switcher() {
      const { setTheme } = useTheme();
      return (
        <button
          onClick={() => setTheme({ variant: 'dark' })}
          data-testid="switch-to-dark"
        >
          switch
        </button>
      );
    }

    render(
      <ThemeProvider theme={{ variant: 'light' }}>
        <Switcher />
      </ThemeProvider>
    );

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--vscode-foreground'))
      .toBe(VS_CODE_TOKEN_MAP.light['--vscode-foreground']);

    act(() => {
      screen.getByTestId('switch-to-dark').click();
    });

    expect(root.style.getPropertyValue('--vscode-foreground'))
      .toBe(VS_CODE_TOKEN_MAP.dark['--vscode-foreground']);
  });

  it('switching variants clears the previous variant values', () => {
    function Switcher() {
      const { setTheme } = useTheme();
      return (
        <button
          onClick={() => setTheme({ variant: 'high-contrast-dark' })}
          data-testid="switch-hc-dark"
        >
          switch
        </button>
      );
    }

    render(
      <ThemeProvider theme={{ variant: 'dark' }}>
        <Switcher />
      </ThemeProvider>
    );

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--vscode-foreground'))
      .toBe(VS_CODE_TOKEN_MAP.dark['--vscode-foreground']);

    act(() => {
      screen.getByTestId('switch-hc-dark').click();
    });

    expect(root.style.getPropertyValue('--vscode-foreground'))
      .toBe(VS_CODE_TOKEN_MAP['high-contrast-dark']['--vscode-foreground']);
  });
});

describe('useTheme', () => {
  it('returns theme context when used within ThemeProvider', () => {
    render(
      <ThemeProvider theme={{ variant: 'dark' }}>
        <ThemeConsumer />
      </ThemeProvider>
    );

    // Verify the hook returns the expected context
    expect(screen.getByTestId('variant')).toHaveTextContent('dark');
    expect(screen.getByTestId('isDark')).toHaveTextContent('dark');
  });

  it('provides setTheme function to update theme', () => {
    render(
      <ThemeProvider theme={{ variant: 'light' }}>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('variant')).toHaveTextContent('light');

    act(() => {
      screen.getByTestId('setDark').click();
    });

    expect(screen.getByTestId('variant')).toHaveTextContent('dark');
  });
});
