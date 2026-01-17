import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from './ThemeProvider';
import { useTheme } from '../hooks/useTheme';
import type { Theme } from './ThemeContext';

const meta: Meta<typeof ThemeProvider> = {
  title: 'Foundation/ThemeProvider',
  component: ThemeProvider,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'ThemeProvider manages the Debrief design system tokens and theme variants. Wrap your application with ThemeProvider to enable consistent styling across all components.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ThemeProvider>;

// Demo component showing theme-aware styling
function ThemeDemo() {
  const { theme, resolvedVariant, isDark, setTheme } = useTheme();

  const boxStyle: React.CSSProperties = {
    padding: 'var(--debrief-space-lg)',
    backgroundColor: 'var(--debrief-bg-secondary)',
    borderRadius: 'var(--debrief-radius-md)',
    border: '1px solid var(--debrief-border-color)',
    minWidth: 300,
  };

  const headingStyle: React.CSSProperties = {
    color: 'var(--debrief-text-primary)',
    fontFamily: 'var(--debrief-font-family)',
    fontSize: 'var(--debrief-font-size-lg)',
    fontWeight: 'var(--debrief-font-weight-bold)',
    marginBottom: 'var(--debrief-space-md)',
  };

  const textStyle: React.CSSProperties = {
    color: 'var(--debrief-text-secondary)',
    fontFamily: 'var(--debrief-font-family)',
    fontSize: 'var(--debrief-font-size-md)',
    marginBottom: 'var(--debrief-space-sm)',
  };

  const buttonStyle: React.CSSProperties = {
    padding: 'var(--debrief-space-sm) var(--debrief-space-md)',
    backgroundColor: 'var(--debrief-color-primary)',
    color: 'var(--debrief-text-inverse)',
    border: 'none',
    borderRadius: 'var(--debrief-radius-md)',
    cursor: 'pointer',
    fontFamily: 'var(--debrief-font-family)',
    fontSize: 'var(--debrief-font-size-md)',
  };

  const colorSwatchStyle = (color: string): React.CSSProperties => ({
    display: 'inline-block',
    width: 24,
    height: 24,
    backgroundColor: color,
    borderRadius: 'var(--debrief-radius-sm)',
    marginRight: 'var(--debrief-space-xs)',
    border: '1px solid var(--debrief-border-color)',
  });

  return (
    <div style={boxStyle}>
      <h3 style={headingStyle}>Theme Demo</h3>
      <p style={textStyle}>Current variant: {theme.variant}</p>
      <p style={textStyle}>Resolved: {resolvedVariant}</p>
      <p style={textStyle}>Dark mode: {isDark ? 'Yes' : 'No'}</p>

      <div style={{ marginTop: 'var(--debrief-space-md)', marginBottom: 'var(--debrief-space-md)' }}>
        <p style={{ ...textStyle, fontWeight: 'var(--debrief-font-weight-medium)' }}>Track Colors:</p>
        <div>
          <span style={colorSwatchStyle('var(--debrief-color-ownship)')} title="Ownship" />
          <span style={colorSwatchStyle('var(--debrief-color-contact)')} title="Contact" />
          <span style={colorSwatchStyle('var(--debrief-color-reference)')} title="Reference" />
          <span style={colorSwatchStyle('var(--debrief-color-solution)')} title="Solution" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--debrief-space-sm)' }}>
        <button style={buttonStyle} onClick={() => setTheme({ variant: 'light' })}>
          Light
        </button>
        <button style={buttonStyle} onClick={() => setTheme({ variant: 'dark' })}>
          Dark
        </button>
        <button style={buttonStyle} onClick={() => setTheme({ variant: 'vscode' })}>
          VS Code
        </button>
      </div>
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <ThemeProvider>
      <ThemeDemo />
    </ThemeProvider>
  ),
};

export const DarkTheme: Story = {
  render: () => (
    <ThemeProvider theme={{ variant: 'dark' }}>
      <ThemeDemo />
    </ThemeProvider>
  ),
};

export const VSCodeTheme: Story = {
  render: () => (
    <ThemeProvider theme={{ variant: 'vscode' }}>
      <ThemeDemo />
    </ThemeProvider>
  ),
};

export const CustomTokens: Story = {
  render: () => {
    const customTheme: Theme = {
      variant: 'light',
      tokens: {
        colorPrimary: '#8b5cf6',
        colorOwnship: '#8b5cf6',
        colorContact: '#ec4899',
      },
    };

    return (
      <ThemeProvider theme={customTheme}>
        <ThemeDemo />
      </ThemeProvider>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Custom tokens can override any theme variable.',
      },
    },
  },
};
