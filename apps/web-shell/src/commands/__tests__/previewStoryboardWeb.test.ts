/**
 * Vitest for the web-shell live-preview launcher (#273, US1).
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildPreviewUrl,
  previewStoryboardWeb,
  PreviewBlockedError,
  type PreviewWebDeps,
} from '../previewStoryboardWeb';
import type { StoryboardPlot } from '@debrief/components';

const plot = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'SB1',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      properties: { kind: 'STORYBOARD', id: 'SB1', name: 'Live', schema_version: 2 },
    },
    {
      type: 'Feature',
      id: 'SC1',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      properties: {
        kind: 'STORYBOARD_SCENE',
        id: 'SC1',
        storyboard_id: 'SB1',
        title: 'Scene 1',
        timestamp: '2025-01-15T12:00:00Z',
        creation_order: 0,
        viewport: { center: [-4, 50], zoom: 6, bearing: 0 },
      },
    },
    {
      type: 'Feature',
      id: 'SB2',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
      properties: { kind: 'STORYBOARD', id: 'SB2', name: 'Other', schema_version: 2 },
    },
  ],
  // eslint-disable-next-line no-restricted-syntax -- test fixture: GeoJSON literal ↔ StoryboardPlot boundary (mirrors StoryboardPanelMount).
} as unknown as StoryboardPlot;

describe('buildPreviewUrl', () => {
  it('appends an encoded ?features blob URL to the renderer base', () => {
    const url = buildPreviewUrl('/briefing-renderer/', 'blob:abc-123');
    expect(url).toBe('/briefing-renderer/?features=blob%3Aabc-123');
  });

  it('tolerates a base without a trailing slash', () => {
    const url = buildPreviewUrl('/x/briefing-renderer', 'blob:y');
    expect(url).toBe('/x/briefing-renderer/?features=blob%3Ay');
  });
});

describe('previewStoryboardWeb', () => {
  function deps(overrides: Partial<PreviewWebDeps> = {}): PreviewWebDeps {
    return {
      createObjectUrl: vi.fn().mockReturnValue('blob:preview-123'),
      openWindow: vi.fn().mockReturnValue({ closed: false }),
      rendererBaseUrl: '/briefing-renderer/',
      ...overrides,
    };
  }

  it('scopes the active storyboard, builds a blob URL, and opens the renderer tab', () => {
    const openWindow = vi.fn().mockReturnValue({ closed: false });
    const createObjectUrl = vi.fn().mockReturnValue('blob:preview-123');
    const result = previewStoryboardWeb(plot, 'SB1', deps({ openWindow, createObjectUrl }));

    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    // The blob holds only the scoped storyboard (SB1 + its scene), not SB2.
    const blobArg = createObjectUrl.mock.calls[0]![0] as Blob;
    expect(blobArg.type).toBe('application/geo+json');

    expect(result.blobUrl).toBe('blob:preview-123');
    expect(result.url).toBe('/briefing-renderer/?features=blob%3Apreview-123');
    expect(openWindow).toHaveBeenCalledWith(result.url);
  });

  it('throws PreviewBlockedError and revokes the blob when the tab is blocked', () => {
    const revokeObjectUrl = vi.fn();
    expect(() =>
      previewStoryboardWeb(
        plot,
        'SB1',
        deps({ openWindow: vi.fn().mockReturnValue(null), revokeObjectUrl }),
      ),
    ).toThrow(PreviewBlockedError);
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:preview-123');
  });
});
