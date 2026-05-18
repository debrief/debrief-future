# Research: Viewport Lock

**Date**: 2026-05-18
**Spec**: [spec.md](./spec.md)

Most design decisions were resolved before the spec was written (recorded in the spec's Assumptions section and in the conversation summary at PR #626). This document captures the three remaining implementation-level questions raised while drafting `plan.md` and the decisions taken.

---

## R1 — How to disable + restore the six Leaflet gesture handlers without re-mounting the map

**Decision**: snapshot each handler's `.enabled()` state into a `useRef<{ dragging: boolean; ... }>` at lock-on, call `.disable()` on each, and at unlock call `.enable()` only on the handlers whose snapshotted value was `true`. The snapshot is captured at lock-on (not at component mount) so a host that had separately disabled a handler for an independent reason (e.g. measurement-tool mode) keeps that handler off after unlock.

**Rationale**:
- Leaflet's `Map.dragging`, `scrollWheelZoom`, `doubleClickZoom`, `touchZoom`, `boxZoom`, `keyboard` are `Handler` instances exposing `.enabled() → boolean`, `.enable()` and `.disable()`. Toggling them does not re-mount the map or touch any layers — zero flicker, zero allocation pressure.
- Capturing the snapshot at lock-on (not at mount) is the conservative choice: the spec's FR-006 says unlock MUST restore the pre-lock state, not the at-mount state. The two only diverge in edge cases (a host that toggles a handler between mount and lock-on) but those edge cases are exactly the ones that go wrong if we capture too early.
- A single `useEffect` on `viewportLocked` plus one `useRef` is enough — no reducer, no event subscription.

**Alternatives considered**:
- *Re-mount the `MapContainer` with `dragging={false}` props*: would cause a visible map flicker (tile re-load), violates FR-004's "do not reflow" cousin requirement for the canvas.
- *Use `react-leaflet`'s prop-based interaction config*: those props are only consulted at mount, so this option degenerates into the re-mount path above.
- *Capture snapshot at mount*: simpler but loses the correctness property for hosts that toggle handlers independently between mount and lock-on. Not worth the simplification.

---

## R2 — Naming convention for the MCP `errorCode`

**Decision**: extend `SetViewportOutput` with `errorCode?: 'VIEWPORT_LOCKED'` as a string-literal type. Return it from the new reject branch alongside the existing `success: false` + `error: 'Viewport is locked — unlock to change view.'`. The string-literal type keeps the surface narrow (callers can exhaustively switch on it) and stays additive (existing callers that don't read `errorCode` are unaffected).

**Rationale**:
- Existing `setViewport.ts` returns `{ success: false, error: string }` for thrown validation errors but offers no machine-detectable cause. FR-009 explicitly requires "a stable, documented error code". `errorCode` as a discriminated string literal is the conventional way to give callers (LLMs, tools, tests) something to switch on without parsing the free-text `error`.
- `SCREAMING_SNAKE_CASE` matches the broader project convention for typed error tags (see search for `ErrorCode` patterns under `services/`).
- Adding the field as **optional** preserves backwards compatibility: existing happy-path callers see `errorCode: undefined`.

**Alternatives considered**:
- *Throw an `Error` subclass*: the tool already does `try/catch` and converts thrown errors to `error: string`. Threading a class through would force callers to inspect `error.constructor.name`, which is anti-pattern for an MCP-facing surface.
- *Use an enum*: TypeScript enums are discouraged in this project's strict-mode TS code; string literal unions are the idiomatic alternative.
- *Use `code: 'locked'`*: lowercase is fine but matches no existing convention; `VIEWPORT_LOCKED` is self-documenting and namespaced.

---

## R3 — Where to bind the `L` keyboard shortcut

**Decision**: bind the shortcut on the `MapView`'s root `<div>` (which already receives keyboard focus when the user clicks the map) via a `keydown` listener that checks `event.key === 'l' && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey` (lowercase L only, no modifiers, to avoid collision with browser zoom shortcuts and the OS-level `Cmd+L` address-bar focus). Bubbling stops at the map; pressing `L` while focus is in the Storyboard panel or any input does nothing (intentional — the spec scopes the shortcut to "when the map has focus").

**Rationale**:
- The Leaflet `keyboard` handler (one of the six being disabled while locked) handles map-pan arrows, but we need a separate plain-DOM listener for `L` because we want the toggle to remain functional **while locked** (otherwise the user would lose the shortcut they need to escape).
- Lowercase, no modifiers is the form used by the existing `R`/`F`/`T` map shortcuts (search `keydown` in `MapView.tsx` confirms the pattern).
- Capture-phase listening is not required because `MapView` has no children that hijack `L`.

**Alternatives considered**:
- *Capture at the document level*: too greedy — would fire while typing into the description field of a scene-edit form, etc.
- *Use a VS Code command + keybinding for the VS Code host only*: solves it in VS Code but leaves the web-shell without a shortcut. The map-focus DOM listener works identically in both hosts.
- *Use a chord (e.g. `Ctrl/Cmd+Alt+L`) for symmetry with `Ctrl/Cmd+Alt+C` capture*: rejected — the user-agreed default in the spec is plain `L` for speed, and the audit doc's "well-trodden flow" justifies lower-friction binding.

---

## Background reading

- `docs/project_notes/viewport-mutation-audit.md` — Section A (six MapView mutation sites this feature must gate, plus the audit's Section E sketch).
- `services/session-state/src/types/spatial.ts` — `SpatialSlice` shape; precedent of `drawingMode` / `drawingPaletteIndex` as ephemeral fields (matches what we're doing with `viewportLocked`).
- `services/session-state/src/persistence/save.ts:42-43` — the "ephemeral fields are always reset" comment that this feature continues the spirit of, but via `Omit<>` rather than hand-resetting.
- `shared/components/src/MapView/MapView.tsx` — A1–A6 mutation effects.
- `shared/components/src/MapView/LeafletToolbar/LeafletToolbar.tsx` — the toolbar buttons that get disabled-with-tooltip.
- `shared/components/src/panels/StoryboardPanel/StoryboardPanel.tsx:200-209` — Capture button (sibling to the new padlock).
- `services/session-state/src/server/tools/setViewport.ts` — the MCP tool that receives the reject branch.
