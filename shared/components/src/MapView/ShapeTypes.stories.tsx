import type { Meta, StoryObj } from '@storybook/react';
import { MapView } from './MapView';
import { ThemeProvider } from '../ThemeProvider';
import type { DebriefFeatureCollection } from '../utils/types';

// Import generated fixture
import allShapesData from '../fixtures/all-shapes.json';

const meta: Meta<typeof MapView> = {
  title: 'Components/MapView/ShapeTypes',
  component: MapView,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
Demonstrates all 15+ annotation shape types parsed from REP files.

**Shape Types Shown:**
- **Basic**: CIRCLE, RECTANGLE, LINE, VECTOR, TEXT, NARRATIVE
- **Phase 2**: POLY, POLYLINE, ELLIPSE, ELLIPSE2, TIMETEXT, PERIODTEXT, WHEEL
- **Phase 3**: DYNAMIC_RECT, DYNAMIC_CIRCLE, DYNAMIC_POLY, SENSOR, SENSOR2, TMA_POS, TRACKSPLIT

This story uses a generated GeoJSON fixture from \`services/io/tests/fixtures/valid/shapes.rep\`.
Regenerate with: \`uv run python services/io/scripts/generate-storybook-fixtures.py\`
        `,
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div style={{ height: '100vh' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MapView>;

// Type assertion for the imported JSON
// Filter out features with null geometry (TRACKSPLIT, etc.) which can't be rendered on the map
const rawData = allShapesData as unknown as DebriefFeatureCollection;
const shapesFeatureCollection: DebriefFeatureCollection = {
  type: 'FeatureCollection',
  features: rawData.features.filter((f) => f.geometry !== null),
};

// Count shapes by kind for display
const shapeCounts = shapesFeatureCollection.features.reduce(
  (acc, f) => {
    const kind = (f.properties as { kind?: string })?.kind ?? 'unknown';
    acc[kind] = (acc[kind] ?? 0) + 1;
    return acc;
  },
  {} as Record<string, number>
);

const shapeCountDisplay = Object.entries(shapeCounts)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([kind, count]) => `${kind}: ${count}`)
  .join(', ');

export const AllShapes: Story = {
  args: {
    features: shapesFeatureCollection,
    height: '100%',
  },
  parameters: {
    docs: {
      description: {
        story: `
All annotation shapes parsed from the test REP file.

**Feature counts:** ${shapeCountDisplay}

**Total features:** ${shapesFeatureCollection.features.length}
        `,
      },
    },
  },
};

// Filter by shape category (already excludes null geometries via shapesFeatureCollection)
function filterByKinds(kinds: string[]): DebriefFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: shapesFeatureCollection.features.filter((f) =>
      kinds.includes((f.properties as { kind?: string })?.kind ?? '')
    ),
  };
}

export const BasicShapes: Story = {
  args: {
    features: filterByKinds(['CIRCLE', 'RECTANGLE', 'LINE', 'VECTOR', 'TEXT', 'NARRATIVE']),
    height: '100%',
  },
  parameters: {
    docs: {
      description: {
        story: 'Basic annotation shapes: CIRCLE, RECTANGLE, LINE, VECTOR, TEXT, NARRATIVE',
      },
    },
  },
};

export const Phase2Shapes: Story = {
  args: {
    features: filterByKinds(['POLY', 'POLYLINE', 'ELLIPSE', 'ELLIPSE2', 'TIMETEXT', 'PERIODTEXT', 'WHEEL']),
    height: '100%',
  },
  parameters: {
    docs: {
      description: {
        story: 'Phase 2 annotation shapes: POLY, POLYLINE, ELLIPSE, ELLIPSE2, TIMETEXT, PERIODTEXT, WHEEL',
      },
    },
  },
};

export const DynamicShapes: Story = {
  args: {
    features: filterByKinds(['DYNAMIC_RECT', 'DYNAMIC_CIRCLE', 'DYNAMIC_POLY']),
    height: '100%',
  },
  parameters: {
    docs: {
      description: {
        story: 'Dynamic annotation shapes with timestamps and group names: DYNAMIC_RECT, DYNAMIC_CIRCLE, DYNAMIC_POLY',
      },
    },
  },
};

export const SensorShapes: Story = {
  args: {
    features: filterByKinds(['SENSOR', 'SENSOR2', 'TMA_POS']),
    height: '100%',
  },
  parameters: {
    docs: {
      description: {
        story: 'Sensor-related annotation shapes: SENSOR, SENSOR2, TMA_POS (target motion analysis)',
      },
    },
  },
};

export const EllipseVariants: Story = {
  args: {
    features: filterByKinds(['ELLIPSE', 'ELLIPSE2', 'TMA_POS']),
    height: '100%',
  },
  parameters: {
    docs: {
      description: {
        story: 'Ellipse-based shapes showing different orientations and sizes: ELLIPSE, ELLIPSE2, TMA_POS (which uses ellipse uncertainty regions)',
      },
    },
  },
};

export const TextShapes: Story = {
  args: {
    features: filterByKinds(['TEXT', 'TIMETEXT', 'PERIODTEXT', 'NARRATIVE']),
    height: '100%',
  },
  parameters: {
    docs: {
      description: {
        story: 'Text-based annotation shapes: TEXT, TIMETEXT, PERIODTEXT, NARRATIVE',
      },
    },
  },
};
