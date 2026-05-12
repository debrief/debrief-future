# Feature Specification: Wire Drawing Mode and Palette to Session-State Store

**Feature Branch**: `108-drawing-mode-session-state`
**Created**: 2026-05-12
**Status**: Draft
**Input**: User description: "Wire drawing mode and palette to session-state store — both frontends use local useState instead of session-state; drawing mode resets on webview re-render (F-3.1, F-3.2). See docs/architectural-consistency-review.md#f-31-drawing-mode-not-using-session-state-store for the architectural review entry. Part of Epic E06."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Drawing mode survives webview re-renders in VS Code (Priority: P1)

A maritime analyst opens a plot in VS Code, activates a drawing mode (for example, "draw point" or "draw polygon") from the drawing toolbar, and is in the middle of placing shapes on the map. The webview panel is rebuilt — because the panel was hidden and re-shown, the host extension reloaded the webview, an editor layout change forced a remount, or the analyst switched to another tab and back. Today the drawing mode silently resets to `null` and the analyst must re-select the same mode from the toolbar. After this feature, the analyst returns to the map with the same drawing mode still active and can continue placing shapes without interruption.

**Why this priority**: This is the primary user-facing symptom that motivated the architectural review entry. Webview re-renders are routine in VS Code and the lost-mode experience is jarring. Fixing it is the highest-value outcome of the change.

**Independent Test**: In VS Code, open a plot, activate drawing mode, force a webview remount (toggle visibility of the map panel, or use the VS Code "Developer: Reload Webviews" command), and confirm the drawing mode indicator shows the previously selected mode without re-clicking the toolbar.

**Acceptance Scenarios**:

1. **Given** the VS Code map webview is open with no drawing mode active, **When** the user clicks the "draw polygon" tool in the drawing toolbar, **Then** the drawing mode indicator shows "polygon" and the map cursor reflects polygon-drawing affordance.
2. **Given** drawing mode "polygon" is active in the VS Code map webview, **When** the webview is hidden and re-shown (or the user runs "Developer: Reload Webviews"), **Then** drawing mode remains "polygon" and the user can continue placing polygon vertices.
3. **Given** drawing mode "polygon" is active, **When** the user clicks the same drawing tool again (or the "cancel" affordance), **Then** drawing mode returns to `null` and the toolbar reflects the un-armed state.
4. **Given** drawing mode is active in the web-shell, **When** the page is reloaded, **Then** drawing mode resets to `null` (because session-state is not persisted across page reloads in web-shell). This is expected and matches the pre-existing reload semantics of session-state in the web-shell.

---

### User Story 2 - Palette selection survives webview re-renders in VS Code (Priority: P2)

The drawing palette (a styled colour/style selector used when arming a drawing mode) currently remembers which entry the analyst picked across normal use. In VS Code, the selected palette index resets to `0` whenever the webview is rebuilt, forcing the analyst to re-pick their preferred style. After this feature, the palette selection is restored after a webview rebuild, matching the behaviour the web-shell already provides.

**Why this priority**: Same root cause as US1 but lower visible impact (the palette default of `0` is often acceptable, and re-picking is one extra click). Resolved opportunistically alongside the drawing-mode fix because the underlying store slice already exists and the change site is the same component.

**Independent Test**: In VS Code, open a plot, select a non-default palette entry (for example, index 2), force a webview remount, and confirm the palette selector still highlights index 2.

**Acceptance Scenarios**:

1. **Given** the VS Code map webview is open with palette index `0`, **When** the user clicks palette entry `2`, **Then** subsequent drawing operations use the styling associated with index `2` and the selector highlights index `2`.
2. **Given** palette index `2` is selected in VS Code, **When** the webview is hidden and re-shown, **Then** the palette selector still shows index `2` highlighted.

---

### User Story 3 - Programmatic and cross-component consumers can read drawing state (Priority: P3)

Because drawing mode and palette index are kept in component-local React state, no other code path can read or set them. Other parts of the platform that legitimately care about drawing state — for example, a future MCP tool that arms a drawing mode programmatically, a status-bar indicator outside the map component, a Playwright test that asserts on drawing mode, or a custom contrib extension — currently have no API to do so. After this feature, drawing mode and palette index live in the session-state store and are observable and mutable by any consumer that already has access to the store, with no new public API surface required.

**Why this priority**: This is a latent enabler, not a user-visible improvement on its own. It is delivered automatically as a side effect of moving the state into the store, so the priority is "valuable but not the reason we are doing this".

**Independent Test**: In a session-state unit test, dispatch `setDrawingMode('polygon')`, assert the store reflects the change, dispatch `setDrawingMode(null)`, assert it clears. Repeat for `drawingPaletteIndex`. (The store-level capability already exists for drawing mode; this story is about the consumer wiring proving that the slice is now the single source of truth.)

