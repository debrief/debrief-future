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
import type { TrackFeature, ReferenceLocation } from '@debrief/schemas';
import type { DebriefFeature } from '../utils/types';

// ---------------------------------------------------------------------------
// Mock data — matches schema types used by getFeatureColor()
// ---------------------------------------------------------------------------

function makeTracks(): TrackFeature[] {
  return [
    {
      type: 'Feature',
      id: 'track-alpha',
      geometry: {
        type: 'LineString',
        coordinates: [[-5, 50], [-4, 51]] as unknown as number[],
      },
      properties: {
        kind: 'TRACK',
        platform_id: 'PLT-001',
        platform_name: 'HMS Belfast',
        track_type: 'OWNSHIP',
        start_time: '2024-01-15T08:00:00Z',
        end_time: '2024-01-15T16:00:00Z',
        color: '#0066cc',
        positions: [],
      },
    },
    {
      type: 'Feature',
      id: 'track-bravo',
      geometry: {
        type: 'LineString',
        coordinates: [[-3, 52], [-2, 53]] as unknown as number[],
      },
      properties: {
        kind: 'TRACK',
        platform_id: 'PLT-002',
        platform_name: 'USS Enterprise',
        track_type: 'CONTACT',
        start_time: '2024-01-15T08:00:00Z',
        end_time: '2024-01-15T16:00:00Z',
        color: '#cc0000',
        positions: [],
      },
    },
    {
      type: 'Feature',
      id: 'track-charlie',
      geometry: {
        type: 'LineString',
        coordinates: [[-1, 54], [0, 55]] as unknown as number[],
      },
      properties: {
        kind: 'TRACK',
        platform_id: 'PLT-003',
        platform_name: 'HMS Victory',
        track_type: 'SOLUTION',
        start_time: '2024-01-15T08:00:00Z',
        end_time: '2024-01-15T16:00:00Z',
        color: '#00cc66',
        positions: [],
      },
    },
  ];
}

function makeLocations(): ReferenceLocation[] {
  return [
    {
      type: 'Feature',
      id: 'ref-delta',
      geometry: {
        type: 'Point',
        coordinates: [-2.5, 51.5] as unknown as number[],
      },
      properties: {
        kind: 'POINT',
        name: 'Alpha Point',
        location_type: 'WAYPOINT',
        valid_from: '2024-01-15T00:00:00Z',
        valid_until: '2024-01-15T23:59:59Z',
        color: '#ff9900',
      },
    },
  ];
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
  const [features, setFeatures] = useState<DebriefFeature[]>(() => [
    ...makeTracks(),
    ...makeLocations(),
  ]);
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
      // Apply the format change by updating features
      setFeatures(prev =>
        prev.map(f => {
          if (!featureIds.includes(f.id)) return f;

          // For any colour-type property, update properties.color so
          // getFeatureColor() picks it up via the legacy path
          if (property.includes('color') || property.includes('fill_color')) {
            const props = { ...(f.properties as Record<string, unknown>), color: value };
            return { ...f, properties: props } as DebriefFeature;
          }

          return f;
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
