/**
 * Exercise Alpha fixture — all supported shape/annotation types.
 *
 * Mirrors apps/vscode/test-data/local-store/items/exercise-alpha.geojson
 * as typed data for use in Storybook stories and tests.
 */

import type { TimeExtent } from '../../utils/types';

// Exercise time range: 2024-01-15 09:30 – 14:00 UTC
export const exerciseAlphaTimeExtent: TimeExtent = [
  new Date('2024-01-15T09:30:00Z').getTime(),
  new Date('2024-01-15T14:00:00Z').getTime(),
];

// All renderable features (excludes NARRATIVE which has empty coordinates)
export const exerciseAlphaFeatures: GeoJSON.Feature[] = [
  {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [-4.1234, 50.3789], [-4.1245, 50.3801], [-4.1267, 50.3815],
        [-4.1289, 50.3832], [-4.1312, 50.3848], [-4.1334, 50.3867],
        [-4.1356, 50.3889], [-4.1378, 50.3912], [-4.1401, 50.3934],
        [-4.1423, 50.3956], [-4.1445, 50.3978], [-4.1467, 50.4001],
        [-4.1489, 50.4023], [-4.1512, 50.4045], [-4.1534, 50.4067],
      ],
    },
    properties: {
      id: 'track-hms-defender', kind: 'TRACK', name: 'HMS Defender',
      platformType: 'OWNSHIP', color: '#2196F3',
      times: [
        1705311000000, 1705312200000, 1705313400000,
        1705314600000, 1705315800000, 1705317000000,
        1705318200000, 1705319400000, 1705320600000,
        1705321800000, 1705323000000, 1705324200000,
        1705325400000, 1705326600000, 1705327200000,
      ],
    },
  },
  {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [-4.0923, 50.4123], [-4.0945, 50.4101], [-4.0967, 50.4078],
        [-4.0989, 50.4056], [-4.1012, 50.4034], [-4.1034, 50.4012],
        [-4.1056, 50.3989], [-4.1078, 50.3967], [-4.1101, 50.3945],
        [-4.1123, 50.3923], [-4.1145, 50.3901], [-4.1167, 50.3878],
        [-4.1189, 50.3856], [-4.1212, 50.3834], [-4.1234, 50.3812],
      ],
    },
    properties: {
      id: 'track-uss-freedom', kind: 'TRACK', name: 'USS Freedom',
      platformType: 'CONTACT', color: '#4CAF50',
      times: [
        1705311000000, 1705312200000, 1705313400000,
        1705314600000, 1705315800000, 1705317000000,
        1705318200000, 1705319400000, 1705320600000,
        1705321800000, 1705323000000, 1705324200000,
        1705325400000, 1705326600000, 1705327200000,
      ],
    },
  },
  // POINT — Waypoint
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-4.1189, 50.3912] },
    properties: { id: 'loc-alpha-point', kind: 'POINT', name: 'Alpha Point', locationType: 'WAYPOINT' },
  },
  // POINT — Reference
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-4.1350, 50.4000] },
    properties: { id: 'loc-bravo-datum', kind: 'POINT', name: 'Bravo Datum', locationType: 'REFERENCE' },
  },
  // CIRCLE — Exclusion Zone
  {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-4.1100, 50.4050], [-4.1050, 50.4035], [-4.1050, 50.3965],
        [-4.1100, 50.3950], [-4.1150, 50.3965], [-4.1150, 50.4035], [-4.1100, 50.4050],
      ]],
    },
    properties: {
      id: 'circle-exclusion-zone', kind: 'CIRCLE', center: [-4.1100, 50.4000], radius: 500,
      label: 'Exclusion Zone',
      style: { fill: true, fill_color: '#F44336', fill_opacity: 0.2, stroke: true, color: '#F44336', weight: 2, opacity: 0.8 },
    },
  },
  // RECTANGLE — Exercise Area
  {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-4.1600, 50.4200], [-4.0800, 50.4200], [-4.0800, 50.3700],
        [-4.1600, 50.3700], [-4.1600, 50.4200],
      ]],
    },
    properties: {
      id: 'rect-exercise-area', kind: 'RECTANGLE', label: 'Exercise Area Alpha',
      style: { fill: true, fill_color: '#2196F3', fill_opacity: 0.1, stroke: true, color: '#2196F3', weight: 2, opacity: 0.6, dash_array: '10, 5' },
    },
  },
  // LINE — Sector Boundary
  {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [[-4.1500, 50.3800], [-4.0900, 50.4100]] },
    properties: {
      id: 'line-sector-boundary', kind: 'LINE', label: 'Sector Boundary',
      style: { stroke: true, color: '#795548', weight: 3, opacity: 0.7, dash_array: '15, 10' },
    },
  },
  // VECTOR — Wind Direction
  {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [[-4.1200, 50.4150], [-4.1050, 50.4100]] },
    properties: {
      id: 'vector-wind', kind: 'VECTOR', origin: [-4.1200, 50.4150], range: 1200, bearing: 135,
      label: 'Wind Direction',
      style: { stroke: true, color: '#607D8B', weight: 2, opacity: 0.9 },
    },
  },
  // TEXT — Nav Warning
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-4.1000, 50.4080] },
    properties: {
      id: 'text-nav-warning', kind: 'TEXT', text: 'NAV WARNING: Restricted area', label: 'Nav Warning',
      style: { color: '#FF5722', weight: 1, opacity: 1.0 },
    },
  },
  // TIMETEXT — Contact Report
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-4.1450, 50.3950] },
    properties: {
      id: 'timetext-contact-report', kind: 'TIMETEXT', text: 'Contact bearing 045', label: 'Contact Report',
      time: '2024-01-15T11:00:00Z',
      style: { color: '#9C27B0', weight: 1, opacity: 1.0 },
    },
  },
  // PERIODTEXT — Exercise Phase
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-4.0950, 50.3850] },
    properties: {
      id: 'periodtext-exercise-phase', kind: 'PERIODTEXT', text: 'Phase 2: ASW Ops', label: 'Exercise Phase',
      start_time: '2024-01-15T11:00:00Z', end_time: '2024-01-15T13:00:00Z',
      style: { color: '#3F51B5', weight: 1, opacity: 1.0 },
    },
  },
  // POLY — Suspected Minefield
  {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-4.1320, 50.4100], [-4.1280, 50.4120], [-4.1240, 50.4110],
        [-4.1230, 50.4080], [-4.1260, 50.4060], [-4.1310, 50.4070], [-4.1320, 50.4100],
      ]],
    },
    properties: {
      id: 'poly-minefield', kind: 'POLY', label: 'Suspected Minefield',
      style: { fill: true, fill_color: '#FF9800', fill_opacity: 0.25, stroke: true, color: '#FF9800', weight: 2, opacity: 0.8, dash_array: '5, 5' },
    },
  },
  // POLYLINE — Shipping Lane Boundary
  {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [[-4.1400, 50.4150], [-4.1350, 50.4170], [-4.1280, 50.4160], [-4.1220, 50.4180], [-4.1180, 50.4170]],
    },
    properties: {
      id: 'polyline-shipping-lane', kind: 'POLYLINE', label: 'Shipping Lane Boundary',
      style: { stroke: true, color: '#009688', weight: 2, opacity: 0.7, dash_array: '8, 4' },
    },
  },
  // ELLIPSE — Position Uncertainty
  {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-4.1050, 50.3830], [-4.1025, 50.3845], [-4.0990, 50.3850],
        [-4.0960, 50.3840], [-4.0945, 50.3820], [-4.0950, 50.3800],
        [-4.0975, 50.3785], [-4.1010, 50.3780], [-4.1040, 50.3790],
        [-4.1055, 50.3810], [-4.1050, 50.3830],
      ]],
    },
    properties: {
      id: 'ellipse-uncertainty', kind: 'ELLIPSE', center: [-4.1000, 50.3815],
      semi_major: 400, semi_minor: 200, orientation: 30, label: 'Position Uncertainty',
      time: '2024-01-15T11:30:00Z',
      style: { fill: true, fill_color: '#E91E63', fill_opacity: 0.15, stroke: true, color: '#E91E63', weight: 1, opacity: 0.7 },
    },
  },
  // ELLIPSE2 — Search Area Estimate
  {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-4.1420, 50.3870], [-4.1400, 50.3890], [-4.1370, 50.3895],
        [-4.1340, 50.3885], [-4.1330, 50.3865], [-4.1340, 50.3845],
        [-4.1370, 50.3840], [-4.1400, 50.3850], [-4.1420, 50.3870],
      ]],
    },
    properties: {
      id: 'ellipse2-search-area', kind: 'ELLIPSE2', center: [-4.1375, 50.3868],
      semi_major: 350, semi_minor: 180, orientation: 60, label: 'Search Area Estimate',
      start_time: '2024-01-15T10:00:00Z', end_time: '2024-01-15T12:00:00Z',
      style: { fill: true, fill_color: '#673AB7', fill_opacity: 0.15, stroke: true, color: '#673AB7', weight: 1, opacity: 0.7, dash_array: '4, 4' },
    },
  },
  // WHEEL — Sonar Coverage
  {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-4.1300, 50.3920] },
    properties: {
      id: 'wheel-sonar', kind: 'WHEEL', label: 'Sonar Coverage',
      radius: 600, inner_radius: 200, spoke_count: 8,
      style: { stroke: true, color: '#00BCD4', weight: 1, opacity: 0.6 },
    },
  },
  // DYNAMIC_RECT — Patrol Box
  {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[[-4.0880, 50.3930], [-4.0830, 50.3930], [-4.0830, 50.3900], [-4.0880, 50.3900], [-4.0880, 50.3930]]],
    },
    properties: {
      id: 'dynrect-patrol-box', kind: 'DYNAMIC_RECT', label: 'Patrol Box',
      group: 'patrol-alpha', time: '2024-01-15T10:30:00Z',
      style: { fill: true, fill_color: '#CDDC39', fill_opacity: 0.2, stroke: true, color: '#CDDC39', weight: 2, opacity: 0.8 },
    },
  },
  // DYNAMIC_CIRCLE — Guard Zone
  {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-4.1560, 50.4100], [-4.1530, 50.4120], [-4.1500, 50.4110],
        [-4.1490, 50.4080], [-4.1520, 50.4060], [-4.1550, 50.4070], [-4.1560, 50.4100],
      ]],
    },
    properties: {
      id: 'dyncircle-guard-zone', kind: 'DYNAMIC_CIRCLE', center: [-4.1525, 50.4090], radius: 300,
      label: 'Guard Zone', group: 'guard-bravo', time: '2024-01-15T11:00:00Z',
      style: { fill: true, fill_color: '#FF5722', fill_opacity: 0.15, stroke: true, color: '#FF5722', weight: 2, opacity: 0.7 },
    },
  },
  // DYNAMIC_POLY — Moving Exclusion Zone
  {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-4.0920, 50.4050], [-4.0890, 50.4070], [-4.0850, 50.4060],
        [-4.0840, 50.4030], [-4.0870, 50.4010], [-4.0910, 50.4020], [-4.0920, 50.4050],
      ]],
    },
    properties: {
      id: 'dynpoly-moving-zone', kind: 'DYNAMIC_POLY', label: 'Moving Exclusion Zone',
      group: 'exclusion-charlie', time: '2024-01-15T12:00:00Z',
      style: { fill: true, fill_color: '#795548', fill_opacity: 0.2, stroke: true, color: '#795548', weight: 2, opacity: 0.8, dash_array: '6, 3' },
    },
  },
  // SENSOR — Sonar Contact
  {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [[-4.1150, 50.3950], [-4.1050, 50.3880]] },
    properties: {
      id: 'sensor-bearing-1', kind: 'SENSOR', label: 'Sonar Contact B1',
      sensor_type: 'SONAR', bearing: 210, range: 800, origin: [-4.1150, 50.3950],
      time: '2024-01-15T11:15:00Z',
      style: { stroke: true, color: '#E91E63', weight: 1, opacity: 0.6, dash_array: '3, 3' },
    },
  },
  // SENSOR2 — Passive Bearing
  {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [[-4.1150, 50.3950], [-4.1250, 50.3870]] },
    properties: {
      id: 'sensor2-bearing-only', kind: 'SENSOR2', label: 'Passive Bearing B2',
      sensor_type: 'PASSIVE', bearing: 225, origin: [-4.1150, 50.3950],
      time: '2024-01-15T11:20:00Z',
      style: { stroke: true, color: '#9C27B0', weight: 1, opacity: 0.5, dash_array: '2, 4' },
    },
  },
  // TMA_POS — Target Motion Analysis
  {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [-4.1080, 50.3880], [-4.1060, 50.3895], [-4.1030, 50.3898],
        [-4.1005, 50.3888], [-4.0995, 50.3870], [-4.1005, 50.3855],
        [-4.1030, 50.3850], [-4.1060, 50.3858], [-4.1080, 50.3880],
      ]],
    },
    properties: {
      id: 'tma-pos-estimate', kind: 'TMA_POS', label: 'TMA Solution',
      center: [-4.1040, 50.3875], semi_major: 250, semi_minor: 150, orientation: 45,
      course: 180, speed: 12, time: '2024-01-15T11:45:00Z',
      style: { fill: true, fill_color: '#FF9800', fill_opacity: 0.2, stroke: true, color: '#FF9800', weight: 2, opacity: 0.8 },
    },
  },
];

// Narrative entries (non-spatial, for sidebar display)
export const exerciseAlphaNarratives = [
  { time: '2024-01-15T09:30:00Z', text: 'Exercise Alpha commenced. HMS Defender departing Plymouth.' },
  { time: '2024-01-15T11:15:00Z', text: 'Sonar contact bearing 210, classified probable submarine.' },
  { time: '2024-01-15T14:00:00Z', text: 'Exercise Alpha complete. All units returning to port.' },
];
