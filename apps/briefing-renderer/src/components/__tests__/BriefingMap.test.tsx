/**
 * Vitest for the BriefingMap basemap tile-URL resolution (#273).
 *
 * Rendering react-leaflet in jsdom is fragile, so the tile-URL decision is
 * extracted into the pure `resolveTileUrl` helper and asserted directly.
 * Covers contract preview-boot Basemap: inline/zip (no `tileLayerUrl`) →
 * bundled local tiles, byte-identical to pre-#273; live preview → online
 * template.
 */

import { describe, it, expect } from 'vitest';
import { resolveTileUrl, BUNDLED_TILE_URL } from '../BriefingMap';

describe('resolveTileUrl', () => {
  it('falls back to the bundled local tiles when tileLayerUrl is unset (inline/zip path)', () => {
    expect(resolveTileUrl(undefined)).toBe(BUNDLED_TILE_URL);
    expect(resolveTileUrl(null)).toBe(BUNDLED_TILE_URL);
    expect(resolveTileUrl('')).toBe(BUNDLED_TILE_URL);
    expect(BUNDLED_TILE_URL).toBe('./tiles/{z}/{x}/{y}.png');
  });

  it('uses the supplied online template for live preview', () => {
    const online = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    expect(resolveTileUrl(online)).toBe(online);
  });
});