**Acceptance Scenarios**:

1. **Given** the session-state store has been initialised, **When** a non-map consumer subscribes to the drawing-mode slice and an end user clicks the drawing toolbar, **Then** the consumer observes the same drawing-mode value as the toolbar UI shows.
2. **Given** the session-state store has `drawingPaletteIndex = 2`, **When** the map component mounts, **Then** the palette selector renders with index `2` pre-selected (instead of defaulting to `0`).

---

### Edge Cases

- **Map component mounts before session-state hydrates**: The drawing toolbar must not crash if the store has not yet provided a value. Until the store provides one, the toolbar shows the same default state it does today (drawing mode `null`, palette index `0`).
- **Two map views observe the same session-state**: The web-shell only renders one map. VS Code, in principle, may host multiple webview instances pointing at the same plot. If both are open and drawing mode is `polygon`, both must reflect that mode. The change must not introduce per-instance divergence — both views read from the same slice.
- **External code sets an invalid drawing mode value**: A consumer that writes to the slice with an unknown drawing-mode string must not break the UI. The toolbar treats unknown values the same way it treats `null` (un-armed) and a warning is logged.
- **Webview reload mid-drawing of a multi-vertex shape**: The drawing *mode* is preserved (the user is still in "polygon" mode), but any in-progress vertices that were managed by the drawing library's transient state may be lost. This is acceptable — the scope of this change is the *mode* and the *palette index*, not the in-progress geometry. The user can begin a new shape with no extra clicks because the mode is still armed.
- **Undo/redo over drawing-mode changes**: Drawing-mode and palette-index changes follow the same undo-tracking convention as other UI state in the session-state store. If the existing convention is "untracked" (UI ephemeral state), this change preserves that. If the convention requires explicit opt-in to undo, this change does not opt in. Either way the behaviour is consistent with how the slice already declares itself.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The VS Code map view MUST read the current drawing mode from the session-state store rather than from component-local React state.
- **FR-002**: The VS Code map view MUST write drawing-mode changes (mode entered, mode cleared) to the session-state store rather than to component-local React state.
- **FR-003**: The web-shell map view MUST read the current drawing mode from the session-state store rather than from component-local React state.
- **FR-004**: The web-shell map view MUST write drawing-mode changes to the session-state store rather than to component-local React state.
- **FR-005**: The VS Code map view MUST read the current drawing-palette index from the session-state store rather than from component-local React state.
- **FR-006**: The VS Code map view MUST write drawing-palette-index changes to the session-state store rather than to component-local React state.
- **FR-007**: The web-shell map view continues to read and write the drawing-palette index via the session-state store (no behaviour change; existing wiring is preserved).
- **FR-008**: After a webview rebuild in VS Code, the drawing mode and palette index MUST match the values that were active immediately before the rebuild, assuming the underlying plot session has not been closed.
- **FR-009**: When session-state has no value for drawing mode (for example, on fresh session creation), the map view MUST render in the same un-armed default state it renders today (drawing mode `null`, palette index `0`).
- **FR-010**: The change MUST NOT introduce a new public API on the session-state store; it MUST use the existing setter (`setDrawingMode`) and the existing palette-index slice (`drawingPaletteIndex`) referenced in the architectural review.
- **FR-011**: No remaining call site in either frontend may use component-local React state as the authoritative source for drawing mode or palette index after this change lands.
- **FR-012**: User-visible behaviour of drawing tools (which tools exist, how they are selected, how drawing is started and stopped, how shapes are committed) MUST be unchanged outside of the persistence-across-rebuild improvement described in US1 and US2.

### Key Entities *(include if feature involves data)*

- **Drawing Mode**: An optional value identifying which drawing tool is currently armed. Lives in the session-state spatial slice. Conceptually one of a small set of named modes (for example, point, line, polygon, circle, rectangle) or unset. Owned by the session-state store; mirrored into the map component's local rendering on demand.
- **Drawing Palette Index**: A non-negative integer identifying the user's current selection within the drawing palette (the styling/colour preset list). Lives in the session-state spatial slice alongside drawing mode. Defaults to `0` when no selection has been made.
- **Map View Component**: The on-screen surface that hosts the drawing toolbar, the palette, and the map. Two instances exist in the platform: one in the VS Code extension webview and one in the web-shell app. After this change, both read drawing mode and palette index from the session-state store rather than from component-local state.

## User Interface Flow *(optional - include for UI features)*

### Decision Analysis

- **Primary Goal**: Allow analysts to use drawing tools in VS Code without losing their armed tool when the webview rebuilds.
- **Key Decision(s)**:
  1. Which drawing mode to arm (this decision is unchanged by this feature — it is made via the existing toolbar).
  2. Which palette entry to use (also unchanged — made via the existing palette selector).
