import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider } from './ThemeProvider';
import { useTheme } from '../hooks/useTheme';
import type { Theme } from './ThemeContext';
import { VS_CODE_TOKEN_MAP } from './vsCodeTokenMap';

// Test component to access theme context
function ThemeConsumer() {
  const { theme, resolvedVariant, isDark, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="variant">{theme.variant}</span>
      <span data-testid="resolved">{resolvedVariant}</span>
      <span data-testid="isDark">{isDark ? 'dark' : 'light'}</span>
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

  it('supports vscode theme variant', () => {
    render(
      <ThemeProvider theme={{ variant: 'vscode' }}>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(screen.getByTestId('variant')).toHaveTextContent('vscode');
    expect(screen.getByTestId('isDark')).toHaveTextContent('dark'); // vscode is treated as dark
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

describe('ThemeProvider — VS Code variable injection (Feature 209)', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
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

  it('does NOT inject --vscode-* values when variant is vscode (real host supplies them)', () => {
    render(
      <ThemeProvider theme={{ variant: 'vscode' }}>
        <div>Content</div>
      </ThemeProvider>
    );

    const root = document.documentElement;
    // No synthetic inline value — the inline style property should be empty
    // (VS Code supplies the variable in a real stylesheet at the host level,
    // which getPropertyValue on inline style does not reflect).
    expect(root.style.getPropertyValue('--vscode-foreground')).toBe('');
    expect(root.style.getPropertyValue('--vscode-sideBar-background')).toBe('');
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

  it('switching from dark to vscode removes the synthetic values', () => {
    function Switcher() {
      const { setTheme } = useTheme();
      return (
        <button
          onClick={() => setTheme({ variant: 'vscode' })}
          data-testid="switch-to-vscode"
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
    // Sanity check: dark values injected first.
    expect(root.style.getPropertyValue('--vscode-foreground'))
      .toBe(VS_CODE_TOKEN_MAP.dark['--vscode-foreground']);

    act(() => {
      screen.getByTestId('switch-to-vscode').click();
    });

    // After switching to vscode, synthetic inline values are cleared.
    expect(root.style.getPropertyValue('--vscode-foreground')).toBe('');
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
