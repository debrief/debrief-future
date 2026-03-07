# Usage Example: Colour Scheme Engine (#134)

## Compute colours for exercises by Vessel Class

```typescript
import {
  computeColourAssignment,
  defaultPalette,
  builtInDimensions,
  ColourLegend,
  ColourDimensionSelector,
} from '@debrief/components/colour-engine';

// Select the "vessel-class" dimension
const dimension = builtInDimensions.find(d => d.id === 'vessel-class')!;

// Compute colour assignments for a set of STAC items
const assignment = computeColourAssignment(items, dimension, defaultPalette);

// Pass to map view (#130) — pre-computed Map<string, string>
<CatalogOverview items={items} colorMap={assignment.colorMap} />

// Pass to timeline view (#131) — function (item) => string | null
<TimelineView items={items} colourFn={assignment.colourFn} />

// Render the legend
<ColourLegend
  legend={assignment.legend}
  unclassifiedColour={defaultPalette.unclassifiedColour}
/>
```

## Default colour (no dimension active)

```typescript
import { getDefaultColourAssignment, defaultPalette } from '@debrief/components/colour-engine';

const assignment = getDefaultColourAssignment(items, defaultPalette);
// All items get defaultPalette.defaultColour (#5B8DEF)
// assignment.legend is null — no legend rendered
```

## Add a custom dimension

```typescript
import type { ColourDimension } from '@debrief/components/colour-engine';

const exerciseTypeDimension: ColourDimension = {
  id: 'exercise-type',
  label: 'Exercise Type',
  type: 'categorical',
  resolve: (item) => item.collection ?? null,
};

// Add to the registry for the selector
const allDimensions = [...builtInDimensions, exerciseTypeDimension];

<ColourDimensionSelector
  dimensions={allDimensions}
  activeDimensionId={activeDimensionId}
  onDimensionChange={setActiveDimensionId}
/>
```

## Expected output

When "Vessel Class" is selected with 3 frigates, 2 destroyers, and 1 submarine:

- **colorMap**: `Map { "item-1" => "#4477AA", "item-2" => "#4477AA", "item-3" => "#EE6677", ... }`
- **legend.entries**: `[{label: "frigate", colour: "#4477AA", count: 3}, {label: "destroyer", colour: "#EE6677", count: 2}, {label: "submarine", colour: "#228833", count: 1}]`
- **colourFn(item)**: returns the same colour as `colorMap.get(item.id)`
