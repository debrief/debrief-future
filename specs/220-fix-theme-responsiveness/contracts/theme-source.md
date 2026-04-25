# Contract: ThemeSource and the Extension-Host Theme Channel

**Spec**: [../spec.md](../spec.md) | **Plan**: [../plan.md](../plan.md) | **Date**: 2026-04-25

This contract pins the boundaries between the four moving pieces of the theme pipeline:

```
┌──────────────────────┐     postMessage      ┌────────────────────────┐
│ Extension Host       │ ───────────────────► │ Webview document       │
│ (themeRelay.ts)      │                      │ (vsCodeAdapter.ts)     │
└──────────┬───────────┘                      └──────────┬─────────────┘
           │                                             │
   onDidChangeActiveColorTheme                  body.classList mutation
           │                                             │
           └──────── ColorThemeKind ◄───────────► ThemeVariant ─────────►  ThemeProvider
                              R2 mapping (research.md)                       │
                                                                             ▼
                                                                    React subtree re-renders
```

Implementations may evolve, but the type signatures, message shapes, and state invariants below are stable for the lifetime of this feature.

---

## 1. `ThemeSource` interface

**File**: `shared/components/src/ThemeProvider/ThemeSource.ts` (new — type-only).

```ts
import type { ThemeVariant } from './ThemeContext';

/**
 * Live source of the active VS Code theme variant.
 * Resolved variants only — `'system'` is a request, never a value here.
 */
export type ResolvedVariant = Exclude<ThemeVariant, 'system'>;

export interface ThemeSource {
  /** Synchronous read for first paint. Must not throw. */
  read(): ResolvedVariant;

  /**
   * Subscribe to live updates.
   * @param onChange called every time the variant changes; never called
   *                 with the same value back-to-back (de-duped by the source).
   * @returns cleanup function. Idempotent; safe to call multiple times.
   */
  subscribe(onChange: (variant: ResolvedVariant) => void): () => void;
}
```

**Implementations** (each lives next to its environment):

| Implementation                | File                                                       | Used by                    |
|-------------------------------|------------------------------------------------------------|----------------------------|
| `vsCodeBodyClassSource()`     | `shared/components/src/ThemeProvider/vsCodeAdapter.ts`     | VS Code webviews           |
| `mediaQuerySource()`          | `shared/components/src/ThemeProvider/browserAdapter.ts`    | Storybook, web-shell, tests|
| `staticSource(variant)`       | `shared/components/src/ThemeProvider/browserAdapter.ts`    | Pinned Storybook stories   |

**Contract assertions** (encoded as Vitest tests):

1. `read()` returns one of the four explicit variants — never `'system'`, never a string outside the union.
2. `subscribe()` returns a cleanup function whose effect is observable — after calling it, mutating the source no longer fires `onChange`.
3. `subscribe()` is re-entrancy-safe — a single source supports multiple concurrent subscribers.
4. The first `onChange` call carries a value *different* from the most recent `read()` (no synthetic synchronous re-emit).

---

## 2. Extension-host → webview message

**File**: `apps/vscode/src/host/themeRelay.ts` (new).

### Message shape

```ts
import type { ColorThemeKind } from 'vscode';

export interface VsCodeThemeChangedMessage {
  type: 'vscode-theme-changed';
  /** VS Code's enum value, forwarded verbatim. */
  kind: ColorThemeKind;
}
```

### Producer contract

```ts
export function startThemeRelay(
  context: vscode.ExtensionContext,
  getActivePanels: () => readonly vscode.WebviewPanel[]
): void;
```

