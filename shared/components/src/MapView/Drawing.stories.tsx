import type { Meta, StoryObj } from '@storybook/react';
import { useState, useCallback } from 'react';
import type { DebriefFeature } from '../utils/types';
import type { DrawingMode } from './LeafletToolbar';
import { MapView } from './MapView';
import { ThemeProvider } from '../ThemeProvider';
import { createDrawnFeature } from './drawing';

const meta: Meta = {
  title: 'Components/MapView/Drawing',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Shape drawing on the map via the custom toolbar shape palette. ' +
          'Demonstrates createDrawnFeature() converting Geoman output to schema-compliant GeoJSON ' +
          'for all four shape types: Point, Rectangle, Polygon, and Polyline. ' +
          'Part of E05: Shape Drawing Tools (Features 094, 095).',
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj;

/**
 * Interactive drawing demo for all four shape types.
 *
 * 1. Click the '+' button in the toolbar to open the shape palette
 * 2. Select "Point" — click on the map to place a point marker
 * 3. Select "Rectangle" — click and drag on the map to draw a rectangle
 * 4. Select "Polygon" — click to place vertices, double-click to close
 * 5. Select "Polyline" — click to place vertices, double-click to finish
 *
 * Drawn features appear in the list below the map with full schema details.
 * The most recently drawn feature is auto-selected (highlighted on map).
 */
export const AllShapes: Story = {
  render: function AllShapesStory() {
    const [features, setFeatures] = useState<DebriefFeature[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [drawingMode, setDrawingMode] = useState<DrawingMode>(null);
    const [lastRawGeojson, setLastRawGeojson] = useState<object | null>(null);

    const handleShapeCreated = useCallback(
      (geojson: GeoJSON.Feature, mode: DrawingMode) => {
        setLastRawGeojson(geojson);
        const feature = createDrawnFeature(geojson, mode);
        if (feature) {
          setFeatures((prev) => [...prev, feature as DebriefFeature]);
          setSelectedIds(new Set([feature.id]));
        }
      },
      [],
    );

    const handleSelect = useCallback((featureId: string) => {
      setSelectedIds(new Set([featureId]));
    }, []);

    const handleBackgroundClick = useCallback(() => {
      setSelectedIds(new Set());
    }, []);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ height: 500, position: 'relative' }}>
          <MapView
            features={features}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onBackgroundClick={handleBackgroundClick}
            drawingMode={drawingMode}
            onDrawingModeChange={setDrawingMode}
            onShapeCreated={handleShapeCreated}
            autoFitBounds={false}
            initialCenter={[50.4, -4.1]}
            initialZoom={12}
            height={500}
          />
        </div>

        {/* Feature list */}
        <div data-testid="drawn-features-list">
          <h4 style={{ margin: '0 0 8px' }}>
            Drawn Features ({features.length})
          </h4>
          {features.length === 0 && (
            <p style={{ color: '#888', fontSize: 13 }}>
              Click '+' in the toolbar, then select a shape type to start drawing.
            </p>
          )}
          {features.map((f) => (
            <div
              key={f.id}
              onClick={() => handleSelect(f.id)}
              data-testid={`feature-${f.id}`}
              style={{
                padding: '8px 12px',
                marginBottom: 4,
                background: selectedIds.has(f.id) ? '#e3f2fd' : '#f5f5f5',
                border: selectedIds.has(f.id) ? '2px solid #1976D2' : '1px solid #ddd',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              <strong>{(f.properties as Record<string, unknown>).kind as string}</strong>
              {' — '}
              {(f.properties as Record<string, unknown>).name as string ??
                (f.properties as Record<string, unknown>).label as string ??
                f.id}
              <span style={{ color: '#888', marginLeft: 8 }}>
                [{f.geometry.type}]
              </span>
            </div>
          ))}
        </div>

        {/* JSON inspector for schema verification */}
        {lastRawGeojson && (
          <details data-testid="json-inspector">
            <summary style={{ cursor: 'pointer', fontSize: 13, color: '#666' }}>
              Last drawn feature JSON (schema inspector)
            </summary>
            <pre
              style={{
                background: '#1e1e1e',
                color: '#d4d4d4',
                padding: 12,
                borderRadius: 4,
                fontSize: 11,
                maxHeight: 200,
                overflow: 'auto',
                marginTop: 4,
              }}
            >
              {features.length > 0
                ? JSON.stringify(features[features.length - 1], null, 2)
                : 'No features yet'}
            </pre>
          </details>
        )}
      </div>
    );
  },
};
