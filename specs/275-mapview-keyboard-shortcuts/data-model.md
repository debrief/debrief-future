# Data Model: MapView keyboard-shortcut convention (#261)

**Feature**: `275-mapview-keyboard-shortcuts` · **Date**: 2026-06-01

This feature persists nothing and defines no LinkML/schema entity. Its "data model" is the **typed TypeScript surface** of the hook, provider, and registry. All types are fully explicit with **no `any`** (Article XV). Signatures below are normative for the `contracts/` and the tests.

---

## 1. `NormalizedKey` (value object)

A registry key after normalization (D3).

```ts
/** A single keyboard key, normalized: single ASCII letters are lower-cased; all
 *  other keys (symbols, named keys) are taken verbatim from KeyboardEvent.key. */
export type NormalizedKey = string;

/** Pure, exported for reuse by the registry and the tests. */
export function normalizeKey(key: string): NormalizedKey;
```

**Validation / rules**
- Input is a `KeyboardEvent.key` value or an author-supplied key string.
- If `/^[A-Za-z]$/` → `key.toLowerCase()`; otherwise returned unchanged.
- Empty string is invalid input (a shortcut must specify a key); the hook treats an empty key as a no-op registration and dev-warns.

---

## 2. `MapKeyboardShortcutOptions` (entity — the per-shortcut policy overrides)

The optional third argument to the hook. Every field is optional; omitting the object yields the safe defaults.

```ts
export interface MapKeyboardShortcutOptions {
  /** When false, the shortcut is registered but inert. Default: true.
   *  Used by the `L` migration to reproduce #260's "do nothing when
   *  onViewportLockChange is absent". */
  enabled?: boolean;

  /** When true, fire even if a modifier (Ctrl/Meta/Alt/Shift) is held.
   *  Default: false (D4). */
  allowModifiers?: boolean;

  /** When true, fire on auto-repeat (held key, event.repeat === true).
   *  Default: false (D6). */
  allowRepeat?: boolean;

  /** When false, the shortcut fires even while focus is in a text-entry
   *  field. Default: true (the typing-guard is on — D5). Escape hatch only;
   *  no current shortcut sets this. */
  guardTextEntry?: boolean;

  /** When false, do not call preventDefault() on a match. Default: true
   *  (D1/FR-006 — suppress the browser/Leaflet default). */
  preventDefault?: boolean;

  /** Human-readable owner label, surfaced in conflict warnings and the
   *  (future) help overlay. e.g. 'viewport-lock'. */
  description?: string;
}
```

**Resolved-defaults table** (what the provider applies when an option is omitted):

| Option | Default | FR / Decision |
|--------|---------|---------------|
| `enabled` | `true` | migration parity (D-migration) |
| `allowModifiers` | `false` | FR-004 / D4 |
| `allowRepeat` | `false` | FR-006 / D6 |
| `guardTextEntry` | `true` | FR-005 / D5 |
| `preventDefault` | `true` | FR-006 / D1 |
| `description` | `undefined` | — |

---

## 3. `ShortcutEntry` (entity — a registry record)

What the provider stores per claimed key. Not part of the public hook signature; exported for tests.

```ts
export interface ShortcutEntry {
  readonly key: NormalizedKey;
  readonly handler: (event: KeyboardEvent) => void;
  /** Fully-resolved options (no optionals) after defaulting. */
  readonly options: Required<Omit<MapKeyboardShortcutOptions, 'description'>> &
    Pick<MapKeyboardShortcutOptions, 'description'>;
}
```

> Note (Article IV.5 / ADR-033): `ShortcutEntry.options` is **derived** from `MapKeyboardShortcutOptions` via `Required<Omit<…>> & Pick<…>` rather than re-listing the fields, so it cannot silently drift if an option is added later.

**Registry**
```ts
/** Provider-scoped, held in a ref so updates don't re-render. Keyed by NormalizedKey. */
type ShortcutRegistry = Map<NormalizedKey, ShortcutEntry>;
```
- **Invariant**: at most one *active* entry per `NormalizedKey` per provider. A duplicate `register` keeps the incumbent and dev-warns (D7 / FR-012).

