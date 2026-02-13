/**
 * Storybook stories for the ContextMenu component.
 *
 * Stories demonstrate:
 * - Basic enum menu
 * - Menu with parameter name header
 * - Custom... option
 * - Custom input mode
 * - Scrollable menu with many items
 * - Viewport repositioning
 *
 * Feature: 091-tool-parameter-context-menus
 */

import React, { useState, useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ContextMenu } from './ContextMenu';
import type { ContextMenuProps, ContextMenuItem } from './ContextMenu';
import { ThemeProvider } from '../ThemeProvider';

const meta: Meta<typeof ContextMenu> = {
  title: 'Components/ContextMenu',
  component: ContextMenu,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
Reusable inline context menu for parameter selection.

## Features

- **Keyboard navigation**: Arrow Up/Down, Enter to select, Escape to dismiss
- **Viewport repositioning**: Auto-adjusts to stay within viewport bounds
- **Custom input**: Optional "Custom..." mode for free-form text entry
- **Validation**: Custom input supports validation with error messages
- **Accessibility**: Uses \`role="menu"\` and \`role="menuitem"\`

## Usage

\`\`\`tsx
import { ContextMenu } from '@debrief/components';

<ContextMenu
  items={[
    { id: 'red', label: 'Red' },
    { id: 'blue', label: 'Blue' },
  ]}
  anchorPosition={{ x: 100, y: 200 }}
  onSelect={(id) => console.log('Selected:', id)}
  onDismiss={() => setOpen(false)}
/>
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'dark';
      return (
        <ThemeProvider theme={{ variant: theme }}>
          <div style={{ width: 400, height: 400, position: 'relative', background: 'var(--debrief-bg-secondary, #252526)' }}>
            <Story />
          </div>
        </ThemeProvider>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof ContextMenu>;

// =============================================================================
// Sample data
// =============================================================================

const COLOR_ITEMS: ContextMenuItem[] = [
  { id: 'red', label: 'Red', description: '#FF0000' },
  { id: 'green', label: 'Green', description: '#00FF00' },
  { id: 'blue', label: 'Blue', description: '#0000FF' },
  { id: 'yellow', label: 'Yellow', description: '#FFFF00' },
  { id: 'cyan', label: 'Cyan', description: '#00FFFF' },
];

const INTERPOLATION_ITEMS: ContextMenuItem[] = [
  { id: 'linear', label: 'Linear', description: 'Straight-line interpolation between points' },
  { id: 'cubic', label: 'Cubic', description: 'Smooth cubic spline interpolation' },
  { id: 'nearest', label: 'Nearest', description: 'Snap to nearest known value' },
];

const MANY_ITEMS: ContextMenuItem[] = Array.from({ length: 25 }, (_, i) => ({
  id: `item-${i + 1}`,
  label: `Option ${i + 1}`,
  description: i % 3 === 0 ? `Description for option ${i + 1}` : undefined,
}));

// =============================================================================
// Stateful wrapper for interactive stories
// =============================================================================

function InteractiveWrapper({
  items,
  header,
  showCustomOption,
  validateCustom,
  anchorPosition = { x: 20, y: 20 },
}: {
  items: ContextMenuItem[];
  header?: string;
  showCustomOption?: boolean;
  validateCustom?: (value: string) => string | null;
  anchorPosition?: { x: number; y: number };
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return (
      <div style={{ padding: 20, color: 'var(--debrief-text-primary, #ccc)' }}>
        <p>Menu dismissed. {selected ? `Last selected: ${selected}` : 'No selection.'}</p>
        <button
          style={{ marginTop: 8, padding: '4px 12px', cursor: 'pointer' }}
          onClick={() => setDismissed(false)}
        >
          Reopen
        </button>
      </div>
    );
  }

  return (
    <>
      <ContextMenu
        items={items}
        anchorPosition={anchorPosition}
        header={header}
        onSelect={(id) => {
          setSelected(id);
          setDismissed(true);
        }}
        onDismiss={() => setDismissed(true)}
        showCustomOption={showCustomOption}
        onCustomValue={(value) => {
          setSelected(`custom:${value}`);
          setDismissed(true);
        }}
        validateCustom={validateCustom}
      />
      {selected && (
        <div style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 11, color: 'var(--debrief-text-muted, #808080)' }}>
          Last selected: {selected}
        </div>
      )}
    </>
  );
}

// =============================================================================
// Stories
// =============================================================================

/**
 * Basic enum menu with color items. Demonstrates keyboard navigation
 * and item descriptions.
 */
export const Default: Story = {
  render: () => (
    <InteractiveWrapper items={COLOR_ITEMS} />
  ),
};

/**
 * Menu with a parameter name header. Useful for showing which
 * parameter the menu is editing.
 */
export const WithHeader: Story = {
  render: () => (
    <InteractiveWrapper
      items={INTERPOLATION_ITEMS}
      header="Interpolation Method"
    />
  ),
};

/**
 * Menu showing the "Custom..." option at the bottom.
 * Clicking it switches to free-form text input mode.
 */
export const WithCustomOption: Story = {
  render: () => (
    <InteractiveWrapper
      items={COLOR_ITEMS}
      header="Track Color"
      showCustomOption
    />
  ),
};

/**
 * Menu with custom input and validation. Values must be valid
 * hex color codes (e.g. #FF0000).
 */
export const WithCustomValidation: Story = {
  render: () => (
    <InteractiveWrapper
      items={COLOR_ITEMS}
      header="Track Color"
      showCustomOption
      validateCustom={(value) => {
        if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
          return 'Must be a valid hex color (e.g. #FF0000).';
        }
        return null;
      }}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Select "Custom..." and try entering an invalid hex color to see the validation error.',
      },
    },
  },
};

/**
 * Menu pre-opened in custom input mode, demonstrating the input field,
 * submit/cancel buttons, and error state.
 */
export const CustomInputMode: Story = {
  render: () => {
    const Wrapper = () => {
      const [result, setResult] = useState<string | null>(null);

      if (result) {
        return (
          <div style={{ padding: 20, color: 'var(--debrief-text-primary, #ccc)' }}>
            Submitted: {result}
          </div>
        );
      }

      return (
        <ContextMenu
          items={[]}
          anchorPosition={{ x: 20, y: 20 }}
          header="Custom Value"
          onSelect={() => {}}
          onDismiss={() => {}}
          showCustomOption={false}
          onCustomValue={(value) => setResult(value)}
        />
      );
    };

    return <Wrapper />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the menu with an empty items list, simulating a direct custom entry scenario.',
      },
    },
  },
};

/**
 * Menu with many items, demonstrating the scrollable container.
 * The menu enforces a max-height and scrolls when items overflow.
 */
export const ManyItems: Story = {
  render: () => (
    <InteractiveWrapper
      items={MANY_ITEMS}
      header="Select an Option"
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'With 25 items, the menu becomes scrollable. Keyboard navigation wraps around at the boundaries.',
      },
    },
  },
};

/**
 * Menu positioned near the bottom-right edge to demonstrate
 * automatic viewport repositioning.
 */
export const ViewportRepositioning: Story = {
  render: () => (
    <InteractiveWrapper
      items={COLOR_ITEMS}
      header="Edge-Positioned Menu"
      anchorPosition={{ x: 300, y: 300 }}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'The menu is anchored at (300, 300) within a 400x400 container. It auto-repositions to avoid overflowing the viewport.',
      },
    },
  },
};

/**
 * Light theme variant.
 */
export const LightTheme: Story = {
  render: () => (
    <ThemeProvider theme={{ variant: 'light' }}>
      <div style={{ width: 400, height: 300, position: 'relative', background: '#f5f5f5' }}>
        <InteractiveWrapper
          items={INTERPOLATION_ITEMS}
          header="Interpolation Method"
          showCustomOption
        />
      </div>
    </ThemeProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Context menu styled for light theme environments.',
      },
    },
  },
};
