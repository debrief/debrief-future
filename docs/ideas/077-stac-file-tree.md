# STAC File Tree Component

## Problem
There is no way to visualize the STAC catalog's filesystem structure in the UI. When snapshots (#074) or tool results (#040) create new files, users cannot see what changed in the store. Additionally, there is no browser-friendly way to browse and open plots from the STAC catalog tree.

## Proposed Solution
1. **StacFileTree component** in `shared/components/` — a collapsible tree view rendering STAC catalog directory structure (catalogs, collections, items, assets)
2. **In-memory filesystem** via `memfs` — provides a full Node.js `fs` API in the browser, pre-loadable from fixture data for Storybook and web-shell
3. **Change highlighting** — new/modified files are visually indicated (e.g., after a snapshot is created)
4. **Plot opening** — double-click a STAC Item in the tree to open it in the current session
5. **Layout integration** — tree sits above the existing Activity/Log tab-panel in the sidebar, collapsible to save space

## Key Design Decisions
- **memfs** (Apache-2.0, 25M+ weekly downloads) as the in-memory filesystem — TypeScript native, browser-compatible, supports `fs.watch()`, full fs API
- Component lives in `shared/components/` for reuse across web-shell, Storybook, and future web UI
- Tree data derived from filesystem scan, not from STAC API — shows actual file layout
- Supports both real filesystem (VS Code extension via Node fs) and in-memory (web-shell/Storybook via memfs)

## Integration Points
- **Web-shell**: memfs Volume loaded from fixture data, tree above tab-panel
- **Storybook**: dedicated stories with pre-populated memfs volumes showing various catalog structures
- **VS Code extension** (future): backed by real filesystem, watches for changes

## Success Criteria
- StacFileTree component renders collapsible tree from a STAC catalog directory
- Works with both memfs (browser) and real fs (Node)
- New files from snapshots are visually highlighted
- Double-click STAC Item opens plot in session
- Storybook stories demonstrate all states (empty, populated, with highlights)
- Web-shell integrates tree above Activity/Log tabs

## Dependencies
- #074 (Snapshots — provides the snapshot creation that produces new files to visualize)
- #071 (Log Recording service — log entries trigger snapshot creation)

## Complexity
Medium
