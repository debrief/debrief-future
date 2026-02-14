# LinkedIn Post: Feature Format Menu

**Type**: Shipped Post
**Date**: 2026-02-14
**Feature**: 097-feature-format-menu

---

Shipped: format menus for maritime plot features.

Every feature row in the Layers panel now has a format icon. Click it, change the colour of a track. Adjust line weight. Switch a waypoint symbol to diamond. Pick from 16 naval tactical colours or line weights from 1-8 pixels.

Tracks expand to show individual positions. Each position gets its own format icon. Change one waypoint to red while the rest stay blue. Per-point overrides persist even when you later change the track's overall style.

Select multiple features and format them together. The menu shows only properties that work for everything selected — line-specific options grey out when points are in the mix, with tooltips explaining why.

Technical highlights:
- CascadingMenu component: hover-cascade submenus, 150ms delay, keyboard navigation, viewport repositioning
- Property mapping covers all 12 feature types
- Dependency injection for testability (formatService accepts mock stacService)
- 43 unit tests, full 534-test regression suite passes
- Every change records previous value in provenance log

The tricky bit was viewport repositioning. Menus near screen edges reposition both axes independently to stay visible. Per-point overrides required nullable schema fields to distinguish "use default" from "explicitly hide" from "use this value".

Format menus are complete. Next up: context-sensitive tool invocation with the same cascading menu pattern for parameter selection.

#Maritime #Geospatial #DeveloperTools #OpenSource

---

**Link**: [Blog post URL when published]
