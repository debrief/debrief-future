# Quickstart: List View with Spatial Thumbnails

**Feature**: 129-list-view-thumbnails
**Date**: 2026-03-06

## Prerequisites

- Node.js 18+ with pnpm
- Feature #125 (STAC extension mock data) merged — provides fixture items with `debrief:*` properties
- Feature #126 (CQL2 filter engine) merged — provides filter evaluation for dynamic list updates

## Development Workflow

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start Storybook for component development

```bash
cd shared/components
pnpm storybook
```

Storybook opens at `http://localhost:6006`. Use the theme toolbar (light/dark/vscode) to test all theme variants.

### 3. Create the ExerciseListView component

Location: `shared/components/src/ExerciseListView/`

```
ExerciseListView/
├── ExerciseListView.tsx          # Main list container with virtualisation
├── ExerciseListView.css          # CSS with VS Code custom property theming
├── ExerciseListItemRow.tsx       # Single exercise row (metadata + thumbnail)
├── SpatialThumbnail.tsx          # SVG thumbnail rendered from GeoJSON
├── SortControl.tsx               # Sort dimension + direction control
├── RecentlyOpenedSection.tsx     # Prominent recent items section
├── types.ts                      # ExerciseListItem, SortConfiguration types
├── utils.ts                      # Duration formatting, sort comparators
├── ExerciseListView.test.tsx     # Unit tests
├── ExerciseListView.stories.tsx  # Storybook stories
└── index.ts                      # Public exports
```

### 4. Key patterns to follow

**Virtualisation** (from FeatureList):
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: sortedItems.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 80, // estimated row height in px
});
```

**Theme CSS variables** (from CatalogOverview):
```css
.exercise-list {
  --el-bg: var(--vscode-editor-background, #1e1e1e);
  --el-fg: var(--vscode-editor-foreground, #cccccc);
  --el-accent: var(--vscode-focusBorder, #007fd4);
  --el-hover: var(--vscode-list-hoverBackground, #2a2d2e);
}
```

**Sort comparators**:
```tsx
const comparators: Record<SortDimension, (a: ExerciseListItem, b: ExerciseListItem) => number> = {
  recency: (a, b) => compareDate(b.startDatetime ?? b.datetime, a.startDatetime ?? a.datetime),
  title: (a, b) => a.title.localeCompare(b.title),
  duration: (a, b) => (computeDuration(b) ?? 0) - (computeDuration(a) ?? 0),
};
```

### 5. Run tests

```bash
# Unit tests
cd shared/components
pnpm test

# Type checking
pnpm typecheck

# Lint
pnpm lint
```

### 6. Storybook stories to create

| Story | Purpose | Data |
|-------|---------|------|
| `Default` | Full list with 100 mock items, default sort | 100 fixture items |
| `WithRecentItems` | List with 5 recently opened exercises | 100 items + 5 recent |
| `EmptyState` | No exercises in store | Empty array |
| `NoMatches` | Filters exclude all items | Empty filtered result |
| `LightTheme` | Theme variant | Standard items + light theme decorator |
| `SortByTitle` | Alphabetical sort active | 100 items, title sort |
| `SortByDuration` | Duration sort active | 100 items, duration sort |
| `FewItems` | Short list without virtualisation | 5 items |

### 7. Export from shared/components

Add to `shared/components/src/index.ts`:
```tsx
export { ExerciseListView } from './ExerciseListView';
export type { ExerciseListViewProps, ExerciseListItem, SortConfiguration } from './ExerciseListView';
```

## Key Design Decisions

1. **Thumbnails are SVG** rendered client-side from GeoJSON track data — no pre-generated images
2. **Sort state is component-local** — not in Zustand; it's UI state, not document state
3. **Recent items come from extension host** via postMessage, using existing `RecentPlotsService`
4. **Virtualised scrolling** via `@tanstack/react-virtual` for 100+ items
5. **Filter integration** consumes filtered item IDs from shared filter state (via props/context)

## Verification

Before pushing, run the full CI check:

```bash
task verify
```

Or manually:
```bash
uv run ruff check . && pnpm lint
uv run pyright && pnpm -r typecheck
uv run pytest && pnpm --filter '!@debrief/web-shell' test
```
