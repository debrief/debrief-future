# Storybook VS Code Theming Guide

How theming works in Debrief shared components and how to create correctly themed components for the VS Code extension.

## 1. Overview

Debrief uses a four-layer theming architecture (#220):

```
tokens.css                    →  Base CSS custom properties (--debrief-*)
                                 with one [data-theme] block per explicit
                                 variant: light, dark, high-contrast-light,
                                 high-contrast-dark.

ThemeSource (vsCodeAdapter /  →  Live source of the active variant.
 browserAdapter)                 - vsCodeBodyClassSource() reads VS Code's
                                   `vscode-*` body class + listens to the
                                   `vscode-theme-changed` postMessage.
                                 - mediaQuerySource() reads OS prefers-
                                   color-scheme + prefers-contrast.
                                 - staticSource(variant) for pinned tests.

ThemeProvider.tsx             →  React context that subscribes to a source,
                                 sets [data-theme] on documentElement, and
                                 re-applies --debrief-* tokens on every emit.
                                 Exposes `isHighContrast` for contrast-
                                 sensitive styling.

.storybook/preview.tsx        →  Toolbar exposes 4 explicit variants +
                                 'system'. Decorator injects `--vscode-*`
                                 values per variant via the shared
                                 `.storybook/vscode-token-map.ts`
                                 (re-exports the runtime map under a strict
                                 `--vscode-${string}` key type).
```

**Variants (`ThemeVariant`)**:

The variant union is a flat enumeration mirroring VS Code's body-class
taxonomy:

| `ThemeVariant`         | VS Code body class            | `data-theme` attr        |
|------------------------|--------------------------------|--------------------------|
| `light`                | `vscode-light`                 | `light`                  |
| `dark`                 | `vscode-dark`                  | `dark`                   |
| `high-contrast-light`  | `vscode-high-contrast-light`   | `high-contrast-light`    |
| `high-contrast-dark`   | `vscode-high-contrast`         | `high-contrast-dark`     |
| `system`               | (no body class, OS pref)       | resolved via media query |

The legacy `'vscode'` variant is **retired** as of #220 — when a webview
runs inside a VS Code host, the variant is resolved from the body class
to one of the four explicit values.

**How it works at runtime:**

1. `tokens.css` defines `--debrief-*` custom properties on `:root` (defaults)
2. CSS `[data-theme='light' | 'dark' | 'high-contrast-light' | 'high-contrast-dark']` selectors override those properties for each variant
3. `ThemeProvider` sets `data-theme` on `document.documentElement` from the source's resolved variant
4. In VS Code webviews, the host supplies `--vscode-*` variables natively; in Storybook / web-shell, the decorator injects them per variant from `.storybook/vscode-token-map.ts`

Components should only use `--debrief-*` tokens (or `var(--vscode-..., FALLBACK)`
when stylistically tied to a specific VS Code surface). Never use raw hex
colors. The `no-hardcoded-colours.test.ts` static gate enforces this.

## 2. Token Reference

All tokens defined in `shared/components/src/styles/tokens.css`.

### Color Tokens

| Token | Purpose | Light | Dark |
|-------|---------|-------|------|
| `--debrief-color-primary` | Brand/accent | `#0066cc` | `#0066cc` |
| `--debrief-color-primary-hover` | Accent hover | `#0052a3` | `#0052a3` |
| `--debrief-color-primary-active` | Accent active | `#003d7a` | `#003d7a` |
| `--debrief-color-secondary` | Secondary accent | `#6c757d` | `#6c757d` |
| `--debrief-color-secondary-hover` | Secondary hover | `#5a6268` | `#5a6268` |
| `--debrief-color-secondary-active` | Secondary active | `#494e52` | `#494e52` |
| `--debrief-color-success` | Success state | `#28a745` | `#28a745` |
| `--debrief-color-warning` | Warning state | `#ffc107` | `#ffc107` |
| `--debrief-color-danger` | Error/danger | `#dc3545` | `#dc3545` |
| `--debrief-color-info` | Info state | `#17a2b8` | `#17a2b8` |

### Track Type Colors

| Token | Purpose | Value |
|-------|---------|-------|
| `--debrief-color-ownship` | Own platform | `#0066cc` |
| `--debrief-color-contact` | Detected contact | `#cc0000` |
| `--debrief-color-reference` | Reference data | `#666666` |
| `--debrief-color-solution` | Computed solution | `#00cc66` |

### Background Tokens

| Token | Purpose | Light | Dark |
|-------|---------|-------|------|
| `--debrief-bg-primary` | Main background | `#ffffff` | `#1e1e1e` |
| `--debrief-bg-secondary` | Side panels | `#f8f9fa` | `#252526` |
| `--debrief-bg-tertiary` | Inset areas | `#e9ecef` | `#2d2d30` |
| `--debrief-bg-overlay` | Modal overlay | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.7)` |

### Text Tokens

| Token | Purpose | Light | Dark |
|-------|---------|-------|------|
| `--debrief-text-primary` | Primary text | `#212529` | `#cccccc` |
| `--debrief-text-secondary` | Secondary text | `#6c757d` | `#9d9d9d` |
| `--debrief-text-muted` | Muted/disabled | `#adb5bd` | `#6d6d6d` |
| `--debrief-text-inverse` | Text on dark bg | `#ffffff` | `#1e1e1e` |

