# Usage Example: Creating a Themed Component

Following the guide at `docs/storybook-vscode-theming.md`, Section 6.

## Component: TrackLabel

A label showing a track name with its type-specific color.

### Step 1: Component (uses only `--debrief-*` tokens)

```tsx
// shared/components/src/components/TrackLabel/TrackLabel.tsx
interface TrackLabelProps {
  name: string;
  type: 'ownship' | 'contact' | 'reference' | 'solution';
}

export function TrackLabel({ name, type }: TrackLabelProps) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--debrief-space-xs)',
      fontSize: 'var(--debrief-font-size-sm)',
      fontFamily: 'var(--debrief-font-family)',
      color: 'var(--debrief-text-primary)',
    }}>
      <span style={{
        width: '8px',
        height: '8px',
        borderRadius: 'var(--debrief-radius-full)',
        backgroundColor: `var(--debrief-color-${type})`,
      }} />
      {name}
    </span>
  );
}
```

### Step 2: Story

```tsx
// shared/components/src/components/TrackLabel/TrackLabel.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { TrackLabel } from './TrackLabel';

const meta: Meta<typeof TrackLabel> = {
  title: 'Components/TrackLabel',
  component: TrackLabel,
};
export default meta;

type Story = StoryObj<typeof TrackLabel>;

export const Ownship: Story = {
  args: { name: 'HMS Ambush', type: 'ownship' },
};

export const Contact: Story = {
  args: { name: 'CONTACT 001', type: 'contact' },
};
```

### Step 3: Verify

Switch Storybook toolbar between Light, Dark, and VS Code themes:

- **Light**: Text is dark (`#212529`), colored dot visible against white background
- **Dark**: Text is light (`#cccccc`), colored dot visible against dark background
- **VS Code**: Inherits editor theme colors, text adapts accordingly

The component works in all three themes because it uses `--debrief-*` tokens that are redefined per theme variant.
