# Research: Drawing UX Guidance and STAC Persistence

**Feature**: 096-drawing-ux-persistence
**Date**: 2026-02-14

## R1: Guidance Overlay Positioning Strategy

**Decision**: Fixed position at the bottom-centre of the map container, above the attribution.

**Rationale**: Three positioning strategies were evaluated:

1. **Cursor-following tooltip** — Moves with the mouse. Highly contextual but risks obscuring the exact area the analyst is drawing in, especially for point placement. Also creates visual noise during active vertex placement.
2. **Map edge (fixed corner)** — Positioned at top-left or bottom-centre of the map. Unobtrusive, predictable location, always visible. Standard pattern in drawing tools (e.g., Figma's mode indicators, Google Maps measurement tool).
3. **Toolbar-adjacent tooltip** — Attached to the '+' button. Close to the action trigger but may be clipped in narrow panels and conflicts with the shape palette dropdown.

Bottom-centre is chosen because:
- It avoids conflict with the toolbar (top-left) and the shape palette dropdown
- It is visible without requiring eye movement from the drawing area
- It scales well across panel widths (centred remains readable)
- Established precedent in map applications for contextual help text

**Alternatives considered**: Cursor-following (too intrusive during drawing), toolbar-adjacent (clipping risk, dropdown conflict).

## R2: Drawing Palette Colour Selection

**Decision**: An 8-colour palette based on distinct hues optimised for cartographic visibility against both light and dark map tiles.

**Rationale**: The palette must:
- Be distinguishable against both light (OpenStreetMap) and dark (satellite/night mode) backgrounds
- Avoid confusing drawn shapes with existing track colours (typically red/green for platform tracks)
- Provide enough variation for typical annotation sessions (1-20 shapes)
- Be accessible to colour-blind users (avoid red-green pairs without shape/pattern distinction)

Proposed palette (8 colours, cycling):
1. `#2196F3` — Blue (current rectangle default)
2. `#FF9800` — Orange (current polygon default)
3. `#00BCD4` — Teal (current polyline default)
4. `#9C27B0` — Purple
5. `#4CAF50` — Green (current point default)
6. `#F44336` — Red
7. `#795548` — Brown
8. `#607D8B` — Blue-grey

This preserves the existing per-type defaults as palette entries, so the visual character is familiar. Sequential assignment cycles through all 8 regardless of shape type (a rectangle and a polygon may share a palette slot if drawn in the same position in the cycle).

**Alternatives considered**:
- Per-type fixed colour (current approach) — rejects visual distinction when multiple shapes of the same type are drawn
- HSL rotation (programmatic) — less predictable, harder to tune for cartographic backgrounds
- User-chosen colour — too much friction for quick annotation; better as a future edit feature

## R3: Persistence Timing and Mechanism

**Decision**: Persist immediately after shape creation using the existing `stacService.addFeatures()` method, followed by `appendProvenance()` for metadata.

**Rationale**: Three persistence strategies were evaluated:

1. **Immediate write-on-create** — Each drawn shape is written to STAC as soon as it is created. Simple, reliable, no data loss risk. Slightly more disk I/O for multi-shape sessions.
2. **Batch write-on-save** — Accumulate drawn shapes in memory and write to STAC when the user explicitly saves or the plot closes. Lower I/O but risks data loss if the application crashes or the webview is closed unexpectedly.
3. **Debounced write** — Write after a short delay (e.g., 2 seconds) following the last draw event. Compromise between I/O and reliability.

Immediate write-on-create is chosen because:
- Constitution Article I.3 requires "no silent failures" — if persistence fails, the user should know immediately
- Constitution Article III.1 requires provenance "always" — delaying provenance recording increases the risk of loss
- The offline-first architecture means writes are to local disk, so performance impact is negligible
- The existing `handleShapeCreated` callback in both `App.tsx` and `mapView.tsx` is the natural integration point

**Write flow**:
1. `handleShapeCreated()` receives GeoJSON + mode from drawing event
2. `createDrawnFeature()` converts to schema-compliant feature with provenance metadata embedded in properties
3. Feature is added to session state (immediate UI update)
4. `stacService.addFeatures()` is called to persist the feature
5. `stacService.appendProvenance()` is called to record the provenance log entry
6. If write fails: feature remains in session state, non-blocking notification shown

**Alternatives considered**: Batch-on-save (data loss risk), debounced (complexity without benefit for local disk writes).

## R4: Provenance Metadata Structure

**Decision**: Embed provenance as an array entry in `feature.properties.provenance`, following the pattern established by feature 071 (Log Recording Service).

**Rationale**: The existing `appendProvenance()` method in stacService already supports this pattern:

```json
{
  "properties": {
    "kind": "POLY",
    "provenance": [
      {
        "source": "user-drawn",
        "timestamp": "2026-02-14T10:30:00Z",
        "operator": "analyst-1",
        "action": "created"
      }
    ]
  }
}
```

Key fields:
- `source`: Always `"user-drawn"` for shapes created via drawing tools (distinguishes from `"imported"`, `"calculated"`, etc.)
- `timestamp`: ISO 8601 UTC timestamp at creation time
- `operator`: User identifier from config service, falling back to `"unknown"` if unavailable
- `action`: `"created"` for initial drawing, `"deleted"` for removal (future)

This aligns with Constitution Article III.1 (provenance always) and III.3 (audit trail immutable — provenance entries are appended, never modified).

**Alternatives considered**:
- Separate provenance file per feature (too many files, harder to query)
- STAC Item-level provenance (too coarse — need per-feature granularity)
- Custom metadata field outside provenance (inconsistent with existing pattern)

## R5: Cursor Crosshair Implementation

**Decision**: Apply CSS `cursor: crosshair` to the Leaflet container element when `drawingMode` is non-null, managed via the `LeafletToolbar` component.

**Rationale**: Two approaches were evaluated:

1. **CSS class on `.leaflet-container`** — Toggle a class like `.debrief-drawing-active` that sets `cursor: crosshair`. Simple, no runtime overhead, works with existing theme system.
2. **Leaflet's cursor API / Geoman cursor** — Geoman may set its own cursor styles. Need to verify whether Geoman already handles this or if it needs supplementing.

Research into Geoman's behaviour:
- Geoman does change the cursor during some draw modes (particularly for point placement) via its own CSS
- However, the cursor behaviour is inconsistent across modes and may not apply in all cases (e.g., may not set crosshair during polygon vertex placement between clicks)
- Adding an explicit CSS class ensures consistent crosshair behaviour across all four modes

Implementation: The `ToolbarControl` class in `LeafletToolbar.tsx` already toggles `--active` class on the draw trigger button. Extend this to also toggle a `debrief-drawing-active` class on the map container when drawing mode changes. The CSS rule:

```css
.leaflet-container.debrief-drawing-active {
  cursor: crosshair;
}
```

**Alternatives considered**: Relying solely on Geoman cursor (inconsistent across modes), JavaScript `setCursor()` calls (unnecessary complexity when CSS suffices).

## R6: I18N Approach for Guidance Strings

**Decision**: Extract all user-facing guidance strings to a constants file (`drawingGuidance.ts`) as a typed record. No translation infrastructure yet, but strings are centralised and ready for future i18n integration.

**Rationale**: Constitution Article XI.1 requires user-facing strings to be "externalisable for translation". The current codebase has no i18n infrastructure — all strings are inline. Introducing a full i18n library (e.g., `i18next`, `react-intl`) for this feature alone would violate Article IX.1 (minimal dependencies).

The pragmatic approach:
1. Define a `DRAWING_GUIDANCE` record mapping `DrawingMode → { instruction: string, cancelHint: string }`
2. Export from `drawingGuidance.ts` in the drawing module
3. Consume in `DrawingGuidanceOverlay.tsx` via import
4. When a project-wide i18n solution is adopted, replace the constants with translation keys

**Alternatives considered**:
- Inline strings in JSX (not externalisable, violates XI.1)
- Full i18n library (premature, violates IX.1 for a single feature)
- JSON resource files (unnecessary indirection without a loader)

## R7: Notification Pattern for Persistence Failures

**Decision**: Reuse the existing `logNotification` state pattern from `App.tsx` — set a notification message string that auto-clears after a timeout.

**Rationale**: The codebase already has a lightweight notification pattern:
- `App.tsx` line 126: `const [logNotification, setLogNotification] = useState<string | null>(null);`
- Messages are set and auto-cleared with `setTimeout(() => setLogNotification(null), 3000)`
- This pattern exists in both `App.tsx` (web-shell) and can be replicated in `mapView.tsx` (VS Code webview)

For persistence failures, the flow:
1. `stacService.addFeatures()` throws an error
2. The error is caught in the `handleShapeCreated` callback
3. `setLogNotification('Failed to save shape — it will be retried on next save')` is called
4. The shape remains in session state (visible on map) for the current session
5. Auto-clear after 5 seconds (longer than the 3-second default to ensure visibility)

No dedicated notification/toast component is needed — the existing inline message pattern suffices.

**Alternatives considered**:
- VS Code `window.showWarningMessage()` (only works in extension context, not in web-shell)
- Dedicated toast component (over-engineering for a single notification case)
- Console-only logging (violates Constitution I.3 — no silent failures)

## R8: Drawing Palette State Management

**Decision**: Track the palette index as a counter in the session-state Zustand store (ephemeral, non-persistent). Increment on each shape creation.

**Rationale**: The palette index needs to:
- Survive component re-renders (not local component state)
- Not persist across sessions (a fresh session starts at index 0)
- Be accessible from the `createDrawnFeature()` call site

Options evaluated:
1. **Zustand slice field** — Add `drawingPaletteIndex: number` to the spatial slice. Ephemeral (not serialised). Incremented by `handleShapeCreated`.
2. **Module-level counter** — A simple `let paletteIndex = 0` in `drawingPalette.ts`. Simpler, but resets if the module is re-imported (hot reload scenarios).
3. **Derived from feature count** — Count existing drawn features in the collection and use that as the index. Correct after reload but coupled to feature count (deletions would shift colours).

Zustand slice field is chosen because:
- It follows the existing pattern (`drawingMode` is already in the spatial slice)
- It naturally resets when the session reloads
- It is independent of feature count (deletions don't affect the next colour)
- The `createDrawnFeature()` function can accept the colour via its `options` parameter (style override), keeping the function pure

**Alternatives considered**: Module counter (fragile on hot reload), derived from feature count (deletion sensitivity).
