# Contract: default keyboard policy & conflict surfacing

**Feature**: `275-mapview-keyboard-shortcuts`

The provider's single `keydown` listener evaluates every press against the **resolved policy** of the matching registry entry. This contract fixes the evaluation order and the conflict-surfacing behaviour so the implementation and tests agree.

## Evaluation order (provider listener, per `keydown`)

```
1. norm = normalizeKey(event.key)
2. entry = registry.get(norm)            → no entry?            ⇒ return (ignore)
3. entry.options.enabled === false?       → yes                  ⇒ return (inert)
4. event.repeat && !allowRepeat?          → yes                  ⇒ return
5. hasModifier(event) && !allowModifiers? → yes                  ⇒ return   // Ctrl||Meta||Alt||Shift
6. guardTextEntry && inTextEntry(target)? → yes                  ⇒ return   // input|textarea|[contenteditable]
7. if preventDefault: event.preventDefault()
8. entry.handler(event)                   // exactly once
```

- `hasModifier(e) = e.ctrlKey || e.metaKey || e.altKey || e.shiftKey`
- `inTextEntry(t) = t instanceof HTMLElement && t.closest('input, textarea, [contenteditable="true"]') !== null` — **no `as` cast** (Article XV / ADR-011 / ADR-038).
- Steps 4–6 are short-circuits: the handler fires only if **all** guards pass.

## Default policy table (when an option is omitted)

| Concern | Default | Override opt | Decision |
|---------|---------|--------------|----------|
| Focus scope | only when container subtree has focus (structural — listener location) | — (not overridable) | D1 |
| Modifiers | rejected | `allowModifiers: true` | D4 |
| Auto-repeat | rejected | `allowRepeat: true` | D6 |
| Text-entry | guarded (rejected) | `guardTextEntry: false` | D5 |
| Default action | `preventDefault()` called | `preventDefault: false` | D1 |
| Letter case | case-insensitive | — | D3 |
| Enabled | active | `enabled: false` | migration parity |

## Conflict-surfacing contract (FR-012 / D7)

On `register(entry)`:

| Condition | Action |
|-----------|--------|
| `registry` has no entry for `entry.key` | add it; if `LEAFLET_RESERVED_KEYS.has(entry.key)` → `console.warn` (dev only) that the key is Leaflet-reserved |
| `registry` already has an entry for `entry.key` | **keep the incumbent**; `console.warn` (dev only): ``duplicate map keyboard shortcut for "<key>": "<incoming.description>" ignored; already claimed by "<existing.description>"`` |

- Warnings are emitted whenever `process.env.NODE_ENV !== 'production'` (review decision 3A) — so they fire in development **and** under the vitest runner (`NODE_ENV='test'`), making C10/C11 testable without env-stubbing, while production webviews stay quiet.
- Warnings never throw and never prevent the map from rendering — surfacing, not failing-hard (proportionality; Article I.3 "no silent failures" satisfied by the warn).
- The authoritative registry of *intended* ownership is **ADR-039**; `RESERVED_MAP_SHORTCUT_KEYS` mirrors it for tests.

## Leaflet-reserved set (normative for the guard)

```
arrowup, arrowdown, arrowleft, arrowright,   // pan
+, =, -, _,                                   // zoom (incl. shift variants)
escape                                        // abort interaction
```
Derived from Leaflet 1.9 `Keyboard` handler bindings. The ADR carries the canonical, human-readable version; the constant exists so the runtime guard and unit tests share one source.