### Border Tokens

| Token | Purpose | Light | Dark |
|-------|---------|-------|------|
| `--debrief-border-color` | Default border | `#dee2e6` | `#3c3c3c` |
| `--debrief-border-color-focus` | Focus ring | `#0066cc` | `#0066cc` |
| `--debrief-border-color-error` | Error border | `#dc3545` | `#dc3545` |

### Selection Tokens

| Token | Purpose | Light | Dark |
|-------|---------|-------|------|
| `--debrief-selection-bg` | Selection background | `rgba(0,102,204,0.1)` | `rgba(0,102,204,0.1)` |
| `--debrief-selection-border` | Selection border | `#0066cc` | `#0066cc` |

### Spacing Tokens

| Token | Value |
|-------|-------|
| `--debrief-space-xs` | `4px` |
| `--debrief-space-sm` | `8px` |
| `--debrief-space-md` | `16px` |
| `--debrief-space-lg` | `24px` |
| `--debrief-space-xl` | `32px` |
| `--debrief-space-2xl` | `48px` |

### Typography Tokens

| Token | Value |
|-------|-------|
| `--debrief-font-family` | System sans-serif stack |
| `--debrief-font-family-mono` | `SF Mono, Monaco, Consolas, monospace` |
| `--debrief-font-size-xs` | `10px` |
| `--debrief-font-size-sm` | `12px` |
| `--debrief-font-size-md` | `14px` |
| `--debrief-font-size-lg` | `16px` |
| `--debrief-font-size-xl` | `20px` |
| `--debrief-font-size-2xl` | `24px` |
| `--debrief-font-weight-normal` | `400` |
| `--debrief-font-weight-medium` | `500` |
| `--debrief-font-weight-bold` | `600` |

### Component-Specific Tokens

| Token | Purpose | Value |
|-------|---------|-------|
| `--debrief-map-min-height` | Map minimum height | `300px` |
| `--debrief-map-controls-bg` | Map controls background | `rgba(255,255,255,0.9)` (light) / `rgba(30,30,30,0.9)` (dark) |
| `--debrief-timeline-height` | Timeline height | `150px` |
| `--debrief-timeline-bar-height` | Timeline bar | `24px` |
| `--debrief-list-row-height` | List row height | `40px` |

## 3. VS Code Variable Mapping

When running inside a VS Code webview, `vsCodeAdapter.ts` maps VS Code's built-in CSS variables to Debrief tokens. This happens at runtime via `applyVSCodeTokens()`.

**Source**: `shared/components/src/ThemeProvider/vsCodeAdapter.ts`

