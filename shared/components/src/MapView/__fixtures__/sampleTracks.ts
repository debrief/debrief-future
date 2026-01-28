/**
 * Sample track data for Storybook stories and tests.
 * Three vessels with timestamps over a 2-hour period.
 */

import type { DebriefFeature } from '../../utils/types';
import type { TimeExtent } from '../../utils/types';

const BASE_TIME = new Date('2026-01-27T10:00:00Z').getTime();
const MINUTE = 60_000;

function generateTrack(
  id: string,
  name: string,
  color: string,
  startLon: number,
  startLat: number,
  dlonPerStep: number,
  dlatPerStep: number,
  steps: number,
  startOffset: number = 0
): DebriefFeature {
  const coordinates: [number, number][] = [];
  const times: number[] = [];

  for (let i = 0; i < steps; i++) {
    coordinates.push([
      startLon + dlonPerStep * i + Math.sin(i * 0.3) * 0.005,
      startLat + dlatPerStep * i + Math.cos(i * 0.3) * 0.003,
    ]);
    times.push(BASE_TIME + startOffset + i * MINUTE);
  }

  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'LineString',
      coordinates,
    },
    properties: {
      kind: 'TRACK',
      name,
      color,
      times,
      trackType: 'SURFACE',
    },
  } as unknown as DebriefFeature;
}

export const sampleTrack1 = generateTrack(
  'track-ownship',
  'OWNSHIP',
  '#4CAF50',
  -4.0, 50.3,
  0.002, 0.001,
  120,
  0
);

export const sampleTrack2 = generateTrack(
  'track-contact-1',
  'CONTACT ALPHA',
  '#2196F3',
  -3.95, 50.28,
  0.0015, 0.0012,
  100,
  10 * MINUTE
);

export const sampleTrack3 = generateTrack(
  'track-contact-2',
  'CONTACT BRAVO',
  '#FF9800',
  -4.05, 50.35,
  0.001, -0.0008,
  90,
  5 * MINUTE
);

export const sampleTracks: DebriefFeature[] = [sampleTrack1, sampleTrack2, sampleTrack3];

export const sampleTimeExtent: TimeExtent = [
  BASE_TIME,
  BASE_TIME + 120 * MINUTE,
];
