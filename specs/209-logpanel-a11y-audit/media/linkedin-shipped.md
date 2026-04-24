The LogPanel in Future Debrief now has an automated WCAG 2.1 AA audit via `@axe-core/playwright`, and — equally importantly — the Storybook theme selector actually works against it.

The second half of that sentence was the blocker. LogPanel CSS reads `--vscode-*` custom properties. Storybook's ThemeProvider only injected `--debrief-*` tokens. Switching the Storybook theme from dark to light or VS Code had no visible effect — the component always fell back to its dark-mode defaults. Any audit run before fixing that would have tested the same dark rendering three times and called it multi-theme coverage.

The fix is a static `--vscode-*` token map injected by the ThemeProvider when running outside a real VS Code webview. Production webview consumers see no change; Storybook finally renders the component the way users will actually see it.

With that in place, feature 209 runs axe-core across six representative LogPanel stories × three themes = 18 runs, producing a committed markdown report that becomes the permanent record of what was audited, what was found, and what was fixed.

Feature post with the design choices and the theme-fix internals is up now.

[link to post]

#FutureDebrief #Accessibility #OpenSource
