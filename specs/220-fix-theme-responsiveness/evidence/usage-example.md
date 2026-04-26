# Usage Example: VS Code Theme Responsiveness

This walk-through demonstrates the headline outcome of feature #220:
**every Debrief webview panel updates its colour scheme within one second
when the user switches VS Code themes**, without any panel reload.

It corresponds to the quickstart §V2 ("End-to-end runtime switch") scenario
and is reproduced by the Playwright test
`apps/web-shell/playwright/tests/theme-runtime-switch.spec.ts`.

## Prerequisites

- VS Code 1.85+
- Debrief extension installed and activated
- Any `.stac` plot open with the LogPanel, ActivityPanel, MapView, and
  TimeController visible

## Steps

### 1. Start in Default Dark+

```text
VS Code → Command Palette → "Preferences: Color Theme" → Default Dark+
```

Open DevTools on a Debrief webview (right-click any panel → Inspect).
Observe that `<html data-theme="dark">` is set on `documentElement`:

```js
> document.documentElement.getAttribute('data-theme')
'dark'
```

Observe that `--debrief-bg-primary` resolves to the dark palette:

```js
> getComputedStyle(document.documentElement)
    .getPropertyValue('--debrief-bg-primary')
'#1e1e1e'
```

### 2. Switch to Default Light+

```text
VS Code → Command Palette → "Preferences: Color Theme" → Default Light+
```

Within ~200ms (well under the 1-second budget from FR-002), every Debrief
panel re-themes:

```js
> document.documentElement.getAttribute('data-theme')
'light'

> getComputedStyle(document.documentElement)
    .getPropertyValue('--debrief-bg-primary')
'#ffffff'
```

The transition is driven by *two* signals:
- The `MutationObserver` in `vsCodeBodyClassSource` fires when VS Code
  swaps the `vscode-dark` body class for `vscode-light`.
- The extension-host theme relay (`apps/vscode/src/host/themeRelay.ts`)
  posts a `{ type: 'vscode-theme-changed', kind: ColorThemeKind.Light }`
  message — a redundant confirmation, harmless if the body-class signal
  already won.

### 3. Switch to Default High Contrast

```text
VS Code → Command Palette → "Preferences: Color Theme" → Default High Contrast
```

```js
> document.documentElement.getAttribute('data-theme')
'high-contrast-dark'

> getComputedStyle(document.documentElement)
    .getPropertyValue('--debrief-border-color')
'#6FC3DF'           /* heavy HC border, visible on every panel */
```

Components consuming the `useTheme()` hook also see the derived
`isHighContrast` flag:

```ts
const { isHighContrast } = useTheme();
// isHighContrast === true for both HC variants;
// drives heavier focus rings, thicker borders, etc.
```

### 4. Switch to Default High Contrast Light

```text
VS Code → Command Palette → "Preferences: Color Theme" → Default High Contrast Light
```

```js
> document.documentElement.getAttribute('data-theme')
'high-contrast-light'
```

### 5. Round-trip back to Default Dark+

The panel returns to its starting state with no intermediate
flash or stale palette bleed-through (SC-006: < 200ms intermediate
state). Verified by the `interaction.gif` recording captured in
`screenshots/interaction.gif`.

## Cross-references

| Step | Screenshot |
|------|-----------|
| 2 | `screenshots/all-panels-light.png`, `screenshots/logpanel-light.png` |
| 1 | `screenshots/all-panels-dark.png`, `screenshots/logpanel-dark.png` |
| 3 | `screenshots/all-panels-high-contrast-dark.png`, `screenshots/logpanel-high-contrast-dark.png` |
| 4 | `screenshots/logpanel-high-contrast-light.png` |
| Cycle | `screenshots/interaction.gif` |

## How to verify in your own session

```sh
# Storybook (any of the four variants):
pnpm --filter @debrief/components storybook
# → toolbar "Theme" → Light / Dark / HC Light / HC Dark / System

# Playwright runtime-switch test:
cd apps/web-shell && node run-playwright.mjs theme-runtime-switch
```

The Playwright test simulates exactly the body-class mutation that VS
Code performs in step 2 above, and records the same evidence GIF.
