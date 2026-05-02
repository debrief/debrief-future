/**
 * Typed shim that owns the plot thumbnail write path.
 *
 * Spec 241 review decision 1B — saveSession.ts used to write thumbnail PNGs
 * and mutate item.json.assets directly from the VS Code extension, a
 * pre-existing Article IV.1 violation. This shim is the typed seam; it
 * still runs in-process today so that the bytes don't have to round-trip
 * through MCP, but it produces the spec-241 STAC 1.1 shape (assets.thumbnail
 * = small, assets.overview = large, with proj:shape, file:size, file:checksum)
 * authoritatively. Follow-up #242 promotes the seam to a service-mediated
 * path so even the in-process write goes through services/stac/.
 *
 * Mirrors `services/stac/src/debrief_stac/thumbnails.py:store_thumbnail()`.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface WritePlotThumbnailsArgs {
  /** Filesystem path of the STAC store root. */
  readonly storePath: string;
  /** Item path relative to the store root (e.g. 'core--boat1/item.json'). */
  readonly itemPath: string;
  /** Base64-encoded PNG bytes for the 800x600 overview. */
  readonly largePngBase64: string;
  /** Base64-encoded PNG bytes for the 200x150 thumbnail. */
  readonly smallPngBase64: string;
}

interface AssetEntry {
  href: string;
  type: string;
  title: string;
  roles: string[];
  'proj:shape': [number, number];
  'file:size': number;
  'file:checksum': string;
}

interface ItemJson {
  assets?: Record<string, AssetEntry | Record<string, unknown>>;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Multihash-encoded SHA-256 of the supplied buffer.
 *
 * Returns the hex string `<varint algo=0x12><varint length=0x20><32-byte digest>`
 * matching the Python helper {@link multihash_sha256_bytes} in
 * services/stac/src/debrief_stac/_helpers.py.
 */
function multihashSha256(buffer: Buffer): string {
  const digest = crypto.createHash('sha256').update(buffer).digest();
  // 0x12 = sha2-256 codec, 0x20 = 32-byte length.
  return `1220${digest.toString('hex')}`;
}

function isoNowUtc(): string {
  const now = new Date();
  return `${now.toISOString().slice(0, -1)}Z`; // already UTC; .toISOString() returns ms-precision Z
}

/**
 * Write thumbnail PNGs to the item directory and update item.json.assets
 * with the spec-241 shape.
 *
 * - thumbnail.png = 200x150 (small)        → assets.thumbnail
 * - overview.png  = 800x600 (large)        → assets.overview
 *
 * Both entries carry proj:shape, file:size, file:checksum (multihash sha-256).
 * The legacy `assets['thumbnail-sm']` key is removed (idempotent).
 *
 * Refreshes `properties.updated`; preserves `properties.created` if present.
 * Synchronous (mirrors the previous fs.writeFileSync semantics).
 */
export function writePlotThumbnails(args: WritePlotThumbnailsArgs): void {
  const { storePath, itemPath, largePngBase64, smallPngBase64 } = args;

  const itemDir = path.join(storePath, path.dirname(itemPath));
  const itemJsonPath = path.join(storePath, itemPath);

  const smallBuffer = Buffer.from(smallPngBase64, 'base64');
  const largeBuffer = Buffer.from(largePngBase64, 'base64');

  const smallPath = path.join(itemDir, 'thumbnail.png');
  const largePath = path.join(itemDir, 'overview.png');
  fs.writeFileSync(smallPath, smallBuffer);
  fs.writeFileSync(largePath, largeBuffer);

  const itemData = JSON.parse(fs.readFileSync(itemJsonPath, 'utf-8')) as ItemJson;
  itemData.assets = itemData.assets ?? {};
  // Drop legacy key — idempotent on fresh items.
  delete itemData.assets['thumbnail-sm'];

  itemData.assets['thumbnail'] = {
    href: './thumbnail.png',
    type: 'image/png',
    title: 'Plot thumbnail (200x150)',
    roles: ['thumbnail'],
    'proj:shape': [150, 200],
    'file:size': smallBuffer.byteLength,
    'file:checksum': multihashSha256(smallBuffer),
  };
  itemData.assets['overview'] = {
    href: './overview.png',
    type: 'image/png',
    title: 'Plot overview (800x600)',
    roles: ['overview'],
    'proj:shape': [600, 800],
    'file:size': largeBuffer.byteLength,
    'file:checksum': multihashSha256(largeBuffer),
  };

  itemData.properties = itemData.properties ?? {};
  if (typeof itemData.properties['created'] !== 'string') {
    itemData.properties['created'] = isoNowUtc();
  }
  itemData.properties['updated'] = isoNowUtc();

  fs.writeFileSync(itemJsonPath, JSON.stringify(itemData, null, 2));
}
