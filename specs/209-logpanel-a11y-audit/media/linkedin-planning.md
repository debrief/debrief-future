The LogPanel in Future Debrief has roving-tabindex, aria-selected, and a full ARIA tab pattern. What it doesn't have yet is a WCAG audit to prove any of that actually works — especially across the three visual themes analysts use.

Before we can run a meaningful audit, there's a problem to fix: the LogPanel's CSS reads `--vscode-*` CSS custom properties, but Storybook's ThemeProvider only injects `--debrief-*` tokens. Switching the Storybook theme selector to "light" or "VS Code" has no visible effect on the component. It renders with dark fallback colours regardless. Auditing three "themes" against the same visual output would be noise, not evidence.

The fix is a static token map injected by the ThemeProvider when running outside a real VS Code webview — targeted, invisible to production consumers. Once that's in place, feature 209 runs `@axe-core/playwright` across six representative LogPanel stories × three themes = 18 audit runs, producing a committed markdown report that permanently records what was found and what was fixed.

Planning post with the open decisions is up now.

[link to post]

#FutureDebrief #Accessibility #OpenSource
