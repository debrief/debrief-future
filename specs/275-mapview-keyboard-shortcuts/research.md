# Research & Design Decisions: MapView keyboard-shortcut convention (#261)

**Feature**: `275-mapview-keyboard-shortcuts` · **Date**: 2026-06-01

There are **no `NEEDS CLARIFICATION` items** — the spec is unambiguous and the existing #260 implementation pins the required behaviour. This document records the design decisions that turn "make the `L` shortcut reusable" into a concrete, testable mechanism. Each decision is grounded in the real code at `shared/components/src/MapView/MapView.tsx` and the regression suite at `MapView/__tests__/keyboardShortcut.test.tsx`.

---

## D1 — Where the listener lives: DOM `keydown` on the focusable wrapper, **not** Leaflet's `useMap()`/`map.keyboard`

**Decision**: Attach a single native `keydown` listener to the map's existing wrapper element (`.debrief-mapview`, which already carries `tabIndex={0}` at `MapView.tsx:997`). The mechanism never calls `useMap()` and never touches `map.keyboard`.

**Rationale**:
- It mirrors the **proven** #260 pattern (`handleRootKeyDown` is a React `onKeyDown` on that wrapper div) and the explicit reasoning in the #260 comment (`MapView.tsx:975-979`): the listener is on the container "NOT at document level" so typing `l` into a Scene description field is unaffected, and it "remains active even while the Leaflet `keyboard` handler is disabled by the lock — the user MUST be able to exit via this shortcut."
- **Focus-scoping is automatic** (FR-002): a `keydown` only reaches the wrapper when focus is within the wrapper's subtree. No `activeElement` containment check is needed.
- **Leaflet coexistence is structural** (FR-007): Leaflet's `Keyboard` handler binds to the inner `.leaflet-container`; our listener is on the outer wrapper and on a matched key calls `preventDefault()`, so Leaflet does not also act. Crucially, because we never disable/enable `map.keyboard`, the mechanism **cannot** leave Leaflet's handler in a mutated state — that snapshot/restore concern belongs solely to the viewport-lock effect (`MapView.tsx:401-438`) and stays there, untouched.

**Alternatives considered**:
- *Document/window-level listener gated by an `activeElement.contains` check* — this is the **TimeController** pattern (`TimeController.tsx:76-103`). Rejected: it is exactly the divergent second pattern this ticket exists to prevent; a global listener also risks firing for unrelated focus and is harder to reason about with multiple maps.
- *`map.on('keydown', …)` via Leaflet* — rejected: couples the mechanism to being **inside** `<MapContainer>` (the `L` handler is deliberately **outside** it) and entangles it with the very `map.keyboard` handler the lock disables, reintroducing the fragility #260 avoided.

---

## D2 — One provider + central listener + key registry; the hook just registers an entry

**Decision**: A `MapKeyboardShortcutProvider` (a logical context provider, renders no DOM of its own) receives the wrapper's `RefObject<HTMLElement>`, owns the **single** `keydown` listener on it, and holds a **registry** `Map<NormalizedKey, ShortcutEntry>`. `useMapKeyboardShortcut(key, handler, opts?)` consumes the context and `register`s its entry on mount / `unregister`s on unmount. The provider's central listener applies the default policy and dispatches to the matching entry.

**Rationale**:
- **FR-001 ergonomics**: a consumer writes `useMapKeyboardShortcut('/', focusFilter)` — only key + handler — and inherits every default. No focus/modifier/typing/Leaflet code at the call site.
- **One listener** regardless of how many shortcuts are registered (efficiency + a single, consistent policy implementation — FR-002/004/005/006).
- **FR-012 conflict detection falls out for free**: `register` checks the registry; a second claim of the same normalized key on the same provider is surfaced (see D7). The registry is the *runtime* source of truth; the ADR is the *human* one.
- **FR-009 lifecycle**: register/unregister tied to the consumer component's mount lifecycle means no leaked listeners and no stale handlers.
- Matches the library's existing **context precedent** (`ThemeProvider`/`ThemeContext`, `PanelContext`, `BrowserSelectionContext`).

