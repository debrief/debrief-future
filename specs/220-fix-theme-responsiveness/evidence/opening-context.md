## What We're Building

Every Debrief webview panel now reflects the active VS Code colour theme on initial load, and updates within a second when you switch themes — including the two high-contrast variants. Until this change, only the Storyboard panel respected your theme; the other six panels (Log, Activity, Map, Results, Time Controller, Catalog Overview) mounted without a theme context, so they rendered against a hardcoded dark fallback regardless of what you'd chosen in VS Code.

The same fix extends to Storybook. Components that read `var(--vscode-foreground, ...)` previously had no `--vscode-*` variables defined when shown in isolation, so every story silently fell through to its fallback colour. The Storybook theme decorator now injects a real palette for each of the four explicit variants — Light, Dark, High Contrast, High Contrast Light — sourced from VS Code's own default themes. What you see in Storybook now matches what you see in the extension.

## How It Fits

This is pure UI wiring. No Python service is touched, no new runtime dependencies, no schema changes. The fix sits across three surfaces in the existing architecture: the shared `ThemeProvider` in `shared/components/`, the seven webview entries in the VS Code extension, and the Storybook decorator. A small (~30 line) extension-host file relays VS Code's `onDidChangeActiveColorTheme` events into the webview message channel, completing a loop the webview was already listening on. Most of the pieces existed already — they just weren't connected.

## Key Decisions

- **Two redundant signals for runtime theme changes.** A `MutationObserver` watches the webview's `document.body` class for `vscode-light` / `vscode-dark` / `vscode-high-contrast` / `vscode-high-contrast-light`, and the extension host also posts a `vscode-theme-changed` message on `onDidChangeActiveColorTheme`. Whichever fires first wins. Belt-and-braces, because losing a theme update is a worse outcome than handling it twice.

- **High-contrast as a first-class variant, not an afterthought.** The variant union is now `light | dark | high-contrast-light | high-contrast-dark | system`, matching VS Code's body-class taxonomy 1:1. Components also get a derived `isHighContrast` flag for cases where accessibility-sensitive styling needs to diverge from the regular light/dark split. DSTL analysts on Windows often run high-contrast themes — collapsing them into "dark" was wrong.

- **Retired the muddled `'vscode'` variant.** The old union had `light | dark | vscode | system`, where `'vscode'` meant "whatever VS Code is currently using". That's now expressible directly with the explicit variants plus `system`, so the ambiguous value goes away. No deprecation shim — we're pre-1.0 and Article XIV gives us the freedom to delete rather than carry baggage.

- **One bootstrap file for all seven webview entries.** Rather than copy-paste a `<ThemeProvider>` wrapper into each entry point, a shared `_bootstrap.tsx` does the wrapping once. Adding the eighth panel — or fixing a future bug in the wrapping pattern — becomes a one-line change instead of seven.

- **Storybook gets a real `--vscode-*` token map.** A single `vscode-token-map.ts` provides palette values for each variant, drawn from VS Code's "Default Light+", "Default Dark+", "Default High Contrast", and "Default High Contrast Light" themes. The decorator writes them onto `documentElement` on every render. This is the only genuinely new concept in the change; everything else is wiring existing parts together.
