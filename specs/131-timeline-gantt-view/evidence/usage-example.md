# Usage Example: Timeline/Gantt View with Temporal Filtering

## Basic Usage

```tsx
import { TimelineView } from '@debrief/components';
import type { StacBrowserItem } from '@debrief/components/filter-engine';

const exercises: StacBrowserItem[] = [
  {
    id: 'exercise-alpha',
    title: 'Exercise Alpha',
    itemPath: 'exercises/alpha/item.json',
    bbox: [-5.5, 49.5, 1.5, 52.0],
    datetime: '2024-03-15T08:00:00Z',
    startDatetime: '2024-03-15T08:00:00Z',
    endDatetime: '2024-03-17T18:00:00Z',
    vesselClasses: ['submarine/nuclear'],
    tags: ['nato-exercise'],
    featureTags: [],
    author: 'J. Smith',
    trackNames: ['ALPHA-01'],
    nationalities: ['GB'],
    collection: null,
  },
  // ... more exercises
];

function BrowserPanel() {
  return (
    <TimelineView
      items={exercises}
      onTemporalFilterChange={(filter) => {
        if (filter) {
          console.log(`Filter: ${new Date(filter.start).toISOString()} – ${new Date(filter.end).toISOString()}`);
        } else {
          console.log('No temporal filter (full range)');
        }
      }}
      onItemSelect={(itemPath) => {
        console.log('Open exercise:', itemPath);
      }}
    />
  );
}
```

## With Colour Scheme

```tsx
import type { ColourFn } from '@debrief/components';

const colourByVesselClass: ColourFn = (item) => {
  if (item.vesselClasses.some(vc => vc.startsWith('submarine'))) return '#e74c3c';
  if (item.vesselClasses.some(vc => vc.startsWith('surface'))) return '#3498db';
  return null; // default colour
};

<TimelineView
  items={exercises}
  colourFn={colourByVesselClass}
  onTemporalFilterChange={handleFilter}
/>
```

## With Filter State Integration

```tsx
import { itemOverlapsFilter } from '@debrief/components/utils/timeline-helpers';

function FilteredBrowser({ allItems }) {
  const [temporalFilter, setTemporalFilter] = useState(null);

  // Apply temporal filter to list/map views
  const filteredItems = temporalFilter
    ? allItems.filter(item => itemOverlapsFilter(item, temporalFilter))
    : allItems;

  return (
    <div>
      <TimelineView
        items={allItems}
        onTemporalFilterChange={setTemporalFilter}
      />
      <ListView items={filteredItems} />
      <MapView items={filteredItems} />
    </div>
  );
}
```

## Storybook

The component is available in Storybook under **Browser > TimelineView** with these stories:

| Story | Description |
|-------|-------------|
| Default | 10 exercises spanning 2022–2025 |
| WithBrush | Interactive brush with filter state display |
| Empty | No exercises (empty state) |
| SingleDatetime | Point markers for single-datetime items |
| ManyItems | 100+ exercises (scroll test) |
| MixedMetadata | Range, single-datetime, and no-time-data items |
| WithColourScheme | Colour function applied to bars |
