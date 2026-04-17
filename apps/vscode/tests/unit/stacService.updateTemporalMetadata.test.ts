/**
 * StacService.updateTemporalMetadata — override-aware + idempotent (T068-T070).
 *
 * Feature #193 / backlog #191, Phase 5 (User Story 3).
 *
 * Tests focus on the NEW behaviour:
 *  - T068: fields listed in item.properties["debrief:overrides"] are skipped.
 *  - T069: no write when derived values equal current values (idempotent).
 *  - T070: no mtime bump when all fields are either overridden or already-current.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { StacService } from '../../src/services/stacService';
import type { StacItem } from '../../src/types/stac';

const EARLIEST = '2024-01-01T00:00:00Z';
const LATEST = '2024-01-02T00:00:00Z';

function writeItem(itemDir: string, item: StacItem): void {
  fs.writeFileSync(
    path.join(itemDir, 'item.json'),
    JSON.stringify(item, null, 2),
  );
}

function writeTrackGeoJson(itemDir: string): string {
  const geoJsonPath = path.join(itemDir, 'track.geojson');
  const fc = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          kind: 'TRACK',
          start_time: EARLIEST,
          end_time: LATEST,
        },
        geometry: null,
      },
    ],
  };
  fs.writeFileSync(geoJsonPath, JSON.stringify(fc));
  return geoJsonPath;
}

function makeItem(props: Record<string, unknown>): StacItem {
  return {
    type: 'Feature',
    stac_version: '1.0.0',
    id: 'test-item',
    geometry: null as unknown as GeoJSON.Geometry,
    bbox: [-10, -20, 30, 40],
    properties: props,
    links: [],
    assets: {
      data: {
        href: './track.geojson',
        type: 'application/geo+json',
      },
    },
  } as unknown as StacItem;
}

describe('StacService.updateTemporalMetadata — override-aware + idempotent', () => {
  let service: StacService;
  let storeDir: string;
  let itemDir: string;
  let itemPath: string;

  beforeEach(() => {
    service = new StacService();
    storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stac-temporal-'));
    itemDir = path.join(storeDir, 'items/test-item');
    fs.mkdirSync(itemDir, { recursive: true });
    itemPath = 'items/test-item/item.json';
    writeTrackGeoJson(itemDir);
  });

  afterEach(() => {
    fs.rmSync(storeDir, { recursive: true, force: true });
  });

  it('T068: skips fields listed in debrief:overrides', async () => {
    const originalStart = '2019-05-05T00:00:00Z';
    writeItem(
      itemDir,
      makeItem({
        title: 'Test',
        start_datetime: originalStart,
        end_datetime: null,
        datetime: null,
        'debrief:overrides': ['start_datetime'],
      }),
    );

    await service.updateTemporalMetadata(storeDir, itemPath);

    const after = JSON.parse(
      fs.readFileSync(path.join(itemDir, 'item.json'), 'utf-8'),
    ) as { properties: Record<string, unknown> };
    // start_datetime override survived
    expect(after.properties.start_datetime).toBe(originalStart);
    // end_datetime & datetime were derived from features
    expect(after.properties.end_datetime).toBe(LATEST);
    expect(after.properties.datetime).toBe(EARLIEST);
  });

  it('T069: no write when derived values equal current values (idempotent)', async () => {
    writeItem(
      itemDir,
      makeItem({
        title: 'Test',
        start_datetime: EARLIEST,
        end_datetime: LATEST,
        datetime: EARLIEST,
      }),
    );
    const mtimeBefore = fs.statSync(path.join(itemDir, 'item.json')).mtimeMs;

    // Ensure a distinguishable tick
    await new Promise((r) => setTimeout(r, 5));
    await service.updateTemporalMetadata(storeDir, itemPath);

    const mtimeAfter = fs.statSync(path.join(itemDir, 'item.json')).mtimeMs;
    expect(mtimeAfter).toBe(mtimeBefore);
  });

  it('T070: mtime stable when all fields are overridden', async () => {
    writeItem(
      itemDir,
      makeItem({
        title: 'Test',
        start_datetime: '2000-01-01T00:00:00Z',
        end_datetime: '2000-01-02T00:00:00Z',
        datetime: '2000-01-01T00:00:00Z',
        'debrief:overrides': ['start_datetime', 'end_datetime', 'datetime'],
      }),
    );
    const mtimeBefore = fs.statSync(path.join(itemDir, 'item.json')).mtimeMs;

    await new Promise((r) => setTimeout(r, 5));
    await service.updateTemporalMetadata(storeDir, itemPath);

    const mtimeAfter = fs.statSync(path.join(itemDir, 'item.json')).mtimeMs;
    expect(mtimeAfter).toBe(mtimeBefore);

    const after = JSON.parse(
      fs.readFileSync(path.join(itemDir, 'item.json'), 'utf-8'),
    ) as { properties: Record<string, unknown> };
    expect(after.properties.start_datetime).toBe('2000-01-01T00:00:00Z');
    expect(after.properties.end_datetime).toBe('2000-01-02T00:00:00Z');
    expect(after.properties.datetime).toBe('2000-01-01T00:00:00Z');
  });

  it('writes when at least one derived field changes', async () => {
    writeItem(
      itemDir,
      makeItem({
        title: 'Test',
        start_datetime: null,
        end_datetime: null,
        datetime: null,
      }),
    );

    await service.updateTemporalMetadata(storeDir, itemPath);

    const after = JSON.parse(
      fs.readFileSync(path.join(itemDir, 'item.json'), 'utf-8'),
    ) as { properties: Record<string, unknown> };
    expect(after.properties.start_datetime).toBe(EARLIEST);
    expect(after.properties.end_datetime).toBe(LATEST);
    expect(after.properties.datetime).toBe(EARLIEST);
  });
});
