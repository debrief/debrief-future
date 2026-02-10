/**
 * Snapshot helpers unit tests.
 * Feature: 074-snapshots (T004)
 */

import {
  findSystemRecord,
  createSystemRecord,
  stripSpatialProvenance,
  countLogEntries,
  generateSnapshotFilename,
  normaliseProvenance,
  trimProvenanceAfterEntry,
} from '../../../src/log/snapshotHelpers.js';
import type { GeoJsonFeatureCollection } from '../../../src/log/types.js';

describe('findSystemRecord', () => {
  it('finds the system record by featureType', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: null, properties: { featureType: 'track' } },
        { type: 'Feature', geometry: null, properties: { featureType: 'system', snapshotLinks: null } },
      ],
    };
    const result = findSystemRecord(fc);
    expect(result).not.toBeNull();
    expect(result!.properties!.featureType).toBe('system');
  });

  it('returns null when no system record exists', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: null, properties: { featureType: 'track' } },
      ],
    };
    expect(findSystemRecord(fc)).toBeNull();
  });

  it('returns null for empty FeatureCollection', () => {
    expect(findSystemRecord({ type: 'FeatureCollection', features: [] })).toBeNull();
  });
});

describe('createSystemRecord', () => {
  it('creates a minimal system record with correct structure', () => {
    const record = createSystemRecord();
    expect(record.type).toBe('Feature');
    expect(record.geometry).toEqual({ type: 'Point', coordinates: [] });
    expect(record.properties).toEqual({
      featureType: 'system',
      snapshotLinks: null,
      branches: [],
      provenance: [],
    });
  });
});

describe('stripSpatialProvenance', () => {
  it('strips provenance from spatial features', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
          properties: { featureType: 'track', provenance: [{ activityId: 'a1' }] },
        },
      ],
    };
    const clean = stripSpatialProvenance(fc);
    expect(clean.features[0].properties!.provenance).toEqual([]);
  });

  it('preserves system record provenance', () => {
    const systemProv = [{ activityId: 'snap-1', type: 'snapshot' }];
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: null,
          properties: { featureType: 'system', provenance: systemProv },
        },
        {
          type: 'Feature',
          geometry: null,
          properties: { featureType: 'track', provenance: [{ activityId: 'a1' }] },
        },
      ],
    };
    const clean = stripSpatialProvenance(fc);
    expect(clean.features[0].properties!.provenance).toEqual(systemProv);
    expect(clean.features[1].properties!.provenance).toEqual([]);
  });

  it('returns a deep copy (does not mutate original)', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: null,
          properties: { featureType: 'track', provenance: [{ activityId: 'a1' }] },
        },
      ],
    };
    const clean = stripSpatialProvenance(fc);
    expect(fc.features[0].properties!.provenance).toEqual([{ activityId: 'a1' }]);
    expect(clean.features[0].properties!.provenance).toEqual([]);
  });

  it('handles features with null properties', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: null, properties: null },
      ],
    };
    const clean = stripSpatialProvenance(fc);
    expect(clean.features[0].properties).toBeNull();
  });
});

describe('countLogEntries', () => {
  it('counts unique entries across features', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: null,
          properties: { provenance: [{ activityId: 'a1' }, { activityId: 'a2' }] },
        },
        {
          type: 'Feature',
          geometry: null,
          properties: { provenance: [{ activityId: 'a2' }, { activityId: 'a3' }] },
        },
      ],
    };
    expect(countLogEntries(fc)).toBe(3); // a1, a2, a3 deduplicated
  });

  it('excludes system record entries', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: null,
          properties: { featureType: 'system', provenance: [{ activityId: 'sys-1' }] },
        },
        {
          type: 'Feature',
          geometry: null,
          properties: { provenance: [{ activityId: 'a1' }] },
        },
      ],
    };
    expect(countLogEntries(fc)).toBe(1);
  });

  it('returns 0 for empty FeatureCollection', () => {
    expect(countLogEntries({ type: 'FeatureCollection', features: [] })).toBe(0);
  });

  it('handles legacy single-object provenance', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: null,
          properties: { provenance: { activityId: 'legacy-1' } },
        },
      ],
    };
    expect(countLogEntries(fc)).toBe(1);
  });
});

describe('generateSnapshotFilename', () => {
  it('generates filename with hyphens replacing colons', () => {
    const timestamp = new Date('2026-02-09T14:30:00.000Z');
    const filename = generateSnapshotFilename(timestamp);
    expect(filename).toBe('plot-snap-2026-02-09T14-30-00-000.geojson');
  });

  it('uses current time when no timestamp provided', () => {
    const filename = generateSnapshotFilename();
    expect(filename).toMatch(/^plot-snap-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}\.geojson$/);
  });
});

describe('normaliseProvenance', () => {
  it('returns empty array for null/undefined', () => {
    expect(normaliseProvenance(null)).toEqual([]);
    expect(normaliseProvenance(undefined)).toEqual([]);
  });

  it('returns array as-is', () => {
    const arr = [{ activityId: 'a1' }];
    expect(normaliseProvenance(arr)).toBe(arr);
  });

  it('wraps single object in array', () => {
    const obj = { activityId: 'a1' };
    expect(normaliseProvenance(obj)).toEqual([obj]);
  });
});

describe('trimProvenanceAfterEntry', () => {
  it('keeps entries after the split point', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: null,
          properties: {
            provenance: [
              { activityId: 'a1', timestamp: '2026-01-01T10:00:00Z' },
              { activityId: 'a2', timestamp: '2026-01-01T11:00:00Z' },
              { activityId: 'a3', timestamp: '2026-01-01T12:00:00Z' },
            ],
          },
        },
      ],
    };

    const result = trimProvenanceAfterEntry(fc, 'a2');
    expect(result.entriesBefore).toBe(2); // a1, a2
    expect(result.entriesAfter).toBe(1);  // a3
    expect(fc.features[0].properties!.provenance).toEqual([
      { activityId: 'a3', timestamp: '2026-01-01T12:00:00Z' },
    ]);
  });

  it('throws for unknown entry ID', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: null, properties: { provenance: [] } },
      ],
    };
    expect(() => trimProvenanceAfterEntry(fc, 'nonexistent')).toThrow('not found');
  });

  it('does not trim system record provenance', () => {
    const fc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: null,
          properties: {
            featureType: 'system',
            provenance: [{ activityId: 'sys-1', type: 'snapshot', timestamp: '2026-01-01T09:00:00Z' }],
          },
        },
        {
          type: 'Feature',
          geometry: null,
          properties: {
            provenance: [
              { activityId: 'a1', timestamp: '2026-01-01T10:00:00Z' },
              { activityId: 'a2', timestamp: '2026-01-01T11:00:00Z' },
            ],
          },
        },
      ],
    };

    trimProvenanceAfterEntry(fc, 'a1');
    // System record provenance should be untouched
    expect(fc.features[0].properties!.provenance).toEqual([
      { activityId: 'sys-1', type: 'snapshot', timestamp: '2026-01-01T09:00:00Z' },
    ]);
    // Spatial feature should only have entries after a1
    expect(fc.features[1].properties!.provenance).toEqual([
      { activityId: 'a2', timestamp: '2026-01-01T11:00:00Z' },
    ]);
  });
});
