/**
 * T012 (spec 240) — TS-side smoke test for the sample STAC catalog.
 *
 * Hedges against the workspace dep edge (@debrief/stac-writer →
 * @debrief/components) or the new ESLint rule accidentally breaking the
 * writer's ability to consume real on-disk STAC items. For every item in
 * preview/workspace/samples/local-store/ the test asserts:
 *
 *  1. The on-disk JSON parses against the post-migration `StacItem` type
 *     (`StacItem` is unchanged by this feature, so the assertion is trivially
 *     true at compile time, but the *runtime* parse + cast catches any
 *     accidental shape change).
 *
 *  2. For items that carry a `properties['debrief:provenance_log']` array
 *     (a subset of the catalog), every entry in the log validates against
 *     `isValidPropertiesProvenanceEntry` — proving the LinkML-derived,
 *     literal-narrowed type accepts existing on-disk data without
 *     behaviour change.
 *
 * Lives in apps/vscode/tests/unit/ rather than apps/web-shell/ because
 * vscode's test config lets us import the @debrief/components leaf
 * subpath (PropertiesPanel/provenanceTypes) directly — the web-shell
 * vitest config aliases only the bare specifier and barrel-importing
 * pulls in Leaflet, which is not available in the Node test runner.
 *
 * Not a behavioural-coverage test — the existing
 * stacService.{provenanceRotation,updateItemMetadata}.test.ts files in
 * this directory cover the runtime semantics. This is a regression net
 * for the type-routing migration.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { StacItem } from '@debrief/stac-writer';
import { isValidPropertiesProvenanceEntry } from '@debrief/components/PropertiesPanel/provenanceTypes';
import type { PropertiesProvenanceEntry } from '@debrief/components/PropertiesPanel/provenanceTypes';

const SAMPLE_CATALOG_ROOT = resolve(
  __dirname,
  '../../../../preview/workspace/samples/local-store',
);

interface ItemFixture {
  readonly entry: string;
  readonly itemPath: string;
}

function discoverItems(): ItemFixture[] {
  const fixtures: ItemFixture[] = [];
  for (const entry of readdirSync(SAMPLE_CATALOG_ROOT)) {
    const entryPath = join(SAMPLE_CATALOG_ROOT, entry);
    let stat;
    try {
      stat = statSync(entryPath);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) {
      continue;
    }
    const itemPath = join(entryPath, 'item.json');
    try {
      statSync(itemPath);
    } catch {
      continue; // not every dir under local-store is a STAC item dir
    }
    fixtures.push({ entry, itemPath });
  }
  return fixtures;
}

describe('sample catalog round-trip (spec 240 / T012)', () => {
  const fixtures = discoverItems();

  it('discovers at least one sample item', () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  it.each(fixtures)('item.json parses as StacItem — $entry', ({ itemPath }) => {
    const raw = readFileSync(itemPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    expect(parsed).toBeTypeOf('object');
    expect(parsed).not.toBeNull();
    const item = parsed as StacItem;
    expect(typeof item.id).toBe('string');
    expect(item.properties).toBeTypeOf('object');
  });

  it.each(fixtures)(
    'every provenance_log entry validates — $entry',
    ({ itemPath }) => {
      const raw = readFileSync(itemPath, 'utf8');
      const parsed = JSON.parse(raw) as StacItem;
      const log = parsed.properties['debrief:provenance_log'];
      if (!Array.isArray(log)) {
        // Items written before #193 (Properties Panel) carry no provenance
        // log; that's expected and not a failure.
        return;
      }
      for (const entry of log as PropertiesProvenanceEntry[]) {
        expect(
          isValidPropertiesProvenanceEntry(entry),
          `Malformed provenance entry in ${itemPath}: ${JSON.stringify(entry)}`,
        ).toBe(true);
      }
    },
  );
});
