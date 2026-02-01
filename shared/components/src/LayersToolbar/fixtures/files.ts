/**
 * Sample AssociatedFile data for LayersToolbar stories and tests.
 */

import type { AssociatedFile } from '../types';

/** Sample source files */
export const sampleSourceFiles: AssociatedFile[] = [
  {
    name: 'exercise-data.rep',
    path: 'sources/exercise-data.rep',
    category: 'source',
    format: 'rep',
  },
  {
    name: 'contact-bearings.csv',
    path: 'sources/contact-bearings.csv',
    category: 'source',
    format: 'csv',
  },
  {
    name: 'sensor-log.2d.json',
    path: 'sources/sensor-log.2d.json',
    category: 'source',
    viewerType: '2d',
    format: 'json',
  },
];

/** Sample result files */
export const sampleResultFiles: AssociatedFile[] = [
  {
    name: 'range-analysis.2d.json',
    path: 'results/range-analysis.2d.json',
    category: 'result',
    viewerType: '2d',
    format: 'json',
  },
  {
    name: 'tma-solution.2d.geojson',
    path: 'results/tma-solution.2d.geojson',
    category: 'result',
    viewerType: '2d',
    format: 'geojson',
  },
  {
    name: 'statistics-report.table.json',
    path: 'results/statistics-report.table.json',
    category: 'result',
    viewerType: 'table',
    format: 'json',
  },
  {
    name: 'track-smooth-output.2d.json',
    path: 'results/track-smooth-output.2d.json',
    category: 'result',
    viewerType: '2d',
    format: 'json',
  },
];

/** Empty file sets */
export const emptySourceFiles: AssociatedFile[] = [];
export const emptyResultFiles: AssociatedFile[] = [];
