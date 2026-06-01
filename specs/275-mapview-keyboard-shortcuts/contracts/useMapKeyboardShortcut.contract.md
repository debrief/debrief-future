# Contract: `useMapKeyboardShortcut` public surface

**Feature**: `275-mapview-keyboard-shortcuts` · Consumed from `@debrief/components`

This is the API contract for the hook + provider. Since the feature exposes no REST/GraphQL endpoint, the "contract" is the module's public TypeScript surface plus the behavioural guarantees each test will assert. Types are normative (see `data-model.md`).

## Exported surface (added to `shared/components/src/index.ts`)

```ts
export { useMapKeyboardShortcut } from './hooks/useMapKeyboardShortcut';
export {
  MapKeyboardShortcutProvider,
  RESERVED_MAP_SHORTCUT_KEYS,
  LEAFLET_RESERVED_KEYS,
} from './hooks/MapKeyboardShortcutProvider';
export type {
  MapKeyboardShortcutOptions,
  MapKeyboardShortcutProviderProps,
} from './hooks/MapKeyboardShortcutProvider';
```

## Signatures

```ts
function useMapKeyboardShortcut(
  key: string,
  handler: (event: KeyboardEvent) => void,
  options?: MapKeyboardShortcutOptions,
): void;

function MapKeyboardShortcutProvider(props: MapKeyboardShortcutProviderProps): JSX.Element;
```

## Behavioural contract (each row → at least one test)

| # | Given | When | Then | Source |
|---|-------|------|------|--------|
| C1 | a shortcut `useMapKeyboardShortcut('k', h)` under a provider whose container has focus | `k` pressed, no modifier | `h` called once; `event.preventDefault()` called | FR-001/006, US1-1 |
| C2 | same | focus is inside an `<input>` within the container | `h` **not** called | FR-005, US1-2 |
| C3 | same | `k` pressed with Ctrl / Meta / Alt / Shift held | `h` **not** called | FR-004, US1-3 |
| C4 | same | a `keydown` fires while the container does **not** have focus (event dispatched elsewhere) | `h` **not** called | FR-002, US1-4 |
| C5 | a shortcut on a **non-letter** key `'/'` | `/` pressed with focus, no modifier | `h` called once | FR-005 edge, US1-5 |
| C6 | a letter shortcut registered as `'L'` | `l` pressed (and vice-versa) | `h` called (case-insensitive) | FR-004 |
| C7 | a mounted shortcut | the consuming component unmounts, then the key is pressed | `h` **not** called (listener/entry removed) | FR-009, US1-6 |
| C8 | a shortcut with `allowRepeat` unset | key pressed with `event.repeat === true` | `h` **not** called; with `allowRepeat:true` it **is** called | FR-006/D6 |
| C9 | a shortcut with `allowModifiers:true` | key pressed with a modifier | `h` **is** called | FR-008 |
| C10 | two shortcuts registering the **same** key on one provider | second registration occurs (dev build) | a `console.warn` naming the key + descriptions is emitted; the first entry stays active | FR-012, US3-2 |
| C11 | a shortcut claiming a Leaflet-reserved key (e.g. `'arrowup'`) | registration occurs (dev build) | a `console.warn` is emitted | FR-007/D8 |
| C12 | the hook used with **no** surrounding provider | the component renders | a descriptive error is thrown (fail-explicit) | Article I.3 |
| C13 | two **different** shortcuts (`'k'`, `'/'`) on one provider | each key pressed | the matching handler (only) fires | FR-001 (multi) |

## Migration contract (the `L` shortcut — must hold verbatim)

The existing #260 suite `MapView/__tests__/keyboardShortcut.test.tsx` is the contract and **must pass unchanged**:

| # | Behaviour preserved |
|---|---------------------|
| M1 | `keyDown(.debrief-mapview, {key:'l'})` while unlocked → `onViewportLockChange(true)` |
| M2 | same while locked → `onViewportLockChange(false)` (escape via shortcut) |
| M3 | `l` + meta / ctrl / alt / shift → no call |
| M4 | `keyDown` on an `<input>` inside the root → no call |
| M5 | `onViewportLockChange` absent → no throw, no call |

These map onto the hook as: an internal `<ViewportLockShortcut/>` calling `useMapKeyboardShortcut('l', () => onToggle(!locked), { enabled: !!onToggle, description: 'viewport-lock' })`, with the provider's listener bound to the same `.debrief-mapview` element the tests target.