- **Decision Inputs**: The existing drawing toolbar (showing available modes), the existing palette selector (showing available presets). No new decision inputs are introduced.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Map view open, drawing mode `null`, palette index `0` | User clicks "polygon" in the drawing toolbar | Drawing mode shows "polygon"; map cursor reflects polygon-drawing affordance |
| 2 | Drawing mode "polygon" armed | User picks palette entry `2` | Palette selector highlights `2`; subsequent shapes use that styling |
| 3 | Drawing mode "polygon" armed, palette index `2` | Webview is hidden and re-shown (or remounts for any reason) | Map view returns with drawing mode still "polygon" and palette index still `2` |
| 4 | Drawing mode "polygon" armed | User clicks the same toolbar entry again, or clicks "cancel" | Drawing mode returns to `null`; toolbar shows un-armed state |

### UI States

- **Empty State**: No drawing mode armed. Drawing toolbar shows all tools idle; palette selector shows index `0` highlighted. This is unchanged from today.
- **Loading State**: Not applicable. Reading drawing mode from the store is synchronous from the map component's perspective; there is no asynchronous fetch.
- **Error State**: If the store provides an unrecognised drawing-mode value, the map view falls back to the un-armed state and a warning is logged. The user sees the same UI they would see for drawing mode `null`.
- **Success State**: After a webview rebuild, the map view re-renders with the previously armed drawing mode and palette index restored, with no flicker through the un-armed default.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In VS Code, after arming a drawing mode and forcing a webview rebuild, the previously armed mode is restored in 100% of trials across the canonical drawing modes (point, line, polygon, circle, rectangle, or whichever modes the toolbar offers).
- **SC-002**: In VS Code, after selecting a non-default palette index and forcing a webview rebuild, the previously selected palette index is restored in 100% of trials.
- **SC-003**: Zero call sites in `apps/web-shell` and `apps/vscode` retain `useState<DrawingMode>` or `useState<number>` as the authoritative store for drawing mode or palette index after this change. (Verifiable by automated grep / lint check in the test suite.)
- **SC-004**: User-visible drawing behaviour outside the rebuild-preservation improvement is unchanged: existing user-flow tests for drawing tools continue to pass with no functional adjustment beyond updating the source of truth they assert against.
- **SC-005**: The drawing-mode and palette-index values in the session-state store are observable by at least one non-map consumer in a unit test (for example, a store-level test or a separate component subscribing to the slice), demonstrating the slice is genuinely the single source of truth.

## Assumptions

- The session-state spatial slice's `setDrawingMode()` API (referenced in the architectural review at `services/session-state/src/store/slices/spatial.ts:47-49`) is the intended public API for drawing-mode writes and does not need to be redesigned as part of this work.
- The session-state spatial slice already exposes `drawingPaletteIndex` (used today by the web-shell at `apps/web-shell/src/App.tsx:504,522`) and does not need a new slice or new actions for this work.
- Web-shell page reload is not in scope: session-state is not persisted across page reloads in the web-shell today, and this feature does not change that. Only VS Code webview re-renders (which preserve the extension-host-owned session-state) are addressed for US1 and US2.
- Multi-webview behaviour: if VS Code ever hosts more than one map view against the same plot, the desired behaviour is "both views reflect the same drawing mode and palette index", which is the natural consequence of reading from a single store and is treated as desirable.
- Drawing-mode and palette-index changes do not need to be undo-tracked unless the existing slice already opts in to undo tracking; this feature inherits whatever the slice already declares.

## Dependencies

- The session-state store and its spatial slice must already exist and expose drawing-mode and palette-index state with their setters (confirmed by the architectural review references).
- No new dependency on external packages, schemas, or services is introduced.

## Out of Scope

- Persisting drawing mode or palette index across application restarts (would require STAC/session persistence changes outside this feature).
- Persisting in-progress drawing geometry (vertices placed but not committed) across webview rebuilds.
- Refactoring the drawing toolbar or palette UI components themselves; only the source of truth for their state is changing.
- The other findings in the architectural review (F-3.3 result-layer lifecycle, F-3.5 tool-undo gap, etc.) — those are tracked as separate backlog items under Epic E06.
- Adding undo/redo tracking for drawing-mode or palette-index changes if the existing slice does not already opt in.

## Related

- Architectural review: `docs/architectural-consistency-review.md#f-31-drawing-mode-not-using-session-state-store` (F-3.1) and `#f-32-vs-code-palette-index-bypasses-store` (F-3.2)
- Epic: E06 (Architectural Consistency)
- Backlog item: 108