| VS Code Variable | Debrief Token |
|------------------|---------------|
| `--vscode-editor-background` | `--debrief-bg-primary` |
| `--vscode-editor-foreground` | `--debrief-text-primary` |
| `--vscode-sideBar-background` | `--debrief-bg-secondary` |
| `--vscode-sideBar-foreground` | `--debrief-text-secondary` |
| `--vscode-list-activeSelectionBackground` | `--debrief-selection-bg` |
| `--vscode-list-activeSelectionForeground` | `--debrief-selection-text` |
| `--vscode-list-hoverBackground` | `--debrief-hover-bg` |
| `--vscode-focusBorder` | `--debrief-focus-ring` |
| `--vscode-contrastBorder` | `--debrief-border-color` |
| `--vscode-widget-border` | `--debrief-border-color-light` |
| `--vscode-button-background` | `--debrief-button-bg` |
| `--vscode-button-foreground` | `--debrief-button-text` |
| `--vscode-button-hoverBackground` | `--debrief-button-hover-bg` |
| `--vscode-badge-background` | `--debrief-badge-bg` |
| `--vscode-badge-foreground` | `--debrief-badge-text` |
| `--vscode-scrollbarSlider-background` | `--debrief-scrollbar-thumb` |
| `--vscode-scrollbarSlider-hoverBackground` | `--debrief-scrollbar-thumb-hover` |
| `--vscode-scrollbarSlider-activeBackground` | `--debrief-scrollbar-thumb-active` |
| `--vscode-font-family` | `--debrief-font-family` |
| `--vscode-font-size` | `--debrief-font-size` |
| `--vscode-editor-font-family` | `--debrief-font-family-mono` |

**CSS-level fallbacks** are also defined in `tokens.css` under `[data-theme='vscode']`:

```css
[data-theme='vscode'] {
  --debrief-bg-primary: var(--vscode-editor-background, #1e1e1e);
  --debrief-bg-secondary: var(--vscode-sideBar-background, #252526);
  --debrief-text-primary: var(--vscode-editor-foreground, #cccccc);
  --debrief-text-secondary: var(--vscode-descriptionForeground, #9d9d9d);
  --debrief-border-color: var(--vscode-panel-border, #3c3c3c);
  --debrief-color-primary: var(--vscode-focusBorder, #0066cc);
}
```

**Adapter utilities** exported from `vsCodeAdapter.ts`:

| Function | Purpose |
|----------|---------|
| `isVSCodeEnvironment()` | Detect if running in a VS Code webview (checks for `acquireVsCodeApi` or `--vscode-editor-background`) |
| `extractVSCodeTokens()` | Read VS Code CSS variables and return as a token object |
| `applyVSCodeTokens()` | Copy VS Code variable values into `--debrief-*` properties on `document.documentElement` |
| `isVSCodeDarkMode()` | Detect dark mode by parsing `--vscode-editor-background` luminance |
| `createVSCodeTheme()` | Return a `Theme` object with `variant: 'vscode'` and extracted tokens |
| `setupVSCodeThemeSync(callback)` | Watch for theme changes via MutationObserver and message events; returns cleanup function |

## 4. Storybook Theme Toolbar

The Storybook toolbar provides a theme switcher configured in `shared/components/.storybook/preview.tsx`.

### Toolbar Configuration

Three theme options appear in the toolbar (paintbrush icon):

| Option | Icon | Theme Variant | Background |
|--------|------|---------------|------------|
| Light | Sun | `light` | `#ffffff` |
| Dark | Moon | `dark` | `#1e1e1e` |
| VS Code | Lightning | `vscode` | `#252526` |

### How It Works

1. `preview.tsx` defines `globalTypes.theme` with toolbar items
2. A `withThemeProvider` decorator wraps every story in `<ThemeProvider>`
3. The decorator reads `context.globals.theme` to get the selected variant
4. `ThemeProvider` sets `data-theme` on the DOM and applies CSS tokens

```tsx
// From preview.tsx
const withThemeProvider: Decorator = (Story, context) => {
  const theme = context.globals.theme as ThemeVariant;
  return (
    <ThemeProvider theme={{ variant: theme }}>
      <Story />
    </ThemeProvider>
  );
};
```

### Storybook UI Theme

The Storybook UI itself (sidebar, toolbar, panels) is themed in `shared/components/.storybook/manager.ts` using `@storybook/theming/create` with Debrief brand colors (`#0066cc` primary, light base).

## 5. Context Decorators

For stories that need to simulate specific runtime environments, use the context decorators from `shared/components/.storybook/decorators/ContextDecorator.tsx`.

### Available Contexts

| Context | Variant | Background | Simulates |
|---------|---------|------------|-----------|
| `electron-light` | `light` | `#ffffff` | Electron app, light mode |
| `electron-dark` | `dark` | `#212529` | Electron app, dark mode |
| `vscode` | `vscode` | `#1e1e1e` | VS Code webview, dark |

Each context provides a full set of tokens (background, text, borders, buttons, badges, scrollbars) matching that environment.

### Usage

**Single context** — wrap a story in one environment:

