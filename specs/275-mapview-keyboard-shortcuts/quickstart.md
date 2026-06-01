# Quickstart: adding a MapView keyboard shortcut

**Feature**: `275-mapview-keyboard-shortcuts` (#261) · For developers adding the *next* map shortcut.

## TL;DR — add a shortcut in one call

Inside any component rendered within a `MapView` (i.e. a descendant of its `MapKeyboardShortcutProvider`):

```tsx
import { useMapKeyboardShortcut } from '@debrief/components';

function FilterFocusShortcut({ onFocusFilter }: { onFocusFilter: () => void }): null {
  // `/` focuses the filter bar — only when the map has focus, never while typing,
  // never with a modifier, once per press, default suppressed. Nothing else to wire.
  useMapKeyboardShortcut('/', onFocusFilter, { description: 'focus-filter' });
  return null;
}
```

That's the whole contract for the common case: **key + handler**. Focus-scoping, the no-modifier rule, the typing-guard, auto-repeat suppression, `preventDefault`, and unmount cleanup are all inherited.

## Before you pick a key

1. **Check the registry** in `docs/project_notes/decisions.md` → **ADR-039** for keys already claimed (today: `L` = viewport lock).
2. **Avoid Leaflet-reserved keys** — arrow keys, `+`/`=`, `-`/`_`, `Esc` (Leaflet pans/zooms with these). `LEAFLET_RESERVED_KEYS` is the runtime list; the provider dev-warns if you claim one.
3. If you register a key that's already claimed on the same map, you'll get a `console.warn` in development (the first claim wins). Don't ship duplicates.
4. **Record your new key in ADR-039's registry table in the same PR.**

## When you need to bend a default

```tsx
useMapKeyboardShortcut('[', stepBackward, { allowRepeat: true, description: 'step-time-back' });
// allowRepeat → holding the key repeats the action (good for stepping, not for toggles)

useMapKeyboardShortcut('f', toggleFullscreen, { allowModifiers: true, description: 'fullscreen' });
// allowModifiers → fire even with a modifier held (use sparingly; risks OS/app chord clashes)
```

| Option | Default | Use when |
|--------|---------|----------|
| `enabled` | `true` | gate a shortcut on a prop (e.g. only when a callback is provided) |
| `allowModifiers` | `false` | the action genuinely needs a modifier chord |
| `allowRepeat` | `false` | holding the key should repeat (stepping, nudging) |
| `guardTextEntry` | `true` (guarded) | almost never change — leaving it on is what stops typing hijacks |
| `preventDefault` | `true` | set `false` only if the browser default must survive |
| `description` | — | always set it: it shows up in conflict warnings |

## How the existing `L` shortcut uses it (reference)

`MapView` wraps its subtree in the provider and registers `L` via a tiny internal component:

```tsx
// inside MapView.tsx
<MapKeyboardShortcutProvider containerRef={containerRef}>
  <div className="debrief-mapview" ref={containerRef} tabIndex={0}>
    <MapContainer>{/* … */}</MapContainer>
    <ViewportLockShortcut
      enabled={!!onViewportLockChange}
      locked={viewportLocked}
      onToggle={onViewportLockChange}
    />
  </div>
</MapKeyboardShortcutProvider>

function ViewportLockShortcut({ enabled, locked, onToggle }: ViewportLockShortcutProps): null {
  useMapKeyboardShortcut('l', () => onToggle?.(!locked), { enabled, description: 'viewport-lock' });
  return null;
}
```

## Run the tests

```sh
# the new hook unit tests + the #260 regression suite (must both pass)
pnpm --filter @debrief/components test

# full local gate before pushing
task verify        # or: uv run ruff check . && pnpm lint && uv run pyright && pnpm -r typecheck && pnpm --filter '!@debrief/web-shell' test
```

Key tests:
- `shared/components/src/hooks/__tests__/useMapKeyboardShortcut.test.tsx` — the convention (C1–C13 in the contract).
- `shared/components/src/MapView/__tests__/keyboardShortcut.test.tsx` — the #260 `L` behaviour (M1–M5), **unchanged**.

## Don't

- Don't add a `keydown` listener to `window`/`document` for a map shortcut (that's the TimeController pattern this convention replaces — global, not focus-scoped).
- Don't reach for `map.keyboard` / `useMap()` — the convention is a DOM listener on the wrapper and must stay independent of Leaflet's handler (so it keeps working while the viewport lock disables `map.keyboard`).
- Don't claim a Leaflet-reserved key.
