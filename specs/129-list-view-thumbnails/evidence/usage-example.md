# Usage Example: ExerciseListView

## Basic Usage

```tsx
import { ExerciseListView } from '@debrief/components';
import type { ExerciseListItem, RecentlyOpenedEntry } from '@debrief/components';

function MyBrowser() {
  const items: ExerciseListItem[] = [
    {
      id: 'exercise-001',
      title: 'Exercise Neptune',
      itemPath: 'exercises/neptune/item.json',
      bbox: [-5.5, 49.5, 1.5, 52.0],
      datetime: '2024-03-15T08:00:00Z',
      startDatetime: '2024-03-15T08:00:00Z',
      endDatetime: '2024-03-17T18:00:00Z',
      vesselClasses: ['Destroyer', 'Submarine'],
      tags: ['training', 'anti-submarine'],
      author: 'Jane Smith',
      nationalities: ['GB', 'US'],
      trackNames: ['HMS Defender', 'USS Enterprise'],
      trackDataHref: 'exercises/neptune/data.geojson',
    },
  ];

  const recentItems: RecentlyOpenedEntry[] = [
    {
      plotId: 'exercise-001',
      title: 'Exercise Neptune',
      storeId: 'local-store',
      lastOpened: new Date(Date.now() - 3600000).toISOString(),
      uri: 'debrief://store/local/exercises/neptune/item.json',
    },
  ];

  return (
    <ExerciseListView
      items={items}
      recentItems={recentItems}
      onItemSelect={(path) => console.log('Open:', path)}
      initialSort={{ dimension: 'recency', direction: 'desc' }}
      height={600}
    />
  );
}
```

## Component API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `ExerciseListItem[]` | Required | Exercise items to display |
| `recentItems` | `RecentlyOpenedEntry[]` | `[]` | Recently opened items |
| `onItemSelect` | `(path: string) => void` | — | Called when an item is clicked |
| `initialSort` | `SortConfiguration` | `{dimension: 'recency', direction: 'desc'}` | Initial sort state |
| `onRequestTrackData` | `(id, href) => void` | — | Lazy GeoJSON load callback |
| `trackData` | `Map<string, FeatureCollection>` | — | Loaded track data |
| `className` | `string` | — | Additional CSS class |
| `height` | `number` | `'100%'` | Container height in pixels |

## Exported Utilities

```tsx
import {
  computeDuration,
  formatDuration,
  formatDateRange,
  formatRelativeTime,
  sortComparators,
} from '@debrief/components';

// Duration
const ms = computeDuration({ startDatetime: '...', endDatetime: '...' });
const label = formatDuration(ms); // "2 days"

// Date range
formatDateRange('2024-01-12T00:00:00Z', '2024-01-14T00:00:00Z', null);
// → "12 Jan 2024 – 14 Jan 2024"

// Relative time
formatRelativeTime('2024-06-15T10:00:00Z'); // "2 hours ago"
```

## Storybook Stories

Available at: `Components/ExerciseListView`

| Story | Description |
|-------|-------------|
| Default | 100 items with lazy-loaded thumbnails |
| WithRecentItems | Recent section at top |
| EmptyState | No exercises message |
| SortByTitle | Alphabetical sorting |
| SortByDuration | Duration sorting |
| FewItems | 5-item short list |
| LightTheme | Light theme variant |
