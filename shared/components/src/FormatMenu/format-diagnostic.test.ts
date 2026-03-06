/**
 * Diagnostic test — verifies getFeatureColor picks up style changes.
 * If this test fails, the bug is in the data / getFeatureColor path.
 * If it passes, the bug is in React rendering.
 */
import { describe, it, expect } from 'vitest';
import { getFeatureColor } from '../utils/labels';
import { isTrackFeature } from '../utils/types';
import type { DebriefFeature } from '../utils/types';

function makeTrack(): DebriefFeature {
  return {
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
      style: { line: { color: '#0066cc' }, point: { shape: 'circle', radius: 5, fill_color: '#0066cc', color: '#0066cc' } },
    },
  } as unknown as DebriefFeature;
}

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
    const category = property.slice(0, dotIndex);
    const field = property.slice(dotIndex + 1);
    const oldCategory = (newStyle[category] ?? {}) as Record<string, unknown>;
    newStyle[category] = { ...oldCategory, [field]: value };
  } else {
    newStyle[property] = value;
  }

  return {
    ...feature,
    properties: { ...props, style: newStyle },
  } as unknown as DebriefFeature;
}

describe('Format menu colour change diagnostic', () => {
  it('isTrackFeature works on cast mock', () => {
    const track = makeTrack();
    expect(isTrackFeature(track)).toBe(true);
  });

  it('getFeatureColor reads style.line.color', () => {
    const track = makeTrack();
    const color = getFeatureColor(track);
    expect(color).toBe('#0066cc');
  });

  it('applyStyleChange updates style.line.color', () => {
    const track = makeTrack();
    const updated = applyStyleChange(track, 'line.color', '#CC0000');

    // Verify runtime structure
    const props = updated.properties as unknown as Record<string, unknown>;
    const style = props.style as Record<string, unknown>;
    const line = style.line as Record<string, unknown>;
    expect(line.color).toBe('#CC0000');
  });

  it('getFeatureColor returns UPDATED color after applyStyleChange', () => {
    const track = makeTrack();
    const original = getFeatureColor(track);
    expect(original).toBe('#0066cc');

    const updated = applyStyleChange(track, 'line.color', '#CC0000');
    const newColor = getFeatureColor(updated);
    expect(newColor).toBe('#CC0000');
  });

  it('isTrackFeature still works on updated feature', () => {
    const track = makeTrack();
    const updated = applyStyleChange(track, 'line.color', '#CC0000');
    expect(isTrackFeature(updated)).toBe(true);
  });

  it('updated feature has different identity from original', () => {
    const track = makeTrack();
    const updated = applyStyleChange(track, 'line.color', '#CC0000');
    expect(updated).not.toBe(track);
    expect(updated.properties).not.toBe(track.properties);
  });
});
