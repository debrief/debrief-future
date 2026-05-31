import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { assembleZip, tileKeyOf } from '../index';

function bytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

describe('assembleZip', () => {
  it('places index.html at zip root and uses the injected HTML', async () => {
    const out = await assembleZip({
      indexHtml: '<!doctype html><html>injected</html>',
      staticBundle: new Map([
        ['index.html', bytes('<!doctype html>template — must be replaced</html>')],
        ['assets/index.js', bytes('console.log("ok")')],
      ]),
      featuresGeojson: '{}',
      itemJson: '{}',
      tiles: new Map(),
      sceneThumbnails: new Map(),
    });

    const zip = await JSZip.loadAsync(out.bytes);
    const indexFile = zip.file('index.html');
    expect(indexFile).not.toBeNull();
    const indexText = await indexFile!.async('string');
    expect(indexText).toContain('injected');
    expect(indexText).not.toContain('must be replaced');
  });

  it('copies every static-bundle asset (except index.html) into the zip', async () => {
    const out = await assembleZip({
      indexHtml: '<!doctype html><html></html>',
      staticBundle: new Map([
        ['index.html', bytes('replaced')],
        ['assets/index.js', bytes('js')],
        ['assets/index.css', bytes('css')],
        ['tiles/placeholder.png', new Uint8Array([1, 2, 3])],
      ]),
      featuresGeojson: '{}',
      itemJson: '{}',
      tiles: new Map(),
      sceneThumbnails: new Map(),
    });

    const zip = await JSZip.loadAsync(out.bytes);
    expect(zip.file('assets/index.js')).not.toBeNull();
    expect(zip.file('assets/index.css')).not.toBeNull();
    expect(zip.file('tiles/placeholder.png')).not.toBeNull();
  });

  it('writes tiles at tiles/{z}/{x}/{y}.png paths', async () => {
    const tile = new Uint8Array([0xff, 0xd8]);
    const out = await assembleZip({
      indexHtml: '<!doctype html><html></html>',
      staticBundle: new Map(),
      featuresGeojson: '{}',
      itemJson: '{}',
      tiles: new Map([
        ['6/32/21', tile],
        ['7/64/42', tile],
      ]),
      sceneThumbnails: new Map(),
    });

    const zip = await JSZip.loadAsync(out.bytes);
    expect(zip.file('tiles/6/32/21.png')).not.toBeNull();
    expect(zip.file('tiles/7/64/42.png')).not.toBeNull();
    expect(out.tileCount).toBe(2);
  });

  it('writes scene-thumbnails at the path the items.json asset href points at', async () => {
    const out = await assembleZip({
      indexHtml: '<!doctype html><html></html>',
      staticBundle: new Map(),
      featuresGeojson: '{}',
      itemJson: '{}',
      tiles: new Map(),
      sceneThumbnails: new Map([
        ['scene-thumbnails/scene-ULID1.png', new Uint8Array([1])],
        ['scene-thumbnails/scene-ULID1-sm.png', new Uint8Array([2])],
      ]),
    });

    const zip = await JSZip.loadAsync(out.bytes);
    expect(zip.file('scene-thumbnails/scene-ULID1.png')).not.toBeNull();
    expect(zip.file('scene-thumbnails/scene-ULID1-sm.png')).not.toBeNull();
    expect(out.thumbnailCount).toBe(2);
  });

  it('includes README.txt when one is provided', async () => {
    const out = await assembleZip({
      indexHtml: '<!doctype html><html></html>',
      staticBundle: new Map(),
      featuresGeojson: '{}',
      itemJson: '{}',
      tiles: new Map(),
      sceneThumbnails: new Map(),
      readme: 'Open index.html in Chrome or Edge.',
    });
    const zip = await JSZip.loadAsync(out.bytes);
    const readme = zip.file('README.txt');
    expect(readme).not.toBeNull();
    expect(await readme!.async('string')).toContain('Chrome or Edge');
  });

  it('uses only relative paths (FR-013)', async () => {
    const out = await assembleZip({
      indexHtml: '<!doctype html><html></html>',
      staticBundle: new Map([
        ['/leading-slash-stripped.js', bytes('x')],
        ['assets/index.js', bytes('x')],
      ]),
      featuresGeojson: '{}',
      itemJson: '{}',
      tiles: new Map(),
      sceneThumbnails: new Map(),
    });
    const zip = await JSZip.loadAsync(out.bytes);
    for (const path of Object.keys(zip.files)) {
      expect(path.startsWith('/')).toBe(false);
    }
    expect(zip.file('leading-slash-stripped.js')).not.toBeNull();
  });

  it('produces a reproducible zip given identical inputs', async () => {
    // JSZip's deflate stream may differ on flush settings, but the file
    // *list* and per-file body bytes must be stable.
    const input = {
      indexHtml: '<!doctype html><html></html>',
      staticBundle: new Map([['assets/x.js', bytes('x')]]),
      featuresGeojson: '{"a":1}',
      itemJson: '{"id":"x"}',
      tiles: new Map([['5/16/10', new Uint8Array([1, 2, 3])]]),
      sceneThumbnails: new Map<string, Uint8Array>(),
    };
    const a = await assembleZip(input);
    const b = await assembleZip(input);
    const za = await JSZip.loadAsync(a.bytes);
    const zb = await JSZip.loadAsync(b.bytes);
    // Compare file paths (JSZip exposes directories as entries too — filter them out).
    const filePaths = (zip: JSZip): string[] =>
      Object.entries(zip.files)
        .filter(([, entry]) => !entry.dir)
        .map(([path]) => path)
        .sort();
    expect(filePaths(za)).toEqual(filePaths(zb));
    for (const p of filePaths(za)) {
      expect(await za.file(p)!.async('uint8array')).toEqual(
        await zb.file(p)!.async('uint8array'),
      );
    }
  });
});

describe('tileKeyOf', () => {
  it('formats coords as z/x/y strings', () => {
    expect(tileKeyOf({ z: 6, x: 32, y: 21 })).toBe('6/32/21');
  });
});