```tsx
import { withContext } from '../.storybook/decorators/ContextDecorator';

export const InVSCode = {
  decorators: [withContext('vscode')],
};
```

**Multi-context comparison** — show a component in all three environments side by side:

```tsx
import { withMultiContext } from '../.storybook/decorators/ContextDecorator';

export const AllContexts = {
  decorators: [withMultiContext],
};
```

**Direct component wrapper** — use `ContextSimulator` in custom layouts:

```tsx
import { ContextSimulator } from '../.storybook/decorators/ContextDecorator';

<ContextSimulator context="vscode">
  <MyComponent />
</ContextSimulator>
```

### When to Use Context Decorators vs Theme Toolbar

- **Theme toolbar**: Quick switching during development. Applies globally to all stories.
- **Context decorators**: Permanent story variants that always render in a specific environment. Use for visual regression testing or documentation.

## 6. How-To: Add a New Themed Component

### Step 1: Create the component

Use only `--debrief-*` CSS custom properties for colors, spacing, and typography. Never use raw hex values.

```tsx
// src/components/StatusBadge/StatusBadge.tsx
import type { ReactNode } from 'react';

interface StatusBadgeProps {
  variant: 'success' | 'warning' | 'danger';
  children: ReactNode;
}

export function StatusBadge({ variant, children }: StatusBadgeProps) {
  return (
    <span
      style={{
        backgroundColor: `var(--debrief-color-${variant})`,
        color: 'var(--debrief-text-inverse)',
        padding: 'var(--debrief-space-xs) var(--debrief-space-sm)',
        borderRadius: 'var(--debrief-radius-md)',
        fontSize: 'var(--debrief-font-size-sm)',
        fontWeight: 'var(--debrief-font-weight-medium)',
      }}
    >
      {children}
    </span>
  );
}
```

### Step 2: Create a Storybook story

```tsx
// src/components/StatusBadge/StatusBadge.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge } from './StatusBadge';

const meta: Meta<typeof StatusBadge> = {
  title: 'Components/StatusBadge',
  component: StatusBadge,
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Success: Story = {
  args: { variant: 'success', children: 'Active' },
};

export const Warning: Story = {
  args: { variant: 'warning', children: 'Pending' },
};

export const Danger: Story = {
  args: { variant: 'danger', children: 'Error' },
};
```

### Step 3: Verify in Storybook

1. Run `pnpm storybook` from `shared/components/`
2. Open your story in the Storybook UI
3. Use the theme toolbar (paintbrush icon) to switch between Light, Dark, and VS Code
4. Verify the component looks correct in all three themes

### Step 4 (optional): Add context decorator variants

If you want permanent visual variants for different environments:

```tsx
import { withContext, withMultiContext } from '../../../.storybook/decorators/ContextDecorator';

export const InVSCode: Story = {
  args: { variant: 'success', children: 'Active' },
  decorators: [withContext('vscode')],
};

export const AllContexts: Story = {
  args: { variant: 'success', children: 'Active' },
  decorators: [withMultiContext],
};
```

## 7. File Reference

| File | Purpose |
|------|---------|
| `shared/components/src/styles/tokens.css` | All `--debrief-*` CSS custom properties with light, dark, and VS Code variant overrides |
| `shared/components/src/ThemeProvider/ThemeContext.ts` | `ThemeVariant` type (`'light' \| 'dark' \| 'vscode' \| 'system'`), `Theme` and `ThemeTokens` interfaces, React context |
| `shared/components/src/ThemeProvider/ThemeProvider.tsx` | Provider component: sets `data-theme` attribute, applies tokens, listens to system color scheme |
| `shared/components/src/ThemeProvider/defaultTheme.ts` | Token value definitions for each variant, merge utilities |
| `shared/components/src/ThemeProvider/vsCodeAdapter.ts` | VS Code detection, variable mapping (`VS_CODE_VARIABLE_MAP`), theme sync via MutationObserver |
| `shared/components/.storybook/preview.tsx` | Global theme decorator and toolbar configuration (light/dark/VS Code switcher) |
| `shared/components/.storybook/manager.ts` | Storybook UI branding (Debrief colors, light base) |
| `shared/components/.storybook/decorators/ContextDecorator.tsx` | Context simulators: `withContext()`, `withMultiContext`, `ContextSimulator` |
| `apps/vscode/src/webview/web/styles.css` | VS Code extension webview styles using `--vscode-*` variables directly |
