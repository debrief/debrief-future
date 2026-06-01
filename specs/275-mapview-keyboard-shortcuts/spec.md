# Feature Specification: First-class keyboard-shortcut convention for MapView

**Feature Branch**: `275-mapview-keyboard-shortcuts` (cloud session branch: `claude/quirky-lovelace-e3rv9`)
**Backlog Item**: 261 (Tech Debt, Priority: Low, status `approved`)
**Created**: 2026-06-01
**Status**: Draft
**Input**: User description (backlog row #261): "First-class keyboard-shortcut convention for `MapView` — the `L` shortcut introduced by #260 is the first single-letter map-focused keyboard binding in the project. It necessarily makes a number of one-off decisions: where to bind the listener, whether the map's root div needs `tabIndex`, how to coexist with Leaflet's own `keyboard` handler (which #260 disables while locked), and which modifiers are valid. The second map shortcut should not have to re-litigate any of these. This ticket codifies them — a small `useMapKeyboardShortcut(key, handler, opts)` hook in `@debrief/components` that handles focus, modifier-policy (default lowercase + no-modifiers), and Leaflet-handler-coexistence; plus an ADR documenting reserved single-letter keys and the policy for adding new ones."

## Background

PR #260 ("viewport lock", `specs/260-viewport-lock/`) added the **first** single-letter, map-focused keyboard binding in the project — pressing **`L`** toggles the map's viewport lock. To make that one shortcut behave correctly it had to settle a cluster of cross-cutting decisions, all currently expressed inline in `shared/components/src/MapView/MapView.tsx`:

- **Where the key is heard** — the binding lives on the map's root element (which carries `tabIndex={0}` so it can hold keyboard focus), not on `window`/`document`. A shortcut therefore only fires when the map has focus.
- **Which modifiers count** — the binding ignores the key press when any of Ctrl / Meta / Alt / Shift is held.
- **Not hijacking typing** — the binding does nothing when focus is in a text-entry context (`input`, `textarea`, `[contenteditable]`).
- **Coexisting with Leaflet** — Leaflet ships its own `keyboard` handler (arrow-key pan, `+`/`-` zoom). #260 snapshots and disables several map handlers (including `keyboard`) while the viewport is locked, then restores only those that were enabled before the lock.

These were reasonable, but they were decided **once, for one key, in one component**. The next map shortcut should not have to rediscover them — and the risk of drift is already real: the **TimeController** binds Space/arrow keys using a *different* pattern (a `window`-level listener gated by an `activeElement` containment check), so the project already has two inconsistent ways to attach a focus-scoped keyboard action. The backlog lists the likely next map shortcuts — Space = play/pause, `/` = filter focus, `[` `]` = step-time — and notes that **`/`, `[`, `]` are non-letter keys**, so the convention must work for symbols, not just letters.

This feature **codifies the convention**: a reusable mechanism (the `useMapKeyboardShortcut` hook in `@debrief/components`) that gives any future map shortcut the same correct-by-default focus / modifier / typing-guard / Leaflet-coexistence behaviour from a single call site, the migration of the existing `L` shortcut onto that mechanism as the first adopter (proving it and preventing regression), and an Architectural Decision Record that documents the reserved single-letter keys and the policy for claiming new ones.

> **Note on audience**: this is developer-facing infrastructure plus a governance decision. The direct "user" of the deliverable is a Debrief developer adding the next shortcut; the indirect beneficiary is the analyst, who gets predictable, consistent keyboard behaviour across every map shortcut. Requirements below are written as observable behaviours so they remain testable.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add the next map shortcut without re-litigating the basics (Priority: P1)

A developer needs to add a new keyboard action to the map (for example, the backlog's `/` = focus the filter bar, or `[` / `]` = step the playhead). They reach for the shared mechanism, specify only **which key** and **what it does**, and get the agreed behaviour automatically: it fires only when the map has focus, ignores modifier-laden presses, never triggers while the analyst is typing, and does not collide with Leaflet's own keyboard navigation.

**Why this priority**: This is the core deliverable and the explicit trigger for the ticket ("the second map shortcut should not have to re-litigate any of these"). Without it, every new shortcut re-implements four subtle concerns by copy-paste, and they drift apart — exactly the situation the TimeController already demonstrates.

**Independent Test**: Bind a throwaway example shortcut (e.g. key `k`, and separately a non-letter key such as `/`) through the mechanism in a unit/interaction test or Storybook story, supplying only key + handler. Confirm all the default behaviours hold without writing any focus / modifier / typing / Leaflet code at the call site.

**Acceptance Scenarios**:

1. **Given** a developer binds a new action to a key through the shared mechanism specifying only the key and the handler, **When** the user presses that key while the map has keyboard focus and no modifier is held, **Then** the handler runs exactly once and the default for that key is suppressed (no unintended browser/Leaflet action).
2. **Given** a bound shortcut, **When** the user presses the key while keyboard focus is inside a text-entry field over the map (`input`, `textarea`, or content-editable), **Then** the handler does **not** run and the character is typed normally.
3. **Given** a bound shortcut, **When** the user presses the key with any of Ctrl / Meta / Alt / Shift held, **Then** the handler does **not** run (default no-modifier policy).
4. **Given** a bound shortcut, **When** the map does **not** have keyboard focus, **Then** the handler does **not** run.
5. **Given** a non-letter key candidate (`/`, `[`, or `]`), **When** a developer binds it through the same mechanism, **Then** it behaves identically to a letter key (focus-scoped, no-modifier, typing-safe) with no special-case code at the call site.
6. **Given** a component that bound a shortcut is removed from the screen, **When** the key is later pressed, **Then** the handler does **not** run (the binding is cleaned up; no leaked listeners).

---

### User Story 2 - Preserve the existing `L` viewport-lock behaviour (Priority: P1)

The viewport-lock `L` shortcut from #260 is re-expressed using the new shared mechanism, as the convention's first adopter. The analyst sees **no change**: `L` still toggles the viewport lock with exactly the same focus, modifier, and typing-guard rules, and Leaflet's keyboard navigation is unaffected after toggling.

**Why this priority**: Migrating the one existing shortcut is what proves the mechanism actually covers the real case (dogfooding) and guarantees the refactor is behaviour-preserving. It is the regression boundary for the whole feature.

**Independent Test**: Re-run the #260 `L`-shortcut acceptance/regression tests against the migrated implementation; all must pass unchanged. Additionally confirm Leaflet arrow-key panning still works after an `L` toggle.

**Acceptance Scenarios**:

1. **Given** the `L` shortcut now runs through the shared mechanism, **When** the analyst presses `L` with the map focused and no modifier, **Then** the viewport lock toggles exactly as it did in #260.
2. **Given** the migrated `L` shortcut, **When** `L` is pressed while typing in a text field, or with a modifier held, or while the map lacks focus, **Then** the lock does **not** toggle (the #260 guards are preserved).
3. **Given** the migration, **When** the existing #260 acceptance and regression scenarios are executed, **Then** they all pass without modification to their expectations.

---

### User Story 3 - Govern the convention with a documented decision (Priority: P2)

Before proposing a second shortcut, a developer (or reviewer) consults a single authoritative document to learn which single-letter keys are already taken, the default focus/modifier policy, which keys are off-limits because Leaflet uses them, and the steps to claim a new key. Key conflicts are surfaced rather than silently shadowing one another.

**Why this priority**: The hook alone codifies *behaviour*; the ADR codifies *governance* (which keys, claimed by whom, how to add more). It prevents the next collision and makes the convention discoverable. It is P2 because the mechanism (P1) delivers value first, but the ADR is required to close the ticket.

**Independent Test**: Verify a single ADR exists in `docs/project_notes/decisions.md` that lists the reserved keys (initially `L` = viewport lock), states the default policy, enumerates Leaflet-reserved keys, and describes the claim procedure. Verify that registering the same key twice on one map is surfaced to the developer.

**Acceptance Scenarios**:

1. **Given** a developer is about to propose a new map shortcut, **When** they open the project decisions record, **Then** they find one ADR that lists every reserved single-letter map key and its owner, the default focus/modifier policy, the keys unavailable because Leaflet reserves them, and the procedure for claiming a new key.
2. **Given** two shortcuts attempt to bind the same key on the same map, **When** the application runs in development, **Then** the conflict is surfaced to the developer (rather than one binding silently shadowing the other), and the ADR registry remains the source of truth for which key belongs to which action.

---

### Edge Cases

- **Same key claimed twice on one map** — two bindings registering the same key risks one silently shadowing the other. The convention surfaces this as a developer-time conflict, and the ADR registry is the authoritative record of ownership.
- **Desired key collides with Leaflet navigation** — arrow keys, `+`, `-` (and other keys Leaflet's keyboard handler owns) are unavailable for custom shortcuts; the policy documents them as off-limits so a new shortcut never fights map panning/zoom.
- **Non-letter and case-irrelevant keys** — symbols such as `/`, `[`, `]` are matched by the character they produce; the case-insensitive letter handling degrades to a no-op for them, and the no-modifier default still applies.
- **A shortcut legitimately needs a modifier or auto-repeat** — these are available only via an explicit opt-out in the mechanism's options; when no options are given, the safe defaults (no modifiers, single fire) apply.
- **Key auto-repeat (key held down)** — for toggle actions, repeated firing would flip-flop the state; the default ignores auto-repeat unless a shortcut explicitly opts in.
- **Multiple map instances on one screen** — each map governs its own focus and bindings; a shortcut fires only for the map that currently has focus, never for an unfocused sibling map.
- **Focus on a non-text interactive control inside the map** (e.g. an overlay button) — consistent with #260, the shortcut still fires for focus anywhere in the map subtree *except* text-entry contexts, which are the only guarded case.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST provide a single reusable mechanism (the `useMapKeyboardShortcut` hook in the shared component library) for binding a single-character key to an action on the map, such that adding a new map shortcut requires specifying only the key and the handler — with no re-implementation of focus, modifier, typing-guard, or Leaflet-coexistence logic at the call site.
- **FR-002**: A bound map shortcut MUST activate only when the map has keyboard focus, consistent with #260 FR-002 ("available when the map has keyboard focus").
- **FR-003**: The mechanism MUST ensure the map surface is keyboard-focusable (carries the appropriate focusability) so shortcuts are reachable by keyboard navigation, without each shortcut having to re-add this itself.
- **FR-004**: By default, a bound shortcut MUST NOT activate when any modifier key (Ctrl, Meta, Alt, Shift) is held, and MUST match letter keys case-insensitively (so `l` and `L` are equivalent).
- **FR-005**: A bound shortcut MUST NOT activate while keyboard focus is in a text-entry context (`input`, `textarea`, or content-editable), so single-character shortcuts never hijack text entry.
- **FR-006**: On a matched key, the mechanism MUST suppress the default action for that key (so the browser and Leaflet do not also act on it) and invoke the handler exactly once per discrete key press.
- **FR-007**: A bound shortcut MUST coexist with Leaflet's built-in keyboard handler: it MUST NOT be swallowed by Leaflet's pan/zoom key bindings, and using a custom shortcut MUST NOT leave Leaflet's keyboard handler in a permanently altered state (map keyboard navigation continues to work afterwards).
- **FR-008**: The mechanism MUST support explicit, opt-in overrides of the defaults for justified cases (e.g. permitting a modifier, allowing a non-letter key, or enabling auto-repeat), while applying the safe defaults whenever no overrides are supplied.
- **FR-009**: The mechanism MUST clean up its binding when the consuming component is removed, leaving no listener active after unmount.
- **FR-010**: The existing #260 `L` viewport-lock shortcut MUST be re-expressed using this mechanism with no observable change in behaviour — same key, same focus/modifier/typing rules, same toggle effect — and the #260 acceptance/regression scenarios MUST continue to pass unchanged.
- **FR-011**: The project MUST record one Architectural Decision Record that (a) lists the reserved single-letter map keys and their meaning (initially `L` = viewport lock), (b) defines the default focus and modifier policy for map shortcuts, (c) documents the keys that are unavailable because Leaflet's keyboard handler reserves them, and (d) describes the procedure for proposing and claiming a new single-character map shortcut.
- **FR-012**: The convention MUST make key conflicts visible rather than silent: attempting to bind a key that is already claimed on the same map MUST be surfaced to the developer (at minimum via a development-time warning), with the ADR registry serving as the authoritative record of which key belongs to which action.

### Key Entities

- **Map keyboard shortcut binding** — the unit a developer creates: a single-character **key**, an **action handler**, and optional **policy overrides** (e.g. allow a modifier, allow a non-letter key, allow auto-repeat). With no overrides it inherits the default focus-scoped, no-modifier, typing-safe behaviour.
- **Reserved single-letter key registry** — the governed list mapping each claimed key to its meaning and owning feature; the ADR is its authoritative form. Initial contents: `L` → viewport lock (#260).
- **Leaflet-reserved keys** — the set of keys the map's built-in keyboard navigation already uses (arrow keys, `+`, `-`), which custom map shortcuts must avoid.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can add a new map keyboard shortcut by supplying only the key and the action — zero lines re-implementing focus, modifier, typing-guard, or Leaflet-coexistence behaviour at the call site.
- **SC-002**: 100% of the #260 `L` viewport-lock acceptance and regression scenarios continue to pass after the lock is migrated onto the shared mechanism (no behavioural regression).
- **SC-003**: A map shortcut produces zero activations while focus is in a text-entry context, zero activations when a disallowed modifier is held, and zero activations when the map lacks focus — verified for both letter and non-letter keys.
- **SC-004**: After a custom map shortcut is used, the map's built-in keyboard navigation (arrow-key pan, `+`/`-` zoom) still works — no permanent change to the map's keyboard-handler state.
- **SC-005**: A developer can identify every reserved single-letter map key and the exact procedure to claim a new one from a single authoritative document, with 100% of currently-bound keys listed.
- **SC-006**: A duplicate key binding (two shortcuts claiming the same key on one map) is surfaced to the developer during development rather than silently shadowed.

## Assumptions

- **Scope is the in-app map surface (`MapView`, react-leaflet).** Other keyboarded surfaces are out of scope for the mechanism: the **TimeController** today binds Space/arrow keys with a different pattern (a `window`-level listener gated by an active-element containment check), and host/application-level commands are governed elsewhere. The ADR notes the TimeController divergence as known context, but reconciling it is not part of this feature.
- **The existing `L` shortcut is migrated** onto the new mechanism as the first adopter (dogfooding + regression guard). If the team later prefers to leave `L` untouched and offer the hook only for future shortcuts, that would reduce scope — but the default taken here is migration, because it is what validates the mechanism against the real case.
- **Conflict prevention is delivered at minimum as the ADR registry** (the documented source of truth), with a lightweight development-time warning on duplicate binding included as the surfacing mechanism (FR-012). A full build-time/lint enforcement of the registry is out of scope for this iteration.
- **Shortcuts are fixed in code** — analyst-configurable key remapping is out of scope (a possible future ticket).
- **Single-character keys are the unit of governance** — multi-key chords or key sequences are out of scope.

## Dependencies

- Builds directly on **#260** (`specs/260-viewport-lock/`), which introduced the `L` shortcut and the Leaflet-handler snapshot/restore approach. #260 is merged.
- Cross-references **#258** (scene-playback-fidelity) for viewport-lock context.
- The shared component library **`@debrief/components`** is the home for the mechanism (alongside existing hooks such as `useIsMobile`, `useTheme`, `useSelection`).
- Produces a new governance artefact: an **ADR** appended to `docs/project_notes/decisions.md` (next available number, ADR-039 at time of writing).

## Out of Scope

- Implementing the future candidate shortcuts themselves (Space = play/pause, `/` = filter focus, `[` / `]` = step-time). This feature delivers the *mechanism*, the *`L` migration*, and the *ADR* — not the new shortcuts.
- Migrating or reworking the **TimeController**'s existing Space/arrow handling.
- User-configurable key remapping or any keybindings settings surface.
- Application- or host-level keybindings outside the map (e.g. VS Code command-palette bindings).
