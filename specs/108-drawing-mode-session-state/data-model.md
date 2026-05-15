# Data Model: Wire Drawing Mode and Palette to Session-State Store

**Feature**: 108-drawing-mode-session-state
**Phase**: 1 (Design & Contracts)
**Date**: 2026-05-12

This feature introduces **no new persistent data entities and no new schemas**. It is a refactor of where two existing in-memory values live: `drawingMode` and `drawingPaletteIndex`. The "model" below describes the existing values for completeness and traceability.

## Entities

### DrawingMode (existing)

- **Location**: `services/session-state/src/types/spatial.ts:64`
- **Type**: `type DrawingMode = 'point' | 'rectangle' | 'polygon' | 'polyline' | null`
- **Lives in**: `SpatialSlice.drawingMode` (`session-state/src/types/spatial.ts:33`).
- **Default**: `null` (un-armed).
- **Mutators**: `setDrawingMode(mode: DrawingMode): void` exposed via `SpatialActions` (`session-state/src/store/slices/spatial.ts:47-49`).
- **Persistence**: In-memory session state only. Not persisted to STAC, not persisted across page reloads in web-shell. Survives VS Code webview rebuilds because the host process retains the store; **the spec's user-visible win is that this survival now reaches the webview's rendered UI**.
- **Validation**: The string literal union enforces valid values at compile time. The webview message handler treats unknown runtime values as `null` and logs a warning (spec edge case).
- **No change made by this feature.**

### DrawingPaletteIndex (existing)

- **Location**: `services/session-state/src/types/spatial.ts` (declared as part of the spatial slice).
- **Type**: `number` (non-negative integer; representing the index into a palette-styles list).
- **Lives in**: `SpatialSlice.drawingPaletteIndex`.
- **Default**: `0`.
- **Mutators**: `incrementDrawingPaletteIndex(): void` (`session-state/src/store/slices/spatial.ts:51-53`). For non-incrementing writes the slice currently relies on the generic Zustand `set` (used internally by the web-shell flow that cycles through palettes by drawing successively).
- **Persistence**: Same as `drawingMode` — in-memory session state, host-side survival in VS Code, page-reload reset in web-shell.
- **Validation**: A `number` runtime value; the toolbar / palette UI bounds the value to the length of the palette-styles list. Out-of-range values fall back to `0` by the same defensive convention as unknown drawing modes.
- **No change made by this feature.**

## State Transitions

```
              ┌────────────────────────────┐
              │  drawingMode = null        │
              │  (un-armed)                │
              └─────────────┬──────────────┘
                            │
                user clicks drawing tool
                            │
                            v
              ┌────────────────────────────┐
              │  drawingMode = '<tool>'    │
              │  (armed; cursor reflects)  │
              └─────────────┬──────────────┘
                            │
        ┌───────────────────┼────────────────────┐
        │                   │                    │
   user clicks       user finishes        user clicks
   same tool         drawing a shape      "cancel"
        │                   │                    │
        v                   v                    v
      back to       drawingMode = null    back to un-armed
      un-armed      (auto-clear)
```

This transition diagram is unchanged by this feature. The only effect of the feature is that the diagram's **starting** state on a fresh webview boot is now whatever the session-state currently holds, not unconditionally `null`.

## Owner-Reader Map (after this feature lands)

| Owner (writes)                                       | Readers (subscribe / read)                                       |
|------------------------------------------------------|------------------------------------------------------------------|
| Web-shell `<App>` (calls `setDrawingMode` on store)  | `<App>` itself; any future store consumer (FR-011 / SC-005)      |
| VS Code extension host `MapPanel` (calls `setDrawingMode` on receiving `drawingModeChanged` from webview) | VS Code webview (via host → webview `setDrawingMode` push); any future store consumer in the host |

The "owner" of writes is always the action source (the toolbar click) but the **authoritative storage** is the session-state slice in both cases. The webview's `useState` is a mirror, not an owner — see research.md Decision 4.

## Why No `data-model.md` entries are added

- This feature does not add a slice, an action, or a stored type.
- The values being relocated already live in a typed slice that pre-dates this feature.
- The "relocation" is structural (changing which component reads which property) rather than schematic.

A future feature that, say, adds a *typed* "drawing-style configuration" object to STAC would warrant data-model entries. This feature does not.
