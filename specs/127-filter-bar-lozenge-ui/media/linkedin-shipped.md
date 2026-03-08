Shipped the filter bar for Future Debrief's STAC Browser.

Analysts compose metadata queries by adding pill-shaped lozenges — one per filter condition. Ten filter types, each with the right input method: hierarchical dropdown for vessel class, flat dropdowns for tags and nationality, free-text for title search, fixed buckets for duration.

AND logic by default between lozenges. For OR logic, create a group container and drag lozenges into it. The entire state serialises to CQL2 JSON for persistence.

64 tests, 12 source files, 7 Storybook stories. Built with React, TypeScript, and @dnd-kit for accessible drag-and-drop.

Part of Epic E08 (STAC Stack Browser Discovery UI) — the analyst-facing discovery interface for maritime tactical analysis.

[LINK]
