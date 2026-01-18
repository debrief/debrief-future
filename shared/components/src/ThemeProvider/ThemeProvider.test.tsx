import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider } from './ThemeProvider';
import { useTheme } from '../hooks/useTheme';
import type { Theme } from './ThemeContext';

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
