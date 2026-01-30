# Add STAC catalog overview panel with map and timeline in VS Code

## Problem

Users have no way to get an overview of what's stored in a STAC catalog without opening individual items one at a time. There's no spatial or temporal summary view showing all items in a collection.

## Proposed Solution

Double-clicking a STAC catalog in the VS Code explorer opens an editor panel showing:

1. **Map view** — displays spatial bounds/overview for each item in the collection
2. **Timeline view** — displays temporal range for each item (reuse existing shared time display component)
3. **Resizable layout** — horizontal drag bar between map and timeline panels
4. **Item navigation** — double-clicking an item on the map or timeline opens that asset in the existing plot view (same as opening from the STAC Catalog tree view)

### Prerequisites

- **Temporal metadata in `item.json`** — `start_datetime` and `end_datetime` properties must be written when assets are saved to the STAC store, so the overview panel can read them
- **Spatial bounds** — similarly updated at save time

### Panel Implementation

- Shown in the VS Code editor pane as a virtual document (in-memory, not file-based)
- Read-only initially (no delete/edit operations)

## Success Criteria

- Double-clicking a STAC catalog opens the overview panel
- Map shows spatial extent of all items in the collection
- Timeline shows temporal range of all items
- User can resize map/timeline via horizontal drag bar
- Double-clicking an item opens it in the existing plot view
- `item.json` files include `start_datetime`/`end_datetime` and spatial `bbox` properties

## Constraints

- Must work offline (local STAC catalog only)
- Reuse existing shared time display component where possible
- Panel is read-only (no mutation operations)

## Out of Scope

- Editing or deleting items from the overview panel
- Remote/cloud STAC catalog support
- Filtering or search within the overview
