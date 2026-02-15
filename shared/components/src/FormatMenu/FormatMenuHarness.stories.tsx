/**
 * FormatMenuHarness — interactive Storybook story for Playwright E2E testing.
 *
 * Renders a FeatureList with format icons, opens FormatMenu on click,
 * and applies colour/style changes so the indicator bar updates.
 *
 * Data includes 3 tiers:
 *   Tier 0: Top-level features (TRACK, POINT, MULTI_POLYGON)
 *   Tier 1: Children (positions, polygons)
 *   Tier 2: Positions within track segments
 */

import { useState, useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FeatureList } from '../FeatureList';
import { FormatMenu } from './FormatMenu';
import { ThemeProvider } from '../ThemeProvider';
import type { DebriefFeature } from '../utils/types';
import type { DisplayItem } from '../FeatureList/flattenFeatures';

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
        coordinates: [[-5, 50], [-4.5, 50.5], [-4, 51]],
      },
      properties: {
        kind: 'TRACK',
        platform_id: 'PLT-001',
        platform_name: 'HMS Belfast',
        track_type: 'OWNSHIP',
        start_time: '2024-01-15T08:00:00Z',
        end_time: '2024-01-15T16:00:00Z',
        positions: [
          { time: '2024-01-15T08:00:00Z', course: 45, speed: 12.5 },
          { time: '2024-01-15T10:00:00Z', course: 90, speed: 10.0 },
          { time: '2024-01-15T12:00:00Z', course: 135, speed: 8.5 },
        ],
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
        style: { color: '#ff9900' },
      },
    },
    // MULTI_POLYGON — expandable with 3 child polygons
    {
      type: 'Feature',
      id: 'mpg-echo',
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          // Polygon 1 (triangle)
          [[[-5, 49], [-4, 49], [-4.5, 50], [-5, 49]]],
          // Polygon 2 (square)
          [[[-3, 49], [-2, 49], [-2, 50], [-3, 50], [-3, 49]]],
          // Polygon 3 (triangle)
          [[[-1, 49], [0, 49], [-0.5, 50], [-1, 49]]],
        ],
      },
      properties: {
        kind: 'MULTI_POLYGON',
        label: 'Patrol Boxes',
        style: { fill_color: '#9900ff', color: '#9900ff', fill_opacity: 0.3 },
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

interface ChildOverride {
  parentFeatureId: string;
  childIndex: number;
  childType: string;
}

interface FormatMenuState {
  featureIds: string[];
  featureKinds: string[];
  position: { x: number; y: number };
  childOverride?: ChildOverride;
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

  const handleChildFormatClick = useCallback(
    (event: React.MouseEvent, displayItem: DisplayItem) => {
      if (!displayItem.parentId || displayItem.index === null) return;
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();

      const childKindMap: Record<string, string> = {
        position: 'POSITION',
        point: 'POINT',
        polygon: 'POLY',
      };
      const menuKind = childKindMap[displayItem.type] ?? 'POINT';

      setFormatMenuState({
        featureIds: [displayItem.parentId],
        featureKinds: [menuKind],
        position: { x: rect.right + 4, y: rect.top },
        childOverride: {
          parentFeatureId: displayItem.parentId,
          childIndex: displayItem.index,
          childType: displayItem.type,
        },
      });
    },
    [],
  );

  const handleFormatChange = useCallback(
    (featureIds: readonly string[], property: string, value: string | number) => {
      const override = formatMenuState?.childOverride;
      if (override) {
        // Child override: write to position_style_overrides on the parent
        setFeatures(prev =>
          prev.map(f => {
            if (f.id !== override.parentFeatureId) return f;
            const props = f.properties as unknown as Record<string, unknown>;
            const overrides = { ...(props.position_style_overrides ?? {}) as Record<string, Record<string, unknown>> };
            const key = String(override.childIndex);
            overrides[key] = { ...(overrides[key] ?? {}), [property]: value };
            return { ...f, properties: { ...props, position_style_overrides: overrides } } as unknown as DebriefFeature;
          }),
        );
        setLastChange(`${override.parentFeatureId}/child/${override.childIndex}|${property}=${String(value)}`);
      } else {
        // Feature-level style change
        setFeatures(prev =>
          prev.map(f => {
            if (!featureIds.includes(f.id)) return f;
            return applyStyleChange(f, property, value);
          }),
        );
        setLastChange(`${featureIds.join(',')}|${property}=${String(value)}`);
      }
      setFormatMenuState(null);
    },
    [formatMenuState],
  );

  // Build a lookup of child override colours for rendering colour indicators
  // on child rows. Keyed by child DisplayItem ID → CSS colour.
  const childColourMap = new Map<string, string>();
  for (const f of features) {
    const props = f.properties as unknown as Record<string, unknown>;
    const overrides = props.position_style_overrides as Record<string, Record<string, unknown>> | undefined;
    if (!overrides) continue;
    for (const [idx, ov] of Object.entries(overrides)) {
      const colour = (ov.fill_color ?? ov.color) as string | undefined;
      if (colour) {
        // Build paths matching flattenFeatures output
        childColourMap.set(`${f.id}/polygons/${idx}`, colour);
        childColourMap.set(`${f.id}/positions/${idx}`, colour);
        childColourMap.set(`${f.id}/points/${idx}`, colour);
      }
    }
  }

  return (
    <div data-testid="format-menu-harness" style={{ width: 420 }}>
      <FeatureList
        features={features}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        showFormatIcon
        onFormatClick={handleFormatClick}
        onChildFormatClick={handleChildFormatClick}
        height={500}
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
      {/* Expose child colour overrides for Playwright assertions */}
      <div data-testid="child-colour-map" style={{ display: 'none' }}>
        {JSON.stringify(Object.fromEntries(childColourMap))}
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
