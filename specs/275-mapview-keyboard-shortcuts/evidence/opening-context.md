## Hook

| Adding the second map shortcut | Before this convention | After this convention |
|---|---|---|
| Where does the listener go? | Re-decide: window, document, or the wrapper div? | Already settled — the provider owns one listener on the focusable wrapper |
| Typing into a Scene description field | Re-implement the input/textarea/contenteditable guard | Inherited |
| Holding the key down | Latent bug — fires many times a second | Auto-repeat suppressed by default |
| Coexisting with Leaflet's arrows / +/- / Esc | Re-read Leaflet's keyboard handler and hope | ADR-039 lists the reserved keys; the registry warns on collisions |
| Two shortcuts claiming the same key | Silent shadowing, discovered later | Dev `console.warn` at registration |
| Writing it | ~40 lines copied from `MapView.tsx` | `useMapKeyboardShortcut('/', focusFilter)` — one line |

## What We're Building

PR #260 added the first map-focused keyboard binding in Debrief: press `L` and the map's viewport lock toggles. Getting one key to behave correctly meant settling a surprising amount of cross-cutting detail inline in `MapView.tsx` — where to attach the listener (the map's focusable wrapper, deliberately *not* `window` or `document`), giving the map root a `tabIndex` so it can hold focus, a no-modifier policy, a guard so the key does nothing while you're typing into a Scene description, and careful coexistence with Leaflet's own arrow-pan and zoom handling. All decided once, for one key, in one component.

The backlog already names the next candidates — `/` to focus the filter, `[` and `]` to step through time, Space to play and pause. None of them should have to re-litigate any of that. So this feature lifts the mechanism out of `MapView.tsx` and turns it into a convention: a reusable `useMapKeyboardShortcut(key, handler, opts?)` hook in `@debrief/components`, backed by a small `MapKeyboardShortcutProvider` that owns a single listener and a key registry. A developer writes one line — key plus handler — and inherits focus-scoping, the no-modifier default, the typing-guard, single-fire with `preventDefault`, auto-repeat suppression, and unmount cleanup. The registry is the runtime source of truth: if two shortcuts claim the same key, it surfaces the conflict with a dev warning rather than letting one silently shadow the other. The existing `L` shortcut becomes the first adopter, behaviour-identical, with #260's regression tests passing unchanged. An ADR (ADR-039) records the reserved keys, the default policy, the Leaflet keys that are off-limits, and how to claim a new one.

## How It Fits

This is a frontend component-library refactor and nothing more — no new runtime dependency, no schema change, no service or persistence touch. The hook, provider, and context live alongside the library's existing custom hooks (`useSelection`, `useTheme`, `useIsMobile`) and mirror the `ThemeProvider` / `ThemeContext` pattern already established there, so it reads as house style rather than a new idiom. It is the kind of debt you pay down right after the first instance of a pattern appears and before the second instance copy-pastes it: a roughly one-to-two-day change whose entire return is that every map shortcut after `L` is cheap, consistent, and discoverable in one ADR.

## Key Decisions

**Listen on the DOM, not on Leaflet.** The shortcut is a native `keydown` on the map's focusable wrapper — the mechanism never calls `useMap()` and never touches `map.keyboard`. This buys three things at once: focus-scoping becomes automatic (a `keydown` only reaches the wrapper when focus is inside it, so no `activeElement` containment check is needed); the shortcut keeps working *even while the viewport lock has disabled Leaflet's keyboard handler*, which matters because `L` is how you escape the lock; and the mechanism can never leave Leaflet's handler in a mutated state. The alternative — a window-level listener gated by an `activeElement` check — is exactly the divergent pattern the TimeController already uses for Space and the arrows. That drift is the reason this convention exists, so adopting it here would defeat the point.

**One provider, one listener, one registry — accepting a little more machinery for conflict-detection.** A bare hook that each consumer wires up independently would be less code than a provider plus context. We took the heavier option deliberately: a central registry is what makes duplicate-key conflicts *visible*. Without it, a second shortcut quietly claiming `L` would just win or lose at random depending on listener order, and nobody would notice until a bug report. The provider owns the single listener and ties every shortcut's lifecycle to React mount/unmount; the hook just registers and unregisters an entry. The extra context is the price of never debugging a silently-shadowed key.

**Auto-repeat off by default — fixing a latent bug by convention.** This is a new decision, beyond what #260 settled. Holding `L` down would, without intervention, flip the lock on and off many times a second — a bug that simply hadn't surfaced yet because nobody held the key. The hook ignores OS key-repeat by default; a future step-time `[` / `]` that genuinely wants to repeat opts in explicitly. The safe behaviour is the one you get for free.

**Conflicts warn, they don't throw.** When two shortcuts collide, the registry emits a dev-only `console.warn` — loud, but non-fatal. A throw would turn a naming clash into a broken map at runtime; a silent log would defeat the purpose. The warning is the runtime nudge; ADR-039's reserved-key table is the authoritative human record.

**Migrate the one shortcut we have, to prove the hook.** Rather than ship the hook and leave `L` on its bespoke handler, the migration moves `L` onto the new mechanism as the first adopter. Dogfooding the convention on a real, test-covered shortcut is the only honest way to show it's equivalent — #260's regression suite passes untouched. The migration also takes the opportunity to tighten the typing-guard: #260's `event.target as HTMLElement` cast becomes an `instanceof HTMLElement` narrowing, bringing the code into line with Article XV and ADR-011/ADR-038 on unchecked boundary casts.
