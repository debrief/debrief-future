# Research: VS Code Theme Responsiveness

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-04-25

This document resolves the technical unknowns identified by the planning workflow. Every spec FR is anchored to one of the decisions below; the implementation tasks are derived from these resolutions.

---

## R1 — How does VS Code signal theme changes to a webview?

**Decision**: Subscribe to two signals and treat them as redundant — whichever fires first wins, the other is a no-op due to idempotent state setters.

1. **DOM signal (primary)** — VS Code sets a body class on the webview's `document.body`: one of `vscode-light`, `vscode-dark`, `vscode-high-contrast`, `vscode-high-contrast-light`. When the user changes themes, VS Code mutates this class. A `MutationObserver` watching `attributes: ['class']` on `document.body` (and `document.documentElement` `style` for the `--vscode-*` updates) catches the change synchronously.
2. **Message signal (belt-and-braces)** — the extension host listens to `vscode.window.onDidChangeActiveColorTheme` and posts a `{ type: 'vscode-theme-changed', kind: <ColorThemeKind> }` message to every active webview panel. The webview already has a listener for this in `vsCodeAdapter.ts:169-175`; today it is unreached because nothing posts the message.

**Rationale**: The DOM signal alone is sufficient on every VS Code build we've tested (1.85+), but it is platform-internal behaviour and not formally part of the Webview API contract. Adding the message channel costs ~20 lines in a new `themeRelay.ts` and protects us against a future VS Code release that delivers theme changes asynchronously or via a different DOM mechanism. Both signals end up calling the same `onThemeChange` handler, so duplication is harmless.

**Alternatives considered**:
- **Polling `document.body.className`**: rejected — burns CPU, loses < 1s SLA on slow theme changes.
- **DOM signal only**: tempting (zero extension-host code) but leaves us blind if VS Code changes the body-class mechanism. The extra file is cheap insurance.
- **Message channel only**: rejected — first paint depends on knowing the variant before the host can post; we still need a synchronous read of `document.body.classList` at mount.

---

## R2 — Mapping VS Code body classes to the new flat union

**Decision**: One-to-one mapping at the adapter boundary.

| VS Code body class       | `ThemeVariant` value      |
|--------------------------|---------------------------|
| `vscode-light`           | `'light'`                 |
| `vscode-dark`            | `'dark'`                  |
| `vscode-high-contrast`   | `'high-contrast-dark'`    |
| `vscode-high-contrast-light` | `'high-contrast-light'` |
| (none of the above)      | `'system'` → resolve via media queries |

**Rationale**: Matches VS Code's `ColorThemeKind` enum (`Light=1, Dark=2, HighContrast=3, HighContrastLight=4`) verbatim except that `HighContrast` (no suffix) maps to `'high-contrast-dark'`. We rename it for clarity — readers shouldn't have to memorise that `ColorThemeKind.HighContrast` happens to be the dark one. The rename is one line in the adapter; the rest of the codebase sees only the explicit four values.

**Alternatives considered**:
- **Keep the `'vscode'` value as a synonym for "use VS Code tokens"**: rejected — that was exactly the muddle the clarification resolved. Every variant now means a specific palette.
- **Mirror `ColorThemeKind` numeric values directly**: rejected — string union is ergonomic in CSS selectors (`[data-theme='dark']`), readable in stack traces, and stable across VS Code Webview API versions.

---

## R3 — Storybook `--vscode-*` injection map

**Decision**: Author a single TypeScript module `shared/components/.storybook/vscode-token-map.ts` exporting a `Record<ThemeVariant, Record<string, string>>` keyed by the new flat union. The Storybook theme decorator reads it at the start of every render and writes each entry via `document.documentElement.style.setProperty('--vscode-...', value)`.

The map covers the variables already enumerated in `specs/209-logpanel-a11y-audit/research.md:62-69`:

- `--vscode-foreground`, `--vscode-editor-background`, `--vscode-sideBar-background`
- `--vscode-panel-border`, `--vscode-button-secondaryBackground`, `--vscode-focusBorder`
- `--vscode-editorError-foreground`, `--vscode-badge-background`, `--vscode-input-background`
- `--vscode-list-activeSelectionBackground`, `--vscode-list-hoverBackground`
- `--vscode-font-family`, `--vscode-font-size`

…extended to four variants. Light + dark palettes mirror VS Code's "Default Light+" and "Default Dark+" (per spec 209's design). High-contrast palettes mirror VS Code's "Default High Contrast" and "Default High Contrast Light", which use heavier borders, distinct focus rings, and pure-black/pure-white backgrounds.

**Rationale**: A single shared map honours FR-011 ("supplied by a single shared source so a new component does not need its own variable list"). Spec 209 already designed this for two variants; extending to four is mechanical. Sourcing values from VS Code's built-in default themes (rather than inventing palette numbers) means our Storybook output matches what users will see in their default VS Code install.

**Alternatives considered**:
- **Generate the map by scraping a live VS Code instance**: theoretically more accurate, but introduces a non-deterministic build step and ties developer setup to a specific VS Code install. Rejected.
- **Per-component override blocks**: rejected — directly contradicts FR-011's "single shared source".
- **Use `getComputedStyle` inside Storybook to read variables already on `:root`**: rejected — Storybook never has `--vscode-*` set in the first place; that was the bug.

---

## R4 — Initial variant resolution at ThemeProvider mount

