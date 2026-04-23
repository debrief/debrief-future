## What We're Building

The Geoman integration from #092 gave us a single proof-of-concept draw button. That was enough to prove the library works inside our Leaflet map. Now we're replacing it with something analysts can actually use: a '+' button on the map toolbar that opens a dropdown with four shape options -- Point, Rectangle, Polygon, and Polyline. Pick one, draw it, done. The toolbar returns to its default state after each shape.

Drawing mode is tracked as ephemeral state in the session-state Zustand store. "Ephemeral" means it survives component re-renders (so the time slider updating mid-draw doesn't cancel your polygon) but is never persisted to disk or included in undo history. It's UI state, not data.

## How It Fits

This is the first real feature in Epic E05 (Shape Drawing Tools). It handles entering and exiting drawing mode -- the shape palette and state management. The actual persistence of drawn shapes is handled by downstream features #094 (point/rectangle) and #095 (polygon/polyline). That split keeps this feature focused on interaction mechanics rather than data management.

## Key Decisions

- **Ephemeral state in SpatialSlice**: Drawing mode lives alongside viewport and rotation in the spatial slice. It's excluded from persistence, undo tracking, and dirty detection via the existing ephemeral field patterns.
- **Geometry-oriented naming**: The store uses 'point', 'polyline', 'rectangle', 'polygon'. Geoman uses 'Marker', 'Line', 'Rectangle', 'Polygon'. A constant lookup table isolates the third-party naming from application state.
- **Leaflet DOM dropdown, not React bridge**: The toolbar is a vanilla Leaflet control. Rather than mount a React component inside it (which requires createRoot bridging), the dropdown uses the same L.DomUtil.create() pattern as existing buttons.
- **Single-shot drawing**: After completing a shape, drawing mode resets to null. Each shape is a deliberate action -- no accidental second polygon because you forgot to exit drawing mode.
- **Geoman's pm:drawend for state reset**: Geoman handles Escape natively but doesn't fire an event for it. The pm:drawend event fires whenever drawing mode exits for any reason, giving the toolbar a reliable signal to update.
