# Quickstart: Colour Scheme Engine (#134)

**Branch**: `134-colour-scheme-engine`

## What This Feature Does

Adds a configurable colour dimension selector and shared legend to the Discovery UI. Exercises on the map and timeline can be coloured by Age, Vessel Class, or Tag. The legend explains the current encoding.

## Key Files

```
shared/components/src/colour-engine/
├── index.ts                    # Public API exports
├── types.ts                    # ColourDimension, LegendModel, etc.
├── palette.ts                  # Default 12-colour palette + gradient stops
├── engine.ts                   # computeColourAssignment, getDefaultAssignment
├── dimensions/
│   ├── age.ts                  # Age dimension (gradient)
│   ├── vessel-class.ts         # Vessel Class dimension (categorical)
│   └── tag.ts                  # Tag dimension (categorical)
├── registry.ts                 # Built-in dimension registry
├── ColourDimensionSelector.tsx  # Dropdown selector component
├── ColourDimensionSelector.css
├── ColourLegend.tsx            # Legend component (gradient + categorical)
├── ColourLegend.css
├── ColourLegend.stories.tsx    # Storybook stories
└── __tests__/
    ├── engine.test.ts          # Core engine unit tests
    ├── palette.test.ts         # Palette generation tests
    ├── dimensions.test.ts      # Dimension resolve function tests
    └── ColourLegend.test.tsx   # Legend component rendering tests
```

## How to Use

### 1. Compute colours for items

```typescript
import { computeColourAssignment, defaultPalette, builtInDimensions } from '../colour-engine';

// Select the "vessel-class" dimension
const dimension = builtInDimensions.find(d => d.id === 'vessel-class')!;
const assignment = computeColourAssignment(items, dimension, defaultPalette);

// Pass to map (#130)
<CatalogOverview items={items} colorMap={assignment.colorMap} />

// Pass to timeline (#131)
<TimelineView items={items} colourFn={assignment.colourFn} />

// Render legend
<ColourLegend legend={assignment.legend} unclassifiedColour={defaultPalette.unclassifiedColour} />
```

### 2. No dimension active (default)

```typescript
import { getDefaultColourAssignment, defaultPalette } from '../colour-engine';

const assignment = getDefaultColourAssignment(items, defaultPalette);
// All items get defaultPalette.defaultColour, legend is null
```

### 3. Add a custom dimension

```typescript
import type { ColourDimension } from '../colour-engine';

const exerciseTypeDimension: ColourDimension = {
  id: 'exercise-type',
  label: 'Exercise Type',
  type: 'categorical',
  resolve: (item) => item.collection ?? null,
};

// Add to registry
const extendedDimensions = [...builtInDimensions, exerciseTypeDimension];
```

## Running Tests

```bash
# Unit tests for the colour engine
pnpm --filter @debrief/components test -- --grep colour-engine

# Storybook (visual verification)
pnpm --filter @debrief/components storybook
# Navigate to "Colour Engine" section
```

## Dependencies

- **Consumes**: `StacBrowserItem` from `filter-engine/types.ts`
- **Consumed by**: `CatalogOverview` (#130) via `colorMap` prop, `TimelineView` (#131) via `colourFn` prop
- **No external dependencies**: Palette and interpolation are hand-rolled (Constitution Art. IX)