**Decision**: ThemeProvider's mount sequence:

1. If `theme` prop has an explicit variant (`'light' | 'dark' | 'high-contrast-light' | 'high-contrast-dark'`), use it.
2. Else if `document.body.classList` contains one of the four `vscode-*` classes, map per R2.
3. Else if the variant is `'system'` (or undefined), resolve via media queries: `prefers-contrast: more` first (returns `high-contrast-dark` or `high-contrast-light` based on `prefers-color-scheme`), else `prefers-color-scheme: dark` returns `'dark'`, else `'light'`.

This sequence runs synchronously during the first render so the panel never paints with a wrong-variant flash (Edge case from spec.md: "What happens when a panel is opened while VS Code is loading its theme? The panel must not render with a white flash").

**Rationale**: Synchronous body-class read is cheap and is the same signal VS Code uses for its own theme detection. Media-query fallback handles Storybook + web-shell cleanly without any "is this a VS Code webview?" sniffing.

**Alternatives considered**:
- **Always start with `'light'` then update on first MutationObserver tick**: rejected — produces the white-flash artefact spec.md's edge case forbids.
- **Read `--vscode-*` variable values to infer variant**: rejected — luminance heuristics (which `vsCodeAdapter.ts:120-126` already uses) are unreliable for high-contrast where backgrounds can be near-black or near-white; and the body class is unambiguous.

---

## R5 — Extension-host theme relay (FR-010 second clause)

**Decision**: Add `apps/vscode/src/host/themeRelay.ts` exposing a single function:

```ts
export function startThemeRelay(context: vscode.ExtensionContext, getActivePanels: () => vscode.WebviewPanel[]): void
```

It registers a disposable for `vscode.window.onDidChangeActiveColorTheme` and, on each event, posts `{ type: 'vscode-theme-changed', kind: theme.kind }` to every panel returned by `getActivePanels()`. The disposable is stored in `context.subscriptions`.

The function is called once during extension activation, after the panel registry has been initialised.

**Rationale**: Keeping this as a single tiny file rather than scattering `postMessage` calls across panel implementations matches the constitution's preference for thin wrappers (Article IV — "MCP wrappers are thin, replaceable layers"; the same logic applies to webview message wrappers). Tests can stub `getActivePanels` to assert behaviour without booting a real VS Code instance.

**Alternatives considered**:
- **Inline the listener in extension activation**: rejected — buries a cross-cutting concern in `extension.ts` and makes it untestable.
- **Each panel registers its own listener**: rejected — N×O duplication and N×O disposal-leak risk.
- **Expose theme via a VS Code workspace setting and have webviews read it**: rejected — workspace settings don't fire change events at the granularity we need.

---

## R6 — Retiring the legacy `'vscode'` variant — migration risk

**Decision**: Hard delete. No deprecation shim, no string alias.

**Rationale**: Article XIV (Pre-Release Freedom) permits breaking changes pre-v4.0.0. Grep across the repo for `theme.variant === 'vscode'` and `'vscode' as ThemeVariant` to enumerate call sites. The known sites are:

- `shared/components/src/ThemeProvider/ThemeContext.ts` (the union itself)
- `shared/components/src/ThemeProvider/defaultTheme.ts` (the default-theme presets)
- `shared/components/src/ThemeProvider/vsCodeAdapter.ts:135-138` (`createVSCodeTheme()` returns `variant: 'vscode'`)
- `shared/components/src/styles/tokens.css` (the `[data-theme='vscode']` block)
- `shared/components/.storybook/preview.tsx` (toolbar entry for `'vscode'`)
- Any Storybook stories that explicitly pass `theme={ variant: 'vscode' }` (spot-check in tasks.md)

The Storybook toolbar gains four explicit options replacing the single `'vscode'` entry; the rest become straightforward replacements.

**Alternatives considered**:
- **Keep `'vscode'` as a runtime alias for whichever of the four resolves from `document.body`**: rejected — preserves the muddle the spec explicitly retired (Clarifications §2026-04-25), and the alias provides no value to callers since they should be using the explicit variant anyway.

---

## R7 — `prefers-contrast` media-query support

**Decision**: Use `window.matchMedia('(prefers-contrast: more)')` in the system-variant branch. Treat `(prefers-contrast: more)` matching as "user wants high-contrast" and combine with `prefers-color-scheme` to pick the dark/light flavour.

**Rationale**: `prefers-contrast` is baseline-supported in all Chromium versions our Playwright stack uses. It's the only OS-level signal that distinguishes "regular theme" from "high-contrast theme" outside a VS Code context. For Storybook/web-shell, this gives us a sensible default; users can still override via the toolbar.

**Alternatives considered**:
- **`forced-colors: active`**: more specific to Windows High Contrast, but matches a *broader* set of conditions (e.g. some assistive tech). Less appropriate for "did the user pick a high-contrast variant?" semantics. Rejected as the primary signal; may be added later if needed.
- **Ignore high-contrast outside VS Code**: rejected — Storybook needs to render high-contrast variants for the SC-005 audit and FR-008's "first-class variant" guarantee.

---

## Summary

All planning-time unknowns resolved. No outstanding `NEEDS CLARIFICATION` markers remain. The technical context in `plan.md` is now fully concrete and the Phase 1 design artefacts (`data-model.md`, `contracts/`, `quickstart.md`) can be authored from the decisions above.
