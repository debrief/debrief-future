# Data Model: VS Code Theme Responsiveness

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-04-25

The "data" for this feature is purely in-memory React/DOM state — there is no persisted schema, no LinkML model, no STAC asset. This document captures the TypeScript types, their invariants, and the state transitions that govern the theme pipeline.

---

## Entities

### `ThemeVariant` (flat union)

```ts
export type ThemeVariant =
  | 'light'
  | 'dark'
  | 'high-contrast-light'
  | 'high-contrast-dark'
  | 'system';
```

**Invariants**:
- The four explicit values are the *only* values that may appear as the `data-theme` attribute on `document.documentElement` after `ThemeProvider` resolves the active variant. `'system'` is a request, never a resolved state.
- The legacy `'vscode'` value is deleted; any reference to it after this feature lands is a type error.

**Source of truth**: `shared/components/src/ThemeProvider/ThemeContext.ts`.

### `Theme`

```ts
export interface Theme {
  variant: ThemeVariant;
  /** Optional per-instance token overrides (rarely used). */
  tokens?: Partial<ThemeTokens>;
}
```

**Invariants**:
- A `Theme` with `variant: 'system'` is only valid as input to `ThemeProvider`. Once resolved (R4 in research.md), the `resolvedVariant` exposed via context is always one of the four explicit values.

### `ThemeTokens`

The named design values rendered as `--debrief-*` CSS variables. Schema unchanged from the existing `defaultTheme.ts`; only the *number of variant rows* in the keyed defaults grows from 3 (`light` / `dark` / `vscode`) to 4 (`light` / `dark` / `high-contrast-light` / `high-contrast-dark`).

**Source of truth**: `shared/components/src/ThemeProvider/defaultTheme.ts`.

### `ThemeContextValue`

```ts
export interface ThemeContextValue {
  /** Caller's last `setTheme` argument, or the initial `theme` prop. */
  theme: Theme;
  /** One of the four explicit variants. Never 'system'. */
  resolvedVariant: Exclude<ThemeVariant, 'system'>;
  setTheme: (value: Theme | ((prev: Theme) => Theme)) => void;
  /** True when resolvedVariant is 'dark' or 'high-contrast-dark'. */
  isDark: boolean;
  /** True when resolvedVariant is one of the high-contrast values. */
  isHighContrast: boolean;
}
```

**Invariants**:
- `isDark` and `isHighContrast` are **derived** — never stored, always computed from `resolvedVariant`. `isHighContrast` is **new** in this feature; consumers that adjust focus-ring weight or border thickness for accessibility read it (FR-008).

### `ThemeSource` (new)

The abstraction for "where do live variant updates come from". One implementation per environment.

```ts
export interface ThemeSource {
  /** Synchronous read of the current variant for first paint. */
  read(): Exclude<ThemeVariant, 'system'>;
  /** Subscribe; invoke `onChange` whenever the variant changes. Returns a cleanup function. */
  subscribe(onChange: (variant: Exclude<ThemeVariant, 'system'>) => void): () => void;
}
```

**Implementations**:
- `vsCodeBodyClassSource()` — `document.body.classList` MutationObserver + `vscode-theme-changed` message listener (combines the two signals from research R1). Returned by `setupVSCodeThemeSync`.
- `mediaQuerySource()` — `prefers-color-scheme` + `prefers-contrast` (research R7). Used by Storybook & web-shell when no `vscode-*` body class is present.
- `staticSource(variant)` — never fires, just reads the constant. Used by Storybook stories that pin a variant.

### Body-class → variant map (boundary table)

Implements research R2.

| `document.body.classList` member          | `ThemeVariant`            |
|-------------------------------------------|---------------------------|
| `vscode-light`                            | `'light'`                 |
| `vscode-dark`                             | `'dark'`                  |
| `vscode-high-contrast`                    | `'high-contrast-dark'`    |
| `vscode-high-contrast-light`              | `'high-contrast-light'`   |

Lives in `shared/components/src/ThemeProvider/vsCodeAdapter.ts` as a frozen `const`. Treated as a contract — see `contracts/theme-source.md`.

### `--vscode-*` token map (Storybook)

```ts
type VsCodeTokenMap = Readonly<Record<
  Exclude<ThemeVariant, 'system'>,
  Readonly<Record<`--vscode-${string}`, string>>
>>;
```

One entry per variant; values match VS Code's "Default Light+", "Default Dark+", "Default High Contrast", "Default High Contrast Light" palettes. Lives in `shared/components/.storybook/vscode-token-map.ts`.

---

## State transitions

### `ThemeProvider` lifecycle

```text
                 ┌─────────────────────────────┐
   mount  ────►  │ resolve initial variant     │
                 │  1. theme prop (if explicit)│
                 │  2. body class              │
                 │  3. media queries (system)  │
                 └──────────────┬──────────────┘
                                │
                       sets data-theme,
                       applies --debrief-* tokens
                                │
                                ▼
                 ┌─────────────────────────────┐
                 │ subscribe via ThemeSource   │ ◄── source.subscribe()
                 └──────────────┬──────────────┘
                                │
            ┌───────────────────┴───────────────────┐
            │                                       │
       (body class                              (extension-host
        mutation)                                message)
            │                                       │
            ▼                                       ▼
     onChange(newVariant) ──── re-applies tokens, updates resolvedVariant ──── React re-renders
                                                    │
                                                    │ unmount
                                                    ▼
                                             cleanup() — disconnects observer
                                             and removes message listener
```

**Failure modes**:
- Source `subscribe()` throws → ThemeProvider catches, logs `console.warn`, retains the initial-resolved variant. Components still render correctly in that variant; only runtime updates are lost.
- `body` class is mutated to a value not in the boundary table → fall back to the previous resolved variant; do not crash. Logged once per session.

### Extension-host relay lifecycle

```text
extension activate ───► startThemeRelay(context, getActivePanels)
                                │
                                ▼
                  vscode.window.onDidChangeActiveColorTheme
                                │
                                ▼ (theme: ColorTheme)
                  for each panel in getActivePanels():
                      panel.webview.postMessage({
                        type: 'vscode-theme-changed',
                        kind: theme.kind     ◄── ColorThemeKind enum
                      })
                                │
                                ▼
extension deactivate ──► disposable disposes; listener detached
```

**Invariant**: every disposable created by `startThemeRelay` is pushed onto `context.subscriptions` so VS Code disposes it during deactivation. No global state outside the closure.

---

## Validation rules

The TypeScript types above are themselves the validation — every constraint is encoded in the type system rather than checked at runtime, in line with Constitution Article XV (Strict Type Safety).

The one runtime narrowing point is the body-class → variant map boundary. The function shape is:

```ts
function bodyClassToVariant(classList: DOMTokenList): Exclude<ThemeVariant, 'system'> | null
```

It returns `null` for any class string outside the four expected values, and the caller decides how to handle that (per the Failure modes above). No `any` is introduced; the return type is narrow.
