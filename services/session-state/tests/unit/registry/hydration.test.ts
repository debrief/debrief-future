/**
 * Result ID Registry hydration unit tests.
 * Feature: 087-logical-result-id-registry (E04)
 *
 * Covers: US3 Populate Registry from Existing Plot (Phase 5)
 */

import { createResultIdRegistry } from '../../../src/registry/resultIdRegistry.js';
import type { ResultIdChangeEvent, StacAssetForHydration } from '../../../src/registry/types.js';

// ─── Test Helpers ────────────────────────────────────────────────────────

function makeStacAsset(
  href: string,
  resultId?: string,
  version?: number,
  type?: string
): StacAssetForHydration {
  const asset: StacAssetForHydration = { href, roles: ['result'] };
  if (resultId !== undefined) asset['debrief:resultId'] = resultId;
  if (version !== undefined) asset['debrief:version'] = version;
  if (type !== undefined) asset.type = type;
  return asset;
}

// ─── Phase 5: US3 — STAC Hydration ──────────────────────────────────────

describe('hydrateFromAssets', () => {
  it('populates registry from a single result ID with single version', () => {
    const registry = createResultIdRegistry();

    registry.hydrateFromAssets({
      'bt_plot_001_v1': makeStacAsset(
        './results/bt_plot_001_v1.png',
        'bt_plot_001',
        1,
        'image/png'
      ),
    });

    expect(registry.size).toBe(1);
    const mapping = registry.resolve('bt_plot_001');
    expect(mapping).toBeDefined();
    expect(mapping!.currentPath).toBe('./results/bt_plot_001_v1.png');
    expect(mapping!.version).toBe(1);
    expect(mapping!.mimeType).toBe('image/png');
  });

  it('selects the highest version when multiple versions exist (SC-003)', () => {
    const registry = createResultIdRegistry();

    registry.hydrateFromAssets({
      'bt_plot_001_v1': makeStacAsset(
        './results/bt_plot_001_v1.png',
        'bt_plot_001',
        1,
        'image/png'
      ),
      'bt_plot_001_v2': makeStacAsset(
        './results/bt_plot_001_v2.png',
        'bt_plot_001',
        2,
        'image/png'
      ),
      'bt_plot_001_v3': makeStacAsset(
        './results/bt_plot_001_v3.png',
        'bt_plot_001',
        3,
        'image/png'
      ),
    });

    expect(registry.size).toBe(1);
    const mapping = registry.resolve('bt_plot_001');
    expect(mapping!.currentPath).toBe('./results/bt_plot_001_v3.png');
    expect(mapping!.version).toBe(3);
  });

  it('handles multiple distinct result IDs', () => {
    const registry = createResultIdRegistry();

    registry.hydrateFromAssets({
      'bt_plot_001_v1': makeStacAsset('./results/bt_plot_001_v1.png', 'bt_plot_001', 1),
      'bt_plot_001_v2': makeStacAsset('./results/bt_plot_001_v2.png', 'bt_plot_001', 2),
      'range_plot_001_v1': makeStacAsset('./results/range_plot_001_v1.json', 'range_plot_001', 1),
      'freq_plot_001_v1': makeStacAsset('./results/freq_plot_001_v1.png', 'freq_plot_001', 1),
    });

    expect(registry.size).toBe(3);
    expect(registry.resolve('bt_plot_001')!.currentPath).toBe('./results/bt_plot_001_v2.png');
    expect(registry.resolve('range_plot_001')!.currentPath).toBe('./results/range_plot_001_v1.json');
    expect(registry.resolve('freq_plot_001')!.currentPath).toBe('./results/freq_plot_001_v1.png');
  });

  it('ignores assets without debrief:resultId metadata', () => {
    const registry = createResultIdRegistry();

    registry.hydrateFromAssets({
      'features': makeStacAsset('./features.geojson'),
      'source_file': makeStacAsset('./assets/boat1.rep'),
      'bt_plot_001_v1': makeStacAsset('./results/bt_plot_001_v1.png', 'bt_plot_001', 1),
    });

    expect(registry.size).toBe(1);
    expect(registry.resolve('bt_plot_001')).toBeDefined();
  });

  it('ignores assets with resultId but no version', () => {
    const registry = createResultIdRegistry();

    registry.hydrateFromAssets({
      'bt_plot_001_v1': {
        href: './results/bt_plot_001_v1.png',
        'debrief:resultId': 'bt_plot_001',
        // No debrief:version
      },
    });

    expect(registry.size).toBe(0);
  });

  it('handles empty asset map without error', () => {
    const registry = createResultIdRegistry();
    registry.hydrateFromAssets({});
    expect(registry.size).toBe(0);
  });

  it('does NOT emit change events during hydration', () => {
    const registry = createResultIdRegistry();
    const events: ResultIdChangeEvent[] = [];

    // Subscribe before hydration
    registry.subscribeAll((e) => events.push(e));

    registry.hydrateFromAssets({
      'bt_plot_001_v1': makeStacAsset('./results/bt_plot_001_v1.png', 'bt_plot_001', 1),
      'range_plot_001_v1': makeStacAsset('./results/range_plot_001_v1.json', 'range_plot_001', 1),
    });

    expect(events).toHaveLength(0);
    expect(registry.size).toBe(2);
  });

  it('preserves MIME type from STAC asset', () => {
    const registry = createResultIdRegistry();

    registry.hydrateFromAssets({
      'bt_plot_001_v1': makeStacAsset(
        './results/bt_plot_001_v1.png',
        'bt_plot_001',
        1,
        'image/png'
      ),
      'range_plot_001_v1': makeStacAsset(
        './results/range_plot_001_v1.json',
        'range_plot_001',
        1,
        'application/json'
      ),
    });

    expect(registry.resolve('bt_plot_001')!.mimeType).toBe('image/png');
    expect(registry.resolve('range_plot_001')!.mimeType).toBe('application/json');
  });

  it('handles assets iterated in non-version order', () => {
    const registry = createResultIdRegistry();

    // Insert v3 before v1 — should still select v3
    registry.hydrateFromAssets({
      'bt_plot_001_v3': makeStacAsset('./results/bt_plot_001_v3.png', 'bt_plot_001', 3),
      'bt_plot_001_v1': makeStacAsset('./results/bt_plot_001_v1.png', 'bt_plot_001', 1),
      'bt_plot_001_v2': makeStacAsset('./results/bt_plot_001_v2.png', 'bt_plot_001', 2),
    });

    expect(registry.resolve('bt_plot_001')!.currentPath).toBe('./results/bt_plot_001_v3.png');
    expect(registry.resolve('bt_plot_001')!.version).toBe(3);
  });
});

// ─── Integration: Hydrate then Live Update ───────────────────────────────

describe('hydrate then live update', () => {
  it('live update after hydration produces correct mapping and event', () => {
    const registry = createResultIdRegistry();

    // Hydrate with v1
    registry.hydrateFromAssets({
      'bt_plot_001_v1': makeStacAsset('./results/bt_plot_001_v1.png', 'bt_plot_001', 1),
    });

    const events: ResultIdChangeEvent[] = [];
    registry.subscribeAll((e) => events.push(e));

    // Live update to v2 via replay
    registry.registerFromReplayResult([
      {
        result_id: 'bt_plot_001',
        version: 2,
        path: './results/bt_plot_001_v2.png',
        previous_path: './results/bt_plot_001_v1.png',
      },
    ]);

    expect(registry.resolve('bt_plot_001')!.currentPath).toBe('./results/bt_plot_001_v2.png');
    expect(registry.resolve('bt_plot_001')!.version).toBe(2);

    expect(events).toHaveLength(1);
    expect(events[0].previousPath).toBe('./results/bt_plot_001_v1.png');
    expect(events[0].previousVersion).toBe(1);
    expect(events[0].newVersion).toBe(2);
  });
});