**Alternatives considered**:
- *Each hook call attaches its own `addEventListener`, with a module-level `WeakMap<Element, Set<key>>` for conflict detection* — rejected: N listeners instead of one, policy logic duplicated per call, and conflict bookkeeping outside React's lifecycle is more error-prone than a provider-scoped `Map`.
- *Hook returns props (`{ onKeyDown, tabIndex }`) for the consumer to spread* — rejected: React allows only one `onKeyDown` per element, so multiple shortcuts can't compose on the same wrapper; also pushes focusability plumbing back onto every call site (violates FR-003's "without each shortcut having to re-add this").

---

## D3 — Key matching: `event.key`, lowercased for single letters, raw for symbols

**Decision**: Normalize the registry key and the incoming `event.key` the same way — if it is a single alphabetic character, lowercase it; otherwise use it verbatim. Match on the normalized value.

**Rationale**:
- **FR-004** requires `l` and `L` to be equivalent (the #260 test asserts both lowercase and uppercase fire — `keyboardShortcut.test.tsx:66-96`). Lowercasing letters delivers this and is CapsLock-tolerant.
- **US1 scenario 5 / FR-005 edge**: the backlog's own next candidates `/`, `[`, `]` are **non-letter** keys. `event.key` yields the produced character (`'/'`, `'['`, `']'`) directly, so symbols "just work" with no special-casing; lowercasing a symbol is a harmless no-op.

**Alternatives considered**:
- *`event.code` (physical key)* — rejected: layout-dependent (`Slash`/`BracketLeft` differ across keyboard layouts, and `code` ignores what character the user actually produced). Analysts think in characters ("press slash"), which is `event.key`.

---

## D4 — Default modifier policy: reject when any of Ctrl/Meta/Alt/Shift is held; opt-in to override

**Decision**: By default a shortcut does not fire if `ctrlKey || metaKey || altKey || shiftKey`. An explicit `allowModifiers` opt lifts this for justified cases.

**Rationale**: Matches #260 exactly (`MapView.tsx:986`; `keyboardShortcut.test.tsx:98-115` asserts Cmd/Ctrl/Alt/Shift+L all no-op because Cmd+L is the OS address bar). Single-character map shortcuts must never clobber OS/browser/app chords.

---

## D5 — Typing guard: skip when focus is in a text-entry context

**Decision**: If the event target is within an `input`, `textarea`, or `[contenteditable]`, the shortcut does not fire. Implemented by narrowing `event.target` with `instanceof HTMLElement` (not an `as` cast) and testing `.closest('input, textarea, [contenteditable="true"]')`.

**Rationale**: Matches #260 (`MapView.tsx:987-988`; `keyboardShortcut.test.tsx:117-135`). The `instanceof` narrowing is a deliberate **upgrade** over #260's `event.target as HTMLElement` to satisfy Article XV / ADR-011 / ADR-038 (no unchecked casts at boundaries).

---

## D6 — Auto-repeat ignored by default (new, beyond #260); opt-in `allowRepeat`

**Decision**: If `event.repeat` is true, the shortcut does not fire unless `allowRepeat` is set.

**Rationale**: For a toggle like `L`, a held key would otherwise flip-flop the lock many times a second — a latent bug in the #260 inline handler (it does not check `repeat`). Codifying "ignore repeat" as the default is precisely the kind of one-off decision this convention should settle once. **Migration safety**: #260's regression tests never set `repeat`, so ignoring it does not change any asserted behaviour (verified against `keyboardShortcut.test.tsx`). Shortcuts that genuinely want repeat (none today; a future "step-time" `[`/`]` might) opt in explicitly.

---

## D7 — Conflict surfacing: dev-only `console.warn` on duplicate registration

**Decision**: When `register` is asked to add a key already present in the provider's registry, emit a `console.warn` (guarded to development builds) naming both the key and the colliding descriptions, and keep the **first** registration as the active one. Additionally, warn when a shortcut claims a **Leaflet-reserved** key (D8).

**Rationale**:
- **FR-012 / no silent failures (Article I.3)**: silent shadowing is the failure mode to avoid. A warn surfaces it to the developer without crashing a panel over a mistake.
- *Warn rather than throw*: throwing would let a single duplicated key take down a map view; a warn is the proportionate "loud but non-fatal" signal, with the ADR registry as the authoritative record.
- *Dev-only*: avoids noise in production webviews while still catching the mistake during development/CI.

**Alternatives considered**: *Throw on conflict* (rejected — too aggressive for a UI panel); *build-time lint rule over the registry* (deferred — out of scope this iteration per spec Assumptions; the ADR + dev warn suffice now).

---

## D8 — Leaflet-reserved keys are documented and (lightly) runtime-guarded

**Decision**: Maintain a small exported constant set of keys Leaflet's `Keyboard` handler owns and which custom shortcuts must avoid: the four **arrow keys** (pan), `+`/`=` and `-`/`_` (zoom), plus `Escape` (abort). The provider warns (D7) if a shortcut claims one. The ADR is the authoritative list.

**Rationale**: Operationalises FR-007's "must avoid Leaflet keys" and FR-011's documentation duty. Leaflet's `Keyboard` handler binds arrows for panning and `+`/`-` (incl. numpad and `=`) for zoom, and `Esc` to abort an in-progress interaction; a custom shortcut on any of these would either be swallowed or fight the map. Keeping the set as a typed constant lets the registry guard and the unit tests reference one source.

**Note (verification)**: the exact Leaflet key set is taken from Leaflet 1.9's `Keyboard` handler (arrows + `+`/`=`/`-`/`_` + numpad zoom + `Esc`). The ADR records it as the normative list and can be refined if a future Leaflet bump changes the bindings; the runtime guard is advisory (a `warn`), so an imperfect list never blocks a legitimate shortcut.

---

## D9 — ADR-039 scope (the governance deliverable)

**Decision**: Append **ADR-039** to `docs/project_notes/decisions.md` (current highest is ADR-038) containing: (a) the **reserved single-letter key registry** — initially `L` → viewport lock (#260); (b) the **default policy** (focus-scoped, no-modifier, typing-safe, single-fire, repeat-ignored); (c) the **Leaflet-reserved keys** (D8) that are off-limits; (d) the **claim procedure** for proposing a new single-character map shortcut (pick a non-reserved key → add it via `useMapKeyboardShortcut` → record it in the ADR registry in the same PR); and (e) a note on the **known TimeController divergence** (Space/arrows via a different pattern) as out-of-scope context so future readers understand the boundary.

**Rationale**: FR-011 makes the ADR a hard deliverable; consolidating registry + policy + reserved set + procedure into one record is what makes the convention discoverable and prevents the next collision (US3).

---

## Migration shape (how `L` adopts the hook — informs Phase 1)

`MapView` captures its existing wrapper div via a callback ref into state (`const [mapEl, setMapEl] = useState<HTMLElement | null>(null)`; `<div ref={setMapEl} …>`), wraps its subtree in `<MapKeyboardShortcutProvider container={mapEl}>` (review decision 1A — the provider effect keys on the element so the listener can't silently fail to bind), deletes the inline `handleRootKeyDown`/`onKeyDown`, and renders a tiny internal `<ViewportLockShortcut enabled={!!onViewportLockChange} locked={viewportLocked} onToggle={onViewportLockChange} />` (a null-rendering descendant of the provider) that calls `useMapKeyboardShortcut('l', () => onToggle(!locked), { enabled, description: 'viewport-lock' })`. Because the provider's listener sits on the same `.debrief-mapview` element the #260 tests fire at, and the entry reproduces the same guards, `keyboardShortcut.test.tsx` and `viewportLock.test.tsx` pass **unchanged** (FR-010). The `enabled` flag reproduces #260's "do nothing when `onViewportLockChange` is absent" (`keyboardShortcut.test.tsx:137-145`).
