/**
 * FormatMenuHarness — interactive Storybook story for Playwright E2E testing.
 *
 * Renders a FeatureList with format icons, opens FormatMenu on click,
 * and applies colour/style changes so the indicator bar updates.
 */

import { useState, useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FeatureList } from '../FeatureList';
import { FormatMenu } from './FormatMenu';
import { ThemeProvider } from '../ThemeProvider';
import type { DebriefFeature } from '../utils/types';

// ---------------------------------------------------------------------------
// Mock data — uses Record<string,unknown> to keep extra fields (style, color)
// that getFeatureColor() reads. We deliberately use untyped records so the
// story avoids fighting with the strict schema types.
// ---------------------------------------------------------------------------

function makeFeatures(): DebriefFeature[] {
  return [
    {
      type: 'Feature',
      id: 'track-alpha',
      geometry: {
        type: 'LineString',
        coordinates: [[-5, 50], [-4, 51]],
      },
      properties: {
        kind: 'TRACK',
        platform_id: 'PLT-001',
        platform_name: 'HMS Belfast',
        track_type: 'OWNSHIP',
        start_time: '2024-01-15T08:00:00Z',
        end_time: '2024-01-15T16:00:00Z',
        positions: [],
        // getFeatureColor() reads style.line.color for tracks
        style: { line: { color: '#0066cc' }, point: { shape: 'circle', radius: 5, fill_color: '#0066cc', color: '#0066cc' } },
      },
    },
    {
      type: 'Feature',
      id: 'track-bravo',
      geometry: {
        type: 'LineString',
        coordinates: [[-3, 52], [-2, 53]],
      },
      properties: {
        kind: 'TRACK',
        platform_id: 'PLT-002',
        platform_name: 'USS Enterprise',
        track_type: 'CONTACT',
        start_time: '2024-01-15T08:00:00Z',
        end_time: '2024-01-15T16:00:00Z',
        positions: [],
        style: { line: { color: '#cc0000' }, point: { shape: 'circle', radius: 5, fill_color: '#cc0000', color: '#cc0000' } },
      },
    },
    {
      type: 'Feature',
      id: 'track-charlie',
      geometry: {
        type: 'LineString',
        coordinates: [[-1, 54], [0, 55]],
      },
      properties: {
        kind: 'TRACK',
        platform_id: 'PLT-003',
        platform_name: 'HMS Victory',
        track_type: 'SOLUTION',
        start_time: '2024-01-15T08:00:00Z',
        end_time: '2024-01-15T16:00:00Z',
        positions: [],
        style: { line: { color: '#00cc66' }, point: { shape: 'circle', radius: 5, fill_color: '#00cc66', color: '#00cc66' } },
      },
    },
    {
      type: 'Feature',
      id: 'ref-delta',
      geometry: {
        type: 'Point',
        coordinates: [-2.5, 51.5],
      },
      properties: {
        kind: 'POINT',
        name: 'Alpha Point',
        location_type: 'WAYPOINT',
        valid_from: '2024-01-15T00:00:00Z',
        valid_until: '2024-01-15T23:59:59Z',
        // getFeatureColor() reads style.color for non-tracks, or props.color
        style: { color: '#ff9900' },
      },
    },
  ] as unknown as DebriefFeature[];
}

// ---------------------------------------------------------------------------
// Style update helper — sets a dot-path value inside properties.style
// e.g. property="line.color" → style.line.color = value
// e.g. property="color"      → style.color = value
// ---------------------------------------------------------------------------

function applyStyleChange(
  feature: DebriefFeature,
  property: string,
  value: string | number,
): DebriefFeature {
  const props = feature.properties as unknown as Record<string, unknown>;
  const oldStyle = (props.style ?? {}) as Record<string, unknown>;
  const newStyle = { ...oldStyle };

  const dotIndex = property.indexOf('.');
  if (dotIndex > 0) {
    // Compound path like "line.color" or "point.fill_color"
    const category = property.slice(0, dotIndex);
    const field = property.slice(dotIndex + 1);
    const oldCategory = (newStyle[category] ?? {}) as Record<string, unknown>;
    newStyle[category] = { ...oldCategory, [field]: value };
  } else {
    // Flat path like "color", "weight"
    newStyle[property] = value;
  }

  return {
    ...feature,
    properties: { ...props, style: newStyle },
  } as unknown as DebriefFeature;
}

// ---------------------------------------------------------------------------
// Harness component
// ---------------------------------------------------------------------------

interface FormatMenuState {
  featureIds: string[];
  featureKinds: string[];
  position: { x: number; y: number };
}

function FormatMenuHarness() {
  const [features, setFeatures] = useState<DebriefFeature[]>(makeFeatures);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(['track-alpha']),
  );
  const [formatMenuState, setFormatMenuState] = useState<FormatMenuState | null>(null);
  const [lastChange, setLastChange] = useState<string>('');

  const handleFormatClick = useCallback(
    (event: React.MouseEvent, feature: DebriefFeature) => {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setFormatMenuState({
        featureIds: [feature.id],
        featureKinds: [feature.properties.kind],
        position: { x: rect.right + 4, y: rect.top },
      });
    },
    [],
  );

  const handleFormatChange = useCallback(
    (featureIds: readonly string[], property: string, value: string | number) => {
      setFeatures(prev =>
        prev.map(f => {
          if (!featureIds.includes(f.id)) return f;
          return applyStyleChange(f, property, value);
        }),
      );
      setLastChange(`${featureIds.join(',')}|${property}=${String(value)}`);
      setFormatMenuState(null);
    },
    [],
  );

  return (
    <div data-testid="format-menu-harness" style={{ width: 420 }}>
      <FeatureList
        features={features}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        showFormatIcon
        onFormatClick={handleFormatClick}
        height={350}
      />
      {formatMenuState && (
        <FormatMenu
          featureIds={formatMenuState.featureIds}
          featureKinds={formatMenuState.featureKinds}
          anchorPosition={formatMenuState.position}
          onFormatChange={handleFormatChange}
          onDismiss={() => setFormatMenuState(null)}
        />
      )}
      {/* Hidden element for test assertions */}
      <div data-testid="last-format-change" style={{ display: 'none' }}>
        {lastChange}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Story metadata
// ---------------------------------------------------------------------------

const meta: Meta = {
  title: 'FormatMenu Harness',
  parameters: {
    layout: 'padded',
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
 * Default harness — tracks pre-selected, format icons visible on hover/selection.
 * Used by Playwright E2E tests.
 */
export const Default: Story = {
  render: () => <FormatMenuHarness />,
};