**Behaviour**:
- Registers a listener for `vscode.window.onDidChangeActiveColorTheme`. Stores the disposable in `context.subscriptions`.
- On every event, calls `getActivePanels()` and posts the `VsCodeThemeChangedMessage` to each panel's `webview.postMessage`.
- Posts are best-effort — if a panel is disposed between `getActivePanels()` returning and `postMessage` firing, the resulting error is caught and logged at `debug` level (a panel's disposal is normal, not an error).
- Never retains panel references outside the lifetime of a single event handler — relies on the registry function being live.

**Failure modes**:
- `getActivePanels()` throws → the listener catches and logs at `warn` level; the relay continues to function for subsequent events.
- A panel's `postMessage` throws → caught per-panel; other panels still receive the message.

### Consumer contract (in the webview)

The webview's existing message listener (today in `vsCodeAdapter.ts:169-175`) is already shaped to consume this exact message:

```ts
window.addEventListener('message', (event: MessageEvent<unknown>) => {
  const data = event.data;
  if (
    typeof data === 'object' &&
    data !== null &&
    (data as { type?: unknown }).type === 'vscode-theme-changed'
  ) {
    // narrow to VsCodeThemeChangedMessage and dispatch
  }
});
```

**Contract assertion**: the consumer narrows `event.data` at the boundary using type guards before treating it as `VsCodeThemeChangedMessage`. No `any`. Compliance verified by the type-audit scanner (Article XV).

---

## 3. Body-class → variant boundary

**File**: `shared/components/src/ThemeProvider/vsCodeAdapter.ts`.

```ts
const BODY_CLASS_TO_VARIANT: Readonly<Record<string, ResolvedVariant>> = Object.freeze({
  'vscode-light': 'light',
  'vscode-dark': 'dark',
  'vscode-high-contrast': 'high-contrast-dark',
  'vscode-high-contrast-light': 'high-contrast-light',
});

export function bodyClassToVariant(classList: DOMTokenList): ResolvedVariant | null {
  for (const cls of Object.keys(BODY_CLASS_TO_VARIANT)) {
    if (classList.contains(cls)) return BODY_CLASS_TO_VARIANT[cls];
  }
  return null;
}
```

**Contract assertions**:
1. Order of the four classes in the table matches research R2 — adding a new VS Code theme kind requires extending this table and re-running the assertion suite.
2. Returning `null` is the *only* signal "no VS Code body class present"; the caller never calls `read()` and gets a fictional variant back.
3. The function does not write to the DOM; it is a pure boundary translator.

---

## 4. Storybook `--vscode-*` token map

**File**: `shared/components/.storybook/vscode-token-map.ts` (new).

```ts
import type { ResolvedVariant } from '@debrief/components';

export type VsCodeTokenMap = Readonly<Record<
  ResolvedVariant,
  Readonly<Record<`--vscode-${string}`, string>>
>>;

export const VSCODE_TOKEN_MAP: VsCodeTokenMap;
```

**Contract assertions**:
1. Every variant key has the *same* set of `--vscode-...` keys as every other variant — adding a token to the dark map without adding it to the high-contrast-light map is a type error (enforced by an exact-keys helper type with a unit test).
2. Keys cover at minimum the variables enumerated in `research.md` §R3.
3. Values are CSS colour strings or font tokens; never `null`/`undefined`. (No runtime check needed — TypeScript enforces this.)
4. The Storybook decorator writes every entry via `documentElement.style.setProperty` on every render; it does *not* memoise (the decorator's per-render cost is dominated by React, not 13 `setProperty` calls).

---

## 5. ThemeProvider public API (unchanged shape, expanded values)

**File**: `shared/components/src/ThemeProvider/ThemeProvider.tsx`.

```tsx
export interface ThemeProviderProps {
  theme?: Theme;
  children: ReactNode;
  container?: HTMLElement;
  /** NEW — overrides the auto-detected source. Default: vsCodeBodyClassSource() if a vscode-* body class is present, else mediaQuerySource(). */
  source?: ThemeSource;
}

export function ThemeProvider(props: ThemeProviderProps): JSX.Element;
```

**Contract assertions**:
1. With no `theme` prop and no `source` prop, the provider auto-selects: `vsCodeBodyClassSource()` if a `vscode-*` class is present at mount; `mediaQuerySource()` otherwise. (Verified by Vitest with both DOM states.)
2. Calling `setTheme({ variant: ... })` overrides the source-derived variant and pins until the next `setTheme` or until the provider re-mounts.
3. The `data-theme` attribute on `props.container ?? document.documentElement` always carries one of the four explicit variants whenever the provider is mounted.
4. Unmounting the provider removes its `data-theme` attribute (so a sibling provider cannot inherit a stale value).
