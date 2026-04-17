/**
 * StacService.updateItemMetadata — provenance log rotation + JSONL archive.
 *
 * Covers tasks T030 (rotation on 501st entry) and T031 (archive parses as
 * one JSON object per line).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { StacService } from '../../src/services/stacService';
import {
  PROPERTIES_PANEL_TOOL_SENTINEL,
  PROVENANCE_LOG_CAP,
  PROVENANCE_LOG_ARCHIVE_FILENAME,
  isValidPropertiesProvenanceEntry,
} from '@debrief/components/PropertiesPanel/provenanceTypes';
import type { PropertiesProvenanceEntry } from '@debrief/components/PropertiesPanel/provenanceTypes';
import type { StacItem } from '../../src/types/stac';

function seedItemWithFullLog(
  itemFull: string,
  entryCount: number,
): PropertiesProvenanceEntry[] {
  const entries: PropertiesProvenanceEntry[] = Array.from(
    { length: entryCount },
    (_, i) => ({
      activity_id: `seed-${String(i).padStart(6, '0')}`,
      timestamp: new Date(Date.UTC(2024, 0, 1, 0, 0, i)).toISOString(),
      tool: PROPERTIES_PANEL_TOOL_SENTINEL,
      method: 'properties-panel@0.0.0',
      source: 'user',
      fields: ['seeded'],
    }),
  );

  const item: StacItem = {
    type: 'Feature',
    stac_version: '1.0.0',
    id: 'test-item',
    geometry: null as unknown as GeoJSON.Geometry,
    bbox: [-10, -20, 30, 40],
    properties: {
      datetime: '2024-06-15T12:00:00Z',
      title: 'Seeded',
      'debrief:provenance_log': entries,
    },
    links: [],
    assets: {},
  };
  fs.mkdirSync(path.dirname(itemFull), { recursive: true });
  fs.writeFileSync(itemFull, JSON.stringify(item, null, 2));
  return entries;
}

describe('StacService.updateItemMetadata provenance rotation', () => {
  let service: StacService;
  let storeDir: string;
  let itemRel: string;
  let itemFull: string;
  let itemDir: string;

  beforeEach(() => {
    service = new StacService();
    storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stac-uim-prov-'));
    itemRel = path.join('items', 'item-1', 'item.json');
    itemFull = path.join(storeDir, itemRel);
    itemDir = path.dirname(itemFull);
  });

  afterEach(() => {
    try {
      fs.rmSync(storeDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('T030: appending the 501st entry rotates the oldest into the archive', async () => {
    // Pre-seed with exactly CAP entries so the new commit pushes us to CAP+1.
    const seeded = seedItemWithFullLog(itemFull, PROVENANCE_LOG_CAP);

    await service.updateItemMetadata({
      storePath: storeDir,
      itemPath: itemRel,
      patch: { title: 'Final' },
      overrideFields: ['title'],
      provenance: {
        tool: PROPERTIES_PANEL_TOOL_SENTINEL,
        fields: ['title'],
      },
      packageVersion: '1.0.0',
    });

    // On-disk log capped at CAP; newest retained.
    const onDisk = JSON.parse(fs.readFileSync(itemFull, 'utf-8')) as StacItem;
    const activeLog = onDisk.properties[
      'debrief:provenance_log'
    ] as PropertiesProvenanceEntry[];
    expect(activeLog).toHaveLength(PROVENANCE_LOG_CAP);
    // Oldest seeded entry must have been evicted.
    expect(
      activeLog.find((e) => e.activity_id === seeded[0]!.activity_id),
    ).toBeUndefined();
    // Newest seeded entry must still be present.
    expect(
      activeLog.find(
        (e) => e.activity_id === seeded[seeded.length - 1]!.activity_id,
      ),
    ).toBeDefined();
    // The just-written entry is last.
    expect(activeLog[activeLog.length - 1]!.fields).toEqual(['title']);

    // Archive contains exactly 1 entry — the oldest seeded one.
    const archivePath = path.join(itemDir, PROVENANCE_LOG_ARCHIVE_FILENAME);
    expect(fs.existsSync(archivePath)).toBe(true);
    const raw = fs.readFileSync(archivePath, 'utf-8');
    const lines = raw.split('\n').filter((l) => l.length > 0);
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]!) as PropertiesProvenanceEntry;
    expect(parsed.activity_id).toBe(seeded[0]!.activity_id);
  });

  it('T031: archive is newline-delimited; each line parses as a valid entry', async () => {
    // Pre-seed with CAP + 3 entries' worth of history so one commit rotates 4
    // entries (CAP + 1 - CAP = 1 is the single-overflow case above; here we
    // want multi-entry rotation to stress the JSONL format).
    const overflow = 3;
    const seeded = seedItemWithFullLog(itemFull, PROVENANCE_LOG_CAP + overflow);

    await service.updateItemMetadata({
      storePath: storeDir,
      itemPath: itemRel,
      patch: { title: 'Trigger rotation' },
      overrideFields: ['title'],
      provenance: {
        tool: PROPERTIES_PANEL_TOOL_SENTINEL,
        fields: ['title'],
      },
      packageVersion: '1.0.0',
    });

    const archivePath = path.join(itemDir, PROVENANCE_LOG_ARCHIVE_FILENAME);
    const raw = fs.readFileSync(archivePath, 'utf-8');
    expect(raw.endsWith('\n')).toBe(true);
    const lines = raw.split('\n').filter((l) => l.length > 0);
    // overflow + 1 (the new commit pushes past cap by overflow+1 entries).
    expect(lines).toHaveLength(overflow + 1);

    const parsedEntries = lines.map(
      (l) => JSON.parse(l) as PropertiesProvenanceEntry,
    );
    for (const entry of parsedEntries) {
      expect(isValidPropertiesProvenanceEntry(entry)).toBe(true);
    }
    // Oldest evicted first — archive order should match seed order.
    expect(parsedEntries[0]!.activity_id).toBe(seeded[0]!.activity_id);
    expect(parsedEntries[parsedEntries.length - 1]!.activity_id).toBe(
      seeded[overflow]!.activity_id,
    );
  });
});
