/**
 * Storybook stories for the PropertiesPanel mode components (Spec #192).
 *
 * Five stories — one per mode + a read-only variant — used by the
 * Storybook-driven Playwright screenshot capture in
 * `shared/components/e2e/PropertiesForm.spec.ts` (Phase 10 / T084-T086).
 *
 * Each story mounts the relevant mode component with realistic mock
 * props. The mode components are normally wrapped by
 * `PropertiesPanelDispatch` inside `ActivityPanel`; here we mount them
 * directly so each surface is screenshot-stable across runs.
 *
 * Article XV: no `any` — mock features cast through `unknown` only at
 * the JSON-fixture boundary, the same idiom existing stories use.
 */

import type { Meta, StoryObj } from '@storybook/react';
import type { DebriefFeature } from '@debrief/schemas';
import { FeatureEditorMode } from './modes/FeatureEditorMode';
import { SubFeatureEditorMode } from './modes/SubFeatureEditorMode';
import { MultiSelectSummaryMode } from './modes/MultiSelectSummaryMode';
import { ReadOnlyBanner } from './readOnlyBanner';

// ─── Mock features ────────────────────────────────────────────────────

const mockTrack = (id: string, overrides: Partial<Record<string, unknown>> = {}): DebriefFeature =>
  ({
    type: 'Feature',
    id,
    geometry: {
      type: 'LineString',
      coordinates: [
        [-1.25, 50.75],
        [-1.24, 50.76],
        [-1.23, 50.77],
        [-1.22, 50.78],
        [-1.21, 50.79],
      ],
    },
    properties: {
      kind: 'TRACK',
      tags: ['intercept'],
      platform_id: 'ssk/type212/HUNTER',
      // Per-platform override defaults — overridden by callers
      display_name: 'HMS Hunter',
      nationality: 'GB',
      vessel_class: 'submarine',
      vessel_type: 'ssk',
      vessel_role: 'hunter',
      domain: 'subsurface',
      times: [
        '2026-03-12T15:00:00Z',
        '2026-03-12T15:01:00Z',
        '2026-03-12T15:02:00Z',
        '2026-03-12T15:03:00Z',
        '2026-03-12T15:04:00Z',
      ],
      ...overrides,
    },
  }) as unknown as DebriefFeature;

const mockPolygonAnnotation = (id: string, vertexMetadata?: unknown[]): DebriefFeature =>
  ({
    type: 'Feature',
    id,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-1.30, 50.70],
          [-1.20, 50.70],
          [-1.20, 50.80],
          [-1.30, 50.80],
          [-1.30, 50.70],
        ],
      ],
    },
    properties: {
      kind: 'POLY',
      tags: [],
      name: 'Exercise Area Alpha',
      vertex_metadata: vertexMetadata ?? [],
    },
  }) as unknown as DebriefFeature;

const trackWithStagedVertex = mockTrack('track-A', {
  vertex_metadata: [
    {
      path: 'positions/2',
      label: 'intercept',
      tags: ['recurring-fix'],
      note: 'CPA closest at this fix',
    },
  ],
});

// ─── No-op staging callbacks (stories don't exercise the buffer) ──────

const noopSetField = () => {};
const noopRevert = () => {};
const noopUnrevert = () => {};

// ─── Story meta ───────────────────────────────────────────────────────

const meta: Meta = {
  title: 'PropertiesPanel/PropertiesForm',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Mode-aware Properties panel surfaces (spec #192). Five stories cover the four editing modes plus the read-only banner.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    // NB: no <ThemeProvider> here — the global preview decorator at
    // `.storybook/preview.tsx` wraps every story with the toolbar's
    // current variant. Adding a second ThemeProvider here would shadow
    // it and silently pin every story to the inner default (light),
    // which is exactly the bug the original capture run had.
    (Story) => (
      <div style={{ width: 360, padding: 12 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj;

// ─── Story 1: Feature mode (T029) ─────────────────────────────────────

export const FeatureMode: Story = {
  name: 'Feature mode — track with override',
  render: () => (
    <FeatureEditorMode
      feature={mockTrack('track-A', {
        display_name: 'HMS Hunter (override)',
      })}
      readOnly={false}
      setFeatureField={noopSetField}
      revertField={noopRevert}
      unrevertField={noopUnrevert}
    />
  ),
};

// ─── Story 2: Sub-feature mode — track point (T035) ───────────────────

export const SubFeatureTrack: Story = {
  name: 'Sub-feature mode — track point',
  render: () => (
    <SubFeatureEditorMode
      feature={trackWithStagedVertex}
      path="positions/2"
      readOnly={false}
      setVertexField={noopSetField}
    />
  ),
};

// ─── Story 3: Sub-feature mode — polygon vertex (T071, cross-geometry hero) ─

export const SubFeaturePolygon: Story = {
  name: 'Sub-feature mode — polygon vertex',
  render: () => (
    <SubFeatureEditorMode
      feature={mockPolygonAnnotation('poly-A', [
        {
          path: 'rings/0/vertices/1',
          label: 'NE corner',
          tags: ['boundary'],
          note: 'Northern exclusion-zone marker',
        },
      ])}
      path="rings/0/vertices/1"
      readOnly={false}
      setVertexField={noopSetField}
    />
  ),
};

// ─── Story 4: Multi-select summary (T056) ─────────────────────────────

export const MultiSelectSummary: Story = {
  name: 'Multi-select summary — two features',
  render: () => {
    const featureA = mockTrack('track-A', {
      display_name: 'HMS Hunter',
      vessel_role: 'hunter',
      tags: ['intercept'],
    });
    const featureB = mockTrack('track-B', {
      display_name: 'HMS Hunter',
      vessel_role: 'escort', // differs from A
      tags: ['intercept'],
    });
    const featuresById = new Map<string, DebriefFeature>([
      ['track-A', featureA],
      ['track-B', featureB],
    ]);
    return (
      <MultiSelectSummaryMode
        featureIds={['track-A', 'track-B']}
        featuresById={featuresById}
        readOnly={false}
      />
    );
  },
};

// ─── Story 5: Read-only banner (T046-T049) ────────────────────────────

export const ReadOnly: Story = {
  name: 'Read-only — banner + disabled inputs',
  render: () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ReadOnlyBanner reason="Storage location is not writable" />
        <FeatureEditorMode
          feature={mockTrack('track-A')}
          readOnly={true}
          setFeatureField={noopSetField}
          revertField={noopRevert}
          unrevertField={noopUnrevert}
        />
      </div>
    );
  },
};