---

## 4. `MapKeyboardShortcutContextValue` (entity — the context)

```ts
export interface MapKeyboardShortcutContextValue {
  register(entry: ShortcutEntry): void;
  unregister(key: NormalizedKey): void;
}
```
- Provided by `MapKeyboardShortcutProvider`; consumed by `useMapKeyboardShortcut`.
- A hook used **outside** a provider throws a clear developer error (`useMapKeyboardShortcut must be used within a MapKeyboardShortcutProvider`) — fail-explicit, not silent (Article I.3).

---

## 5. `MapKeyboardShortcutProvider` props

```ts
export interface MapKeyboardShortcutProviderProps {
  /** The focusable map wrapper to attach the single keydown listener to.
   *  MapView captures its `.debrief-mapview` element via a callback ref into
   *  state and passes the resolved element here (review decision 1A). Passing
   *  the element — not a RefObject — lets the provider's effect key on it, so
   *  the listener (re)binds whenever the element appears or changes; there is
   *  no silent bind-failure if the ref isn't populated when the effect first
   *  runs (Article I.3). */
  container: HTMLElement | null;
  children: React.ReactNode;
}
```
**Behaviour**
- In a `useEffect` keyed on `[container]`: when `container` is non-null, attach one `keydown` listener; clean up (remove it) on change/unmount (no leaks). A null `container` is a no-op until the element resolves — the callback-ref capture (1A) re-runs the effect the moment the element mounts.
- The listener: normalize `event.key`; look up the registry; if an *enabled* entry exists, apply its resolved policy (modifiers, repeat, text-entry guard); if all pass, optionally `preventDefault()` and invoke `handler(event)` exactly once.
- Defensive: if `container` lacks a `tabIndex`, the provider may set `tabIndex = 0` so focusability is guaranteed (FR-003). (MapView already sets it, so this is belt-and-braces.)

---

## 6. The public hook

```ts
export function useMapKeyboardShortcut(
  key: string,
  handler: (event: KeyboardEvent) => void,
  options?: MapKeyboardShortcutOptions,
): void;
```
- Resolves defaults, builds a `ShortcutEntry`, and `register`s it in a `useEffect` keyed on `[key, handler, …resolved options]`; returns the cleanup that `unregister`s. Latest `handler` is held in a ref so callers need not memoize.
- Registering with `enabled: false` stores an inert entry (keeps the key "claimed" for conflict purposes but never fires) — or, equivalently, unregisters; **the contract is only that it does not fire** (the `L` no-callback test must pass).

---

## 7. Reserved-key governance constants

```ts
/** Single-letter keys already claimed by a shipped feature. The ADR is the
 *  authoritative registry; this constant mirrors it for the runtime guard/tests. */
export const RESERVED_MAP_SHORTCUT_KEYS: Readonly<Record<NormalizedKey, string>> = {
  l: 'viewport-lock (#260)',
};

/** Keys Leaflet's Keyboard handler owns — off-limits to custom shortcuts (D8). */
export const LEAFLET_RESERVED_KEYS: ReadonlySet<NormalizedKey>;
// { 'arrowup','arrowdown','arrowleft','arrowright','+','=','-','_','escape' }
```

**State transitions**: none — there is no stateful lifecycle beyond registry add/remove, already covered by the mount/unmount invariant in §3–§6.

---

## Entity relationship (at a glance)

```
MapView
 └─ <MapKeyboardShortcutProvider container> ── owns ──▶ ShortcutRegistry (Map<NormalizedKey, ShortcutEntry>)
       │                                                        ▲
       │ provides context                                       │ register / unregister
       ▼                                                        │
   any descendant ── useMapKeyboardShortcut(key, handler, opts) ┘
       e.g. <ViewportLockShortcut/>  → entry { key:'l', handler, options }

 single keydown listener on `.debrief-mapview` ──normalize→lookup→policy→ handler(event)
```
