Drawing a shape on a maritime analysis plot should be one click to choose the geometry, then draw. Not a mode picker, a toolbar scan, a settings panel.

We're replacing Future Debrief's proof-of-concept draw button with a proper shape palette -- a '+' button that opens a dropdown of four geometry types (Point, Rectangle, Polygon, Polyline). Select one, draw it on the map, and the toolbar resets automatically. Single-shot by design: each shape is a deliberate action.

One implementation detail that turned out to matter: the toolbar is a vanilla Leaflet control, not a React component. Rather than bridge React into Leaflet's imperative DOM (fragile), the dropdown uses the same native DOM pattern as the existing toolbar buttons. Drawing state lives in the Zustand session store as an ephemeral field -- survives re-renders, never hits disk, stays out of undo history.

This is the entry point for Epic E05 (Shape Drawing Tools). Downstream features handle persistence; this one handles the interaction mechanics.

https://debrief.github.io/blog/2026/02/13/planning-drawing-toolbar-shape-palette

#FutureDebrief #MaritimeAnalysis #OpenSource
